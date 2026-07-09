import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ALBUMS, makePlaceholderCapsule } from '../data/albums'
import { CURATED_ALBUMS } from '../data/curatedAlbums'
import baked from '../data/tracks.json'
import { ensureFont } from '../lib/fonts'
import { BRAND, CONTACT } from '../config'
import {
  hasSupabase,
  getSession,
  onAuthChange,
  signIn,
  signOut,
  checkSchema,
  checkAdmin,
  fetchOrders,
  fetchAllProducts,
  fetchCustomers,
  setOrderStatus,
  addProduct,
  updateProduct,
  deleteProduct,
  fetchAlbumRows,
  importSeedAlbums,
  updateAlbumRow,
  createAlbum,
  deleteAlbum,
  uploadAlbumAsset,
  getCategories,
  saveCategories,
  getSiteSettings,
  saveSiteSettings,
  lookupCollection,
  searchAlbums,
} from './adminData'
import './admin.css'

// ═══ 33RPM CONSOLE ═══════════════════════════════════════════════
// The back room. Reached only via /<VITE_ADMIN_PATH>; lazy-loaded so
// the storefront never ships a byte of it.

const npr = (n) => `NPR ${Number(n || 0).toLocaleString()}`
const dt = (s) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
const dtt = (s) => new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const GARMENTS = ['tee', 'longsleeve', 'hoodie', 'jacket', 'knit', 'cap', 'shorts']
const FLOW = { pending: 'confirmed', confirmed: 'shipped', shipped: 'completed' }

function useLoad(fn) {
  const [st, set] = useState({ busy: true, data: null, err: null })
  const run = useCallback(() => {
    set((s) => ({ ...s, busy: true, err: null }))
    fn()
      .then((data) => set({ busy: false, data, err: null }))
      .catch((e) => set({ busy: false, data: null, err: e.message || String(e) }))
  }, [fn])
  useEffect(run, [run])
  return { ...st, reload: run }
}

const Stat = ({ k, v, gold }) => (
  <div className="adm-card">
    <div className="k">{k}</div>
    <div className={`v ${gold ? 'gold' : ''}`}>{v}</div>
  </div>
)

// ── root gate ────────────────────────────────────────────────────
export default function AdminApp() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [schema, setSchema] = useState(null) // 'ok' | 'no-schema'
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    if (!hasSupabase) return
    let sub
    getSession().then(setSession)
    onAuthChange(setSession).then((s) => (sub = s?.data?.subscription))
    checkSchema().then(setSchema)
    return () => sub?.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user?.email && schema === 'ok') {
      checkAdmin(session.user.email).then(setIsAdmin)
    }
  }, [session, schema])

  if (!hasSupabase) {
    return (
      <div className="adm">
        <div className="adm-gate">
          <h1>33RPM CONSOLE</h1>
          <div className="adm-err">
            Supabase isn't configured — copy <b>.env.example</b> to <b>.env</b>, fill in the keys,
            and restart the dev server.
          </div>
        </div>
      </div>
    )
  }
  if (session === undefined) return <div className="adm" />
  if (!session) return <Login schema={schema} />
  if (schema === 'no-schema') return <SetupNotice email={session.user.email} />
  if (isAdmin === false) {
    return (
      <div className="adm">
        <div className="adm-gate">
          <h1>33RPM CONSOLE</h1>
          <div className="adm-err">
            <b>{session.user.email}</b> is not on the admin allowlist (<code>admin_users</code>).
          </div>
          <button className="adm-btn ghost" onClick={() => signOut()}>SIGN OUT</button>
        </div>
      </div>
    )
  }
  if (isAdmin !== true) return <div className="adm" />
  return <Shell email={session.user.email} />
}

function Login({ schema }) {
  const [email, setEmail] = useState('parth@vinylfashion.com')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await signIn(email.trim(), pw)
    } catch (ex) {
      setErr(ex.message || 'Sign-in failed')
    }
    setBusy(false)
  }
  return (
    <div className="adm">
      <form className="adm-gate" onSubmit={submit}>
        <div className="adm-gate-mark">VF</div>
        <h1>33RPM CONSOLE</h1>
        <p className="sub">staff only · the shop floor is upstairs</p>
        <input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <input type="password" placeholder="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        {err && <div className="adm-err">{err}</div>}
        {schema === 'no-schema' && (
          <div className="adm-err">Heads up: the database schema isn't installed yet (SETUP.md steps 2–3).</div>
        )}
        <button className="adm-btn" disabled={busy || !pw}>
          {busy ? 'CHECKING…' : 'ENTER THE BACK ROOM'}
        </button>
      </form>
    </div>
  )
}

function SetupNotice({ email }) {
  return (
    <div className="adm">
      <div className="adm-main" style={{ margin: 'auto' }}>
        <div className="adm-setup adm-card">
          <h2 className="adm-mono" style={{ letterSpacing: '.2em', fontSize: 14 }}>ONE-TIME SETUP</h2>
          <p>
            Signed in as <b>{email}</b>, but the database is empty. In the Supabase dashboard:
          </p>
          <ol>
            <li>SQL Editor → New query → paste all of <code>supabase/schema.sql</code> → Run.</li>
            <li>New query → paste <code>supabase/seed.sql</code> → Run.</li>
            <li>Reload this page.</li>
          </ol>
          <button className="adm-btn" onClick={() => window.location.reload()}>RELOAD</button>
        </div>
      </div>
    </div>
  )
}

// ── shell ────────────────────────────────────────────────────────
const TABS = ['DASHBOARD', 'ORDERS', 'ADD STOCK', 'LEDGER', 'CUSTOMERS', 'ALBUMS', 'SETTINGS']

