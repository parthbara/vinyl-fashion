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

  // Option labels live in product_variants.color, prefixed by kind:
  //   combo:Name|#hex|imgIdx|Design   → a full colour×design line (+ size col)
  //   color:Name|#hex|imgIdx          → a colour (legacy, may carry a size)
  //   design:Label                    → a bare design label
  //   <plain>                         → legacy = a design label
  // We fold them all into one flat variantRows[] the storefront reasons over.
  const colorsByName = new Map() // name → { name, hex, imgIdx }
  const designSet = new Set()
  const sizeSet = new Set()
  const variantRows = [] // { color, design, size, stock }

  const addColor = (name, hex, idx) => {
    const nm = (name || '').trim()
    if (!nm) return
    const existing = colorsByName.get(nm)
    if (!existing) colorsByName.set(nm, { name: nm, hex: (hex || '').trim() || null, imgIdx: idx })
    else if (existing.imgIdx == null && idx != null) existing.imgIdx = idx
  }

  for (const v of variants) {
    const c = v.color || ''
    const size = v.size || null
    if (size) sizeSet.add(size)
    const stock = v.stock ?? 0

    if (c.startsWith('combo:')) {
      const parts = c.slice('combo:'.length).split('|')
      const name = (parts[0] || '').trim()
      const idxRaw = parts[2]
      const idx = idxRaw !== '' && idxRaw != null ? Number(idxRaw) : null
      const design = parts.slice(3).join('|').trim() || null
      if (name) addColor(name, parts[1], idx)
      if (design) designSet.add(design)
      variantRows.push({ color: name || null, design, size, stock, imgIdx: idx })
    } else if (c.startsWith('color:')) {
      const [name, hex, idxRaw] = c.slice('color:'.length).split('|')
      const idx = idxRaw !== undefined && idxRaw !== '' ? Number(idxRaw) : null
      if ((name || '').trim()) addColor(name, hex, idx)
      variantRows.push({ color: (name || '').trim() || null, design: null, size, stock })
    } else if (c.startsWith('design:')) {
      const d = c.slice('design:'.length).trim()
      if (d) designSet.add(d)
    } else if (c) {
      designSet.add(c.trim()) // legacy plain = a design
    } else if (size) {
      variantRows.push({ color: null, design: null, size, stock }) // size-only stock
    }
  }

  // aggregate "colourName¦size" stock — kept for the existing availability
  // helpers; sparse (unknown combos treated as available)
  const stockMap = {}
  for (const vr of variantRows) {
    if (!vr.color && !vr.size) continue
    const key = `${vr.color || ''}¦${vr.size || ''}`
    stockMap[key] = (stockMap[key] || 0) + (vr.stock || 0)
  }

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
    designs: [...designSet],
    colors: [...colorsByName.values()],
    sizes: [...sizeSet],
    variantRows, // full colour×design×size stock lines
    stockMap,
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
