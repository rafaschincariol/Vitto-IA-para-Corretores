-- Extensions
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector, usado a partir da fase 3 (RAG)

-- Tenants (uma linha por corretora)
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Perfis: liga auth.users a um tenant. Um usuário pertence a exatamente um tenant.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  full_name text,
  email text not null,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create index profiles_tenant_id_idx on public.profiles (tenant_id);

-- Ao criar um usuário (signup por e-mail/senha, Google ou LinkedIn), cria
-- automaticamente um tenant novo ("corretora") e o profile correspondente,
-- para que o usuário já saia do signup pronto para usar o app.
--
-- SECURITY DEFINER: o insert em auth.users é feito pelo serviço interno do
-- Supabase Auth, não pelo usuário final autenticado — a função roda com o
-- privilégio do owner (bypassa RLS) para poder criar as linhas de setup.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
  tenant_name text;
begin
  tenant_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'tenant_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '') || ' - Corretora',
    'Minha Corretora'
  );

  insert into public.tenants (name) values (tenant_name)
  returning id into new_tenant_id;

  insert into public.profiles (id, tenant_id, full_name, email)
  values (
    new.id,
    new_tenant_id,
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger genérico para manter updated_at em dia (usado por policies na fase 2)
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
