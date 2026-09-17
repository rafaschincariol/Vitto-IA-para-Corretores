-- Simulador de Necessidade de Seguro de Vida (DIME + "Linha da Vida"): guarda
-- simulações de necessidade de proteção por tenant, com dívidas e filhos
-- (com plano de faculdade) em jsonb, mesmo padrão de sucessao_simulacoes
-- (0020) pra bens. "result" guarda um snapshot do cálculo (número DIME +
-- projeção ano a ano) no momento do save.

create table public.vida_simulacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  client_name text not null,
  monthly_income numeric(12, 2) not null default 0,
  dependency_years int not null default 15,
  debts jsonb not null default '[]'::jsonb,
  children jsonb not null default '[]'::jsonb,
  current_investments numeric(12, 2) not null default 0,
  monthly_contribution numeric(12, 2) not null default 0,
  existing_insurance numeric(12, 2) not null default 0,
  real_return_rate numeric(5, 4) not null default 0.04,
  final_costs numeric(12, 2) not null default 15000,
  notes text,
  result jsonb not null,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vida_simulacoes_tenant_id_idx on public.vida_simulacoes (tenant_id);
create index vida_simulacoes_client_id_idx on public.vida_simulacoes (client_id);
create index vida_simulacoes_assigned_to_idx on public.vida_simulacoes (assigned_to);

create trigger vida_simulacoes_set_updated_at
  before update on public.vida_simulacoes
  for each row execute function public.set_updated_at();

alter table public.vida_simulacoes enable row level security;

-- Mesmo padrão de sucessao_simulacoes/protecao_inss_simulacoes: owner
-- vê/edita tudo da tenant; member só vê/edita o que está atribuído a ele.
create policy "vida_simulacoes_select_own_tenant" on public.vida_simulacoes
  for select using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "vida_simulacoes_insert_own_tenant" on public.vida_simulacoes
  for insert with check (tenant_id = public.auth_tenant_id());

create policy "vida_simulacoes_update_own_tenant" on public.vida_simulacoes
  for update using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "vida_simulacoes_delete_owner_only" on public.vida_simulacoes
  for delete using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );
