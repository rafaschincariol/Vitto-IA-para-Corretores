-- Painel admin deixa de ser só visualização: adiciona edição de dados da
-- corretora e dos membros, e reset de senha. Mesmo padrão de segurança das
-- funções em 0010_platform_admin.sql — SECURITY DEFINER que confere
-- platform_admins internamente, então a policy de RLS de cada tabela
-- (que restringe tudo a auth_tenant_id()) não precisa abrir exceção
-- nenhuma pra admin da plataforma.

-- Lista os membros (perfis) de uma corretora, para o painel admin exibir e
-- oferecer edição/reset de senha por pessoa.
create or replace function public.admin_list_tenant_members(p_tenant_id uuid)
returns table (
  profile_id uuid,
  full_name text,
  email text,
  role text,
  created_at timestamptz
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
  select p.id, p.full_name, p.email, p.role, p.created_at
  from public.profiles p
  where p.tenant_id = p_tenant_id
  order by (p.role = 'owner') desc, p.created_at asc;
end;
$$;

revoke execute on function public.admin_list_tenant_members from public;
grant execute on function public.admin_list_tenant_members to authenticated;

-- Renomeia a corretora. É o único campo de `tenants` que faz sentido o
-- admin da plataforma editar diretamente — o resto (status de assinatura,
-- etc.) é derivado do Stripe e não deve ser digitado à mão (ver comentário
-- em 0008_billing.sql sobre por que tenant_subscriptions não tem policy de
-- update para usuário comum).
create or replace function public.admin_update_tenant_name(p_tenant_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email') then
    raise exception 'not authorized';
  end if;

  if trim(p_name) = '' then
    raise exception 'nome não pode ser vazio';
  end if;

  update public.tenants set name = trim(p_name) where id = p_tenant_id;
end;
$$;

revoke execute on function public.admin_update_tenant_name from public;
grant execute on function public.admin_update_tenant_name to authenticated;

-- Renomeia um membro específico (nome de exibição, não o e-mail — trocar
-- e-mail mexe com auth.users e login, fora do escopo desta função).
create or replace function public.admin_update_profile_name(p_profile_id uuid, p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email') then
    raise exception 'not authorized';
  end if;

  if trim(p_full_name) = '' then
    raise exception 'nome não pode ser vazio';
  end if;

  update public.profiles set full_name = trim(p_full_name) where id = p_profile_id;
end;
$$;

revoke execute on function public.admin_update_profile_name from public;
grant execute on function public.admin_update_profile_name to authenticated;
