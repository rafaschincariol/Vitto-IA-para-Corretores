-- Cobrança via Stripe: assinatura mensal por corretora (tenant), com 14
-- dias de teste grátis. Os dados de assinatura ficam numa tabela separada
-- de "tenants" de propósito: se ficassem em tenants, a policy
-- "tenants_update_owner" (usada hoje só pra renomear a corretora) deixaria
-- qualquer owner escrever subscription_status = 'active' direto pelo client
-- SDK, sem nunca passar pelo Stripe. Aqui, a tabela só tem policy de
-- leitura — a única escrita client-side é feita por uma função
-- SECURITY DEFINER que confere que quem chama é o owner do tenant; a
-- mudança de status em si (trial -> ativo -> cancelado) só acontece via
-- webhook do Stripe, que roda com a service_role key (ver
-- src/app/api/webhooks/stripe/route.ts) — ali quem autentica a escrita é a
-- assinatura criptográfica do Stripe, não uma sessão de usuário Supabase.
-- (A service_role key também é usada em src/lib/supabase/admin.ts, pro
-- reset de senha no painel admin — sempre atrás de checagem de
-- platform_admins, nunca como atalho de RLS.)

create table public.tenant_subscriptions (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  -- Valores possíveis do Subscription.status do Stripe, mais "trialing" que
  -- também usamos internamente pro trial de 14 dias (que não é Stripe
  -- trial, é controlado só pelo app antes de existir qualquer assinatura).
  status text not null default 'trialing'
    check (status in (
      'trialing', 'active', 'past_due', 'canceled', 'unpaid',
      'incomplete', 'incomplete_expired', 'paused'
    )),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create unique index tenant_subscriptions_stripe_customer_id_idx
  on public.tenant_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.tenant_subscriptions enable row level security;

create policy "tenant_subscriptions_select_own_tenant" on public.tenant_subscriptions
  for select using (tenant_id = public.auth_tenant_id());

-- Grava o stripe_customer_id na primeira vez que o owner inicia um
-- checkout. SECURITY DEFINER porque a tabela não tem policy de update pra
-- authenticated — mas confere auth.uid() antes de gravar, então não é uma
-- porta aberta: só o owner do próprio tenant consegue chamar com sucesso.
create or replace function public.set_tenant_stripe_customer(p_tenant_id uuid, p_customer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and tenant_id = p_tenant_id and role = 'owner'
  ) then
    raise exception 'not authorized';
  end if;

  update public.tenant_subscriptions
  set stripe_customer_id = p_customer_id, updated_at = now()
  where tenant_id = p_tenant_id;
end;
$$;

revoke execute on function public.set_tenant_stripe_customer from public;
grant execute on function public.set_tenant_stripe_customer to authenticated;

-- Atualiza o gatilho de signup: tenant novo (não convite) já nasce com uma
-- linha de assinatura em trial de 14 dias.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
  tenant_name text;
  invite record;
  invite_found boolean := false;
  member_role text;
  is_new_tenant boolean := false;
begin
  if new.raw_user_meta_data ->> 'invite_token' is not null then
    select * into invite
    from public.tenant_invites
    where token = (new.raw_user_meta_data ->> 'invite_token')::uuid
      and accepted_at is null
      and lower(email) = lower(new.email)
    limit 1;
    invite_found := found;
  end if;

  if invite_found then
    new_tenant_id := invite.tenant_id;
    member_role := invite.role;

    update public.tenant_invites set accepted_at = now() where id = invite.id;
  else
    tenant_name := coalesce(
      nullif(new.raw_user_meta_data ->> 'tenant_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', '') || ' - Corretora',
      'Minha Corretora'
    );

    insert into public.tenants (name) values (tenant_name)
    returning id into new_tenant_id;

    member_role := 'owner';
    is_new_tenant := true;
  end if;

  insert into public.profiles (id, tenant_id, full_name, email, role)
  values (
    new.id,
    new_tenant_id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    member_role
  );

  if is_new_tenant then
    insert into public.tenant_subscriptions (tenant_id, status, trial_ends_at)
    values (new_tenant_id, 'trialing', now() + interval '14 days');
  end if;

  return new;
end;
$$;

-- Backfill: tenants criados antes desta migration (inclusive o que já está
-- em uso em produção) ganham uma linha de trial de 14 dias a partir de
-- agora, pra não travar o acesso de ninguém assim que isto for aplicado.
insert into public.tenant_subscriptions (tenant_id, status, trial_ends_at)
select id, 'trialing', now() + interval '14 days'
from public.tenants
on conflict (tenant_id) do nothing;
