-- Simulador de Gap de Proteção Previdenciária (INSS): mostra a diferença
-- entre a renda familiar atual e a pensão por morte que o INSS pagaria,
-- pra quebrar a objeção "eu já tenho INSS, não preciso de seguro de vida".
-- "result" guarda um snapshot do cálculo no momento do save, mesmo padrão
-- de sucessao_simulacoes (0020) — sobrevive a mudanças futuras no teto do
-- INSS sem divergir do PDF já entregue ao cliente.

create table public.protecao_inss_simulacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  client_name text not null,
  contribution_salary numeric(12, 2) not null default 0,
  dependents_count int not null default 0,
  family_monthly_income numeric(12, 2) not null default 0,
  dependency_years int not null default 15,
  notes text,
  result jsonb not null,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index protecao_inss_simulacoes_tenant_id_idx on public.protecao_inss_simulacoes (tenant_id);
create index protecao_inss_simulacoes_client_id_idx on public.protecao_inss_simulacoes (client_id);
create index protecao_inss_simulacoes_assigned_to_idx on public.protecao_inss_simulacoes (assigned_to);

create trigger protecao_inss_simulacoes_set_updated_at
  before update on public.protecao_inss_simulacoes
  for each row execute function public.set_updated_at();

alter table public.protecao_inss_simulacoes enable row level security;

-- Mesmo padrão de sucessao_simulacoes (0020): owner vê/edita tudo da tenant;
-- member só vê/edita o que está atribuído a ele. Exclusão só owner.
create policy "protecao_inss_simulacoes_select_own_tenant" on public.protecao_inss_simulacoes
  for select using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "protecao_inss_simulacoes_insert_own_tenant" on public.protecao_inss_simulacoes
  for insert with check (tenant_id = public.auth_tenant_id());

create policy "protecao_inss_simulacoes_update_own_tenant" on public.protecao_inss_simulacoes
  for update using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "protecao_inss_simulacoes_delete_owner_only" on public.protecao_inss_simulacoes
  for delete using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );
