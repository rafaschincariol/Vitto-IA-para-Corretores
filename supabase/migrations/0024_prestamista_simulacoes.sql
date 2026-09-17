-- Simulador de Seguro Prestamista: quanto de cobertura o cliente precisa pra
-- que a família (e o banco) não fiquem com o saldo devedor do financiamento
-- em caso de morte ou invalidez. "result" guarda um snapshot do cálculo
-- (saldo devedor projetado, comparação SAC x Price) no momento do save,
-- mesmo padrão dos outros três simuladores.

create table public.prestamista_simulacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  client_name text not null,
  financed_amount numeric(12, 2) not null default 0,
  annual_interest_rate numeric(5, 2) not null default 0,
  term_years int not null default 30,
  amortization_system text not null default 'sac' check (amortization_system in ('sac', 'price')),
  years_elapsed numeric(5, 2) not null default 0,
  notes text,
  result jsonb not null,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prestamista_simulacoes_tenant_id_idx on public.prestamista_simulacoes (tenant_id);
create index prestamista_simulacoes_client_id_idx on public.prestamista_simulacoes (client_id);
create index prestamista_simulacoes_assigned_to_idx on public.prestamista_simulacoes (assigned_to);

create trigger prestamista_simulacoes_set_updated_at
  before update on public.prestamista_simulacoes
  for each row execute function public.set_updated_at();

alter table public.prestamista_simulacoes enable row level security;

-- Mesmo padrão dos outros simuladores: owner vê/edita tudo da tenant; member
-- só vê/edita o que está atribuído a ele. Exclusão só owner.
create policy "prestamista_simulacoes_select_own_tenant" on public.prestamista_simulacoes
  for select using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "prestamista_simulacoes_insert_own_tenant" on public.prestamista_simulacoes
  for insert with check (tenant_id = public.auth_tenant_id());

create policy "prestamista_simulacoes_update_own_tenant" on public.prestamista_simulacoes
  for update using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "prestamista_simulacoes_delete_owner_only" on public.prestamista_simulacoes
  for delete using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );
