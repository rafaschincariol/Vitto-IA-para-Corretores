-- Motor de IA / RAG com base dupla:
--   - document_chunks: base PRIVADA, isolada por tenant (conteúdo das
--     apólices e documentos do próprio corretor).
--   - global_chunks: base GLOBAL, compartilhada entre todos os tenants
--     (condições gerais / manuais de seguradoras). Leitura liberada para
--     qualquer usuário autenticado; escrita restrita a quem está em
--     platform_admins (gerido fora do app, não pelo tenant).
-- pgvector já foi habilitado em 0001_init.sql.

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1024),
  created_at timestamptz not null default now()
);

create index document_chunks_tenant_id_idx on public.document_chunks (tenant_id);
create index document_chunks_document_id_idx on public.document_chunks (document_id);
create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.document_chunks enable row level security;

create policy "document_chunks_all_own_tenant" on public.document_chunks
  for all
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

-- Quem pode escrever na base global. Gerido manualmente via SQL Editor por
-- enquanto (não há painel de super-admin nesta fase).
create table public.platform_admins (
  email text primary key
);

alter table public.platform_admins enable row level security;
-- Sem policy de insert/update/delete para usuários comuns: só o papel
-- postgres (SQL Editor / migrations) altera esta tabela. A única policy é de
-- leitura do PRÓPRIO e-mail — usada só para a UI decidir se mostra o painel
-- de base global (a escrita em global_chunks abaixo é o que realmente vale
-- como controle de acesso).
create policy "platform_admins_select_self" on public.platform_admins
  for select using (email = auth.jwt() ->> 'email');

create table public.global_chunks (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  chunk_index int not null,
  content text not null,
  embedding vector(1024),
  created_by text,
  created_at timestamptz not null default now()
);

create index global_chunks_embedding_idx on public.global_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.global_chunks enable row level security;

create policy "global_chunks_select_authenticated" on public.global_chunks
  for select using (auth.role() = 'authenticated');

create policy "global_chunks_write_platform_admins" on public.global_chunks
  for all
  using (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'));

-- Função de busca por similaridade (usada pelas duas bases via parâmetro).
create or replace function public.match_document_chunks(
  query_embedding vector(1024),
  match_tenant_id uuid,
  match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select id, document_id, content, 1 - (embedding <=> query_embedding) as similarity
  from public.document_chunks
  where tenant_id = match_tenant_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_document_chunks from public;
grant execute on function public.match_document_chunks to authenticated;

create or replace function public.match_global_chunks(
  query_embedding vector(1024),
  match_count int default 6
)
returns table (
  id uuid,
  source_name text,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select id, source_name, content, 1 - (embedding <=> query_embedding) as similarity
  from public.global_chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_global_chunks from public;
grant execute on function public.match_global_chunks to authenticated;
