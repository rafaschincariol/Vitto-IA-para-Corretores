-- Expõe se o dono da corretora já confirmou o e-mail. O trigger
-- handle_new_user() (0001_init.sql) roda em "after insert on auth.users" —
-- ou seja, o tenant/profile/subscription já existem assim que a pessoa
-- envia o formulário de cadastro, ANTES de confirmar o e-mail. Quem
-- abandona nesse meio-tempo (nunca clica no link) fica com um cadastro
-- "fantasma": não consegue entrar (e-mail não confirmado) e não consegue
-- se cadastrar de novo com o mesmo e-mail (Supabase já considera
-- registrado). Sem visibilidade disso no painel, esses casos ficam presos
-- pra sempre — só o admin, vendo isso aqui, consegue liberar o e-mail.
drop function if exists public.admin_list_tenants();

create or replace function public.admin_list_tenants()
returns table (
  tenant_id uuid,
  tenant_name text,
  created_at timestamptz,
  owner_full_name text,
  owner_email text,
  owner_email_confirmed boolean,
  status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  client_count bigint,
  policy_count bigint,
  active_policy_count bigint,
  document_count bigint,
  member_count bigint,
  pending_deletion_at timestamptz
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
    (au.email_confirmed_at is not null),
    coalesce(ts.status, 'trialing'),
    ts.trial_ends_at,
    ts.current_period_end,
    ts.stripe_customer_id,
    coalesce(cl.client_count, 0),
    coalesce(pl.policy_count, 0),
    coalesce(pl.active_policy_count, 0),
    coalesce(doc.document_count, 0),
    coalesce(mem.member_count, 0),
    t.pending_deletion_at
  from public.tenants t
  left join public.tenant_subscriptions ts on ts.tenant_id = t.id
  left join lateral (
    select p.id, p.full_name, p.email
    from public.profiles p
    where p.tenant_id = t.id and p.role = 'owner'
    order by p.created_at asc
    limit 1
  ) owner on true
  left join auth.users au on au.id = owner.id
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
