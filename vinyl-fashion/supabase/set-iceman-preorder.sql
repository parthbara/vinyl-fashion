-- SUPERSEDED (Aug 2026): Iceman is on regular sale now. Run
-- open-regular-orders.sql instead. Kept so the next drop can be put
-- back on reservations by re-running this file.
--
-- Put the Iceman capsule on pre-order.
--
-- The storefront already reads this correctly without running anything:
-- src/data/albums.js carries `effects.preorder` for iceman as the seed
-- default, and db.js merges the DB row's effects OVER the seed, so a
-- missing `preorder` key in the DB leaves the seed's value standing.
--
-- Run this anyway so the Album Studio agrees with the storefront. The
-- Studio reads the DB row only, so until this lands the PRE-ORDER
-- dropdown there will read "no" while the shop shows the badge.
--
-- Reversible: set 'preorder' to false, or drop the keys, at any time.

update albums
set effects = coalesce(effects, '{}'::jsonb) || jsonb_build_object(
  'preorder',     true,
  'preorderText', 'PRE-ORDER',
  'preorderNote', 'SHIPS IN 2-3 WEEKS'
)
where id = 'iceman';

-- Everything else stays on the Coming-Soon wall. This is a no-op today
-- (all 88 non-iceman capsules are already comingSoon) and is here as an
-- explicit guard: a capsule can never be locked AND taking pre-orders,
-- so make sure nothing else carries a stray preorder flag.
update albums
set effects = coalesce(effects, '{}'::jsonb) || jsonb_build_object('preorder', false)
where id <> 'iceman'
  and coalesce((effects ->> 'preorder')::boolean, false) is true;

-- Check
select id,
       status,
       effects ->> 'comingSoon'   as coming_soon,
       effects ->> 'preorder'     as preorder,
       effects ->> 'preorderNote' as ship_window
from albums
where coalesce((effects ->> 'preorder')::boolean, false)
   or id = 'iceman';
