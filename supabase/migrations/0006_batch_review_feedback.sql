-- Upload em lote com auto-catalogação: quando a IA processa uma apólice em
-- lote, cria o cliente e a apólice direto (zero digitação), mas marca
-- reviewed = false até o corretor confirmar (ver /documents/review). Isso
-- também alimenta o feedback loop: cada correção feita na revisão é
-- registrada em ai_extraction_feedback para calibrar prompts no futuro.

alter table public.clients
  add column ai_created boolean not null default false,
  add column reviewed boolean not null default true;

alter table public.policies
  add column ai_created boolean not null default false,
  add column reviewed boolean not null default true;

create index clients_reviewed_idx on public.clients (tenant_id, reviewed) where reviewed = false;
create index policies_reviewed_idx on public.policies (tenant_id, reviewed) where reviewed = false;

create table public.ai_extraction_feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  policy_id uuid references public.policies (id) on delete set null,
  field_name text not null,
  ai_value text,
  corrected_value text,
  corrected_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ai_extraction_feedback_tenant_id_idx on public.ai_extraction_feedback (tenant_id);

alter table public.ai_extraction_feedback enable row level security;

create policy "ai_extraction_feedback_all_own_tenant" on public.ai_extraction_feedback
  for all
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());
