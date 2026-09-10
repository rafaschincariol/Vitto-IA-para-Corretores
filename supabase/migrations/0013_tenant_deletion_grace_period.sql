-- Troca a exclusão imediata (0012) por exclusão AGENDADA com 30 dias de
-- carência — bate com o que a Política de Privacidade promete ("período
-- razoável para reativação" antes da exclusão definitiva) e evita perda
-- de dados irreversível por um clique errado na confirmação. A exclusão
-- definitiva de verdade roda depois, via cron (ver
-- src/app/api/cron/purge-tenants/route.ts), usando a service_role key
-- diretamente — não precisa de RPC porque quem confere autorização ali é
-- o segredo do cron, não uma sessão de usuário.

alter table public.tenants add column pending_deletion_at timestamptz;

drop function if exists public.delete_own_tenant(uuid);
drop function if exists public.admin_delete_tenant(uuid);

create or replace function public.schedule_own_tenant_deletion(p_tenant_id uuid)
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

  update public.tenants set pending_deletion_at = now() + interval '30 days' where id = p_tenant_id;
end;
$$;

revoke execute on function public.schedule_own_tenant_deletion from public;
grant execute on function public.schedule_own_tenant_deletion to authenticated;

create or replace function public.admin_schedule_tenant_deletion(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email') then
    raise exception 'not authorized';
  end if;

  update public.tenants set pending_deletion_at = now() + interval '30 days' where id = p_tenant_id;
end;
$$;

revoke execute on function public.admin_schedule_tenant_deletion from public;
grant execute on function public.admin_schedule_tenant_deletion to authenticated;

create or replace function public.admin_cancel_tenant_deletion(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email') then
    raise exception 'not authorized';
  end if;

  update public.tenants set pending_deletion_at = null where id = p_tenant_id;
end;
$$;

revoke execute on function public.admin_cancel_tenant_deletion from public;
grant execute on function public.admin_cancel_tenant_deletion to authenticated;

-- Reexpõe pending_deletion_at pro painel admin mostrar o status. Precisa
-- de DROP explícito porque o tipo de retorno muda (coluna nova).
drop function if exists public.admin_list_tenants();

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
