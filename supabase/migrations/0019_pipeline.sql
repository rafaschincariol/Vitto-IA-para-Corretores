-- Funil de vendas: etapas editáveis por tenant + prospects (leads antes de
-- virarem cliente) + histórico de mudança de etapa (base para analytics de
-- conversão). Primeira tabela lookup por-tenant do schema — status de
-- policies/documents é texto fixo com check, mas aqui o corretor precisa
-- poder criar/renomear/reordenar as etapas.

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  position int not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);

create index pipeline_stages_tenant_id_idx on public.pipeline_stages (tenant_id);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages (id) on delete restrict,
  client_id uuid references public.clients (id) on delete set null,
  name text not null,
  cpf_cnpj text,
  email text,
  phone text,
  estimated_value numeric(12, 2),
  insurance_type text,
  notes text,
  lost_reason text,
  position int not null default 0,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  stage_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospects_tenant_id_idx on public.prospects (tenant_id);
create index prospects_stage_id_idx on public.prospects (tenant_id, stage_id);
create index prospects_assigned_to_idx on public.prospects (assigned_to);

create trigger prospects_set_updated_at
  before update on public.prospects
  for each row execute function public.set_updated_at();

-- Histórico de troca de etapa — base pra "índices de conversão" (quantos
-- prospects distintos chegaram em cada etapa) e "tempo até fechar". Guarda o
-- nome da etapa em texto (from_stage_name/to_stage_name) além da FK, pra
-- sobreviver a renomeação/exclusão de etapa sem quebrar o histórico — mesma
-- lógica de snapshot que activity_log já usa em metadata.
create table public.prospect_stage_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  from_stage_id uuid references public.pipeline_stages (id) on delete set null,
  from_stage_name text,
  to_stage_id uuid references public.pipeline_stages (id) on delete set null,
  to_stage_name text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index prospect_stage_history_tenant_idx on public.prospect_stage_history (tenant_id, prospect_id);
create index prospect_stage_history_changed_idx on public.prospect_stage_history (tenant_id, changed_at);

-- RLS

alter table public.pipeline_stages enable row level security;

-- Etapas: qualquer corretor da tenant (owner ou member) pode ver/criar/
-- editar/excluir — é configuração do funil, não dado sensível de cliente.
create policy "pipeline_stages_all_own_tenant" on public.pipeline_stages
  for all
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

alter table public.prospects enable row level security;

-- Mesmo padrão de clients (0005): owner vê/edita tudo da tenant; member só
-- vê/edita os prospects atribuídos a ele. Exclusão só pelo owner.
create policy "prospects_select_own_tenant" on public.prospects
  for select using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "prospects_insert_own_tenant" on public.prospects
  for insert with check (tenant_id = public.auth_tenant_id());

create policy "prospects_update_own_tenant" on public.prospects
  for update using (
    tenant_id = public.auth_tenant_id()
    and (
      assigned_to = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    )
  );

create policy "prospects_delete_owner_only" on public.prospects
  for delete using (
    tenant_id = public.auth_tenant_id()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

alter table public.prospect_stage_history enable row level security;

-- Histórico é só leitura/gravação (log) — sem update/delete, mesmo padrão de
-- activity_log. Visível pra quem já enxerga o prospect correspondente.
create policy "prospect_stage_history_select_own_tenant" on public.prospect_stage_history
  for select using (
    tenant_id = public.auth_tenant_id()
    and exists (
      select 1 from public.prospects p
      where p.id = prospect_stage_history.prospect_id
        and (
          p.assigned_to = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
        )
    )
  );

create policy "prospect_stage_history_insert_own_tenant" on public.prospect_stage_history
  for insert with check (tenant_id = public.auth_tenant_id());
