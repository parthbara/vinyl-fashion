-- Per-variant pricing: let one colour × design × size line cost
-- something different from the rest of the product.
--
-- Nullable on purpose. NULL means "no override — use the product's
-- own price", which is how every existing row behaves, so nothing
-- changes until you actually type a price into the grid.
--
-- Safe to run twice.

alter table product_variants
  add column if not exists price numeric(10,2);

comment on column product_variants.price is
  'Per-variant price override in NPR. NULL = inherit products.sale_price/price.';

-- Check — every existing line should come back with price = null.
select count(*) as variant_lines,
       count(price) as lines_with_own_price
from product_variants;
