-- Simulador de Sucessão: guarda simulações de custo de inventário/ITCMD por
-- tenant, ligadas opcionalmente a um cliente já cadastrado. Os bens ficam num
-- campo jsonb dentro da própria simulação (não uma tabela separada) — eles
-- não têm vida própria fora de uma simulação, mesmo padrão já usado em
-- documents.extracted_data. "result" guarda um snapshot do cálculo no
-- momento do save, pra sobreviver a mudanças futuras nas alíquotas do ITCMD
-- sem divergir do PDF já entregue ao cliente.

create table public.sucessao_simulacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  client_name text not null,
  assets jsonb not null default '[]'::jsonb,
  marital_regime text not null default 'solteiro'
    check (marital_regime in ('solteiro', 'comunhao_parcial', 'comunhao_universal', 'separacao_total')),
  existing_protection numeric(12, 2) not null default 0,
  monthly_maintenance numeric(12, 2) not null default 0,
  custom_duration_months int not null default 36,
  scenario text not null default 'max' check (scenario in ('min', 'max')),
  notes text,
  result jsonb not null,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sucessao_simulacoes_tenant_id_idx on public.sucessao_simulacoes (tenant_id);
create index sucessao_simulacoes_client_id_idx on public.sucessao_simulacoes (client_id);
create index sucessao_simulacoes_assigned_to_idx on public.sucessao_simulacoes (assigned_to);

create trigger sucessao_simulacoes_set_updated_at
  before update on public.sucessao_simulacoes
  for each row execute function public.set_updated_at();

alter table public.sucessao_simulacoes enable row level security;

-- Mesmo padrão de clients/prospects (0005/0019): owner vê/edita tudo da
-- tenant; member só vê/edita o que está atribuído a ele. Exclusão só owner.
create policy "sucessao_simulacoes_select_own_tenant" on public.sucessao_simulacoes
  for select using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "sucessao_simulacoes_insert_own_tenant" on public.sucessao_simulacoes
  for insert with check (tenant_id = public.auth_tenant_id());

create policy "sucessao_simulacoes_update_own_tenant" on public.sucessao_simulacoes
  for update using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "sucessao_simulacoes_delete_owner_only" on public.sucessao_simulacoes
  for delete using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );
