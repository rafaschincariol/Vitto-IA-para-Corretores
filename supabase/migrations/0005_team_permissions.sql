-- Permissões de equipe: "owner" (Admin) vê toda a carteira da corretora;
-- "member" (Corretor/Sub-usuário) só vê os clientes atribuídos a ele e as
-- apólices/documentos desses clientes. O papel já existe em public.profiles
-- (check role in ('owner','member')) desde a fase 1 — aqui adicionamos o
-- vínculo de atribuição e o convite de novos membros.

alter table public.clients
  add column assigned_to uuid references public.profiles (id) on delete set null;

-- Por padrão, um cliente fica atribuído a quem o cadastrou.
update public.clients set assigned_to = created_by where assigned_to is null;

create index clients_assigned_to_idx on public.clients (assigned_to);

-- Convites: um owner gera um link de convite (e-mail + papel); o convidado
-- usa esse link para se cadastrar e entrar no MESMO tenant, em vez de criar
-- uma corretora nova. Evita precisar da service_role key (Admin API) só
-- para criar contas de equipe.
create table public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  token uuid not null default gen_random_uuid(),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index tenant_invites_token_idx on public.tenant_invites (token);
create index tenant_invites_tenant_id_idx on public.tenant_invites (tenant_id);

alter table public.tenant_invites enable row level security;

-- Owners do tenant veem/criam/apagam os convites da própria corretora.
create policy "tenant_invites_select_own_tenant" on public.tenant_invites
  for select using (tenant_id = public.auth_tenant_id());

create policy "tenant_invites_insert_owner" on public.tenant_invites
  for insert with check (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

create policy "tenant_invites_delete_owner" on public.tenant_invites
  for delete using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- Leitura pública por token: a página de signup precisa ler o convite (nome
-- da corretora, e-mail, papel) ANTES do convidado ter uma sessão. Sem isso,
-- auth_tenant_id() não resolveria nada (usuário ainda não está logado).
create policy "tenant_invites_select_by_token" on public.tenant_invites
  for select using (true);

-- getInviteInfo() (signup pré-autenticado) faz um join tenant:tenants(name)
-- via PostgREST — sem esta policy, "tenants_select_own" (0003_rls.sql)
-- bloqueia esse join para quem ainda não tem sessão, e o convite aparece
-- como "inválido" mesmo sendo válido. Libera o nome do tenant só quando
-- existe um convite pendente apontando pra ele (mesmo pré-requisito de quem
-- já tem o link do convite).
create policy "tenants_select_by_pending_invite" on public.tenants
  for select using (
    exists (
      select 1 from public.tenant_invites
      where tenant_invites.tenant_id = tenants.id
        and tenant_invites.accepted_at is null
    )
  );

-- Atualiza o gatilho de signup: se o metadata trouxer um invite_token válido
-- e ainda não aceito, entra nesse tenant com o papel do convite em vez de
-- criar uma corretora nova.
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
  end if;

  insert into public.profiles (id, tenant_id, full_name, email, role)
  values (
    new.id,
    new_tenant_id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    member_role
  );

  return new;
end;
$$;

-- Substitui as policies de clients/policies/documents: owners continuam
-- vendo tudo do tenant; members só veem o que está atribuído a eles (via
-- clients.assigned_to, que também governa policies/documents pelo client_id).
drop policy "clients_all_own_tenant" on public.clients;

create policy "clients_select_own_tenant" on public.clients
  for select using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "clients_insert_own_tenant" on public.clients
  for insert with check (tenant_id = public.auth_tenant_id());

create policy "clients_update_own_tenant" on public.clients
  for update using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "clients_delete_owner_only" on public.clients
  for delete using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

drop policy "policies_all_own_tenant" on public.policies;

create policy "policies_all_own_tenant" on public.policies
  for all
  using (
    tenant_id = public.auth_tenant_id()
    and exists (
      select 1 from public.clients c
      where c.id = policies.client_id
        and (
          c.assigned_to = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
        )
    )
  )
  with check (tenant_id = public.auth_tenant_id());

drop policy "documents_all_own_tenant" on public.documents;

create policy "documents_all_own_tenant" on public.documents
  for all
  using (
    tenant_id = public.auth_tenant_id()
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.id = documents.client_id
          and (
            c.assigned_to = auth.uid()
            or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
          )
      )
    )
  )
  with check (tenant_id = public.auth_tenant_id());
