// ── Admin data layer ─────────────────────────────────────────────
// Every Supabase call the console makes. RLS does the real guarding
// (admin_users allowlist via is_admin()); this file just talks.

import { getSupabase, hasSupabase } from '../lib/supabase'
import { compressImages, compressImage } from '../lib/imageCompress'
import { ALBUMS } from '../data/albums'

export { hasSupabase }
export { lookupCollection, searchAlbums } from '../lib/itunes'

const sb = () => getSupabase()

// let an open storefront tab know something changed (best-effort)
function ping(channel) {
  try {
    new BroadcastChannel('vf').postMessage(channel)
  } catch {
    /* no BroadcastChannel — the storefront refetches on next load */
  }
}

// ── auth ─────────────────────────────────────────────────────────
export async function getSession() {
  const s = await sb()
  const { data } = await s.auth.getSession()
  return data.session
}

export async function onAuthChange(cb) {
  const s = await sb()
  return s.auth.onAuthStateChange((_e, session) => cb(session))
}

export async function signIn(email, password) {
  const s = await sb()
  const { data, error } = await s.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  const s = await sb()
  await s.auth.signOut()
}

// ── health / access ──────────────────────────────────────────────
// 'no-schema' | 'ok'  (42P01 = relation does not exist)
export async function checkSchema() {
  const s = await sb()
  const { error } = await s.from('albums').select('id').limit(1)
  // 42P01 = direct pg "relation does not exist"; PGRST205 = PostgREST
  // "could not find the table in the schema cache" (what you actually
  // get from the REST API before schema.sql has been run)
  if (
    error &&
    (error.code === '42P01' ||
      error.code === 'PGRST205' ||
      /does not exist|could not find the table/i.test(error.message || ''))
  )
    return 'no-schema'
  return 'ok'
}

// A logged-in admin can read their own allowlist row; others can't.
export async function checkAdmin(email) {
  const s = await sb()
  const { data, error } = await s.from('admin_users').select('email').eq('email', email).maybeSingle()
  if (error) return false
  return Boolean(data)
}

// ── dashboard-ish reads ──────────────────────────────────────────
export async function fetchOrders() {
  const s = await sb()
  const { data, error } = await s
    .from('orders')
    .select('*, order_items(*), order_events(*)')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return data
}

