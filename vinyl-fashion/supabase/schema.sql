-- ═════════════════════════════════════════════════════════════════
--  VINYL FASHION — database schema
--  Run this once in the Supabase SQL editor (see SETUP.md). Safe to
--  re-run: everything is create-if-not-exists / or-replace.
--
--  Security model:
--   • anon (storefront) may READ live albums + visible products, and
--     may only WRITE through two RPCs: place_order() and track_order().
--   • authenticated users whose email is in admin_users get full CRUD
--     (enforced by RLS via is_admin()).
--   • the orders/customers tables are never exposed to anon directly.
-- ═════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── updated_at helper ────────────────────────────────────────────
create or replace function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── albums (Album Studio source of truth; albums.js is the seed) ──
create table if not exists albums (
  id            text primary key,          -- slug, e.g. 'mbdtf'
  collection_id bigint,                     -- iTunes collectionId
  artist        text not null,
  title         text not null,
  display_title text,                       -- may contain \n line breaks
  year          int,
  label         text,
  capsule_no    text,
  featured      text,                       -- featured track name
  story         text,
  artwork       text,
  palette       jsonb not null default '{}'::jsonb,   -- bg0,bg1,ink,accent,accent2,glow,paper
  fonts         jsonb not null default '{}'::jsonb,    -- display,body,displayCase,displayTracking,displayWeight
  ticker        jsonb not null default '[]'::jsonb,
  notes         jsonb not null default '[]'::jsonb,    -- [{after,kicker,text}]
  clip          jsonb not null default '{}'::jsonb,    -- {start,duration}s — song portion to play (IG-story trimmer)
  effects       jsonb not null default '{}'::jsonb,    -- dust/glow/grain knobs (future)
  status        text not null default 'live',          -- draft | scheduled | live
  drop_at       timestamptz,
  sort          int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── products (the clothes) ───────────────────────────────────────
-- album_id is a soft reference (text slug) so products don't require
-- an album row while albums still live in albums.js.
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  album_id     text,
  title        text not null,
  garment_type text,                         -- tee/hoodie/jacket/... (GarmentSvg fallback)
  category     text,
  price        numeric(10,2) not null default 0,
  sale_price   numeric(10,2),
  stock        int not null default 0,
  description  text,
  ai_info      text,                          -- hidden extra context for the AI assistant
  images       jsonb not null default '[]'::jsonb,   -- storage paths or URLs; [0] = cover
  caption      text,
  featured     boolean not null default false,
  sort         int not null default 0,
  status       text not null default 'active',        -- active | hidden | soldout
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_album_idx on products (album_id);

-- ── product variants (per-colour/size stock) ─────────────────────
create table if not exists product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color      text,
  size       text,
  stock      int not null default 0,
  sku        text
);
create index if not exists variants_product_idx on product_variants (product_id);

-- ── customers ────────────────────────────────────────────────────
create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  phone      text unique,                     -- primary identity (COD / WhatsApp)
  email      text,
  created_at timestamptz not null default now()
);

-- ── orders ───────────────────────────────────────────────────────
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,      -- short human tracking code, e.g. VF-3F9A2
  customer_id      uuid references customers(id) on delete set null,
  customer_name    text,
  customer_phone   text,
  customer_address text,
  status           text not null default 'pending',  -- pending|confirmed|shipped|completed|cancelled
  total            numeric(10,2) not null default 0,
  note             text,
  channel          text default 'whatsapp',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_status_idx on orders (status);

-- ── order items (price snapshot at purchase) ─────────────────────
create table if not exists order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  title      text not null,
  album_id   text,
  color      text,
  size       text,
  unit_price numeric(10,2) not null,
  qty        int not null default 1
);
create index if not exists order_items_order_idx on order_items (order_id);

-- ── order events (admin status timeline) ─────────────────────────
create table if not exists order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  status     text not null,
  note       text,
  created_at timestamptz not null default now()
);

-- ── admin allowlist ──────────────────────────────────────────────
create table if not exists admin_users (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- ── site settings (brand, resting theme, toggles) ────────────────
create table if not exists site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── updated_at triggers ──────────────────────────────────────────
drop trigger if exists trg_albums_updated on albums;
create trigger trg_albums_updated before update on albums
  for each row execute function set_updated_at();
drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();

-- ═════════════════════════════════════════════════════════════════
--  Auth helper + Row Level Security
-- ═════════════════════════════════════════════════════════════════

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_users where email = (auth.jwt() ->> 'email')
  );
$$;

alter table albums            enable row level security;
alter table products          enable row level security;
alter table product_variants  enable row level security;
alter table customers         enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table order_events      enable row level security;
alter table admin_users       enable row level security;
alter table site_settings     enable row level security;

-- public reads
drop policy if exists albums_read on albums;
create policy albums_read on albums for select
  using (status in ('live', 'scheduled'));

drop policy if exists products_read on products;
create policy products_read on products for select
  using (status <> 'hidden');

drop policy if exists variants_read on product_variants;
create policy variants_read on product_variants for select using (true);

drop policy if exists settings_read on site_settings;
create policy settings_read on site_settings for select using (true);

