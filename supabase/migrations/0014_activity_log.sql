-- Log de atividade pensado pro painel admin, não pra debug técnico: cada
-- linha já vem com uma frase em português pronta pra leitura, sem precisar
-- abrir Sentry/Vercel/Supabase. "sistema" é quando algo quebrou (API, IA,
-- Stripe); "usuario" é quando alguém teve dificuldade (cadastro que não
-- foi, senha errada, e por aí vai).

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  category text not null check (category in ('sistema', 'usuario')),
  event_type text not null,
  message text not null,
  level text not null default 'info' check (level in ('info', 'aviso', 'erro')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_created_at_idx on public.activity_log (created_at desc);
create index activity_log_tenant_id_idx on public.activity_log (tenant_id);

alter table public.activity_log enable row level security;

-- Só o admin da plataforma lê — este log pode conter e-mails/tentativas de
-- outras corretoras, não é algo que uma corretora deveria ver da outra
-- (nem da própria, esse painel não existe do lado dela).
create policy "activity_log_select_platform_admins" on public.activity_log
  for select using (exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email'));

-- Escrita só pela função abaixo (não é uma policy de insert aberta) —
-- quem chama passa por log_activity(), nunca grava direto na tabela.
create or replace function public.log_activity(
  p_tenant_id uuid,
  p_category text,
  p_event_type text,
  p_message text,
  p_level text default 'info',
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (tenant_id, category, event_type, message, level, metadata)
  values (p_tenant_id, p_category, p_event_type, p_message, p_level, p_metadata);
end;
$$;

-- Precisa incluir "anon" pois cadastro e login que falham acontecem ANTES
-- de existir sessão — quem tenta logar/cadastrar ainda não está
-- autenticado quando o próprio evento que queremos registrar acontece.
grant execute on function public.log_activity to authenticated, anon;

-- Lista os eventos mais recentes pro painel admin, já com o nome da
-- corretora resolvido (quando houver).
create or replace function public.admin_list_activity_log(p_limit int default 100)
returns table (
  id uuid,
  tenant_id uuid,
  tenant_name text,
  category text,
  event_type text,
  message text,
  level text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.platform_admins where email = auth.jwt() ->> 'email') then
    raise exception 'not authorized';
  end if;

  return query
  select l.id, l.tenant_id, t.name, l.category, l.event_type, l.message, l.level, l.metadata, l.created_at
  from public.activity_log l
  left join public.tenants t on t.id = l.tenant_id
  order by l.created_at desc
  limit p_limit;
end;
$$;

revoke execute on function public.admin_list_activity_log from public;
grant execute on function public.admin_list_activity_log to authenticated;
