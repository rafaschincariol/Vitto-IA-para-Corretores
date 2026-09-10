-- Exclusão de conta (LGPD art. 18, VI — eliminação dos dados tratados com
-- consentimento do titular). Duas portas de entrada pro mesmo efeito:
-- o próprio owner encerrando a conta (self-service) e o admin da
-- plataforma excluindo por pedido via suporte. Ambas só apagam a linha de
-- public.tenants — todo o resto (clients, policies, documents,
-- document_chunks, tenant_invites, tenant_subscriptions, profiles) cai em
-- cascata pelas FKs em tenant_id, todas já ON DELETE CASCADE desde as
-- migrações anteriores. Apagar os logins em auth.users continua sendo
-- responsabilidade do código da aplicação (Admin API, fora do alcance de
-- uma função SQL comum) — ver src/lib/tenants/delete-tenant.ts.

create or replace function public.delete_own_tenant(p_tenant_id uuid)
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

  delete from public.tenants where id = p_tenant_id;
end;
$$;

revoke execute on function public.delete_own_tenant from public;
grant execute on function public.delete_own_tenant to authenticated;

create or replace function public.admin_delete_tenant(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email') then
    raise exception 'not authorized';
  end if;

  delete from public.tenants where id = p_tenant_id;
end;
$$;

revoke execute on function public.admin_delete_tenant from public;
grant execute on function public.admin_delete_tenant to authenticated;
