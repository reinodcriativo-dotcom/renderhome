-- RenderEstate 3D - Schema inicial
-- Rode este arquivo no SQL Editor do Supabase Dashboard.

-- Extensões
create extension if not exists "pgcrypto";

-- =============================================
-- profiles
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- spaces
-- =============================================
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  address text,
  status text not null default 'draft'
    check (status in ('draft','uploading','queued','processing','completed','failed')),
  public_slug text unique,
  is_public boolean not null default true,
  thumbnail_url text,
  viewer_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spaces_user_id_idx on public.spaces(user_id);
create index if not exists spaces_public_slug_idx on public.spaces(public_slug);
create index if not exists spaces_status_idx on public.spaces(status);

-- =============================================
-- space_tags
-- =============================================
create table if not exists public.space_tags (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (space_id, tag)
);

create index if not exists space_tags_space_id_idx on public.space_tags(space_id);

-- =============================================
-- space_assets
-- =============================================
create table if not exists public.space_assets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('image','video','model','thumbnail','metadata')),
  file_url text not null,
  file_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists space_assets_space_id_idx on public.space_assets(space_id);
create index if not exists space_assets_user_id_idx on public.space_assets(user_id);

-- =============================================
-- processing_jobs
-- =============================================
create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued','processing','completed','failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  error_message text,
  input_assets jsonb,
  output_assets jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists processing_jobs_space_id_idx on public.processing_jobs(space_id);
create index if not exists processing_jobs_status_idx on public.processing_jobs(status);

-- =============================================
-- Trigger: manter updated_at
-- =============================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_spaces on public.spaces;
create trigger touch_spaces
  before update on public.spaces
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_processing_jobs on public.processing_jobs;
create trigger touch_processing_jobs
  before update on public.processing_jobs
  for each row execute function public.touch_updated_at();

-- =============================================
-- Trigger: criar profile automaticamente quando user é criado
-- =============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