function Shell({ email }) {
  const [tab, setTab] = useState('DASHBOARD')
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-side-brand">
          <span className="disc" />
          <div>
            <b>VINYL FASHION</b>
            <span>33RPM CONSOLE</span>
          </div>
        </div>
        {TABS.map((t) => (
          <button key={t} className={`adm-nav-btn ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            <span className="label">{t}</span>
          </button>
        ))}
        <div className="spacer" />
        <button className="adm-nav-btn" onClick={() => signOut()}>
          <span className="label">SIGN OUT</span>
        </button>
      </aside>
      <main className="adm-main">
        <div className="adm-head">
          <h2>{tab}</h2>
          <span className="who">{email}</span>
        </div>
        {tab === 'DASHBOARD' && <Dashboard />}
        {tab === 'ORDERS' && <Orders />}
        {tab === 'ADD STOCK' && <AddStock />}
        {tab === 'LEDGER' && <Ledger />}
        {tab === 'CUSTOMERS' && <Customers />}
        {tab === 'ALBUMS' && <Albums />}
        {tab === 'SETTINGS' && <Settings email={email} />}
      </main>
    </div>
  )
}

// ── dashboard ────────────────────────────────────────────────────
function Dashboard() {
  const load = useCallback(
    () => Promise.all([fetchOrders(), fetchAllProducts(), fetchCustomers()]),
    []
  )
  const { busy, data, err, reload } = useLoad(load)
  if (err) return <Err err={err} retry={reload} />
  if (busy || !data) return <p className="adm-note">Loading…</p>
  const [orders, products, customers] = data

  const revenue = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + Number(o.total), 0)
  const pending = orders.filter((o) => o.status === 'pending').length
  const low = products.filter((p) => p.status === 'active' && p.stock <= 3)

  // top sellers by revenue from counted orders
  const counted = orders.filter((o) => ['confirmed', 'shipped', 'completed'].includes(o.status))
  const sellers = {}
  counted.forEach((o) =>
    (o.order_items || []).forEach((it) => {
      sellers[it.title] = (sellers[it.title] || 0) + Number(it.unit_price) * it.qty
    })
  )
  const top = Object.entries(sellers).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // last 14 days revenue bars
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const key = d.toDateString()
    const sum = orders
      .filter((o) => o.status === 'completed' && new Date(o.created_at).toDateString() === key)
      .reduce((s, o) => s + Number(o.total), 0)
    return sum
  })
  const max = Math.max(...days, 1)

  return (
    <>
      <div className="adm-stats">
        <Stat k="REVENUE · COMPLETED" v={npr(revenue)} gold />
        <Stat k="PENDING ORDERS" v={pending} />
        <Stat k="PRODUCTS" v={products.length} />
        <Stat k="CUSTOMERS" v={customers.length} />
      </div>
      <div className="adm-grid2">
        <div className="adm-card">
          <p className="adm-sec-title">REVENUE — LAST 14 DAYS</p>
          <div className="adm-bars">
            {days.map((v, i) => (
              <div key={i} className={`bar ${v === 0 ? 'zero' : ''}`} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} title={npr(v)} />
            ))}
          </div>
          <p className="adm-sec-title" style={{ marginTop: 22 }}>RECENT ORDERS</p>
          <table className="adm-table">
            <tbody>
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id}>
                  <td className="adm-mono">{o.code}</td>
                  <td>{o.customer_name || o.customer_phone}</td>
                  <td>{npr(o.total)}</td>
                  <td><span className={`pill ${o.status}`}>{o.status}</span></td>
                  <td className="adm-mono">{dt(o.created_at)}</td>
                </tr>
              ))}
              {!orders.length && <tr><td className="adm-note">No orders yet — they'll land here.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="adm-card">
            <p className="adm-sec-title">LOW STOCK (≤3)</p>
            {low.length ? low.map((p) => (
              <div key={p.id} className="adm-detail" style={{ position: 'static' }}>
                <div className="row"><span>{p.title}</span><b>{p.stock} left</b></div>
              </div>
            )) : <p className="adm-note">All pressings well stocked.</p>}
          </div>
          <div className="adm-card">
            <p className="adm-sec-title">TOP SELLERS</p>
            {top.length ? top.map(([t, v]) => (
              <div key={t} className="adm-detail" style={{ position: 'static' }}>
                <div className="row"><span>{t}</span><b>{npr(v)}</b></div>
              </div>
            )) : <p className="adm-note">Nothing sold yet.</p>}
          </div>
          <button className="adm-btn ghost" onClick={reload}>↻ REFRESH</button>
        </div>
      </div>
    </>
  )
}

// ── orders ───────────────────────────────────────────────────────
function Orders() {
  const { busy, data, err, reload } = useLoad(fetchOrders)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('open')
  const [selId, setSelId] = useState(null)
  const [acting, setActing] = useState(false)

  const orders = data || []
  const shown = orders.filter((o) => {
    if (filter === 'open' && !['pending', 'confirmed', 'shipped'].includes(o.status)) return false
    if (filter !== 'open' && filter !== 'all' && o.status !== filter) return false
    const hay = `${o.code} ${o.customer_name} ${o.customer_phone} ${(o.order_items || []).map((i) => i.title).join(' ')}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })
  const sel = orders.find((o) => o.id === selId)

  const act = async (status) => {
    if (!sel) return
    setActing(true)
    try {
      await setOrderStatus(sel, status)
      reload()
    } catch (e) {
      alert(e.message)
    }
    setActing(false)
  }

  if (err) return <Err err={err} retry={reload} />
  return (
    <>
      <div className="adm-toolbar">
        <input type="search" placeholder="Search code, name, phone, item…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="open">Open tickets</option>
          <option value="all">All</option>
          {['pending', 'confirmed', 'shipped', 'completed', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="search" placeholder="Search capsules..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All capsules</option>
          <option value="live">Live</option>
          <option value="soon">Coming soon</option>
          <option value="draft">Draft/hidden</option>
        </select>
        <input type="search" placeholder="Search capsules..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All capsules</option>
          <option value="live">Live</option>
          <option value="soon">Coming soon</option>
          <option value="draft">Draft/hidden</option>
        </select>
        <button className="adm-btn ghost" onClick={reload}>↻</button>
      </div>
      <div className="adm-grid2">
        <div className="adm-card" style={{ padding: 6 }}>
          <table className="adm-table">
            <thead>
              <tr><th>CODE</th><th>CUSTOMER</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th><th>DATE</th></tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className={`click ${o.id === selId ? 'sel' : ''}`} onClick={() => setSelId(o.id)}>
                  <td className="adm-mono">{o.code}</td>
                  <td>{o.customer_name || '—'}<br /><small style={{ opacity: 0.5 }}>{o.customer_phone}</small></td>
                  <td>{(o.order_items || []).map((i) => `${i.qty}× ${i.title}`).join(', ') || '—'}</td>
                  <td>{npr(o.total)}</td>
                  <td><span className={`pill ${o.status}`}>{o.status}</span></td>
                  <td className="adm-mono">{dt(o.created_at)}</td>
                </tr>
              ))}
              {!busy && !shown.length && <tr><td colSpan="6" className="adm-note" style={{ padding: 20 }}>No matching orders.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="adm-card adm-detail">
          {!sel ? (
            <p className="adm-note">Select a ticket to call, confirm, ship, complete or cancel it.</p>
          ) : (
            <>
              <div className="row"><span>Ticket</span><b className="adm-mono">{sel.code}</b></div>
              <div className="row"><span>Placed</span><b>{dtt(sel.created_at)}</b></div>
              <div className="row"><span>Customer</span><b>{sel.customer_name || '—'}</b></div>
              <div className="row"><span>Phone</span><b>{sel.customer_phone}</b></div>
              {sel.customer_address && <div className="row"><span>Address</span><b>{sel.customer_address}</b></div>}
              {sel.note && <div className="row"><span>Note</span><b>{sel.note}</b></div>}
              <div className="row"><span>Total</span><b>{npr(sel.total)}</b></div>
              <p className="adm-sec-title">ITEMS</p>
              {(sel.order_items || []).map((i) => (
                <div className="row" key={i.id}>
                  <span>{i.qty}× {i.title}{i.size ? ` · ${i.size}` : ''}{i.color ? ` · ${i.color}` : ''}</span>
                  <b>{npr(i.unit_price * i.qty)}</b>
                </div>
              ))}
              <div className="adm-actions">
                <a className="adm-btn ghost" href={`tel:+${sel.customer_phone.replace(/\D/g, '')}`}>📞 CALL</a>
                <a
                  className="adm-btn ghost"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://wa.me/${sel.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${sel.customer_name || ''}! About your VINYL FASHION order ${sel.code}:`)}`}
                >
                  WHATSAPP
                </a>
                {FLOW[sel.status] && (
                  <button className="adm-btn" disabled={acting} onClick={() => act(FLOW[sel.status])}>
                    MARK {FLOW[sel.status].toUpperCase()}
                  </button>
                )}
                {!['completed', 'cancelled'].includes(sel.status) && (
                  <button className="adm-btn danger" disabled={acting} onClick={() => window.confirm('Cancel this order?') && act('cancelled')}>
                    CANCEL
                  </button>
                )}
              </div>
              <p className="adm-sec-title">TIMELINE</p>
              <div className="adm-timeline">
                {(sel.order_events || [])
                  .slice()
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                  .map((ev) => (
                    <div className="ev" key={ev.id}>
                      <time>{dtt(ev.created_at)}</time>
                      <span className={`pill ${ev.status}`}>{ev.status}</span>
                      {ev.note && <span style={{ opacity: 0.6 }}>{ev.note}</span>}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── add stock ────────────────────────────────────────────────────
const EMPTY = { title: '', album_id: ALBUMS[0].id, garment_type: 'tee', category: '', price: '', sale_price: '', stock: 1, description: '', ai_info: '', caption: '', variants: '', colors: '', sizes: [] }

// quick-fill presets for the size picker
const SIZE_PRESETS = {
  alpha: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  numeric: ['28', '30', '32', '34', '36', '38', '40'],
}

function AddStock() {
  const [f, setF] = useState(EMPTY)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [cats, setCats] = useState([])
  const [albumList, setAlbumList] = useState(ALBUMS.map((a) => ({ id: a.id, capsule_no: a.capsuleNo, title: a.title })))
  const [selectedSlot, setSelectedSlot] = useState(0)
  const fileRef = useRef(null)
  const [sizeInput, setSizeInput] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  // sizes are freeform (letters like S/M/L or numbers like 32) and kept
  // as an ordered, de-duped list of chips
  const addSizes = (raw) => {
    const parts = (Array.isArray(raw) ? raw : String(raw).split(','))
      .map((v) => v.trim())
      .filter(Boolean)
    if (!parts.length) return
    setF((s) => {
      const next = [...s.sizes]
      for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p)
      return { ...s, sizes: next }
    })
    setSizeInput('')
  }
  const removeSize = (val) => setF((s) => ({ ...s, sizes: s.sizes.filter((x) => x !== val) }))
  const previews = useMemo(() => files.map((fl) => URL.createObjectURL(fl)), [files])
  const selectedAlbum = albumList.find((a) => a.id === f.album_id)
  const seedAlbum = ALBUMS.find((a) => a.id === f.album_id)
  const mockSlots = seedAlbum?.capsule?.length ? seedAlbum.capsule : makePlaceholderCapsule()

  useEffect(() => {
    getCategories().then((c) => c.length && setCats(c)).catch(() => {})
    fetchAlbumRows().then((r) => r?.length && setAlbumList(r)).catch(() => {})
  }, [])

  useEffect(() => {
    const first = mockSlots[0]
    setSelectedSlot(0)
    if (first && !f.title) {
      setF((s) => ({ ...s, title: first.name, garment_type: first.type || s.garment_type }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.album_id])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await addProduct(
        {
          title: f.title.trim(),
          album_id: f.album_id,
          garment_type: f.garment_type,
          category: f.category || null,
          price: Number(f.price) || 0,
          sale_price: f.sale_price ? Number(f.sale_price) : null,
          stock: Number(f.stock) || 0,
          description: f.description || null,
          ai_info: f.ai_info || null,
          caption: f.caption || null,
        },
        files,
        f.variants.split(','),
        f.colors.split(','),
        f.sizes
      )
      setMsg({ ok: true, text: `“${f.title}” added to the ${f.album_id} capsule.` })
      setF({ ...EMPTY, album_id: f.album_id })
      setFiles([])
      if (fileRef.current) fileRef.current.value = ''
    } catch (ex) {
      setMsg({ ok: false, text: ex.message })
    }
    setBusy(false)
  }

  return (
    <form className="adm-form" onSubmit={submit}>
      <div className="adm-stock-context full">
        <div>
          <p className="adm-sec-title">ADDING TO {selectedAlbum?.title || seedAlbum?.title || f.album_id}</p>
          <p className="adm-note">
            Placeholder capsule slots stay on the storefront until this album has real stock. Once you add products here, those real pieces replace the placeholder grid for this capsule.
          </p>
        </div>
        <div className="adm-slot-strip">
          {mockSlots.map((item, i) => (
            <button
              key={`${item.name}-${i}`}
              type="button"
              className={selectedSlot === i ? 'on' : ''}
              onClick={() => {
                setSelectedSlot(i)
                setF((s) => ({
                  ...s,
                  title: item.name,
                  garment_type: item.type || s.garment_type,
                }))
              }}
            >
              <b>{String(i + 1).padStart(2, '0')}</b>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="adm-field full"><label>TITLE</label><input required value={f.title} onChange={set('title')} placeholder="Runaway Varsity" /></div>
      <div className="adm-field"><label>CAPSULE / ALBUM</label>
        <select value={f.album_id} onChange={set('album_id')}>
          {albumList.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </div>
      <div className="adm-field"><label>GARMENT TYPE (placeholder art)</label>
        <select value={f.garment_type} onChange={set('garment_type')}>
          {GARMENTS.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div className="adm-field"><label>PRICE (NPR)</label><input required type="number" min="0" value={f.price} onChange={set('price')} /></div>
      <div className="adm-field"><label>SALE PRICE (optional)</label><input type="number" min="0" value={f.sale_price} onChange={set('sale_price')} /></div>
      <div className="adm-field"><label>STOCK COUNT</label><input type="number" min="0" value={f.stock} onChange={set('stock')} /></div>
      <div className="adm-field"><label>CATEGORY</label>
        {cats.length ? (
          <select value={f.category} onChange={set('category')}>
            <option value="">— none —</option>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        ) : (
          <input value={f.category} onChange={set('category')} placeholder="Outerwear (manage in Settings)" />
        )}
      </div>
      <div className="adm-field full"><label>DESCRIPTION</label><textarea value={f.description} onChange={set('description')} placeholder="Fabric, fit, occasion, garment details." /></div>
      <div className="adm-field full"><label>CAPTION (shown under the piece)</label><input value={f.caption} onChange={set('caption')} placeholder="Numbered like a pressing." /></div>
      <div className="adm-field full">
        <label>DESIGN VARIANTS (comma-separated — e.g. Runaway print, Ballerina print, Phoenix back-print)</label>
        <input value={f.variants} onChange={set('variants')} placeholder="Leave empty for a single design" />
      </div>
      <div className="adm-field full">
        <label>COLOUR VARIANTS (comma-separated — e.g. Black, Bone, Crimson)</label>
        <input value={f.colors} onChange={set('colors')} placeholder="Leave empty for a single colour" />
      </div>
      <div className="adm-field full">
        <label>SIZES (letters or numbers — leave empty for one-size)</label>
        {f.sizes.length > 0 && (
          <div className="adm-chips">
            {f.sizes.map((sz) => (
              <span className="adm-chip" key={sz}>
                {sz}
                <button type="button" aria-label={`Remove ${sz}`} onClick={() => removeSize(sz)}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="adm-chip-add">
          <input
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSizes(sizeInput)
              }
            }}
            placeholder="Add a size (e.g. S, M, L, Free, 32)"
          />
          <button type="button" className="adm-chip-btn" onClick={() => addSizes(sizeInput)}>＋ Add size</button>
        </div>
        <div className="adm-chip-presets">
          <span>Quick add:</span>
          <button type="button" onClick={() => addSizes(SIZE_PRESETS.alpha)}>Alphabetical · XS–XXL</button>
          <button type="button" onClick={() => addSizes(SIZE_PRESETS.numeric)}>Numerical · 28–40</button>
          <button type="button" onClick={() => addSizes('Free')}>Free size</button>
        </div>
      </div>
      <p className="adm-note full" style={{ marginTop: -4 }}>
        Photo order = <b>design images first, then colour images</b>. Selecting a design or colour on the
        storefront jumps to its matching photo; shoppers can still swipe the whole carousel.
      </p>
      <div className="adm-field full"><label>AI EXTRA INFO (hidden from shoppers — feeds the assistant)</label><textarea value={f.ai_info} onChange={set('ai_info')} placeholder="e.g. can be customized with 2 weeks notice; hand wash only." /></div>
      <div className="adm-field full">
        <label>PHOTOS (compressed to WebP ≤1600px automatically · first = cover)</label>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => setFiles([...e.target.files])} />
        {!!previews.length && <div className="adm-thumbs" style={{ marginTop: 8 }}>{previews.map((u) => <img key={u} src={u} alt="" />)}</div>}
      </div>
      {msg && <div className={`full ${msg.ok ? 'adm-ok' : 'adm-err'}`}>{msg.text}</div>}
      <div className="full"><button className="adm-btn" disabled={busy}>{busy ? 'UPLOADING…' : '＋ ADD STOCK ITEM'}</button></div>
    </form>
  )
}

// ── ledger ───────────────────────────────────────────────────────
function Ledger() {
  const { busy, data, err, reload } = useLoad(fetchAllProducts)
  const [q, setQ] = useState('')
  const [album, setAlbum] = useState('all')
  if (err) return <Err err={err} retry={reload} />
  const all = data || []
  const albumIds = [...new Set(all.map((p) => p.album_id).filter(Boolean))].sort()
  const products = all.filter(
    (p) =>
      (album === 'all' || p.album_id === album) &&
      `${p.title} ${p.album_id} ${p.category || ''}`.toLowerCase().includes(q.toLowerCase())
  )
  const units = products.reduce((s, p) => s + (p.stock || 0), 0)
  const value = products.reduce((s, p) => s + (p.stock || 0) * Number(p.sale_price ?? p.price ?? 0), 0)

  const save = async (id, patch) => {
    try {
      await updateProduct(id, patch)
    } catch (e) {
      alert(e.message)
      reload()
    }
  }

  return (
    <>
      <div className="adm-stats">
        <Stat k="PRODUCTS" v={products.length} />
        <Stat k="UNITS" v={units} />
        <Stat k="STOCK VALUE" v={npr(value)} gold />
      </div>
      <div className="adm-toolbar">
        <input type="search" placeholder="Search stock ledger…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={album} onChange={(e) => setAlbum(e.target.value)}>
          <option value="all">All capsules</option>
          {albumIds.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <button className="adm-btn ghost" onClick={reload}>↻</button>
      </div>
      <div className="adm-card" style={{ padding: 6 }}>
        <table className="adm-table">
          <thead><tr><th>PRODUCT</th><th>CAPSULE</th><th>CATEGORY</th><th>PRICE</th><th>SALE</th><th>STOCK</th><th>STATUS</th><th>DESIGNS</th><th>PHOTOS</th><th /></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><b>{p.title}</b></td>
                <td className="adm-mono">{p.album_id || '—'}</td>
                <td className="adm-mono">{p.category || '—'}</td>
                <td><input type="number" defaultValue={p.price} onBlur={(e) => Number(e.target.value) !== Number(p.price) && save(p.id, { price: Number(e.target.value) })} /></td>
                <td><input type="number" defaultValue={p.sale_price ?? ''} placeholder="—" onBlur={(e) => save(p.id, { sale_price: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                <td><input type="number" defaultValue={p.stock} onBlur={(e) => Number(e.target.value) !== Number(p.stock) && save(p.id, { stock: Number(e.target.value) })} /></td>
                <td>
                  <select defaultValue={p.status} onChange={(e) => save(p.id, { status: e.target.value })}>
                    {['active', 'hidden', 'soldout'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="adm-mono" title={(p.product_variants || []).map((v) => (v.color || '').replace(/^(design|color):/, '')).join(', ') || '—'}>
                  {(p.product_variants || []).length || '—'}
                </td>
                <td className="adm-mono">{(p.images || []).length}</td>
                <td>
                  <button className="adm-btn danger" onClick={() => window.confirm(`Remove “${p.title}”?`) && deleteProduct(p.id).then(reload)}>✕</button>
                </td>
              </tr>
            ))}
            {!busy && !products.length && <tr><td colSpan="9" className="adm-note" style={{ padding: 20 }}>Ledger is empty — add stock first.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── customers ────────────────────────────────────────────────────
function Customers() {
  const { busy, data, err, reload } = useLoad(fetchCustomers)
  if (err) return <Err err={err} retry={reload} />
  const rows = (data || []).map((c) => {
    const orders = (c.orders || []).filter((o) => o.status !== 'cancelled')
    return {
      ...c,
      count: orders.length,
      spent: orders.reduce((s, o) => s + Number(o.total), 0),
      last: orders.map((o) => o.created_at).sort().slice(-1)[0],
    }
  })
  const exportCsv = () => {
    const csv = ['name,phone,email,orders,total_spent,last_order']
      .concat(rows.map((r) => [r.name, r.phone, r.email, r.count, r.spent, r.last || ''].map((x) => `"${x ?? ''}"`).join(',')))
      .join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'vinyl-fashion-customers.csv'
    a.click()
  }
  return (
    <>
      <div className="adm-toolbar">
        <button className="adm-btn ghost" onClick={exportCsv}>⤓ EXPORT CSV</button>
        <button className="adm-btn ghost" onClick={reload}>↻</button>
      </div>
      <div className="adm-card" style={{ padding: 6 }}>
        <table className="adm-table">
          <thead><tr><th>CUSTOMER</th><th>PHONE</th><th>ORDERS</th><th>TOTAL SPENT</th><th>LAST ORDER</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.name || '—'}</b></td>
                <td className="adm-mono">{r.phone}</td>
                <td>{r.count}</td>
                <td>{npr(r.spent)}</td>
                <td className="adm-mono">{r.last ? dt(r.last) : '—'}</td>
              </tr>
            ))}
            {!busy && !rows.length && <tr><td colSpan="5" className="adm-note" style={{ padding: 20 }}>No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── ALBUM STUDIO ─────────────────────────────────────────────────
const PALETTE_KEYS = ['bg0', 'bg1', 'ink', 'accent', 'accent2', 'glow', 'paper']
const FONT_PRESETS = {
  'Opulent serif (Playfair)': { display: "'Playfair Display', Georgia, serif", displayCase: 'uppercase', displayTracking: '0.04em', displayWeight: 700 },
  'Heavy grotesk (Archivo)': { display: "'Archivo', 'Helvetica Neue', sans-serif", displayCase: 'none', displayTracking: '-0.01em', displayWeight: 900 },
  'Airy minimal (Inter)': { display: "'Inter', 'Helvetica Neue', sans-serif", displayCase: 'lowercase', displayTracking: '0.28em', displayWeight: 200 },
  'Script (Great Vibes)': { display: "'Great Vibes', cursive", displayCase: 'lowercase', displayTracking: '0.01em', displayWeight: 400 },
  'Cold condensed (Oswald)': { display: "'Oswald', 'Helvetica Neue', sans-serif", displayCase: 'uppercase', displayTracking: '0.06em', displayWeight: 600 },
  'Pop display (Bungee)': { display: "'Bungee', 'Arial Black', sans-serif", displayCase: 'none', displayTracking: '0.02em', displayWeight: 400 },
  'Editorial serif (Cormorant)': { display: "'Cormorant Garamond', Georgia, serif", displayCase: 'none', displayTracking: '0.02em', displayWeight: 600 },
  'Luxury didone (Bodoni Moda)': { display: "'Bodoni Moda', Georgia, serif", displayCase: 'uppercase', displayTracking: '0.08em', displayWeight: 700 },
  'Street condensed (Bebas Neue)': { display: "'Bebas Neue', 'Arial Narrow', sans-serif", displayCase: 'uppercase', displayTracking: '0.05em', displayWeight: 400 },
  'Industrial mono (Roboto Mono)': { display: "'Roboto Mono', monospace", displayCase: 'uppercase', displayTracking: '0.08em', displayWeight: 600 },
  'Soft modern (DM Sans)': { display: "'DM Sans', system-ui, sans-serif", displayCase: 'none', displayTracking: '0em', displayWeight: 800 },
  'Wide future (Orbitron)': { display: "'Orbitron', system-ui, sans-serif", displayCase: 'uppercase', displayTracking: '0.08em', displayWeight: 700 },
}
const FONT_CHOICES = [
  "'Inter', system-ui, sans-serif",
  "'Space Grotesk', system-ui, sans-serif",
  "'Playfair Display', Georgia, serif",
  "'Archivo', 'Helvetica Neue', sans-serif",
  "'Great Vibes', cursive",
  "'Oswald', 'Helvetica Neue', sans-serif",
  "'Bungee', 'Arial Black', sans-serif",
  "'Cormorant Garamond', Georgia, serif",
  "'Bodoni Moda', Georgia, serif",
  "'Bebas Neue', 'Arial Narrow', sans-serif",
  "'Roboto Mono', monospace",
  "'DM Sans', system-ui, sans-serif",
  "'Orbitron', system-ui, sans-serif",
  "'Cinzel', Georgia, serif",
  "'Anton', 'Arial Black', sans-serif",
  "'Syne', system-ui, sans-serif",
  "'Unbounded', system-ui, sans-serif",
  "'Libre Baskerville', Georgia, serif",
  "'IBM Plex Mono', monospace",
]
const fontName = (font) => String(font).split(',')[0].replace(/^["']|["']$/g, '')

const bakedTracksFor = (cid) => baked[String(cid)]?.tracks || []
const STUDIO_SECTIONS = ['ESSENTIALS', 'SOUND', 'VISUALS', 'COPY']

const slugify = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const JUNK_RE = /karaoke|tribute|in the style|made famous|originally performed|instrumental|8.?bit|lullaby|rendition|cover version|as made popular/i
const normLoose = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Pick the cleanest real release for an {artist,title} from search hits:
// must match artist + title, not be junk, ≥3 tracks; prefer the plainest
// (shortest) title so the original beats deluxe/remaster reissues.
function bestMatch(results, artist, title) {
  const aN = normLoose(artist)
  const tN = normLoose(title)
  return (
    results
      .filter((r) => {
        if (JUNK_RE.test(r.artist || '') || JUNK_RE.test(r.title || '')) return false
        const ra = normLoose(r.artist)
        const rt = normLoose(r.title)
        return (ra.includes(aN) || aN.includes(ra)) && rt.includes(tN) && (r.trackCount || 0) >= 3
      })
      .sort((x, y) => (x.title || '').length - (y.title || '').length)[0] || null
  )
}

function Albums() {
  const { busy, data, err, reload } = useLoad(fetchAlbumRows)
  const [selectedId, setSelectedId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [bulk, setBulk] = useState(null) // { total, done, added, skipped, failed, current, running }
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  // Bulk-import the curated all-genre list as Coming-Soon capsules.
  // Sequential + throttled so iTunes doesn't rate-limit; dedups against
  // what's already in the crate; each becomes a live Coming-Soon record.
  const runBulk = async () => {
    if (bulk?.running) return
    const rowsNow = data || []
    const haveSlug = new Set(rowsNow.map((a) => a.id))
    const haveCid = new Set(rowsNow.map((a) => a.collection_id).filter(Boolean))
    let added = 0, skipped = 0, failed = 0, sort = rowsNow.length
    setBulk({ total: CURATED_ALBUMS.length, done: 0, added: 0, skipped: 0, failed: 0, current: '', running: true })
    for (let i = 0; i < CURATED_ALBUMS.length; i++) {
      const { artist, title } = CURATED_ALBUMS[i]
      setBulk((b) => ({ ...b, done: i, current: `${artist} — ${title}` }))
      const slug = slugify(`${artist}-${title}`)
      if (haveSlug.has(slug)) { skipped++; setBulk((b) => ({ ...b, skipped })); continue }
      try {
        const res = await searchAlbums(`${artist} ${title}`, 25)
        const pick = bestMatch(res, artist, title)
        if (!pick || haveCid.has(pick.collectionId)) {
          skipped++; setBulk((b) => ({ ...b, skipped }))
        } else {
          await createAlbum({
            id: slug, collection_id: Number(pick.collectionId),
            artist: pick.artist, title: pick.title, display_title: (pick.title || '').toUpperCase(),
            year: pick.year || null, label: '', capsule_no: '',
            featured: '', story: '',
            artwork: pick.artwork || null, palette: ALBUMS[0].palette, fonts: ALBUMS[0].fonts,
            ticker: [], notes: [], effects: { comingSoon: true, comingSoonText: 'COMING SOON' },
            clip: {}, status: 'live', sort: sort++,
          })
          haveSlug.add(slug); haveCid.add(pick.collectionId)
          added++; setBulk((b) => ({ ...b, added }))
        }
      } catch { failed++; setBulk((b) => ({ ...b, failed })) }
      await new Promise((r) => setTimeout(r, 550)) // throttle iTunes
    }
    setBulk((b) => ({ ...b, done: CURATED_ALBUMS.length, current: '', running: false }))
    reload()
  }

  if (err) return <Err err={err} retry={reload} />
  const rows = data || []
  const shown = rows.filter((a) => {
    if (filter === 'live' && a.status !== 'live') return false
    if (filter === 'draft' && a.status === 'live') return false
    if (filter === 'soon' && !a.effects?.comingSoon) return false
    const hay = `${a.capsule_no} ${a.artist} ${a.title} ${a.featured}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })
  const selected = shown.find((a) => a.id === selectedId) || shown[0] || null

  const doImport = async () => {
    setImporting(true)
    try { await importSeedAlbums(); reload() } catch (e) { alert(e.message) }
    setImporting(false)
  }

  return (
    <>
      <p className="adm-note" style={{ marginBottom: 14 }}>
        The Album Studio — every capsule's identity, palette, fonts, story, ticker, liner notes,
        the exact portion of the song that plays, and its Coming-Soon state. Storefront updates on
        its next load.
      </p>
      <div className="adm-toolbar">
        <button className="adm-btn" onClick={() => setCreating(true)}>＋ NEW CAPSULE</button>
        <button className="adm-btn ghost" disabled={bulk?.running} onClick={runBulk}>
          {bulk?.running ? 'IMPORTING…' : `＋ IMPORT TOP ${CURATED_ALBUMS.length} ALBUMS (Coming Soon)`}
        </button>
        <button className="adm-btn ghost" disabled={importing} onClick={doImport}>
          {importing ? 'IMPORTING…' : rows.length ? '↻ RE-SYNC SEED CAPSULES' : '＋ IMPORT SEED CAPSULES'}
        </button>
        <button className="adm-btn ghost" onClick={reload}>↻</button>
      </div>
      {bulk && (
        <div className={`adm-bulk ${bulk.running ? 'running' : 'done'}`}>
          <div className="adm-bulk-bar">
            <span style={{ width: `${Math.round((bulk.done / bulk.total) * 100)}%` }} />
          </div>
          <p className="adm-note">
            {bulk.running
              ? `Importing ${bulk.done}/${bulk.total} — ${bulk.current}`
              : `Done · ${bulk.added} added · ${bulk.skipped} not on iTunes / skipped · ${bulk.failed} failed`}
          </p>
        </div>
      )}
      {creating && <NewCapsule onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload() }} onAdded={reload} existing={rows} />}
      {!busy && !rows.length && (
        <div className="adm-empty adm-card"><span>No capsules yet — import the seed or create one.</span></div>
      )}
      {!busy && rows.length > 0 && !shown.length && (
        <div className="adm-empty adm-card"><span>No capsules match that search.</span></div>
      )}
      {selected && (
        <div className="adm-studio">
          <aside className="adm-studio-list" aria-label="Capsules">
            {shown.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`adm-studio-pick ${selected.id === a.id ? 'on' : ''}`}
                onClick={() => setSelectedId(a.id)}
              >
                {a.artwork ? <img src={a.artwork.replace('1200x1200bb', '420x420bb')} alt="" /> : <span className="pick-art" />}
                <span className="pick-copy">
                  <b>{a.capsule_no} · {a.title}</b>
                  <small>{a.artist} · {a.year}</small>
                </span>
                {a.effects?.comingSoon && <span className="pill draft">soon</span>}
              </button>
            ))}
          </aside>
          <AlbumRow key={selected.id} a={selected} onSaved={reload} />
        </div>
      )}
    </>
  )
}

// New capsule — search the iTunes library and import, paste a
// collection id, or fill it in by hand.
function NewCapsule({ onClose, onCreated, onAdded, existing }) {
  const [f, setF] = useState({ id: '', collection_id: '', artist: '', title: '', year: '', artwork: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [added, setAdded] = useState([]) // collectionIds imported this session
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // a slug not already taken (auto-suffix on collision)
  const freeSlug = (title, cid) => {
    let base = slugify(title) || `capsule-${cid}`
    if (!existing.some((a) => a.id === base)) return base
    let n = 2
    while (existing.some((a) => a.id === `${base}-${n}`)) n++
    return `${base}-${n}`
  }

  const doSearch = async () => {
    if (!term.trim()) return
    setSearching(true); setMsg(null)
    try {
      const res = await searchAlbums(term)
      setResults(res)
      if (!res.length) setMsg({ ok: false, text: `Nothing in the library for “${term.trim()}”.` })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setSearching(false)
  }

  // one-click add straight to capsules, enriched with tracklist + hi-res art
  const importAlbum = async (r) => {
    setBusy(true); setMsg(null)
    try {
      let artwork = r.artwork
      let featured = ''
      try {
        const d = await lookupCollection(r.collectionId)
        if (d) { artwork = d.artwork || artwork; featured = d.tracks?.[0]?.name || '' }
      } catch { /* enrich is best-effort — import still proceeds */ }
      await createAlbum({
        id: freeSlug(r.title, r.collectionId), collection_id: Number(r.collectionId),
        artist: r.artist || 'ARTIST', title: r.title, display_title: r.title.toUpperCase(),
        year: r.year ? Number(r.year) : null, label: '', capsule_no: '',
        featured, story: '',
        artwork: artwork || null, palette: ALBUMS[0].palette, fonts: ALBUMS[0].fonts,
        ticker: [], notes: [], effects: { comingSoon: true, comingSoonText: 'COMING SOON' },
        clip: {}, status: 'live', sort: existing.length,
      })
      setAdded((a) => [...a, r.collectionId])
      setMsg({ ok: true, text: `Imported ${r.artist} — ${r.title} as a Coming-Soon capsule.` })
      onAdded?.()
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  const doLookup = async () => {
    setBusy(true); setMsg(null)
    try {
      const d = await lookupCollection(f.collection_id.trim())
      if (!d) throw new Error('No album found for that collection id.')
      setF((s) => ({ ...s, artist: d.artist, title: d.title, year: d.year || '', artwork: d.artwork, id: s.id || slugify(d.title) }))
      setMsg({ ok: true, text: `Found: ${d.artist} — ${d.title} (${d.tracks.length} tracks).` })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  const create = async () => {
    const id = (f.id || slugify(f.title)).trim()
    if (!id || !f.title) { setMsg({ ok: false, text: 'Need at least a title.' }); return }
    if (existing.some((a) => a.id === id)) { setMsg({ ok: false, text: `Slug “${id}” already exists.` }); return }
    setBusy(true); setMsg(null)
    try {
      await createAlbum({
        id, collection_id: f.collection_id ? Number(f.collection_id) : null,
        artist: f.artist || 'ARTIST', title: f.title, display_title: f.title.toUpperCase(),
        year: f.year ? Number(f.year) : null, label: '', capsule_no: '',
        featured: bakedTracksFor(f.collection_id)[0]?.name || '', story: '',
        artwork: f.artwork || null, palette: ALBUMS[0].palette, fonts: ALBUMS[0].fonts,
        ticker: [], notes: [], effects: { comingSoon: true, comingSoonText: 'COMING SOON' },
        clip: {}, status: 'live', sort: existing.length,
      })
      onCreated()
    } catch (e) { setMsg({ ok: false, text: e.message }); setBusy(false) }
  }

  return (
    <div className="qv-overlay" onClick={onClose}>
      <div className="adm-card" style={{ width: 'min(640px,94vw)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <p className="adm-sec-title">NEW CAPSULE</p>
        <div className="adm-form">
          <div className="adm-field full">
            <label>SEARCH THE LIBRARY (artist or album — imports art, tracks & meta)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch() } }}
                placeholder="e.g. Frank Ocean Blonde"
              />
              <button className="adm-btn ghost" disabled={searching || !term.trim()} onClick={doSearch}>
                {searching ? 'SEARCHING…' : 'SEARCH'}
              </button>
            </div>
          </div>
          {results.length > 0 && (
            <div className="adm-lib full">
              {results.map((r) => (
                <div className="adm-lib-card" key={r.collectionId}>
                  {r.artwork
                    ? <img src={r.artwork.replace('1200x1200bb', '200x200bb')} alt="" loading="lazy" />
                    : <span className="adm-lib-art" />}
                  <div className="adm-lib-meta">
                    <b>{r.title}</b>
                    <small>{r.artist} · {r.year || '—'}{r.trackCount ? ` · ${r.trackCount} tracks` : ''}</small>
                  </div>
                  {added.includes(r.collectionId)
                    ? <span className="adm-lib-added">ADDED ✓</span>
                    : <button className="adm-btn" disabled={busy} onClick={() => importAlbum(r)}>IMPORT</button>}
                </div>
              ))}
            </div>
          )}

          <p className="adm-note full" style={{ marginTop: 2 }}>— or add by iTunes ID / by hand —</p>
          <div className="adm-field full"><label>ITUNES COLLECTION ID (optional — auto-fills art, tracks, meta)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={f.collection_id} onChange={set('collection_id')} placeholder="e.g. 1443160553" />
              <button className="adm-btn ghost" disabled={busy || !f.collection_id} onClick={doLookup}>LOOK UP</button>
            </div>
          </div>
          {f.artwork && <div className="full"><img src={f.artwork.replace('1200x1200bb', '300x300bb')} alt="" style={{ width: 90, borderRadius: 8 }} /></div>}
          <div className="adm-field"><label>ARTIST</label><input value={f.artist} onChange={set('artist')} /></div>
          <div className="adm-field"><label>TITLE</label><input value={f.title} onChange={set('title')} /></div>
          <div className="adm-field"><label>YEAR</label><input value={f.year} onChange={set('year')} /></div>
          <div className="adm-field"><label>URL SLUG</label><input value={f.id} onChange={set('id')} placeholder="auto from title" /></div>
          {msg && <div className={`full ${msg.ok ? 'adm-ok' : 'adm-err'}`}>{msg.text}</div>}
          <div className="full adm-actions">
            <button className="adm-btn" disabled={busy} onClick={create}>CREATE (starts as Coming Soon)</button>
            <button className="adm-btn ghost" onClick={onClose}>{added.length ? 'DONE' : 'CANCEL'}</button>
          </div>
          <p className="adm-note full">New capsules start hidden behind a Coming-Soon sticker — flip it off when the drop is ready.</p>
        </div>
      </div>
    </div>
  )
}

function AlbumRow({ a, open = true, onToggle = () => {}, onSaved }) {
  const seed = () => ({
    artist: a.artist || '', title: a.title || '', display_title: a.display_title || '',
    year: a.year ?? '', label: a.label || '', capsule_no: a.capsule_no || '', featured: a.featured || '',
    story: a.story || '', status: a.status || 'live', sort: a.sort ?? 0,
    palette: { ...(a.palette || {}) }, fonts: { ...(a.fonts || {}) },
    ticker: [...(a.ticker || [])], notes: (a.notes || []).map((n) => ({ ...n })), artwork: a.artwork || '',
    comingSoon: !!a.effects?.comingSoon, comingSoonText: a.effects?.comingSoonText || 'COMING SOON',
    clipStart: a.clip?.start ?? '', clipEnd: a.clip?.duration ? (a.clip?.start ?? 0) + a.clip.duration : '', clipDur: a.clip?.duration ?? '', clipSrc: a.clip?.src || '',
  })
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [section, setSection] = useState('ESSENTIALS')
  const edit = f ?? seed()
  const set = (k, v) => setF({ ...edit, [k]: v })

  const save = async () => {
    setBusy(true)
    try {
      await updateAlbumRow(a.id, {
        artist: edit.artist, title: edit.title, display_title: edit.display_title,
        year: edit.year === '' ? null : Number(edit.year), label: edit.label, capsule_no: edit.capsule_no,
        featured: edit.featured, story: edit.story, status: edit.status, sort: Number(edit.sort) || 0,
        palette: edit.palette, fonts: edit.fonts, ticker: edit.ticker.filter(Boolean),
        notes: edit.notes.filter((n) => n.text), artwork: edit.artwork || null,
        effects: { ...a.effects, comingSoon: edit.comingSoon, comingSoonText: edit.comingSoonText },
        clip: edit.clipStart !== '' || edit.clipEnd !== '' || edit.clipSrc
          ? { start: Number(edit.clipStart) || 0, ...(edit.clipEnd !== '' ? { duration: Math.max(0.5, Number(edit.clipEnd) - (Number(edit.clipStart) || 0)) } : {}), ...(edit.clipSrc ? { src: edit.clipSrc } : {}) }
          : {},
      })
      setF(null); onSaved()
    } catch (e) { alert(e.message) }
    setBusy(false)
  }

  const remove = async () => {
    if (!window.confirm(`Delete the ${a.title} capsule? Products keep their album tag but lose the album.`)) return
    try { await deleteAlbum(a.id); onSaved() } catch (e) { alert(e.message) }
  }

  const tracks = bakedTracksFor(a.collection_id)
  useEffect(() => {
    FONT_CHOICES.forEach((font) => ensureFont(font))
  }, [])

  return (
    <div className="adm-album">
      <div className="adm-album-head">
        {edit.artwork ? <img src={edit.artwork.replace('1200x1200bb', '420x420bb')} alt="" /> : <span style={{ width: 40 }} />}
        <span className="t"><b>{a.title}</b><span>{a.artist} · {a.year}</span></span>
        {a.effects?.comingSoon && <span className="pill draft">soon</span>}
        <span className={`pill ${a.status === 'live' ? 'live' : 'draft'}`}>{a.status}</span>
      </div>
      {open && (
        <div className="adm-album-body">
          <StudioPreview edit={edit} />
          <div className="adm-studio-tabs full" role="tablist" aria-label="Capsule editor sections">
            {STUDIO_SECTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={section === s ? 'on' : ''}
                onClick={() => setSection(s)}
              >
                {s}
              </button>
            ))}
          </div>
          {section === 'ESSENTIALS' && (
            <>
          <div className="adm-field"><label>ARTIST</label><input value={edit.artist} onChange={(e) => set('artist', e.target.value)} /></div>
          <div className="adm-field"><label>TITLE</label><input value={edit.title} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="adm-field full"><label>DISPLAY TITLE (use ↵ for line breaks)</label>
            <textarea style={{ minHeight: 54 }} value={edit.display_title} onChange={(e) => set('display_title', e.target.value)} />
          </div>
          <div className="adm-field"><label>YEAR</label><input value={edit.year} onChange={(e) => set('year', e.target.value)} /></div>
          <div className="adm-field"><label>LABEL</label><input value={edit.label} onChange={(e) => set('label', e.target.value)} /></div>
          <div className="adm-field"><label>SHELF ORDER</label><input type="number" value={edit.sort} onChange={(e) => set('sort', e.target.value)} /></div>
          {/* status + coming soon */}
          <div className="adm-field"><label>STATUS</label>
            <select value={edit.status} onChange={(e) => set('status', e.target.value)}>
              {['live', 'draft'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="adm-field"><label>COMING SOON</label>
            <select value={edit.comingSoon ? 'yes' : 'no'} onChange={(e) => set('comingSoon', e.target.value === 'yes')}>
              <option value="no">no — open & shoppable</option>
              <option value="yes">yes — sticker, locked</option>
            </select>
          </div>
          {edit.comingSoon && (
            <div className="adm-field full"><label>COMING-SOON STICKER TEXT</label>
              <input value={edit.comingSoonText} onChange={(e) => set('comingSoonText', e.target.value)} placeholder="COMING SOON" />
            </div>
          )}
          <div className="adm-field full"><label>COVER ART OVERRIDE</label>
            <UploadField accept="image/*" label="Upload cover" onUploaded={(url) => set('artwork', url)} prefix="covers" />
            {edit.artwork && <span className="adm-note" style={{ marginLeft: 8 }}>set</span>}
          </div>
            </>
          )}

          {/* featured song + clip */}
          {section === 'SOUND' && (
            <>
          <div className="adm-field full"><label>FEATURED SONG</label>
            {tracks.length ? (
              <select value={edit.featured} onChange={(e) => set('featured', e.target.value)}>
                {!tracks.some((t) => t.name === edit.featured) && <option value={edit.featured}>{edit.featured || '— pick —'}</option>}
                {tracks.map((t) => <option key={t.id} value={t.name}>{t.num}. {t.name}</option>)}
              </select>
            ) : (
              <input value={edit.featured} onChange={(e) => set('featured', e.target.value)} placeholder="song name" />
            )}
          </div>
          <ClipEditor album={a} edit={edit} set={set} />
            </>
          )}

          {/* palette */}
          {section === 'VISUALS' && (
            <>
          <div className="adm-field full"><label>PALETTE</label>
            <div className="adm-swatches">
              {PALETTE_KEYS.map((k) => (
                <span className="adm-swatch" key={k}>
                  <input type="color" value={edit.palette[k] || '#000000'} onChange={(e) => set('palette', { ...edit.palette, [k]: e.target.value })} />
                  <span>{k}</span>
                </span>
              ))}
            </div>
          </div>

          {/* fonts */}
          <div className="adm-field full"><label>FONT PRESET</label>
            <select value="" onChange={(e) => { const p = FONT_PRESETS[e.target.value]; if (p) set('fonts', { ...edit.fonts, ...p }) }}>
              <option value="">— apply a preset —</option>
              {Object.keys(FONT_PRESETS).map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <FontSelect label="DISPLAY FONT" value={edit.fonts.display || ''} onChange={(v) => set('fonts', { ...edit.fonts, display: v })} />
          <FontSelect label="BODY FONT" value={edit.fonts.body || ''} onChange={(v) => set('fonts', { ...edit.fonts, body: v })} />
          <div className="adm-field"><label>CASE</label>
            <select value={edit.fonts.displayCase || 'none'} onChange={(e) => set('fonts', { ...edit.fonts, displayCase: e.target.value })}>
              {['none', 'uppercase', 'lowercase'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="adm-field"><label>TRACKING</label><input value={edit.fonts.displayTracking || ''} onChange={(e) => set('fonts', { ...edit.fonts, displayTracking: e.target.value })} placeholder="0.04em" /></div>
          <div className="adm-field"><label>WEIGHT</label><input type="number" value={edit.fonts.displayWeight || ''} onChange={(e) => set('fonts', { ...edit.fonts, displayWeight: Number(e.target.value) })} /></div>
            </>
          )}

          {/* ticker */}
          {section === 'COPY' && (
            <>
          <div className="adm-field full"><label>STORY</label><textarea value={edit.story} onChange={(e) => set('story', e.target.value)} /></div>
          <div className="adm-field full"><label>TICKER LINES</label>
            <ListEditor items={edit.ticker} onChange={(v) => set('ticker', v)} placeholder="TICKER LINE" />
          </div>

          {/* liner notes */}
          <div className="adm-field full"><label>LINER NOTES (editorial cards between garments)</label>
            <NotesEditor notes={edit.notes} onChange={(v) => set('notes', v)} />
          </div>

          {/* cover override */}
            </>
          )}

          <div className="full adm-actions" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', gap: 8 }}>
              <button className="adm-btn" disabled={busy || !f} onClick={save}>{busy ? 'SAVING…' : 'SAVE CAPSULE'}</button>
              {f && <button className="adm-btn ghost" onClick={() => setF(null)}>DISCARD</button>}
            </span>
            <button className="adm-btn danger" onClick={remove}>DELETE CAPSULE</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Live preview — the capsule's palette + type applied to a mini hero,
// updating as you edit. What you see is what the storefront becomes.
function StudioPreview({ edit }) {
  const p = edit.palette || {}
  const fo = edit.fonts || {}
  useEffect(() => {
    ensureFont(fo.display)
    ensureFont(fo.body)
  }, [fo.display, fo.body])
  const lines = (edit.display_title || edit.title || '').split('\n')
  return (
    <div className="adm-preview full" style={{ background: `linear-gradient(158deg, ${p.bg1 || '#333'}, ${p.bg0 || '#111'})`, color: p.ink || '#fff' }}>
      <span className="adm-preview-tag">LIVE PREVIEW</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.28em', opacity: 0.6 }}>
        {[edit.year, edit.label].filter(Boolean).join(' · ')}
      </span>
      <h4
        style={{
          fontFamily: fo.display || 'inherit',
          textTransform: fo.displayCase || 'none',
          letterSpacing: fo.displayTracking || 'normal',
          fontWeight: fo.displayWeight || 700,
          fontSize: 'clamp(20px,3vw,34px)',
          lineHeight: 1.05,
          margin: '4px 0',
          textShadow: `0 0 44px ${(p.glow || '#000')}66`,
        }}
      >
        {lines.map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}
      </h4>
      <p style={{ fontFamily: fo.body || 'inherit', fontWeight: 300, fontSize: 12, lineHeight: 1.6, opacity: 0.82, maxWidth: '48ch' }}>
        {edit.story || '—'}
      </p>
      <span className="adm-preview-chip" style={{ background: p.accent || '#888', color: p.bg0 || '#000' }}>
        ▸ DROP THE NEEDLE — {(edit.featured || '').toUpperCase()}
      </span>
      <div className="adm-preview-swatches">
        {PALETTE_KEYS.map((k) => <i key={k} style={{ background: p[k] || '#000' }} title={`${k} ${p[k] || ''}`} />)}
      </div>
    </div>
  )
}

function FontSelect({ label, value, onChange }) {
  const options = FONT_CHOICES.includes(value) || !value ? FONT_CHOICES : [value, ...FONT_CHOICES]
  return (
    <div className="adm-field adm-font-select">
      <label>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontFamily: value || undefined }}
      >
        {options.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {fontName(font)}
          </option>
        ))}
      </select>
    </div>
  )
}

// Pick ANY portion of the featured song. Uses the uploaded full song
// if present, otherwise the 30-second preview.
function ClipEditor({ album, edit, set }) {
  const audioRef = useRef(null)
  const [dur, setDur] = useState(0)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)

  const tracks = bakedTracksFor(album.collection_id)
  const feat = tracks.find((x) => x.name === edit.featured) || tracks[0]
  const src = edit.clipSrc || feat?.previewUrl || ''
  const usingFull = !!edit.clipSrc

  const max = Math.max(1, dur || 30)
  const start = Math.max(0, Math.min(Number(edit.clipStart) || 0, max - 0.5))
  const savedEnd = edit.clipEnd !== '' ? Number(edit.clipEnd) : start + (Number(edit.clipDur) || 8)
  const end = Math.max(start + 0.5, Math.min(max, savedEnd || start + 8))

  useEffect(() => () => audioRef.current?.pause(), [])

  const setStart = (value) => {
    const nextStart = Math.max(0, Math.min(Number(value) || 0, end - 0.5))
    set('clipStart', String(nextStart))
    if (audioRef.current) audioRef.current.currentTime = nextStart
  }

  const setEnd = (value) => {
    const nextEnd = Math.min(max, Math.max(Number(value) || 0, start + 0.5))
    set('clipEnd', String(nextEnd))
  }

  const preview = () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
      return
    }
    el.currentTime = start
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  return (
    <div className="adm-field full adm-clip">
      <label>PLAYED PORTION — pick any part of the song (IG-story style)</label>
      {src ? (
        <>
          <audio
            ref={audioRef}
            src={src}
            preload="metadata"
            onLoadedMetadata={(e) => setDur(e.target.duration || 0)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(e) => {
              const now = e.target.currentTime
              setT(now)
              if (now >= end) {
                e.target.pause()
                setPlaying(false)
              }
            }}
          />
          <div className="adm-clip-window">
            <div className="adm-clip-window-bar">
              <span
                className="adm-clip-window-fill"
                style={{
                  left: `${(start / max) * 100}%`,
                  width: `${Math.max(0, ((end - start) / max) * 100)}%`,
                }}
              />
              <span className="adm-clip-playhead" style={{ left: `${(Math.min(t, max) / max) * 100}%` }} />
            </div>
            <div className="adm-clip-stamps">
              <b>{fmt(start)}</b>
              <span>{fmt(end - start)} selected</span>
              <b>{fmt(end)}</b>
            </div>
          </div>
          <div className="adm-clip-row">
            <span className="adm-mono">START</span>
            <input
              type="range" min="0" max={Math.max(1, Math.floor(dur))} step="0.5"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <span className="adm-mono adm-clip-time">{fmt(start)}</span>
          </div>
          <div className="adm-clip-row">
            <span className="adm-mono">END</span>
            <input
              type="range" min="0.5" max={Math.max(1, Math.floor(dur))} step="0.5"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            <span className="adm-mono adm-clip-time">{fmt(end)}</span>
          </div>
          <div className="adm-clip-row">
            <span className="adm-mono">START</span>
            <input type="number" min="0" step="0.5" value={start} onChange={(e) => setStart(e.target.value)} />
            <span className="adm-mono">END</span>
            <input type="number" min="0.5" step="0.5" value={end} onChange={(e) => setEnd(e.target.value)} />
            <button className="adm-btn ghost" type="button" onClick={() => setStart(String(Math.round(t)))}>SET START = NOW ({fmt(t)})</button>
            <button className="adm-btn" type="button" onClick={preview}>{playing ? 'PAUSE PREVIEW' : 'PREVIEW CLIP'}</button>
          </div>
          <p className="adm-note">
            Source: {usingFull ? 'uploaded full song ✓ (pick any timestamp)' : `30-second preview — limited to 0–${Math.floor(dur)}s`}
          </p>
        </>
      ) : (
        <p className="adm-note">No preview available for this album — upload the full song below to set a clip.</p>
      )}
      <div className="adm-clip-row">
        <UploadField accept="audio/*" label="Upload full song" prefix="audio" onUploaded={(url) => set('clipSrc', url)} />
        {edit.clipSrc && <button className="adm-btn ghost" type="button" onClick={() => set('clipSrc', '')}>use preview instead</button>}
      </div>
    </div>
  )
}

const fmt = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

function ListEditor({ items, onChange, placeholder }) {
  return (
    <div className="adm-list">
      {items.map((it, i) => (
        <div className="adm-list-row" key={i}>
          <input value={it} placeholder={placeholder} onChange={(e) => { const c = [...items]; c[i] = e.target.value; onChange(c) }} />
          <button className="adm-btn danger" type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="adm-btn ghost" type="button" onClick={() => onChange([...items, ''])}>＋ ADD</button>
    </div>
  )
}

function NotesEditor({ notes, onChange }) {
  const upd = (i, patch) => { const c = notes.map((n) => ({ ...n })); c[i] = { ...c[i], ...patch }; onChange(c) }
  return (
    <div className="adm-list">
      {notes.map((n, i) => (
        <div className="adm-note-row" key={i}>
          <input style={{ width: 70 }} type="number" min="0" value={n.after ?? 1} title="after garment #" onChange={(e) => upd(i, { after: Number(e.target.value) })} />
          <input style={{ flex: '0 0 130px' }} value={n.kicker || ''} placeholder="KICKER" onChange={(e) => upd(i, { kicker: e.target.value })} />
          <input style={{ flex: 1 }} value={n.text || ''} placeholder="Liner note text…" onChange={(e) => upd(i, { text: e.target.value })} />
          <button className="adm-btn danger" type="button" onClick={() => onChange(notes.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="adm-btn ghost" type="button" onClick={() => onChange([...notes, { after: 1, kicker: '', text: '' }])}>＋ ADD NOTE</button>
    </div>
  )
}

function UploadField({ accept, label, prefix, onUploaded }) {
  const [busy, setBusy] = useState(false)
  return (
    <label className={`adm-btn ghost ${busy ? '' : ''}`} style={{ cursor: 'pointer' }}>
      {busy ? 'UPLOADING…' : label}
      <input
        type="file" accept={accept} hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]; if (!file) return
          setBusy(true)
          try { onUploaded(await uploadAlbumAsset(file, prefix)) } catch (ex) { alert(ex.message) }
          setBusy(false); e.target.value = ''
        }}
      />
    </label>
  )
}

// ── settings: the storefront's editable identity ─────────────────
const SETTING_FIELDS = [
  ['brand', 'name', 'BRAND NAME', 'VINYL FASHION'],
  ['brand', 'mark', 'MONOGRAM (2–3 letters)', 'VF'],
  ['brand', 'tagline', 'TAGLINE', 'WEAR THE SOUND'],
  ['brand', 'est', 'EST. LINE', 'EST. MMXXVI'],
  ['contact', 'whatsapp', 'WHATSAPP (intl, no +)', '9779818981912'],
  ['contact', 'whatsappDisplay', 'WHATSAPP (display)', '+977 98-1898-1912'],
  ['contact', 'instagram', 'INSTAGRAM HANDLE (no @)', 'vinylfashion.np'],
  ['contact', 'email', 'EMAIL', 'hello@vinylfashion.com'],
  ['contact', 'city', 'CITY LINE', 'KATHMANDU'],
]

function Settings({ email }) {
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    getSiteSettings()
      .then((v) =>
        setForm({
          brand: { ...BRANDDefaults(), ...(v?.brand || {}) },
          contact: { ...CONTACTDefaults(), ...(v?.contact || {}) },
        })
      )
      .catch(() => setForm({ brand: BRANDDefaults(), contact: CONTACTDefaults() }))
  }, [])

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      await saveSiteSettings(form)
      setMsg({ ok: true, text: 'Saved — the storefront picks this up on its next load.' })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setBusy(false)
  }

  return (
    <div className="adm-form" style={{ maxWidth: 760 }}>
      <div className="adm-card full">
        <p className="adm-sec-title">STOREFRONT IDENTITY — edits every visitor sees</p>
        {!form ? (
          <p className="adm-note">Loading…</p>
        ) : (
          <div className="adm-form" style={{ marginTop: 6 }}>
            {SETTING_FIELDS.map(([group, key, label, ph]) => (
              <div className="adm-field" key={`${group}.${key}`}>
                <label>{label}</label>
                <input
                  value={form[group][key] ?? ''}
                  placeholder={ph}
                  onChange={(e) =>
                    setForm({ ...form, [group]: { ...form[group], [key]: e.target.value } })
                  }
                />
              </div>
            ))}
            {msg && <div className={`full ${msg.ok ? 'adm-ok' : 'adm-err'}`}>{msg.text}</div>}
            <div className="full">
              <button className="adm-btn" disabled={busy} onClick={save}>
                {busy ? 'SAVING…' : 'SAVE STOREFRONT SETTINGS'}
              </button>
            </div>
          </div>
        )}
      </div>
      <CategoriesCard />
      <div className="adm-card full">
        <p className="adm-sec-title">SESSION</p>
        <div className="adm-detail" style={{ position: 'static' }}>
          <div className="row"><span>Signed in as</span><b>{email}</b></div>
          <div className="row"><span>Admin route</span><b className="adm-mono">/{import.meta.env.VITE_ADMIN_PATH || '33rpm'}</b></div>
        </div>
        <p className="adm-note" style={{ marginTop: 10 }}>
          · Admins are managed in the <b>admin_users</b> table — add a row to invite one.<br />
          · Change your password in Supabase → Authentication → Users.<br />
          · Security is enforced by row-level security in the database, not by this UI.
        </p>
      </div>
      <div className="full">
        <button className="adm-btn ghost" onClick={() => signOut()}>SIGN OUT</button>
      </div>
    </div>
  )
}

// Manage the product category list used by Add Stock.
function CategoriesCard() {
  const [list, setList] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    getCategories()
      .then((c) => setList(c.length ? c : ['Outerwear', 'Tops', 'Knitwear', 'Headwear', 'Bottoms']))
      .catch(() => setList(['Outerwear', 'Tops']))
  }, [])
  const save = async () => {
    setBusy(true); setMsg(null)
    try {
      await saveCategories((list || []).map((s) => s.trim()).filter(Boolean))
      setMsg('Saved — Add Stock uses these now.')
    } catch (e) { setMsg(e.message) }
    setBusy(false)
  }
  return (
    <div className="adm-card full">
      <p className="adm-sec-title">PRODUCT CATEGORIES — the dropdown in Add Stock</p>
      {!list ? <p className="adm-note">Loading…</p> : (
        <>
          <ListEditor items={list} onChange={setList} placeholder="Category name" />
          {msg && <div className="adm-ok" style={{ marginTop: 10 }}>{msg}</div>}
          <div style={{ marginTop: 10 }}>
            <button className="adm-btn" disabled={busy} onClick={save}>{busy ? 'SAVING…' : 'SAVE CATEGORIES'}</button>
          </div>
        </>
      )}
    </div>
  )
}

const BRANDDefaults = () => ({ name: BRAND.name, mark: BRAND.mark, tagline: BRAND.tagline, est: BRAND.est })
const CONTACTDefaults = () => ({
  whatsapp: CONTACT.whatsapp,
  whatsappDisplay: CONTACT.whatsappDisplay,
  instagram: CONTACT.instagram,
  email: CONTACT.email,
  city: CONTACT.city,
})

const Err = ({ err, retry }) => (
  <div className="adm-err" style={{ maxWidth: 560 }}>
    {String(err)} — <button className="adm-btn ghost" style={{ padding: '6px 10px' }} onClick={retry}>retry</button>
  </div>
)