export async function fetchAllProducts() {
  const s = await sb()
  const { data, error } = await s
    .from('products')
    .select('*, product_variants(id,color,size,stock,price)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchCustomers() {
  const s = await sb()
  const { data, error } = await s
    .from('customers')
    .select('*, orders(total,status,created_at)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── orders ───────────────────────────────────────────────────────
export async function setOrderStatus(order, status, note = null) {
  const s = await sb()
  const { error } = await s.from('orders').update({ status }).eq('id', order.id)
  if (error) throw error
  await s.from('order_events').insert({ order_id: order.id, status, note })
  // stock: decrement when confirmed, restore when cancelled after confirm
  const items = order.order_items || []
  const wasCounted = ['confirmed', 'shipped', 'completed'].includes(order.status)
  const willCount = ['confirmed', 'shipped', 'completed'].includes(status)
  const delta = !wasCounted && willCount ? -1 : wasCounted && status === 'cancelled' ? 1 : 0
  if (delta !== 0) {
    for (const it of items) {
      if (!it.product_id) continue
      const { data: p } = await s.from('products').select('stock').eq('id', it.product_id).maybeSingle()
      if (p) {
        await s
          .from('products')
          .update({ stock: Math.max(0, (p.stock ?? 0) + delta * (it.qty || 1)) })
          .eq('id', it.product_id)
      }
    }
  }
}

// ── products ─────────────────────────────────────────────────────
export async function uploadProductImages(files) {
  const s = await sb()
  const compressed = await compressImages(files)
  const dir = `products/${crypto.randomUUID()}`
  const paths = []
  for (let i = 0; i < compressed.length; i++) {
    const f = compressed[i]
    const path = `${dir}/${i}-${Date.now()}.${f.type === 'image/webp' ? 'webp' : 'jpg'}`
    const { error } = await s.storage.from('product-images').upload(path, f, { contentType: f.type })
    if (error) throw error
    paths.push(path)
  }
  return paths
}

// Design + colour options become product_variants rows. Labels are
// stored in `color` with a lightweight prefix (design:/color:) so the
// storefront can split them into separate groups; the db layer treats
// any legacy unprefixed label as a design.
const variantRow = (product_id, prefix, label, stock) => ({
  product_id,
  color: `${prefix}:${label.trim()}`,
  stock,
})

// `combos` (preferred): [{ color: 'color:Name|#hex|imgIdx'|null, size|null, stock, price }]
// — one row per colour×size combo, each with its own stock count and,
// optionally, its own price (null = charge the product's price).
export async function addProduct(fields, files, designs = [], combos = null) {
  const s = await sb()
  const images = files?.length ? await uploadProductImages(files) : []
  const { data, error } = await s
    .from('products')
    .insert({ ...fields, images })
    .select('id')
    .single()
  if (error) throw error
  const rows = [
    ...designs.map((v) => v.trim()).filter(Boolean).map((d) => variantRow(data.id, 'design', d, fields.stock ?? 0)),
    ...(combos || []).map((c) => ({
      product_id: data.id,
      color: c.color,
      size: c.size,
      stock: c.stock ?? 0,
      price: c.price ?? null,
    })),
  ]
  if (rows.length) {
    const { error: ve } = await s.from('product_variants').insert(rows)
    if (ve) throw ve
  }
}

export async function updateVariant(id, patch) {
  const s = await sb()
  const { error } = await s.from('product_variants').update(patch).eq('id', id)
  if (error) throw error
}

export async function addVariants(product_id, rows) {
  if (!rows?.length) return
  const s = await sb()
  const { error } = await s
    .from('product_variants')
    .insert(
      rows.map((r) => ({
        product_id,
        color: r.color,
        size: r.size ?? null,
        stock: r.stock ?? 0,
        price: r.price ?? null,
      }))
    )
  if (error) throw error
}

export async function deleteVariants(ids) {
  if (!ids?.length) return
  const s = await sb()
  const { error } = await s.from('product_variants').delete().in('id', ids)
  if (error) throw error
}

// NOTE for whoever adds per-combo photo uploads to the ledger editor:
// variant rows address their photo by INDEX into products.images, so new
// shots may only be appended. Splice or reorder that array and every
// stored index shifts, and each combo starts showing another garment.

// One-click restock/copy: same fields + photos + variants, lands hidden
// so it never flashes onto the storefront before it's reviewed.
export async function duplicateProduct(p) {
  const s = await sb()
  const { data, error } = await s
    .from('products')
    .insert({
      title: `${p.title} (COPY)`,
      album_id: p.album_id, garment_type: p.garment_type, category: p.category,
      price: p.price, sale_price: p.sale_price, stock: p.stock,
      description: p.description, ai_info: p.ai_info, caption: p.caption,
      images: p.images || [], status: 'hidden',
    })
    .select('id')
    .single()
  if (error) throw error
  const vars = (p.product_variants || []).map((v) => ({
    product_id: data.id, color: v.color ?? null, size: v.size ?? null, stock: v.stock ?? 0,
    price: v.price ?? null,
  }))
  if (vars.length) {
    const { error: ve } = await s.from('product_variants').insert(vars)
    if (ve) throw ve
  }
}

export async function updateProduct(id, patch) {
  const s = await sb()
  const { error } = await s.from('products').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id) {
  const s = await sb()
  const { error } = await s.from('products').delete().eq('id', id)
  if (error) throw error
}

// ── albums (Studio-lite) ─────────────────────────────────────────
export async function fetchAlbumRows() {
  const s = await sb()
  const { data, error } = await s.from('albums').select('*').order('sort')
  if (error) throw error
  return data
}

export async function importSeedAlbums() {
  const s = await sb()
  const rows = ALBUMS.map((a, i) => ({
    id: a.id,
    collection_id: a.collectionId,
    artist: a.artist,
    title: a.title,
    display_title: a.displayTitle,
    year: a.year,
    label: a.label,
    capsule_no: a.capsuleNo,
    featured: a.featured,
    story: a.story,
    artwork: a.artwork,
    palette: a.palette,
    fonts: a.fonts,
    ticker: a.ticker,
    notes: a.notes ?? [],
    clip: a.clip ?? {},
    status: 'live',
    sort: i,
  }))
  const { error } = await s.from('albums').upsert(rows)
  if (error) throw error
}

export async function updateAlbumRow(id, patch) {
  const s = await sb()
  const { error } = await s.from('albums').update(patch).eq('id', id)
  if (error) throw error
  ping('albums')
}

export async function createAlbum(row) {
  const s = await sb()
  const { error } = await s.from('albums').insert(row)
  if (error) throw error
  ping('albums')
}

export async function deleteAlbum(id) {
  const s = await sb()
  const { error } = await s.from('albums').delete().eq('id', id)
  if (error) throw error
  ping('albums')
}

// Cover art (compressed) or full-length audio → the public album-art
// bucket. Returns a public URL. Audio here lets a clip point at ANY
// part of the real song, not just the 30-second iTunes preview.
export async function uploadAlbumAsset(file, prefix = 'asset') {
  const s = await sb()
  const isImage = file.type.startsWith('image/')
  const up = isImage ? await compressImage(file, { maxDimension: 1400 }) : file
  const ext = isImage ? 'webp' : (file.name.split('.').pop() || 'mp3').toLowerCase()
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`
  const { error } = await s.storage
    .from('album-art')
    .upload(path, up, { contentType: up.type || file.type, upsert: true })
  if (error) throw error
  return s.storage.from('album-art').getPublicUrl(path).data.publicUrl
}

// ── categories (managed list in site_settings) ──────────────────
export async function getCategories() {
  const s = await sb()
  const { data } = await s.from('site_settings').select('value').eq('key', 'categories').maybeSingle()
  return Array.isArray(data?.value) ? data.value : []
}

export async function saveCategories(list) {
  const s = await sb()
  const { error } = await s
    .from('site_settings')
    .upsert({ key: 'categories', value: list, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ── site settings (brand/contact — editable storefront copy) ─────
export async function getSiteSettings() {
  const s = await sb()
  const { data, error } = await s
    .from('site_settings')
    .select('value')
    .eq('key', 'site')
    .maybeSingle()
  if (error) throw error
  return data?.value || null
}

export async function saveSiteSettings(value) {
  const s = await sb()
  const { error } = await s
    .from('site_settings')
    .upsert({ key: 'site', value, updated_at: new Date().toISOString() })
  if (error) throw error
}
