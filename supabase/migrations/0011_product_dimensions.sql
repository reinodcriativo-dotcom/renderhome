-- RenderAR — categoria + tamanho fisico do produto e do marker
-- Adiciona dimensoes reais para que o viewer AR renderize o modelo em
-- tamanho proporcional ao QR fisico.

alter table public.products
  add column if not exists category text not null default 'custom';

-- Restringe a categoria a valores conhecidos (presets) + 'custom'.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_category_check'
  ) then
    alter table public.products
      add constraint products_category_check
      check (category in ('tenis','camiseta','bone','relogio','custom'));
  end if;
end$$;

alter table public.products
  add column if not exists size_label text;

-- Dimensoes em centimetros (numeric para suportar decimais ex.: 26.5).
alter table public.products
  add column if not exists dim_length_cm numeric;

alter table public.products
  add column if not exists dim_width_cm numeric;

alter table public.products
  add column if not exists dim_height_cm numeric;

-- Largura fisica do QR impresso, em cm. Default 10cm = um QR razoavelmente
-- grande, facil de imprimir em folha A4 e detectar a partir de 50cm-2m.
alter table public.products
  add column if not exists marker_width_cm numeric not null default 10;

create index if not exists products_category_idx on public.products(category);
