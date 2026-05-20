-- RenderAR — pivot do produto (2026-05-19)
--
-- Drop das tabelas do RenderHome original (spaces, space_tags, space_assets,
-- processing_jobs) e criacao das tabelas do RenderAR (products, product_overlays).
-- A tabela profiles e mantida — auth e o mesmo.
--
-- Rode este arquivo INTEIRO no SQL Editor do Supabase. As migracoes 0001-0003
-- ja foram aplicadas; este arquivo as substitui logicamente.

-- =============================================
-- DROP do schema antigo
-- =============================================
drop table if exists public.processing_jobs cascade;
drop table if exists public.space_assets    cascade;
drop table if exists public.space_tags      cascade;
drop table if exists public.spaces          cascade;

-- =============================================
-- products
-- =============================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer,
  currency text not null default 'BRL',

  -- modelo 3D (.glb / .gltf)
  model_url text,
  model_path text,
  model_size_bytes bigint,

  -- imagem do marker (PNG do QR gerado)
  marker_url text,
  marker_path text,

  -- arquivo de tracking compilado pelo MindAR (.mind)
  mind_file_url text,
  mind_file_path text,

  -- URL publica para o experiencia AR
  public_slug text unique,
  is_public boolean not null default true,

  status text not null default 'draft'
    check (status in ('draft','ready','archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_user_id_idx     on public.products(user_id);
create index if not exists products_public_slug_idx on public.products(public_slug);
create index if not exists products_status_idx      on public.products(status);

-- =============================================
-- product_overlays
-- =============================================
-- Etiquetas/textos posicionados em volta do modelo 3D na cena AR.
-- type: 'text' (descricao livre), 'price' (formatado como moeda), 'badge'
-- (selo destacado tipo "NOVO" / "PROMO").
create table if not exists public.product_overlays (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('text','price','badge')),
  content text not null,

  position_x real not null default 0,
  position_y real not null default 0.5,
  position_z real not null default 0,
  rotation_y real not null default 0,
  scale real not null default 1,

  color text not null default '#ffffff',
  background_color text not null default 'rgba(0,0,0,0.7)',

  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_overlays_product_id_idx on public.product_overlays(product_id);

-- =============================================
-- Triggers (touch updated_at). Funcao touch_updated_at ja existe da migracao 0001.
-- =============================================
drop trigger if exists touch_products on public.products;
create trigger touch_products
  before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_product_overlays on public.product_overlays;
create trigger touch_product_overlays
  before update on public.product_overlays
  for each row execute function public.touch_updated_at();

-- =============================================
-- RLS
-- =============================================
alter table public.products         enable row level security;
alter table public.product_overlays enable row level security;

drop policy if exists "products: owner full access" on public.products;
create policy "products: owner full access"
  on public.products for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Leitura publica de produtos publicados (qualquer um pode escanear o QR)
drop policy if exists "products: public read when ready" on public.products;
create policy "products: public read when ready"
  on public.products for select
  to anon, authenticated
  using (is_public = true and status = 'ready');

drop policy if exists "product_overlays: owner full access" on public.product_overlays;
create policy "product_overlays: owner full access"
  on public.product_overlays for all
  using (
    exists (
      select 1 from public.products p
      where p.id = product_overlays.product_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_overlays.product_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "product_overlays: public read when product ready" on public.product_overlays;
create policy "product_overlays: public read when product ready"
  on public.product_overlays for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_overlays.product_id
        and p.is_public = true
        and p.status = 'ready'
    )
  );

-- =============================================
-- Storage policies (bucket 'spaces' continua sendo usado, agora para .glb / .png / .mind)
-- =============================================
-- As policies do bucket "spaces" definidas em 0003_storage.sql para owner
-- read/insert/update/delete via prefixo <user_id>/ continuam validas — basta
-- substituir a logica "public read quando space.is_public+completed" pela
-- equivalente para products.
drop policy if exists "spaces bucket: public read model/thumb when published" on storage.objects;

drop policy if exists "spaces bucket: public read product assets when ready" on storage.objects;
create policy "spaces bucket: public read product assets when ready"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'spaces'
    and exists (
      select 1
      from public.products p
      where p.user_id::text = (storage.foldername(name))[1]
        and p.id::text      = (storage.foldername(name))[2]
        and p.is_public = true
        and p.status = 'ready'
    )
  );
