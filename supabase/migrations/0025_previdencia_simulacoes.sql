-- Simulador de Previdência Privada (PGBL/VGBL): projeta o saldo acumulado e
-- compara plano (PGBL/VGBL) x regime de tributação (regressivo/progressivo)
-- no resgate. "result" guarda um snapshot do cálculo no momento do save,
-- mesmo padrão dos outros simuladores.

create table public.previdencia_simulacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  client_name text not null,
  monthly_contribution numeric(12, 2) not null default 0,
  existing_balance numeric(12, 2) not null default 0,
  years_to_retirement numeric(5, 2) not null default 10,
  annual_return_rate numeric(5, 2) not null default 6,
  annual_taxable_income numeric(12, 2) not null default 0,
  files_complete_declaration boolean not null default true,
  plan_type text not null default 'pgbl' check (plan_type in ('pgbl', 'vgbl')),
  tax_regime text not null default 'regressivo' check (tax_regime in ('regressivo', 'progressivo')),
  notes text,
  result jsonb not null,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index previdencia_simulacoes_tenant_id_idx on public.previdencia_simulacoes (tenant_id);
create index previdencia_simulacoes_client_id_idx on public.previdencia_simulacoes (client_id);
create index previdencia_simulacoes_assigned_to_idx on public.previdencia_simulacoes (assigned_to);

create trigger previdencia_simulacoes_set_updated_at
  before update on public.previdencia_simulacoes
  for each row execute function public.set_updated_at();

alter table public.previdencia_simulacoes enable row level security;

-- Mesmo padrão dos outros simuladores: owner vê/edita tudo da tenant; member
-- só vê/edita o que está atribuído a ele. Exclusão só owner.
create policy "previdencia_simulacoes_select_own_tenant" on public.previdencia_simulacoes
  for select using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "previdencia_simulacoes_insert_own_tenant" on public.previdencia_simulacoes
  for insert with check (tenant_id = public.auth_tenant_id());

create policy "previdencia_simulacoes_update_own_tenant" on public.previdencia_simulacoes
  for update using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "previdencia_simulacoes_delete_owner_only" on public.previdencia_simulacoes
  for delete using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );
