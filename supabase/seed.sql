-- ═════════════════════════════════════════════════════════════════
--  VINYL FASHION — seed data
--  Run AFTER schema.sql. Edit the admin email below to your own, then
--  create a matching user (SETUP.md step 5). Sample products let you
--  see the live catalogue immediately; delete them once you add real
--  stock from the admin.
-- ═════════════════════════════════════════════════════════════════

-- 1) Admin allowlist — the email you'll log in with.
insert into admin_users (email) values ('parth@vinylfashion.com')
  on conflict (email) do nothing;

-- 2) Storefront settings (optional; storefront still works without).
insert into site_settings (key, value) values
  ('brand', '{"name":"VINYL FASHION","tagline":"WEAR THE SOUND","est":"EST. MMXXVI"}'::jsonb)
  on conflict (key) do nothing;

-- 3) Sample products for the MBDTF capsule (no photos yet → the
--    garment silhouettes render, now with price + WhatsApp order).
insert into products (album_id, title, garment_type, category, price, sale_price, stock, description, caption, sort, status) values
  ('mbdtf', 'RUNAWAY VARSITY', 'jacket', 'Outerwear', 12000, null, 6,
   'Wool-body varsity with leather sleeves and chain-stitch crest.', 'Numbered like a pressing.', 1, 'active'),
  ('mbdtf', 'POWER TEE', 'tee', 'Tops', 3800, 2900, 20,
   'Heavyweight cotton tee, gold foil print.', 'Runs true to size.', 2, 'active'),
  ('mbdtf', 'MONSTER HOODIE', 'hoodie', 'Tops', 7800, null, 0,
   'Boxy loop-back hoodie, velvet-flock graphic.', null, 3, 'active')
on conflict do nothing;
