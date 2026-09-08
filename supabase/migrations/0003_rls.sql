-- Helper: tenant do usuário autenticado. SECURITY DEFINER + STABLE evita
-- recursão de RLS ao consultar public.profiles de dentro de outra policy e
-- permite que o planner cacheie o resultado dentro da mesma query.
create function public.auth_tenant_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

revoke execute on function public.auth_tenant_id() from public;
grant execute on function public.auth_tenant_id() to authenticated;

-- tenants: cada usuário só enxerga o próprio tenant; só o owner pode renomear.
-- Inserts/deletes não são expostos ao cliente (criação acontece via trigger
-- de signup, que roda como SECURITY DEFINER e bypassa RLS).
alter table public.tenants enable row level security;

create policy "tenants_select_own" on public.tenants
  for select using (id = public.auth_tenant_id());

create policy "tenants_update_owner" on public.tenants
  for update using (
    id = public.auth_tenant_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );

-- profiles: membros do mesmo tenant se enxergam; cada um só edita o próprio
-- registro. Inserts/deletes também ficam a cargo do trigger de signup.
alter table public.profiles enable row level security;

create policy "profiles_select_same_tenant" on public.profiles
  for select using (tenant_id = public.auth_tenant_id());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- clients / policies / documents: isolamento estrito por tenant_id em todas
-- as operações.
alter table public.clients enable row level security;

create policy "clients_all_own_tenant" on public.clients
  for all
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

alter table public.policies enable row level security;

create policy "policies_all_own_tenant" on public.policies
  for all
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

alter table public.documents enable row level security;

create policy "documents_all_own_tenant" on public.documents
  for all
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

-- Storage: bucket privado "documents", um arquivo por objeto, isolado por
-- tenant através do primeiro segmento do path: "<tenant_id>/<arquivo>".
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_select_own_tenant" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

create policy "documents_bucket_insert_own_tenant" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

create policy "documents_bucket_update_own_tenant" on storage.objects
  for update using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

create policy "documents_bucket_delete_own_tenant" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );
