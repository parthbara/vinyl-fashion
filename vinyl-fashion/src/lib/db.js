// ── Data access ──────────────────────────────────────────────────
// The one place the app talks to Supabase. Reads fall back to the
// local albums.js seed when the DB isn't configured or errors, so the
// storefront always renders. Writes (orders) go through security-
// definer RPCs — the client never touches the orders/customers tables
// directly.

import { getSupabase, hasSupabase, SUPABASE_URL } from './supabase'
import { ALBUMS, makePlaceholderCapsule } from '../data/albums'

// Turn a stored image reference into a usable URL. Full URLs pass
// through; bare paths resolve against the public product-images bucket
// (deterministic public path — no client needed).
function imageUrl(ref) {
  if (!ref) return null
  if (/^https?:\/\//.test(ref)) return ref
  if (!SUPABASE_URL) return ref
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${ref}`
}

function normalizeProduct(row) {
  const images = Array.isArray(row.images) ? row.images : []
  const variants = row.product_variants || []
  const labels = variants.map((v) => v.color).filter(Boolean)
  const clean = (prefix) =>
    labels
      .filter((v) => v.startsWith(prefix))
      .map((v) => v.slice(prefix.length).trim())
      .filter(Boolean)
  const legacyDesigns = labels.filter((v) => !v.startsWith('design:') && !v.startsWith('color:'))
  return {
    id: row.id,
    name: row.title,
    type: row.garment_type || 'tee',
    price: row.price != null ? Number(row.price) : null,
    salePrice: row.sale_price != null ? Number(row.sale_price) : null,
    stock: row.stock ?? null,
    caption: row.caption || null,
    description: row.description || null,
    image: imageUrl(images[0]),
    images: images.map(imageUrl).filter(Boolean),
    // Existing DB stores option labels in product_variants.color. New rows
    // prefix labels as design:/color: so the storefront can split them.
    designs: [...new Set([...clean('design:'), ...legacyDesigns])],
    // colour labels may encode "Name|#hex|imageIndex" (admin colour rows);
    // legacy plain names parse to a swatch-less colour with no photo link
    colors: [...new Set(clean('color:'))].map((raw) => {
      const [name, hex, idx] = raw.split('|')
      return {
        name: (name || '').trim(),
        hex: (hex || '').trim() || null,
        imgIdx: idx !== undefined && idx !== '' ? Number(idx) : null,
      }
    }),
    sizes: [...new Set(variants.map((v) => v.size).filter(Boolean))],
    soldOut: row.status === 'soldout' || row.stock === 0,
  }
}

// Products for one album, or null to signal "use placeholders"
// (not configured, error, or empty catalogue for this album).
export async function fetchProducts(albumId) {
  if (!hasSupabase) return null
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('products')
    .select('id,title,garment_type,price,sale_price,stock,description,caption,images,status,sort,product_variants(color,size,stock)')
    .eq('album_id', albumId)
    .neq('status', 'hidden')
    .order('sort', { ascending: true })
  if (error) {
    console.warn('[db] fetchProducts:', error.message)
    return null
  }
  return data.length ? data.map(normalizeProduct) : null
}

// Albums from the DB, merged over the local seed so any field the
// Studio hasn't set still has a sensible default. Falls back entirely
// to the seed when the DB is unavailable.
export async function fetchAlbums() {
  if (!hasSupabase) return ALBUMS
  const supabase = await getSupabase()
  // status 'live' shows normally; 'draft' is hidden from the store.
  // "Coming soon" is a flag inside effects (so the album stays 'live'
  // and readable) — it shows on the shelf with a sticker but can't be
  // opened until you flip it off.
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('status', 'live')
    .order('sort', { ascending: true })
  if (error || !data?.length) return ALBUMS
  const seedById = Object.fromEntries(ALBUMS.map((a) => [a.id, a]))
  return data.map((row) => {
    const effects = { ...seedById[row.id]?.effects, ...(row.effects || {}) }
    return {
      ...seedById[row.id],
      id: row.id,
      collectionId: row.collection_id ?? seedById[row.id]?.collectionId,
      artist: row.artist,
      title: row.title,
      displayTitle: row.display_title || row.title,
      year: row.year,
      label: row.label,
      capsuleNo: row.capsule_no,
      featured: row.featured,
      story: row.story,
      artwork: row.artwork ?? seedById[row.id]?.artwork,
      palette: { ...seedById[row.id]?.palette, ...(row.palette || {}) },
      fonts: { ...seedById[row.id]?.fonts, ...(row.fonts || {}) },
      ticker: row.ticker?.length ? row.ticker : seedById[row.id]?.ticker,
      notes: row.notes ?? seedById[row.id]?.notes ?? [],
      effects,
      clip: row.clip && Object.keys(row.clip).length ? row.clip : seedById[row.id]?.clip ?? null,
      capsule: seedById[row.id]?.capsule ?? makePlaceholderCapsule(),
      comingSoon: !!effects.comingSoon,
      comingSoonText: effects.comingSoonText || 'COMING SOON',
      capsuleTitle: effects.capsuleTitle || '',
    }
  })
}

// Place an order via the RPC; returns a short tracking code.
export async function placeOrder({ name, phone, address, note, items }) {
  if (!hasSupabase) throw new Error('Store is not configured yet.')
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('place_order', {
    p_name: name,
    p_phone: phone,
    p_address: address ?? null,
    p_note: note ?? null,
    p_items: items,
  })
  if (error) throw error
  return data // e.g. 'VF-3F9A2'
}

// Look up an order for the /track page (code + phone must match).
export async function trackOrder(code, phone) {
  if (!hasSupabase) return null
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('track_order', {
    p_code: code,
    p_phone: phone,
  })
  if (error) throw error
  return data // null when no match
}
