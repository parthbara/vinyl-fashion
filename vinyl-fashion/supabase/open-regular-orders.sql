-- Take Iceman off pre-order and open both Iceman and Blonde for
-- regular ordering.
--
-- This reverses supabase/set-iceman-preorder.sql. Two separate things
-- have to be true for a capsule to be normally orderable:
--   * effects.preorder   is false/absent  → ORDER, not PRE-ORDER
--   * effects.comingSoon is false/absent  → the record opens at all
--
-- The storefront seed (src/data/albums.js) no longer carries a
-- preorder flag for iceman, but db.js merges the DB row's effects OVER
-- the seed — so a stale `preorder: true` in the DB would keep the
-- PRE-ORDER button standing on its own. Run this so the DB, the
-- storefront and the Album Studio all agree.
--
-- Reversible: re-run set-iceman-preorder.sql to take reservations again.

-- 1) Turn the pre-order OFF and unlock the Coming-Soon sticker.
--    Written as an explicit `false` rather than by dropping the keys:
--    db.js merges the DB row's effects over the seed, so a *missing*
--    key just lets the seed's old preorder:true show through. An
--    explicit false wins no matter which version of the code is
--    deployed — so this script fixes the live site on its own.
update albums
set effects = coalesce(effects, '{}'::jsonb)
              || jsonb_build_object('preorder', false, 'comingSoon', false)
where id in ('iceman', 'blonde');

-- 2) Both capsules must be 'live' to appear on the shelf at all
--    ('draft' is hidden from the store entirely).
update albums
set status = 'live'
where id in ('iceman', 'blonde')
  and status <> 'live';

-- 3) Guard: nothing else should be carrying a stray pre-order flag.
update albums
set effects = coalesce(effects, '{}'::jsonb) || jsonb_build_object('preorder', false)
where id not in ('iceman', 'blonde')
  and coalesce((effects ->> 'preorder')::boolean, false) is true;

-- Check — both rows should read live / coming_soon f / preorder null.
select id,
       status,
       effects ->> 'comingSoon' as coming_soon,
       effects ->> 'preorder'   as preorder
from albums
where id in ('iceman', 'blonde')
   or coalesce((effects ->> 'preorder')::boolean, false);

-- Check — a capsule only shows an ORDER button once it has active
-- stock. Blonde will be empty until the piece is added in the Studio.
select album_id, count(*) as active_products, sum(coalesce(stock, 0)) as units
from products
where album_id in ('iceman', 'blonde')
  and status <> 'hidden'
group by album_id;
