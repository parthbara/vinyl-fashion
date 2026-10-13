// ── Supabase client (lazy) ───────────────────────────────────────
// Config comes from the environment (see .env.example). When the keys
// aren't set, `hasSupabase` is false and the storefront falls back to
// the local seed in albums.js — nothing breaks.
//
// The client library is imported dynamically so it's code-split into
// its own chunk: visitors only download it once a DB call actually
// runs (i.e. only when the store is configured).

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const SUPABASE_URL = url
export const hasSupabase = Boolean(url && anonKey)

let clientPromise = null

export function getSupabase() {
  if (!hasSupabase) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    )
  }
  return clientPromise
}
