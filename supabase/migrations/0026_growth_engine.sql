-- Motor de aquisição de assinantes ("growth engine"): leads de corretores
-- que ainda não são clientes do Vitto, importados de listas próprias
-- (nunca raspados da SUSEP — a SUSEP só serve pra confirmar registro ativo,
-- ver susep_status), qualificados e rascunhados por IA, sempre aprovados
-- por um humano antes de enviar. Dado da PLATAFORMA, não de uma tenant —
-- por isso sem tenant_id e com RLS restrita a platform_admins, mesmo
-- padrão de global_chunks_write_platform_admins (0007_rag.sql).

create table public.growth_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  contact_name text not null,
  email text not null,
  phone text,
  cnpj_cpf text,
  city text,
  state text,
  source text not null default 'csv_import' check (source in ('csv_import', 'manual')),
  susep_status text not null default 'unchecked' check (susep_status in ('active', 'inactive', 'not_found', 'unchecked')),
  susep_checked_at timestamptz,
  stage text not null default 'novo' check (stage in ('novo', 'qualificado', 'descartado', 'convertido')),
  qualification_score int check (qualification_score between 0 and 100),
  qualification_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraint única direta na coluna (não expressão em lower(email)) porque o
-- upsert do PostgREST precisa de on_conflict casando com colunas reais; todo
-- ponto de entrada (import CSV, form de edição) já normaliza pra minúsculo
-- antes de gravar.
alter table public.growth_leads add constraint growth_leads_email_key unique (email);
create index growth_leads_stage_idx on public.growth_leads (stage);

create trigger growth_leads_set_updated_at
  before update on public.growth_leads
  for each row execute function public.set_updated_at();

create table public.growth_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.growth_leads (id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected', 'sent')),
  -- E-mail do admin de plataforma que revisou (não uuid de profiles: quem
  -- acessa /admin está em platform_admins, não em profiles — ver
  -- handle_new_user() em 0010_platform_admin.sql).
  reviewed_by text,
  reviewed_at timestamptz,
  sent_at timestamptz,
  resend_message_id text,
  created_at timestamptz not null default now()
);

create index growth_outreach_drafts_lead_idx on public.growth_outreach_drafts (lead_id);
create index growth_outreach_drafts_status_idx on public.growth_outreach_drafts (status);

-- Log append-only de eventos do Resend (delivered/opened/clicked/bounced/
-- complained/replied) — mesmo espírito de prospect_stage_history (0019).
create table public.growth_outreach_events (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.growth_outreach_drafts (id) on delete cascade,
  event_type text not null check (event_type in ('delivered', 'opened', 'clicked', 'bounced', 'complained', 'replied')),
  metadata jsonb,
  occurred_at timestamptz not null default now()
);

create index growth_outreach_events_draft_idx on public.growth_outreach_events (draft_id);

-- Supressão permanente (bounce, complaint ou opt-out manual) — checada antes
-- de todo envio. Nunca removida via UI comum, só manualmente no banco.
create table public.growth_suppressions (
  email text primary key,
  reason text not null check (reason in ('bounced', 'complained', 'unsubscribed', 'manual')),
  created_at timestamptz not null default now()
);

alter table public.growth_leads enable row level security;
alter table public.growth_outreach_drafts enable row level security;
alter table public.growth_outreach_events enable row level security;
alter table public.growth_suppressions enable row level security;

create policy "growth_leads_platform_admins" on public.growth_leads
  for all
  using (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'));

create policy "growth_outreach_drafts_platform_admins" on public.growth_outreach_drafts
  for all
  using (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'));

create policy "growth_outreach_events_platform_admins" on public.growth_outreach_events
  for all
  using (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'));

create policy "growth_suppressions_platform_admins" on public.growth_suppressions
  for all
  using (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'));
