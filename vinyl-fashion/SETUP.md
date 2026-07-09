# Vinyl Fashion — Setup Guide

This is a Vite + React storefront that runs fully on its own. Connecting
**Supabase** turns on the live catalogue, orders, tracking, admin, and
(later) the Album Studio. Until then everything falls back to the local
seed in `src/data/albums.js` — the site never breaks if the DB is absent.

---

## 0. Run it locally (no backend needed)

```bash
npm install
npm run dev
```

Open the printed URL. You'll get the full experience on the four seed
albums with placeholder garments. Everything below is to enable commerce.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com> → **New project**. Pick a name, a strong
   database password, and the region closest to Nepal (e.g. Singapore).
2. Wait for it to finish provisioning (~2 min).

> **Free-tier note:** projects **pause after 7 days of no requests** and
> have **no backups**. Fine for building; before a real launch, either
> add an uptime ping to keep it awake or upgrade to Pro ($25/mo).

---

## 2. Create the schema

1. In the dashboard: **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql)
   and **Run**. This creates every table, the security rules, the order
   RPCs, and the storage buckets. It's safe to re-run.

---

## 3. Seed it

1. [`supabase/seed.sql`](supabase/seed.sql) is already set to the admin
   email `parth@vinylfashion.com` — edit it first if you ever change that.
2. Paste it into a new SQL Editor query and **Run**. This adds your admin
   email, some default settings, and a few sample MBDTF products.

---

## 4. Get your API keys → `.env`

1. **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. In the project root, copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...          # anon public key
VITE_WHATSAPP_NUMBER=9779818981912          # your order line
VITE_ADMIN_PATH=33rpm                        # hidden admin route
```

Leave `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` blank for now —
they're only used by server/edge functions in later phases. **Never**
put the service-role key in a `VITE_` variable; that would ship it to the
browser.

4. Restart `npm run dev`. The MBDTF capsule now shows the seeded products
   with prices and a WhatsApp **ORDER** button — the DB is live.

---

## 5. Create your admin login

The admin email in `admin_users` only grants access once a matching auth
user exists.

1. **Authentication → Users → Add user** → email `parth@vinylfashion.com`,
   set your password, and tick **Auto Confirm**.
2. That's it — row-level security recognises that email as an admin. (The
   hidden admin console UI lands in the admin phase, at
   `/33rpm`; there's also a fallback: five clicks on the footer
   "33⅓ RPM" badge.)

---

## 6. Product images

- Images live in the public **`product-images`** storage bucket (created
  by the schema). The admin uploader compresses photos client-side first
  (`src/lib/imageCompress.js`: WebP, max 1600px, quality 0.82).
- A product's `images` array holds bucket paths (or full URLs); `images[0]`
  is the cover. `src/lib/db.js` resolves them to public URLs automatically.

---

## 7. Deploy (Netlify)

1. Push to GitHub, then **Netlify → Add new site → Import**.
2. Build command `npm run build`, publish directory `dist`.
3. Add the same env vars from step 4 under **Site settings → Environment
   variables** (add `VITE_` ones; keep secrets for edge functions only).
4. SPA routing is already handled by `public/_redirects`.

---

## Later phases (already scaffolded for)

- **AI assistant → Gemini.** The assistant (`src/components/FloatingActions.jsx`)
  runs a local keyword helper today. To use Gemini, call it from a Supabase
  **edge function** using `GEMINI_API_KEY` (server-side only) and swap the
  `answer()` call for a fetch to that function.
- **Album Studio.** The `albums` table already stores palette, fonts,
  ticker, notes, and effects as JSON, plus `status`/`drop_at` for scheduled
  drops. `fetchAlbums()` in `db.js` merges DB rows over the local seed.

---

## Data model at a glance

| Table              | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `albums`           | Capsule theme + metadata (Studio source of truth)   |
| `products`         | Garments (price, stock, images, `album_id` slug)    |
| `product_variants` | Per colour/size stock                               |
| `customers`        | Buyers, keyed by phone                              |
| `orders`           | Orders with a short tracking `code` + status        |
| `order_items`      | Line items with price snapshot                      |
| `order_events`     | Status history timeline                             |
| `admin_users`      | Email allowlist for admin access                    |
| `site_settings`    | Brand / theme / toggles                             |

Storefront writes go only through `place_order()` and `track_order()`;
the client never touches `orders`/`customers` directly.
