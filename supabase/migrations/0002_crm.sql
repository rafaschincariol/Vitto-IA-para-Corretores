-- Clientes
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  cpf_cnpj text,
  email text,
  phone text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index clients_tenant_id_idx on public.clients (tenant_id);
create index clients_name_idx on public.clients using gin (to_tsvector('portuguese', name));

-- Apólices
create table public.policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  insurer text not null,
  policy_number text not null,
  policy_type text,
  premium_total numeric(12, 2),
  start_date date not null,
  end_date date not null,
  status text not null default 'ativo' check (status in ('ativo', 'em_renovacao', 'cancelado', 'vencido')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index policies_tenant_id_idx on public.policies (tenant_id);
create index policies_client_id_idx on public.policies (client_id);
create index policies_end_date_idx on public.policies (end_date);
create index policies_status_idx on public.policies (status);

create trigger policies_set_updated_at
  before update on public.policies
  for each row execute function public.set_updated_at();

-- Documentos (upload manual nesta fase; status "pending_ai"/"extracted"/"error"
-- ficam reservados para a fase 2, quando o OCR por IA passa a preencher o campo)
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  policy_id uuid references public.policies (id) on delete set null,
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  file_size bigint,
  status text not null default 'manual' check (status in ('manual', 'pending_ai', 'extracted', 'error')),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index documents_tenant_id_idx on public.documents (tenant_id);
create index documents_client_id_idx on public.documents (client_id);
create index documents_policy_id_idx on public.documents (policy_id);
