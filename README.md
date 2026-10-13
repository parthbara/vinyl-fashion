# Vinyl Fashion

**A clothing brand storefront built like a record shop.** Each capsule is themed after an album. Pull a sleeve from the crate, the case opens, the record drops onto a turntable, the song starts, and the whole site takes on that album's palette and typography.

Self-founded label, built end to end: storefront, admin panel, database, ordering.

[![CI](https://github.com/parthbara/vinyl-fashion/actions/workflows/ci.yml/badge.svg)](https://github.com/parthbara/vinyl-fashion/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

<!-- LIVE DEMO: add the production URL here, e.g. **Live:** https://your-site.netlify.app -->

## What it does

**Storefront**
- Album capsules with per-album CSS-variable themes (palette, fonts, copy) and a GSAP-driven opening sequence: sleeve, case, record drop, needle.
- A CSS 3D vinyl, not WebGL, so it stays smooth on integrated graphics.
- All sound effects (crackle, needle drop, whoosh) are synthesized at runtime with the Web Audio API. No audio files in the repo.
- Flexible variants: colour × design × size combos, each with its own stock, photos and optional price.
- Pre-order mode per capsule, shareable capsule links, wall filters, mobile quick-view bottom sheet.
- Orders go out over WhatsApp with a pre-filled message, and customers can look up an order by code and phone.

**Admin panel** (hidden route, Supabase Auth, admin allow-list)
- Orders with status changes and an event log, customers, products and variants.
- Album studio: bulk album import, artist photos, an in-page colour wheel, per-colour photo cards, reorderable shelf.
- Site settings and announcement bar.

**Resilience**
- With no backend configured, the whole site runs on a local seed (`src/data/albums.js`). It never breaks if the database is absent.

## Architecture

```
src/
  components/   storefront UI (sleeve, turntable, vinyl disc, shop, album page)
  admin/        admin panel, lazy-loaded so shoppers never download it
  lib/          supabase client, data hooks, Web Audio SFX, palette + theme engine,
                iTunes/Deezer lookups, image compression, preloading
  data/         seed albums, curated catalogue, baked track data
  styles/       base / cinema / album / shop CSS
supabase/       schema.sql (tables, RLS policies, order RPCs, storage buckets) + seed + migrations
docs/SETUP.md  step-by-step Supabase and environment setup
```

Security model: row-level security is on for every table, order tracking goes through a `track_order` RPC (order code plus phone), and the schema ships a `place_order` RPC for server-side order creation (today the storefront hands orders off over WhatsApp). Only `VITE_*` variables reach the browser. The service-role key is never used client-side.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173, works with no backend (seed data)
npm run build      # production build to dist/
```

To turn on the live catalogue, orders and admin, follow [docs/SETUP.md](docs/SETUP.md) (create a Supabase project, run `supabase/schema.sql`, copy `.env.example` to `.env`).

## Make it yours

| What | Where |
|---|---|
| Brand name, tagline, contact | `src/config.js` |
| Album palettes, fonts, garment names, blurbs | `src/data/albums.js` |
| Order line (WhatsApp) | `VITE_WHATSAPP_NUMBER` in `.env` |
| Hidden admin route | `VITE_ADMIN_PATH` in `.env` |

## Deploy

Netlify: connect the repo and leave the build settings empty. `netlify.toml` provides the build command, SPA fallback, asset caching and security headers.

## Notes

- Album art and 30-second previews stream from the iTunes Search API (no key, cached for 7 days). Check licensing before a commercial launch.
- Supabase free-tier projects pause after a week of inactivity. See the setup guide for options.

## License

MIT, see [LICENSE](LICENSE).
