-- Painel administrativo da plataforma (não confundir com "Admin" de uma
-- corretora, que é só um role dentro do tenant). Acesso restrito a quem está
-- em public.platform_admins (já existente desde 0007_rag.sql).

-- admin_list_tenants(): visão consolidada de todas as corretoras para o
-- painel de assinantes. Retorna só CONTAGENS agregadas de clients/policies/
-- documents — nunca as linhas em si — para que o painel administrativo
-- nunca tenha acesso a CPF/nome de cliente final de nenhuma corretora,
-- minimizando os dados expostos (mesmo princípio das outras funções
-- security definer do projeto, ver match_document_chunks em 0007_rag.sql).
create or replace function public.admin_list_tenants()
returns table (
  tenant_id uuid,
  tenant_name text,
  created_at timestamptz,
  owner_full_name text,
  owner_email text,
  status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  client_count bigint,
  policy_count bigint,
  active_policy_count bigint,
  document_count bigint,
  member_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email') then
    raise exception 'not authorized';
  end if;

  return query
  select
    t.id,
    t.name,
    t.created_at,
    owner.full_name,
    owner.email,
    coalesce(ts.status, 'trialing'),
    ts.trial_ends_at,
    ts.current_period_end,
    ts.stripe_customer_id,
    coalesce(cl.client_count, 0),
    coalesce(pl.policy_count, 0),
    coalesce(pl.active_policy_count, 0),
    coalesce(doc.document_count, 0),
    coalesce(mem.member_count, 0)
  from public.tenants t
  left join public.tenant_subscriptions ts on ts.tenant_id = t.id
  left join lateral (
    select p.full_name, p.email
    from public.profiles p
    where p.tenant_id = t.id and p.role = 'owner'
    order by p.created_at asc
    limit 1
  ) owner on true
  left join (
    select clients.tenant_id as t_id, count(*) as client_count
    from public.clients
    group by clients.tenant_id
  ) cl on cl.t_id = t.id
  left join (
    select policies.tenant_id as t_id, count(*) as policy_count,
      count(*) filter (where policies.status in ('ativo', 'em_renovacao')) as active_policy_count
    from public.policies
    group by policies.tenant_id
  ) pl on pl.t_id = t.id
  left join (
    select documents.tenant_id as t_id, count(*) as document_count
    from public.documents
    group by documents.tenant_id
  ) doc on doc.t_id = t.id
  left join (
    select profiles.tenant_id as t_id, count(*) as member_count
    from public.profiles
    group by profiles.tenant_id
  ) mem on mem.t_id = t.id
  order by t.created_at desc;
end;
$$;

revoke execute on function public.admin_list_tenants from public;
grant execute on function public.admin_list_tenants to authenticated;

-- Aceite de termos no cadastro (LGPD art. 8º — consentimento precisa ser
-- inequívoco e o controlador tem o ônus de provar que houve consentimento).
alter table public.profiles add column terms_accepted_at timestamptz;

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
  -- Administradores da plataforma não são corretores: não criar
  -- tenant/profile pra eles (o acesso deles é só via platform_admins +
  -- auth.users, ver src/app/(admin)/admin/layout.tsx).
  if exists (select 1 from public.platform_admins where email = new.email) then
    return new;
  end if;

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

  insert into public.profiles (id, tenant_id, full_name, email, role, terms_accepted_at)
  values (
    new.id,
    new_tenant_id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    member_role,
    nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz
  );

  if is_new_tenant then
    insert into public.tenant_subscriptions (tenant_id, status, trial_ends_at)
    values (new_tenant_id, 'trialing', now() + interval '14 days');
  end if;

  return new;
end;
$$;
