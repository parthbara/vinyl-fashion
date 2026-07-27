-- Restore the two deleted albums. Safe to re-run.
-- Only these two ids are touched; every other album row is left alone.
insert into albums
  (id, collection_id, artist, title, display_title, year, label, capsule_no,
   featured, story, artwork, palette, fonts, ticker, notes, clip, effects, status, sort)
values
  ('iceman', 6769649287, 'DRAKE', 'Iceman', 'ICEMAN', 2026, 'OVO SOUND / REPUBLIC', '005', 'Whisper My Name', 'Cut from a glacier. Diamond-cold blues, brushed silver and frost-white technical layers — dressed for the coldest room in the building.', 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/7f/39/61/7f396123-be56-bc11-eaab-976441808e58/26UMGIM63622.rgb.jpg/1200x1200bb.jpg', '{"bg0":"#040910","bg1":"#0b3a63","ink":"#eaf6ff","accent":"#57c9f4","accent2":"#8fb3cf","glow":"#7ee0ff","paper":"#081420"}'::jsonb, '{"display":"''Oswald'', ''Helvetica Neue'', sans-serif","body":"''Space Grotesk'', system-ui, sans-serif","displayCase":"uppercase","displayTracking":"0.06em","displayWeight":600}'::jsonb, '["MAKE THEM CRY","DUST","WHISPER MY NAME","RAN TO ATLANTA","WHAT DID I MISS?","MAKE THEM REMEMBER"]'::jsonb, '[{"after":1,"kicker":"LINER NOTES · 005","text":"Frost-white technical layers and diamond-cold blues, built for the coldest room in the building. Brushed silver hardware, sealed seams, zero warmth wasted."}]'::jsonb, '{}'::jsonb, '{"comingSoon":false}'::jsonb, 'live', 4),
  ('honestly-nevermind', 1630221591, 'DRAKE', 'Honestly, Nevermind', 'honestly,
nevermind', 2022, 'OVO SOUND / REPUBLIC', '004', 'Massive', 'For the club at 4AM and the beach at 7. Breathable whites, pool blues, movement first.', 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/6d/31/ab/6d31abaf-7a07-05f1-13ad-72ec520b6bfb/22UMGIM67374.rgb.jpg/1200x1200bb.jpg', '{"bg0":"#0b0718","bg1":"#5b2a86","ink":"#fdf2ff","accent":"#ff62c0","accent2":"#5fe0d6","glow":"#ff9a6b","paper":"#1a1030"}'::jsonb, '{"display":"''Great Vibes'', cursive","body":"''Space Grotesk'', system-ui, sans-serif","displayCase":"lowercase","displayTracking":"0.01em","displayWeight":400}'::jsonb, '["FALLING BACK","TEXTS GO GREEN","CURRENTS","MASSIVE","STICKY","JIMMY COOKS"]'::jsonb, '[{"after":1,"kicker":"LINER NOTES · 004","text":"Club-to-beach engineering: quick-dry mesh, chlorine-safe blues, seams that move at 124 BPM. For the floor at 4AM and the water at 7."}]'::jsonb, '{}'::jsonb, '{"comingSoon":true,"comingSoonText":"COMING SOON"}'::jsonb, 'live', 3)
on conflict (id) do update set
  artist = excluded.artist,
  title = excluded.title,
  display_title = excluded.display_title,
  year = excluded.year,
  label = excluded.label,
  capsule_no = excluded.capsule_no,
  featured = excluded.featured,
  story = excluded.story,
  artwork = excluded.artwork,
  palette = excluded.palette,
  fonts = excluded.fonts,
  ticker = excluded.ticker,
  notes = excluded.notes,
  clip = excluded.clip,
  effects = excluded.effects,
  status = excluded.status,
  sort = excluded.sort;

-- Verify: iceman should show 2 relinked products, honestly-nevermind 0.
select a.id, a.status, a.effects->>'comingSoon' as coming_soon,
       (select count(*) from products p where p.album_id = a.id) as products
from albums a
where a.id in ('iceman', 'honestly-nevermind');
