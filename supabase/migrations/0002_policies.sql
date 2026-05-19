-- RenderEstate 3D - Row Level Security policies

-- =============================================
-- Habilitar RLS
-- =============================================
alter table public.profiles         enable row level security;
alter table public.spaces           enable row level security;
alter table public.space_tags       enable row level security;
alter table public.space_assets     enable row level security;
alter table public.processing_jobs  enable row level security;

-- =============================================
-- profiles
-- =============================================
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =============================================
-- spaces
-- =============================================
drop policy if exists "spaces: owner full access" on public.spaces;
create policy "spaces: owner full access"
  on public.spaces for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Leitura pública: qualquer um pode ver spaces com is_public=true e status=completed
drop policy if exists "spaces: public read when published" on public.spaces;
create policy "spaces: public read when published"
  on public.spaces for select
  to anon, authenticated
  using (is_public = true and status = 'completed');

-- =============================================
-- space_tags
-- =============================================
drop policy if exists "space_tags: owner full access" on public.space_tags;
create policy "space_tags: owner full access"
  on public.space_tags for all
  using (
    exists (
      select 1 from public.spaces s
      where s.id = space_tags.space_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.spaces s
      where s.id = space_tags.space_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "space_tags: public read when space published" on public.space_tags;
create policy "space_tags: public read when space published"
  on public.space_tags for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.spaces s
      where s.id = space_tags.space_id
        and s.is_public = true
        and s.status = 'completed'
    )
  );

-- =============================================
-- space_assets
-- =============================================
drop policy if exists "space_assets: owner full access" on public.space_assets;
create policy "space_assets: owner full access"
  on public.space_assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Apenas thumbnails e modelos do space publicado podem ser lidos publicamente
drop policy if exists "space_assets: public read model/thumb when published" on public.space_assets;
create policy "space_assets: public read model/thumb when published"
  on public.space_assets for select
  to anon, authenticated
  using (
    type in ('model','thumbnail')
    and exists (
      select 1 from public.spaces s
      where s.id = space_assets.space_id
        and s.is_public = true
        and s.status = 'completed'
    )
  );

-- =============================================
-- processing_jobs
-- =============================================
drop policy if exists "processing_jobs: owner full access" on public.processing_jobs;
create policy "processing_jobs: owner full access"
  on public.processing_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