-- admin full control (every table)
drop policy if exists albums_admin on albums;
create policy albums_admin on albums for all using (is_admin()) with check (is_admin());
drop policy if exists products_admin on products;
create policy products_admin on products for all using (is_admin()) with check (is_admin());
drop policy if exists variants_admin on product_variants;
create policy variants_admin on product_variants for all using (is_admin()) with check (is_admin());
drop policy if exists customers_admin on customers;
create policy customers_admin on customers for all using (is_admin()) with check (is_admin());
drop policy if exists orders_admin on orders;
create policy orders_admin on orders for all using (is_admin()) with check (is_admin());
drop policy if exists order_items_admin on order_items;
create policy order_items_admin on order_items for all using (is_admin()) with check (is_admin());
drop policy if exists order_events_admin on order_events;
create policy order_events_admin on order_events for all using (is_admin()) with check (is_admin());
drop policy if exists admin_users_admin on admin_users;
create policy admin_users_admin on admin_users for all using (is_admin()) with check (is_admin());
drop policy if exists settings_admin on site_settings;
create policy settings_admin on site_settings for all using (is_admin()) with check (is_admin());

-- ═════════════════════════════════════════════════════════════════
--  Storefront write RPCs (SECURITY DEFINER — bypass RLS safely)
-- ═════════════════════════════════════════════════════════════════

-- Place an order. p_items = [{product_id, variant_id?, qty, color?, size?}].
-- Prices are looked up server-side so the client can't set them.
create or replace function place_order(
  p_name text, p_phone text, p_address text, p_note text, p_items jsonb
) returns text
  language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_order    uuid;
  v_code     text;
  v_total    numeric := 0;
  it         jsonb;
  v_product  products;
  v_price    numeric;
  v_qty      int;
begin
  if p_phone is null or length(trim(p_phone)) < 5 then
    raise exception 'A valid phone number is required.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your order is empty.';
  end if;

  insert into customers (name, phone)
    values (nullif(trim(p_name), ''), trim(p_phone))
    on conflict (phone) do update
      set name = coalesce(excluded.name, customers.name)
    returning id into v_customer;

  v_code := 'VF-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 5));

  insert into orders (code, customer_id, customer_name, customer_phone, customer_address, note, status, total)
    values (v_code, v_customer, nullif(trim(p_name), ''), trim(p_phone),
            nullif(trim(p_address), ''), nullif(trim(p_note), ''), 'pending', 0)
    returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = (it ->> 'product_id')::uuid;
    if v_product.id is null then continue; end if;
    v_price := coalesce(v_product.sale_price, v_product.price);
    v_qty   := greatest(1, coalesce((it ->> 'qty')::int, 1));
    insert into order_items (order_id, product_id, variant_id, title, album_id, color, size, unit_price, qty)
      values (v_order, v_product.id, nullif(it ->> 'variant_id', '')::uuid,
              v_product.title, v_product.album_id,
              nullif(it ->> 'color', ''), nullif(it ->> 'size', ''), v_price, v_qty);
    v_total := v_total + v_price * v_qty;
  end loop;

  update orders set total = v_total where id = v_order;
  insert into order_events (order_id, status, note) values (v_order, 'pending', 'Order placed');
  return v_code;
end $$;

-- Track an order — returns its status + items only when the code and
-- phone both match, so the orders table stays private.
create or replace function track_order(p_code text, p_phone text)
returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_order  orders;
  v_items  jsonb;
  v_events jsonb;
begin
  select * into v_order from orders where code = upper(trim(p_code));
  if v_order.id is null then return null; end if;
  if replace(coalesce(v_order.customer_phone, ''), ' ', '') <> replace(trim(p_phone), ' ', '') then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'title', title, 'qty', qty, 'unit_price', unit_price,
           'color', color, 'size', size, 'album_id', album_id) order by title), '[]'::jsonb)
    into v_items from order_items where order_id = v_order.id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'status', status, 'note', note, 'at', created_at) order by created_at), '[]'::jsonb)
    into v_events from order_events where order_id = v_order.id;

  return jsonb_build_object(
    'code', v_order.code, 'status', v_order.status, 'total', v_order.total,
    'name', v_order.customer_name, 'created_at', v_order.created_at,
    'items', v_items, 'events', v_events
  );
end $$;

-- ═════════════════════════════════════════════════════════════════
--  Grants  (RLS still governs row visibility)
-- ═════════════════════════════════════════════════════════════════
grant usage on schema public to anon, authenticated;
grant select on albums, products, product_variants, site_settings to anon, authenticated;
grant select, insert, update, delete on
  albums, products, product_variants, customers, orders, order_items, order_events, admin_users, site_settings
  to authenticated;
grant execute on function place_order(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function track_order(text, text) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════
--  Storage buckets  (public read, admin write)
-- ═════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('album-art', 'album-art', true)
  on conflict (id) do nothing;

drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects for select
  using (bucket_id in ('product-images', 'album-art'));

drop policy if exists storage_admin_write on storage.objects;
create policy storage_admin_write on storage.objects for insert
  with check (bucket_id in ('product-images', 'album-art') and is_admin());

drop policy if exists storage_admin_update on storage.objects;
create policy storage_admin_update on storage.objects for update
  using (bucket_id in ('product-images', 'album-art') and is_admin());

drop policy if exists storage_admin_delete on storage.objects;
create policy storage_admin_delete on storage.objects for delete
  using (bucket_id in ('product-images', 'album-art') and is_admin());
