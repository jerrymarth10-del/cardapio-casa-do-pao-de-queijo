-- Casa do Pão de Queijo — Cardápio v2
-- Execute em um projeto Supabase dedicado ao cardápio.
-- Depois crie o usuário administrador em Authentication e rode o bloco de bootstrap no fim deste arquivo.

create extension if not exists pgcrypto;

create table if not exists public.menu_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text not null,
  address text not null default '',
  whatsapp text not null default '',
  location_url text not null default '',
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  is_active boolean not null default true,
  hours jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null default '•',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  base_price numeric(10,2) not null default 0 check (base_price >= 0),
  image_url text not null default '',
  emoji text not null default '🥐',
  badge text not null default '',
  options jsonb not null default '[]'::jsonb,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_store_products (
  store_id uuid not null references public.menu_stores(id) on delete cascade,
  product_id uuid not null references public.menu_products(id) on delete cascade,
  available boolean not null default true,
  price_override numeric(10,2) null check (price_override is null or price_override >= 0),
  primary key (store_id, product_id)
);

create table if not exists public.menu_orders (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid() unique,
  order_number text not null unique,
  store_id uuid not null references public.menu_stores(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  fulfillment text not null check (fulfillment in ('pickup','delivery')),
  address jsonb not null default '{}'::jsonb,
  location_url text not null default '',
  payment_method text not null default '',
  notes text not null default '',
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total numeric(10,2) not null default 0 check (total >= 0),
  status text not null default 'new' check (status in ('new','accepted','preparing','ready','out_for_delivery','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.menu_orders(id) on delete cascade,
  product_id uuid null references public.menu_products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 99),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  options jsonb not null default '[]'::jsonb,
  line_total numeric(10,2) not null check (line_total >= 0)
);

create index if not exists menu_products_category_idx on public.menu_products(category_id);
create index if not exists menu_products_active_sort_idx on public.menu_products(is_active, sort_order);
create index if not exists menu_orders_store_created_idx on public.menu_orders(store_id, created_at desc);
create index if not exists menu_orders_status_created_idx on public.menu_orders(status, created_at desc);
create unique index if not exists menu_orders_public_token_idx on public.menu_orders(public_token);
create index if not exists menu_order_items_order_idx on public.menu_order_items(order_id);

create or replace function public.menu_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menu_stores_touch on public.menu_stores;
create trigger menu_stores_touch before update on public.menu_stores for each row execute function public.menu_touch_updated_at();
drop trigger if exists menu_categories_touch on public.menu_categories;
create trigger menu_categories_touch before update on public.menu_categories for each row execute function public.menu_touch_updated_at();
drop trigger if exists menu_products_touch on public.menu_products;
create trigger menu_products_touch before update on public.menu_products for each row execute function public.menu_touch_updated_at();
drop trigger if exists menu_orders_touch on public.menu_orders;
create trigger menu_orders_touch before update on public.menu_orders for each row execute function public.menu_touch_updated_at();

alter table public.menu_admins enable row level security;
alter table public.menu_stores enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_products enable row level security;
alter table public.menu_store_products enable row level security;
alter table public.menu_orders enable row level security;
alter table public.menu_order_items enable row level security;

drop policy if exists "menu_admin_read_self" on public.menu_admins;
create policy "menu_admin_read_self" on public.menu_admins for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "menu_stores_public_read" on public.menu_stores;
create policy "menu_stores_public_read" on public.menu_stores for select to anon, authenticated using (is_active = true);
drop policy if exists "menu_categories_public_read" on public.menu_categories;
create policy "menu_categories_public_read" on public.menu_categories for select to anon, authenticated using (is_active = true);
drop policy if exists "menu_products_public_read" on public.menu_products;
create policy "menu_products_public_read" on public.menu_products for select to anon, authenticated using (is_active = true);
drop policy if exists "menu_store_products_public_read" on public.menu_store_products;
create policy "menu_store_products_public_read" on public.menu_store_products for select to anon, authenticated using (true);

-- Pedidos não podem ser gravados diretamente pelo navegador.
-- A rota /api/orders usa a chave secreta somente no servidor da Vercel.
drop policy if exists "menu_orders_public_insert" on public.menu_orders;
drop policy if exists "menu_order_items_public_insert" on public.menu_order_items;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['menu_stores','menu_categories','menu_products','menu_store_products','menu_orders','menu_order_items']
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_all', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (exists (select 1 from public.menu_admins a where a.user_id = (select auth.uid()))) with check (exists (select 1 from public.menu_admins a where a.user_id = (select auth.uid())))',
      table_name || '_admin_all', table_name
    );
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select on public.menu_stores, public.menu_categories, public.menu_products, public.menu_store_products to anon, authenticated;
grant select on public.menu_admins to authenticated;
grant all on public.menu_stores, public.menu_categories, public.menu_products, public.menu_store_products, public.menu_orders, public.menu_order_items to authenticated;
revoke insert, update, delete on public.menu_orders, public.menu_order_items from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-products', 'menu-products', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "menu_product_images_public_read" on storage.objects;
create policy "menu_product_images_public_read" on storage.objects for select to anon, authenticated
using (bucket_id = 'menu-products');
drop policy if exists "menu_product_images_admin_insert" on storage.objects;
create policy "menu_product_images_admin_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'menu-products' and exists (select 1 from public.menu_admins a where a.user_id = (select auth.uid())));
drop policy if exists "menu_product_images_admin_update" on storage.objects;
create policy "menu_product_images_admin_update" on storage.objects for update to authenticated
using (bucket_id = 'menu-products' and exists (select 1 from public.menu_admins a where a.user_id = (select auth.uid())))
with check (bucket_id = 'menu-products' and exists (select 1 from public.menu_admins a where a.user_id = (select auth.uid())));
drop policy if exists "menu_product_images_admin_delete" on storage.objects;
create policy "menu_product_images_admin_delete" on storage.objects for delete to authenticated
using (bucket_id = 'menu-products' and exists (select 1 from public.menu_admins a where a.user_id = (select auth.uid())));

insert into public.menu_stores (id, slug, name, short_name, address, whatsapp, delivery_fee, sort_order)
values
  ('11111111-1111-4111-8111-111111111111', 'cidade-alta', 'Casa do Pão de Queijo — Cidade Alta', 'Cidade Alta', 'Cidade Alta — em frente à Farmácia Economize', '', 8.00, 1),
  ('22222222-2222-4222-8222-222222222222', 'norte-sul', 'Casa do Pão de Queijo — Norte-Sul', 'Norte-Sul', 'Av. Norte-Sul, 4390 — em frente à Laranjas Rolim', '5569993677137', 8.00, 2)
on conflict (id) do update set name = excluded.name, short_name = excluded.short_name, address = excluded.address, delivery_fee = excluded.delivery_fee;

insert into public.menu_categories (id, slug, name, icon, sort_order)
values
  ('c1111111-1111-4111-8111-111111111111', 'paes-de-queijo', 'Pães de queijo', '🧀', 1),
  ('c2222222-2222-4222-8222-222222222222', 'salgados', 'Salgados', '🥟', 2),
  ('c3333333-3333-4333-8333-333333333333', 'cafes', 'Cafés', '☕', 3),
  ('c4444444-4444-4444-8444-444444444444', 'bebidas', 'Bebidas', '🥤', 4)
on conflict (id) do update set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order;

insert into public.menu_products (id, category_id, name, description, base_price, emoji, badge, options, sort_order)
values
  ('a1111111-1111-4111-8111-111111111111','c1111111-1111-4111-8111-111111111111','Pão de queijo tradicional','Quentinho, macio por dentro e douradinho por fora.',1.25,'🧀','Mais vendido','[]'::jsonb,1),
  ('a2222222-2222-4222-8222-222222222222','c1111111-1111-4111-8111-111111111111','Pão de queijo recheado','Escolha seu recheio favorito.',3.00,'🤤','', '[{"name":"Recheio","required":true,"type":"single","values":[{"label":"Frango com catupiry","price_delta":0},{"label":"Calabresa","price_delta":0},{"label":"Catupiry puro","price_delta":0},{"label":"Chocolate","price_delta":0},{"label":"Doce de leite","price_delta":0},{"label":"Goiabada","price_delta":0}]}]'::jsonb,2),
  ('a3333333-3333-4333-8333-333333333333','c2222222-2222-4222-8222-222222222222','Salgado assado','Assado na hora, com massa leve e recheio caprichado.',10.00,'🥐','', '[{"name":"Sabor","required":true,"type":"single","values":[{"label":"Frango com catupiry","price_delta":0},{"label":"Carne","price_delta":0},{"label":"Queijo com presunto","price_delta":0},{"label":"Mini pizza","price_delta":0}]}]'::jsonb,1),
  ('a4444444-4444-4444-8444-444444444444','c2222222-2222-4222-8222-222222222222','Risoles fritos','Crocantes por fora e bem recheados.',7.00,'🥟','', '[{"name":"Sabor","required":true,"type":"single","values":[{"label":"Carne","price_delta":0},{"label":"Queijo e presunto","price_delta":0},{"label":"Frango","price_delta":0}]}]'::jsonb,2),
  ('a5555555-5555-4555-8555-555555555555','c3333333-3333-4333-8333-333333333333','Café','Café passado, servido quentinho.',3.00,'☕','','[]'::jsonb,1),
  ('a6666666-6666-4666-8666-666666666666','c3333333-3333-4333-8333-333333333333','Café com leite','Café com leite cremoso e equilibrado.',4.00,'🥛','','[]'::jsonb,2),
  ('a7777777-7777-4777-8777-777777777777','c4444444-4444-4444-8444-444444444444','Todinho','Achocolatado gelado.',3.50,'🧃','','[]'::jsonb,1),
  ('a8888888-8888-4888-8888-888888888888','c4444444-4444-4444-8444-444444444444','Refrigerante','Escolha a marca e o tamanho.',6.00,'🥤','', '[{"name":"Marca","required":true,"type":"single","values":[{"label":"Coca-Cola","price_delta":0},{"label":"Guaraná Antarctica","price_delta":0},{"label":"Fanta laranja","price_delta":0}]},{"name":"Tamanho","required":true,"type":"single","values":[{"label":"350 ml","price_delta":0},{"label":"600 ml","price_delta":2},{"label":"1 L","price_delta":6},{"label":"2 L","price_delta":9}]}]'::jsonb,2),
  ('a9999999-9999-4999-8999-999999999999','c4444444-4444-4444-8444-444444444444','Tampico','Geladinho. Escolha o tamanho.',6.00,'🍊','', '[{"name":"Tamanho","required":true,"type":"single","values":[{"label":"250 ml","price_delta":0},{"label":"450 ml","price_delta":2},{"label":"1 L","price_delta":4},{"label":"2 L","price_delta":9}]}]'::jsonb,3),
  ('abbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','c4444444-4444-4444-8444-444444444444','Gatorade','Sabores variados, sujeito à disponibilidade.',8.00,'⚡','','[]'::jsonb,4)
on conflict (id) do update set name = excluded.name, description = excluded.description, base_price = excluded.base_price, options = excluded.options, sort_order = excluded.sort_order;

insert into public.menu_store_products (store_id, product_id, available)
select s.id, p.id, true from public.menu_stores s cross join public.menu_products p
on conflict (store_id, product_id) do nothing;

-- BOOTSTRAP DO ADMINISTRADOR
-- 1) Crie o usuário em Authentication > Users (e-mail + senha).
-- 2) Troque SEU_EMAIL_AQUI pelo e-mail criado e execute SOMENTE as linhas abaixo:
-- insert into public.menu_admins (user_id)
-- select id from auth.users where email = 'SEU_EMAIL_AQUI'
-- on conflict (user_id) do nothing;
