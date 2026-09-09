-- Fecha a policy de storage que permitia sobrescrever um documento já enviado
-- (o app nunca chama .update() no storage, só .upload()/.remove() — ver
-- document-dropzone.tsx e documents/actions.ts). Sem essa policy, upload de
-- documento vira efetivamente imutável: só criar e apagar continuam permitidos.
drop policy "documents_bucket_update_own_tenant" on storage.objects;

-- Rate limit de login por conta (defense-in-depth além do limite global do
-- projeto no Supabase Auth). Sem RLS policy para anon/authenticated -- acesso
-- só através das funções security definer abaixo (deny by default).
create table public.auth_login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  attempted_at timestamptz not null default now()
);

alter table public.auth_login_attempts enable row level security;

create index auth_login_attempts_email_idx on public.auth_login_attempts (email, attempted_at);

create function public.is_login_rate_limited(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select count(*) >= 5
  from public.auth_login_attempts
  where email = p_email
    and attempted_at > now() - interval '15 minutes';
$$;

create function public.record_failed_login(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.auth_login_attempts
  where email = p_email
    and attempted_at < now() - interval '1 hour';

  insert into public.auth_login_attempts (email) values (p_email);
end;
$$;

grant execute on function public.is_login_rate_limited(text) to anon, authenticated;
grant execute on function public.record_failed_login(text) to anon, authenticated;
