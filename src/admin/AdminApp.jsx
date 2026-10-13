import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ALBUMS, makePlaceholderCapsule } from '../data/albums'
import { CURATED_ALBUMS } from '../data/curatedAlbums'
import baked from '../data/tracks.json'
import ColorPicker from './ColorPicker'
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
  updateVariant,
  addVariants,
  deleteVariants,
  duplicateProduct,
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
        <a className="adm-nav-btn" href="/" target="_blank" rel="noopener noreferrer">
          <span className="label">STOREFRONT ↗</span>
        </a>
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

// quick-fill presets for the size & color pickers
const SIZE_PRESETS = {
  alpha: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  numeric: ['28', '30', '32', '34', '36', '38', '40'],
  fit: ['Cropped Box', 'Regular', 'Oversize'],
}
const COLOR_PRESETS = {
  base: [
    { name: 'Black', hex: '#141414' }, { name: 'White', hex: '#f2f0ea' }, { name: 'Navy', hex: '#1d2a44' },
    { name: 'Charcoal', hex: '#3a3a3a' }, { name: 'Gray', hex: '#8d8d8d' },
  ],
  vibrant: [
    { name: 'Red', hex: '#c22d2d' }, { name: 'Royal Blue', hex: '#2d50c2' }, { name: 'Forest Green', hex: '#1f5e38' },
    { name: 'Crimson', hex: '#8f1030' }, { name: 'Burgundy', hex: '#5e1a26' },
  ],
  earth: [
    { name: 'Tan', hex: '#c9a476' }, { name: 'Cream', hex: '#efe6d2' }, { name: 'Olive', hex: '#6b6b3a' },
    { name: 'Rust', hex: '#a4502a' }, { name: 'Khaki', hex: '#9a8b62' },
  ],
}

function AddStock() {
  const [f, setF] = useState(EMPTY)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [cats, setCats] = useState([])
  const [albumList, setAlbumList] = useState(
    ALBUMS.map((a) => ({ id: a.id, capsule_no: a.capsuleNo, title: a.title, status: 'live', effects: a.effects }))
  )
  // Has the user chosen a capsule by hand? Until they do, the form
  // retargets itself to a shoppable album once the real list lands —
  // the seed's first entry is whatever happens to sit at the top of
  // albums.js, and dropping new pieces on a locked Coming-Soon capsule
  // hides them from the storefront with no warning.
  const albumPicked = useRef(false)
  const [selectedSlot, setSelectedSlot] = useState(0)
  const fileRef = useRef(null)
  const [sizeInput, setSizeInput] = useState('')
  const [colorRows, setColorRows] = useState([])
  const [openPicker, setOpenPicker] = useState(null) // index of the open colour wheel
  // design variants: each has a name and can optionally also come in a
  // mirrored / flipped orientation (front↔back), which expands to a
  // second design label automatically.
  const [designRows, setDesignRows] = useState([])
  // combos the user has switched OFF (e.g. Cyan has no Blue design).
  // keyed "colour¦design"; absent = the combo exists.
  const [excluded, setExcluded] = useState({})
  // an optional photo per colour×design combo, keyed "colour¦design".
  // overrides the colour's default photo when that combo is selected.
  const [comboPhotos, setComboPhotos] = useState({})
  // an optional photo per exact colour×design×size cell, keyed
  // "colour¦design¦size" — the most specific override of all.
  const [sizePhotos, setSizePhotos] = useState({})
  // per-combo stock: "colour¦design¦size" → count ('' while editing).
  // untouched cells default to 1, like a fresh pressing of each combo.
  const [cells, setCells] = useState({})
  // per-combo price overrides, same keys as `cells`. Blank = charge the
  // product price typed above; a number here overrides it for that line.
  const [prices, setPrices] = useState({})
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  // sizes/colors are freeform and kept as ordered, de-duped chip lists
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

  // colour variants: swatch + name + an optional photo of the garment in
  // that colour — the storefront swatch and photo-jump come from these
  const setColorRow = (i, patch) => setColorRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const removeColorRow = (i) => setColorRows((rs) => rs.filter((_, j) => j !== i))
  const addColorRows = (list) =>
    setColorRows((rs) => [
      ...rs,
      // only dedupe real names — blank rows (＋ ADD COLOUR) always add
      ...list
        .filter((c) => !c.name.trim() || !rs.some((r) => r.name.trim().toLowerCase() === c.name.trim().toLowerCase()))
        .map((c) => ({ file: null, ...c })),
    ])
  // design rows: name + optional flipped orientation
  const setDesignRow = (i, patch) => setDesignRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const removeDesignRow = (i) => setDesignRows((rs) => rs.filter((_, j) => j !== i))
  const addDesignRow = () => setDesignRows((rs) => [...rs, { name: '', flipped: false }])

  // ── the combo calibration grid (colour × design × size) ─────────
  const namedColors = colorRows.filter((r) => r.name.trim())
  // a design that also comes flipped expands into two labels
  const designLabels = designRows
    .filter((d) => d.name.trim())
    .flatMap((d) => (d.flipped ? [d.name.trim(), `${d.name.trim()} (flipped)`] : [d.name.trim()]))
  const effColors = namedColors.length ? namedColors : [null] // null = one colour
  const effDesigns = designLabels.length ? designLabels : [null] // null = one design
  const effSizes = f.sizes.length ? f.sizes : [null] // null = one-size
  const showGrid = namedColors.length > 0 || designLabels.length > 0 || f.sizes.length > 0

  const comboKey = (c, d) => `${c ? c.name.trim() : ''}¦${d || ''}`
  const cellKey = (c, d, sz) => `${c ? c.name.trim() : ''}¦${d || ''}¦${sz || ''}`
  const isExcluded = (c, d) => !!excluded[comboKey(c, d)]
  const setComboPhoto = (c, d, file) => setComboPhotos((m) => ({ ...m, [comboKey(c, d)]: file }))
  const setSizePhoto = (c, d, sz, file) => setSizePhotos((m) => ({ ...m, [cellKey(c, d, sz)]: file }))
  const toggleCombo = (c, d) =>
    setExcluded((x) => {
      const k = comboKey(c, d)
      const next = { ...x }
      if (next[k]) delete next[k]
      else next[k] = true
      return next
    })
  // every colour×design pairing the user hasn't switched off
  const activeCombos = effColors
    .flatMap((c) => effDesigns.map((d) => ({ c, d })))
    .filter(({ c, d }) => !isExcluded(c, d))

  const cellShown = (k) => (cells[k] === undefined ? 1 : cells[k])
  // blank / junk / zero → no override
  const cellPrice = (k) => {
    const n = Number(prices[k])
    return prices[k] !== undefined && prices[k] !== '' && Number.isFinite(n) && n > 0 ? n : null
  }
  const cellNum = (k) => {
    const v = cells[k]
    if (v === undefined) return 1
    const n = Math.floor(Number(v))
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const gridTotal = showGrid
    ? activeCombos.reduce((s, { c, d }) => s + effSizes.reduce((t, sz) => t + cellNum(cellKey(c, d, sz)), 0), 0)
    : Number(f.stock) || 0

  const previews = useMemo(() => files.map((fl) => URL.createObjectURL(fl)), [files])
  const selectedAlbum = albumList.find((a) => a.id === f.album_id)
  const seedAlbum = ALBUMS.find((a) => a.id === f.album_id)
  // Shoppable capsules first — the picker runs to ~90 records, and the
  // ones a new piece will actually surface on belong at the top.
  const albumGroups = useMemo(() => {
    const openRows = []
    const lockedRows = []
    for (const a of albumList) {
      if (a.status === 'live' && !a.effects?.comingSoon) openRows.push(a)
      else lockedRows.push(a)
    }
    return { openRows, lockedRows }
  }, [albumList])
  // a piece filed here won't reach the storefront until the capsule opens
  const targetLocked = !!selectedAlbum && (selectedAlbum.status !== 'live' || !!selectedAlbum.effects?.comingSoon)
  const mockSlots = seedAlbum?.capsule?.length ? seedAlbum.capsule : makePlaceholderCapsule()

  useEffect(() => {
    getCategories().then((c) => c.length && setCats(c)).catch(() => {})
    fetchAlbumRows()
      .then((r) => {
        if (!r?.length) return
        setAlbumList(r)
        if (albumPicked.current) return
        // land on somewhere the piece will actually be visible: an open
        // capsule first, then any live one, else whatever's first
        const open = r.find((a) => a.status === 'live' && !a.effects?.comingSoon)
        const target = open || r.find((a) => a.status === 'live') || r[0]
        if (target) setF((s) => ({ ...s, album_id: target.id }))
      })
      .catch(() => {})
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
      // photos are appended after the main carousel, in a fixed order:
      //   [main] → [colour defaults] → [combo photos] → [per-size photos]
      // each level remembers the index of its own uploaded shot
      let nextIdx = files.length
      const colorImg = new Map()
      const colorFiles = []
      namedColors.forEach((r) => {
        if (r.file) { colorImg.set(r, nextIdx++); colorFiles.push(r.file) }
        else colorImg.set(r, '')
      })
      const comboImg = new Map() // comboKey → image index
      const comboFiles = []
      activeCombos.forEach(({ c, d }) => {
        const file = comboPhotos[comboKey(c, d)]
        if (file) { comboImg.set(comboKey(c, d), nextIdx++); comboFiles.push(file) }
      })
      const sizeImg = new Map() // cellKey → image index
      const sizeFiles = []
      activeCombos.forEach(({ c, d }) =>
        effSizes.forEach((sz) => {
          const file = sizePhotos[cellKey(c, d, sz)]
          if (file) { sizeImg.set(cellKey(c, d, sz), nextIdx++); sizeFiles.push(file) }
        })
      )
      const allFiles = [...files, ...colorFiles, ...comboFiles, ...sizeFiles]
      // the photo a specific colour×design×size shows: its own → its
      // combo's → its colour's default → none
      const resolveImg = (c, d, sz) => {
        const ck = cellKey(c, d, sz)
        if (sizeImg.has(ck)) return sizeImg.get(ck)
        const mk = comboKey(c, d)
        if (comboImg.has(mk)) return comboImg.get(mk)
        return c ? colorImg.get(c) : ''
      }
      const comboColor = (c, d, img) =>
        encodeCombo({ name: c ? c.name : '', hex: c ? c.hex : '', imgIdx: img, design: d })
      // every active colour×design×size combo becomes its own stock row
      const combos = showGrid
        ? activeCombos.flatMap(({ c, d }) =>
            effSizes.map((sz) => ({
              color: comboColor(c, d, resolveImg(c, d, sz)),
              size: sz || null,
              stock: cellNum(cellKey(c, d, sz)),
              price: cellPrice(cellKey(c, d, sz)),
            }))
          )
        : null
      await addProduct(
        {
          title: f.title.trim(),
          album_id: f.album_id,
          garment_type: f.garment_type,
          category: f.category || null,
          price: Number(f.price) || 0,
          sale_price: f.sale_price ? Number(f.sale_price) : null,
          stock: gridTotal, // product total = sum of the variant grid
          description: f.description || null,
          ai_info: f.ai_info || null,
          caption: f.caption || null,
        },
        allFiles,
        [], // designs now ride inside the combos
        combos
      )
      setMsg({ ok: true, text: `“${f.title}” added to the ${f.album_id} capsule.` })
      setF({ ...EMPTY, album_id: f.album_id })
      setFiles([])
      setColorRows([])
      setDesignRows([])
      setExcluded({})
      setComboPhotos({})
      setSizePhotos({})
      setCells({})
      setPrices({})
      if (fileRef.current) fileRef.current.value = ''
    } catch (ex) {
      setMsg({ ok: false, text: ex.message })
    }
    setBusy(false)
  }

  // Jump-to nav for a form that runs well past one screen. Each step
  // reports whether it has anything in it yet, so an unfinished section
  // is visible without scrolling the whole way down.
  const STEPS = [
    ['s1', '1', 'BASICS', !!f.title.trim()],
    ['s2', '2', 'DESIGNS', designRows.some((d) => (d.name || '').trim())],
    ['s3', '3', 'COLOURS', colorRows.some((c) => (c.name || '').trim())],
    ['s4', '4', 'SIZES', f.sizes.length > 0],
    ['s5', '5', 'STOCK', gridTotal > 0],
    ['s6', '6', 'PHOTOS', files.length > 0],
  ]

  return (
    <form className="adm-form" onSubmit={submit}>
      <nav className="adm-steps full" aria-label="Form sections">
        {STEPS.map(([id, n, label, done]) => (
          <a key={id} href={`#${id}`} className={`adm-step ${done ? 'done' : ''}`}>
            <b>{done ? '✓' : n}</b> {label}
          </a>
        ))}
        <span className="adm-steps-total">{gridTotal} units</span>
      </nav>
      <div className="adm-stock-context full">
        <div>
          <p className="adm-sec-title">ADDING TO {selectedAlbum?.title || seedAlbum?.title || f.album_id}</p>
          {targetLocked ? (
            <p className="adm-warn">
              ⚠ This capsule is {selectedAlbum.status !== 'live' ? 'a draft' : 'on the Coming-Soon wall'} — shoppers
              can't open it, so anything you add here stays invisible on the storefront until you open it in the Album
              Studio. Pick an OPEN capsule above if this piece is meant to sell now.
            </p>
          ) : (
            <p className="adm-note">
              Placeholder capsule slots stay on the storefront until this album has real stock. Once you add products here, those real pieces replace the placeholder grid for this capsule.
            </p>
          )}
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
      <div id="s1" className="adm-sect-head full"><span>1</span> THE BASICS</div>
      <div className="adm-field full"><label>TITLE</label><input required value={f.title} onChange={set('title')} placeholder="Runaway Varsity" /></div>
      <div className="adm-field"><label>CAPSULE / ALBUM</label>
        <select
          value={f.album_id}
          onChange={(e) => {
            albumPicked.current = true
            set('album_id')(e)
          }}
        >
          {albumGroups.openRows.length > 0 && (
            <optgroup label="OPEN — PIECES GO LIVE">
              {albumGroups.openRows.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </optgroup>
          )}
          {albumGroups.lockedRows.length > 0 && (
            <optgroup label="LOCKED — PIECES STAY HIDDEN">
              {albumGroups.lockedRows.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} {a.status !== 'live' ? '— draft' : '— coming soon'}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      <div className="adm-field"><label>GARMENT TYPE (placeholder art)</label>
        <select value={f.garment_type} onChange={set('garment_type')}>
          {GARMENTS.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div className="adm-field"><label>PRICE (NPR)</label><input required type="number" min="0" value={f.price} onChange={set('price')} /></div>
      <div className="adm-field"><label>SALE PRICE (optional)</label><input type="number" min="0" value={f.sale_price} onChange={set('sale_price')} /></div>
      <div className="adm-field"><label>{showGrid ? 'STOCK (auto — from the grid)' : 'STOCK COUNT'}</label>
        {showGrid
          ? <input value={gridTotal} readOnly style={{ opacity: 0.65 }} />
          : <input type="number" min="0" value={f.stock} onChange={set('stock')} />}
      </div>
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

      <div id="s2" className="adm-sect-head full"><span>2</span> DESIGNS
        <em>e.g. Blue silhouette, Black silhouette — tick “also flipped” for a mirrored front↔back version</em>
      </div>
      <div className="adm-field full">
        {designRows.map((d, i) => (
          <div className="adm-design-row" key={i}>
            <input
              className="adm-design-name"
              value={d.name}
              onChange={(e) => setDesignRow(i, { name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
              placeholder={`Design ${i + 1} name (e.g. Blue silhouette)`}
            />
            <label className="adm-flip-toggle" title="Also comes mirrored (front↔back swapped)">
              <input type="checkbox" checked={d.flipped} onChange={(e) => setDesignRow(i, { flipped: e.target.checked })} />
              <span>⇄ also flipped</span>
            </label>
            <button type="button" className="adm-chip-btn danger" onClick={() => removeDesignRow(i)}>× Remove</button>
          </div>
        ))}
        <div className="adm-chip-presets">
          <button type="button" className="adm-chip-btn accent" onClick={addDesignRow}>＋ Add design</button>
          {designLabels.length > 0 && (
            <span>{designLabels.length} design{designLabels.length === 1 ? '' : 's'}: {designLabels.join(' · ')}</span>
          )}
        </div>
      </div>

      <div id="s3" className="adm-sect-head full"><span>3</span> COLOURS
        <em>pick from the wheel, name it, add that colour’s own photo</em>
      </div>
      <div className="adm-field full">
        {colorRows.map((r, i) => (
          <div className="adm-color-card" key={i}>
            <div className="adm-color-top">
              <button
                type="button"
                className="adm-color-swatch"
                style={{ background: r.hex || '#888888' }}
                onClick={() => setOpenPicker(openPicker === i ? null : i)}
                title="Open the colour wheel"
                aria-label="Open the colour wheel"
              />
              <input
                className="adm-color-name"
                value={r.name}
                onChange={(e) => setColorRow(i, { name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                placeholder="Colour name (e.g. Sea Green)"
              />
              <button type="button" className="adm-chip-btn danger" onClick={() => { removeColorRow(i); setOpenPicker(null) }}>× Remove</button>
            </div>
            {openPicker === i && (
              <ColorPicker value={r.hex || '#888888'} onChange={(hex) => setColorRow(i, { hex })} />
            )}
            <div className="adm-color-photos">
              {r.file && (
                <span className="adm-color-thumb">
                  <img src={URL.createObjectURL(r.file)} alt="" />
                  <button type="button" onClick={() => setColorRow(i, { file: null })} aria-label="Remove photo">×</button>
                </span>
              )}
              <label className="adm-color-add" title="Photo of the garment in this colour">
                <input type="file" accept="image/*" hidden onChange={(e) => setColorRow(i, { file: e.target.files[0] || null })} />
                <span>{r.file ? '↻ Replace photo' : '＋ Add photo'}</span>
              </label>
            </div>
          </div>
        ))}
        <div className="adm-chip-presets">
          <button type="button" className="adm-chip-btn accent" onClick={() => { addColorRows([{ name: '', hex: '#888888' }]); setOpenPicker(colorRows.length) }}>＋ Add colour</button>
          <span>or quick add:</span>
          <button type="button" onClick={() => addColorRows(COLOR_PRESETS.base)}>Base 5</button>
          <button type="button" onClick={() => addColorRows(COLOR_PRESETS.vibrant)}>Vibrant 5</button>
          <button type="button" onClick={() => addColorRows(COLOR_PRESETS.earth)}>Earth 5</button>
        </div>
      </div>
      <div id="s4" className="adm-sect-head full"><span>4</span> SIZES
        <em>letters or numbers — leave empty for one-size</em>
      </div>
      <div className="adm-field full">
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
          <button type="button" onClick={() => addSizes(SIZE_PRESETS.fit)}>Fit · Cropped/Regular/Oversize</button>
          <button type="button" onClick={() => addSizes(SIZE_PRESETS.alpha)}>Alphabetical · XS–XXL</button>
          <button type="button" onClick={() => addSizes(SIZE_PRESETS.numeric)}>Numerical · 28–40</button>
          <button type="button" onClick={() => addSizes('Free')}>Free size</button>
        </div>
      </div>

      {showGrid && (
        <>
          <div id="s5" className="adm-sect-head full"><span>5</span> STOCK GRID
            <em>every colour × design combo · switch off the ones that don’t exist · set the count per size · type a price under any cell to charge that line differently</em>
          </div>
          <div className="adm-field full">
            <div className="adm-grid-bar">
              <span><b>{activeCombos.length}</b> active combo{activeCombos.length === 1 ? '' : 's'} · <b>{gridTotal}</b> units total</span>
            </div>
            <div className="adm-matrix-wrap">
              <table className="adm-matrix combos">
                <thead>
                  <tr>
                    <th className="cmb-head">COMBO</th>
                    <th className="cmb-photo-h">PHOTO</th>
                    {effSizes.map((sz) => <th key={sz || 'one'}>{sz || 'ONE-SIZE'}</th>)}
                    <th className="cmb-total">Σ</th>
                  </tr>
                </thead>
                <tbody>
                  {effColors.flatMap((c, ci) =>
                    effDesigns.map((d, di) => {
                      const off = isExcluded(c, d)
                      const rowTotal = effSizes.reduce((t, sz) => t + cellNum(cellKey(c, d, sz)), 0)
                      const photo = comboPhotos[comboKey(c, d)]
                      return (
                        <tr key={`${ci}-${di}`} className={off ? 'is-off' : ''}>
                          <th className="cmb-head">
                            <button
                              type="button"
                              className={`cmb-toggle ${off ? '' : 'on'}`}
                              title={off ? 'This combo does not exist — click to include' : 'Click to exclude this combo'}
                              onClick={() => toggleCombo(c, d)}
                            >
                              {off ? '＋' : '✓'}
                            </button>
                            {c && <i className="adm-dot" style={{ background: c.hex || '#888' }} />}
                            <span className="cmb-name">{c ? c.name : 'Any colour'}</span>
                            {d && <span className="cmb-design">{d}</span>}
                          </th>
                          <td className="cmb-photo">
                            <label className="cmb-photo-slot" title="Photo of this exact combo (optional — falls back to the colour photo)">
                              <input type="file" accept="image/*" hidden disabled={off} onChange={(e) => setComboPhoto(c, d, e.target.files[0] || null)} />
                              {photo
                                ? <img src={URL.createObjectURL(photo)} alt="" />
                                : <span>{off ? '—' : '＋'}</span>}
                            </label>
                            {photo && !off && (
                              <button type="button" className="cmb-photo-x" onClick={() => setComboPhoto(c, d, null)} aria-label="Remove combo photo">×</button>
                            )}
                          </td>
                          {effSizes.map((sz) => {
                            const k = cellKey(c, d, sz)
                            const szPhoto = sizePhotos[k]
                            return (
                              <td key={k}>
                                <div className="cmb-cell">
                                  <input
                                    type="number"
                                    min="0"
                                    disabled={off}
                                    value={off ? '' : cellShown(k)}
                                    className={!off && cellNum(k) === 0 ? 'out' : ''}
                                    onChange={(e) => setCells((cs) => ({ ...cs, [k]: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                                  />
                                  {!off && (
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      className="cmb-cell-price"
                                      placeholder={f.price ? `${f.price}` : 'price'}
                                      title="Price for this exact line — leave blank to charge the product price above"
                                      value={prices[k] ?? ''}
                                      onChange={(e) => setPrices((m) => ({ ...m, [k]: e.target.value }))}
                                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                                    />
                                  )}
                                  {!off && (
                                    <span className="cmb-cell-photo-wrap">
                                      <label className={`cmb-cell-photo ${szPhoto ? 'has' : ''}`} title="Optional photo for this exact size (overrides the combo photo)">
                                        <input type="file" accept="image/*" hidden onChange={(e) => setSizePhoto(c, d, sz, e.target.files[0] || null)} />
                                        {szPhoto ? <img src={URL.createObjectURL(szPhoto)} alt="" /> : <span>＋ pic</span>}
                                      </label>
                                      {szPhoto && (
                                        <button type="button" className="cmb-cell-photo-x" onClick={() => setSizePhoto(c, d, sz, null)} aria-label="Remove size photo">×</button>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                          <td className="cmb-total">{off ? '—' : rowTotal}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="adm-note" style={{ marginTop: 6 }}>
              ✓ = this combo exists · ＋ = switched off (won’t be created) · set a size to 0 to show it sold-out.
              Photo priority: the size’s own “＋ pic” → the combo’s PHOTO → the colour’s photo. Add only the ones you need.
            </p>
          </div>
        </>
      )}

      <div id="s6" className="adm-sect-head full"><span>6</span> PHOTOS &amp; EXTRAS</div>
      <p className="adm-note full" style={{ marginTop: -4 }}>
        The PHOTOS field is the main carousel — <b>first = cover, then one per design in order</b>.
        Each colour&apos;s own photo (from its row above) is appended automatically and the storefront
        jumps to it when that swatch is selected.
      </p>
      <div className="adm-field full"><label>AI EXTRA INFO (hidden from shoppers — feeds the assistant)</label><textarea value={f.ai_info} onChange={set('ai_info')} placeholder="e.g. can be customized with 2 weeks notice; hand wash only." /></div>
      <div className="adm-field full">
        <label>PHOTOS (compressed to WebP ≤1600px automatically · first = cover)</label>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => setFiles([...e.target.files])} />
        {!!previews.length && (
          <div className="adm-thumbs" style={{ marginTop: 8 }}>
            {previews.map((u, i) => (
              <span className="adm-thumb" key={u}>
                <img src={u} alt="" />
                {i === 0 && <b>COVER</b>}
                <button type="button" aria-label="Remove photo" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      {msg && <div className={`full ${msg.ok ? 'adm-ok' : 'adm-err'}`}>{msg.text}</div>}
      <div className="full"><button className="adm-btn" disabled={busy}>{busy ? 'UPLOADING…' : '＋ ADD STOCK ITEM'}</button></div>
    </form>
  )
}

// ── ledger ───────────────────────────────────────────────────────
// parse a variant row back into something readable: colour name+swatch,
// design label, size — whatever the row carries
// Encode a colour×design line. The ONLY place this string is built —
// Add Stock and the ledger editor both come through here so the two can
// never drift apart on the wire format. '|' is the field separator, so
// scrub it out of the colour name.
const encodeCombo = ({ name, hex, imgIdx, design }) => {
  const nm = (name || '').trim().replace(/\|/g, '·')
  const img = imgIdx == null || imgIdx === '' ? '' : imgIdx
  return `combo:${nm}|${nm ? hex || '' : ''}|${img}|${design || ''}`
}

const parseVariant = (v) => {
  const c = v.color || ''
  if (c.startsWith('combo:')) {
    const parts = c.slice('combo:'.length).split('|')
    const design = parts.slice(3).join('|').trim()
    const idxRaw = parts[2]
    return {
      kind: 'combo',
      name: (parts[0] || '').trim(),
      hex: (parts[1] || '').trim() || null,
      imgIdx: idxRaw !== '' && idxRaw != null ? Number(idxRaw) : null,
      design: design || null,
      size: v.size || null,
    }
  }
  const body = c.replace(/^(design|color):/, '')
  const [nm, hex] = body.split('|')
  return {
    kind: c.startsWith('design:') ? 'design' : c ? 'colour' : 'size',
    name: (nm || '').trim(),
    hex: (hex || '').trim() || null,
    imgIdx: null,
    design: null,
    size: v.size || null,
  }
}

// stock units live on colour/combo/size rows; bare design rows are labels
const isStockRow = (v) => {
  const c = v.color || ''
  return c.startsWith('combo:') || c.startsWith('color:') || (!c.startsWith('design:') && !!v.size)
}

// ── the ledger's full variant editor ─────────────────────────────
// Everything the Add Stock grid can do, but against a product that
// already exists — add a colour / design / size, switch a pairing off,
// retune any count.
//
// Saving is a DIFF, never a rebuild. Existing lines are matched by
// colour¦design¦size and keep their row id, so their stock and their
// photo index survive untouched; only genuinely new pairings are
// inserted and only ones you removed are deleted. A rewrite-on-save
// would throw away every per-combo photo link on the product.
const vKey = (colour, design, size) => `${colour || ''}¦${design || ''}¦${size || ''}`

function VariantEditor({ p, onChanged }) {
  const stockRows = useMemo(() => (p.product_variants || []).filter(isStockRow), [p])

  // read the product's current grid back out of its variant rows
  const initial = useMemo(() => {
    const colours = []
    const designs = []
    const sizes = []
    const byKey = new Map()
    for (const v of stockRows) {
      const i = parseVariant(v)
      if (i.name && !colours.some((c) => c.name === i.name)) {
        colours.push({ name: i.name, hex: i.hex || '#888888', imgIdx: i.imgIdx })
      }
      if (i.design && !designs.includes(i.design)) designs.push(i.design)
      if (i.size && !sizes.includes(i.size)) sizes.push(i.size)
      byKey.set(vKey(i.name, i.design, i.size), {
        id: v.id, stock: v.stock ?? 0, colour: v.color, imgIdx: i.imgIdx,
        price: v.price != null ? Number(v.price) : null,
      })
    }
    // The photo index is per colour×DESIGN, not per colour — one colour
    // routinely carries a different shot for each design it's printed
    // with. Keep those per-pair indexes so a re-encode can hand every row
    // back its own photo instead of flattening them all onto the colour's
    // first one.
    const pairImg = new Map()
    const colourImg = new Map()
    for (const v of stockRows) {
      const i = parseVariant(v)
      if (i.imgIdx == null) continue
      const pk = `${i.name || ''}¦${i.design || ''}`
      if (!pairImg.has(pk)) pairImg.set(pk, i.imgIdx)
      if (i.name && !colourImg.has(i.name)) colourImg.set(i.name, i.imgIdx)
    }
    // Which colour×design pairings actually exist. A pairing with no line
    // was switched off when the product was built, so it must start OFF —
    // otherwise the editor shows the full cross-product and merely opening
    // it and pressing save would resurrect combinations that were never
    // made (SNITCHES has three of them).
    const present = new Set()
    for (const v of stockRows) {
      const i = parseVariant(v)
      present.add(`${i.name || ''}¦${i.design || ''}`)
    }
    const off = {}
    for (const c of colours.length ? colours : [null]) {
      for (const d of designs.length ? designs : [null]) {
        const k = `${c ? c.name : ''}¦${d || ''}`
        if (!present.has(k)) off[k] = true
      }
    }
    return { colours, designs, sizes, byKey, off, pairImg, colourImg }
  }, [stockRows])

  const [colours, setColours] = useState(initial.colours)
  const [designs, setDesigns] = useState(initial.designs)
  const [sizes, setSizes] = useState(initial.sizes)
  const [cells, setCells] = useState(() =>
    Object.fromEntries([...initial.byKey].map(([k, v]) => [k, v.stock]))
  )
  // per-line price overrides; '' means "no override, charge the product price"
  const [vPrices, setVPrices] = useState(() =>
    Object.fromEntries([...initial.byKey].map(([k, v]) => [k, v.price ?? '']))
  )
  const [dropped, setDropped] = useState(initial.off) // pairings switched off, keyed colour¦design
  const [sizeInput, setSizeInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const effColours = colours.length ? colours : [null]
  const effDesigns = designs.length ? designs : [null]
  const effSizes = sizes.length ? sizes : [null]
  const pairKey = (c, d) => `${c ? c.name : ''}¦${d || ''}`
  const pairs = effColours
    .flatMap((c) => effDesigns.map((d) => ({ c, d })))
    .filter(({ c, d }) => !dropped[pairKey(c, d)])

  const cellAt = (c, d, sz) => {
    const v = cells[vKey(c ? c.name : '', d, sz)]
    return v === undefined ? 0 : v
  }
  const cellNum = (c, d, sz) => {
    const n = Math.floor(Number(cellAt(c, d, sz)))
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const setCell = (c, d, sz, val) =>
    setCells((m) => ({ ...m, [vKey(c ? c.name : '', d, sz)]: val }))
  const priceAt = (c, d, sz) => vPrices[vKey(c ? c.name : '', d, sz)] ?? ''
  const setPriceAt = (c, d, sz, val) =>
    setVPrices((m) => ({ ...m, [vKey(c ? c.name : '', d, sz)]: val }))
  // blank / junk / zero → no override
  const priceNum = (raw) => {
    const n = Number(raw)
    return raw !== '' && raw != null && Number.isFinite(n) && n > 0 ? n : null
  }
  const total = pairs.reduce((s, { c, d }) => s + effSizes.reduce((t, sz) => t + cellNum(c, d, sz), 0), 0)

  // ── what save would actually do, computed up front so the button can
  //    tell you before you press it ──
  const plan = useMemo(() => {
    const desired = new Map()
    for (const { c, d } of pairs) {
      for (const sz of effSizes) {
        const k = vKey(c ? c.name : '', d, sz)
        const have = initial.byKey.get(k)
        // A line that already exists keeps its OWN photo. A brand-new one
        // inherits from its colour×design pair if that pair is already
        // photographed (a new size of an existing combo), else from the
        // colour's first shot.
        const img = have
          ? have.imgIdx
          : initial.pairImg.get(`${c ? c.name : ''}¦${d || ''}`) ??
            (c ? initial.colourImg.get(c.name) : undefined) ??
            null
        const colour = encodeCombo({
          name: c ? c.name : '',
          hex: c ? c.hex : '',
          imgIdx: img,
          design: d,
        })
        const n = Math.floor(Number(cells[k] === undefined ? 0 : cells[k]))
        desired.set(k, {
          colour,
          size: sz,
          stock: Number.isFinite(n) && n > 0 ? n : 0,
          price: priceNum(vPrices[k]),
        })
      }
    }
    const inserts = []
    const updates = []
    for (const [k, want] of desired) {
      const have = initial.byKey.get(k)
      if (!have) { inserts.push(want); continue }
      const patch = {}
      if (Number(have.stock) !== want.stock) patch.stock = want.stock
      if (have.colour !== want.colour) patch.colour = want.colour // rename / recolour
      // null vs a number both matter here: clearing the box is a real
      // edit that puts the line back on the product's price
      if ((have.price ?? null) !== (want.price ?? null)) patch.price = want.price
      if (Object.keys(patch).length) updates.push({ id: have.id, patch })
    }
    const deletes = []
    for (const [k, have] of initial.byKey) if (!desired.has(k)) deletes.push({ id: have.id, k })
    return { inserts, updates, deletes }
  }, [pairs, effSizes, cells, vPrices, initial])

  const dirty = plan.inserts.length || plan.updates.length || plan.deletes.length

  const save = async () => {
    if (plan.deletes.length) {
      const ok = window.confirm(
        `Remove ${plan.deletes.length} stock line${plan.deletes.length === 1 ? '' : 's'} from “${p.title}”?\n\n` +
          plan.deletes.slice(0, 8).map((d) => '  · ' + d.k.replace(/¦/g, ' · ')).join('\n') +
          (plan.deletes.length > 8 ? `\n  … and ${plan.deletes.length - 8} more` : '') +
          '\n\nTheir stock counts are lost. Everything else keeps its count and photo.'
      )
      if (!ok) return
    }
    setSaving(true)
    setMsg(null)
    try {
      for (const u of plan.updates) {
        await updateVariant(u.id, {
          ...(u.patch.stock !== undefined ? { stock: u.patch.stock } : {}),
          ...(u.patch.colour !== undefined ? { color: u.patch.colour } : {}),
          ...(u.patch.price !== undefined ? { price: u.patch.price } : {}),
        })
      }
      await addVariants(
        p.id,
        plan.inserts.map((i) => ({ color: i.colour, size: i.size, stock: i.stock, price: i.price }))
      )
      await deleteVariants(plan.deletes.map((d) => d.id))
      await updateProduct(p.id, { stock: total })
      setMsg({ ok: true, text: `Saved — ${plan.inserts.length} added, ${plan.updates.length} changed, ${plan.deletes.length} removed.` })
      onChanged()
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setSaving(false)
  }

  const addSizes = (raw) => {
    const parts = String(raw).split(',').map((v) => v.trim()).filter(Boolean)
    if (!parts.length) return
    setSizes((s) => {
      const next = [...s]
      for (const x of parts) if (!next.some((y) => y.toLowerCase() === x.toLowerCase())) next.push(x)
      return next
    })
    setSizeInput('')
  }

  return (
    <div className="adm-var-panel">
      {/* ── colours ── */}
      <div className="adm-ve-sect">
        <span className="adm-ve-k">COLOURS</span>
        <div className="adm-ve-chips">
          {colours.map((c, i) => (
            <span className="adm-ve-chip" key={i}>
              <ColorPicker
                value={c.hex || '#888888'}
                onChange={(hex) => setColours((rs) => rs.map((r, j) => (j === i ? { ...r, hex } : r)))}
              />
              <input
                className="adm-ve-name"
                value={c.name}
                onChange={(e) => setColours((rs) => rs.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))}
              />
              <button type="button" className="adm-ve-x" title="Remove this colour" onClick={() => setColours((rs) => rs.filter((_, j) => j !== i))}>✕</button>
            </span>
          ))}
          <button type="button" className="adm-btn ghost sm" onClick={() => setColours((rs) => [...rs, { name: '', hex: '#888888', imgIdx: null }])}>＋ COLOUR</button>
        </div>
      </div>

      {/* ── designs ── */}
      <div className="adm-ve-sect">
        <span className="adm-ve-k">DESIGNS</span>
        <div className="adm-ve-chips">
          {designs.map((d, i) => (
            <span className="adm-ve-chip" key={i}>
              <input
                className="adm-ve-name wide"
                value={d}
                onChange={(e) => setDesigns((rs) => rs.map((r, j) => (j === i ? e.target.value : r)))}
              />
              <button type="button" className="adm-ve-x" title="Remove this design" onClick={() => setDesigns((rs) => rs.filter((_, j) => j !== i))}>✕</button>
            </span>
          ))}
          <button type="button" className="adm-btn ghost sm" onClick={() => setDesigns((rs) => [...rs, ''])}>＋ DESIGN</button>
        </div>
      </div>

      {/* ── sizes ── */}
      <div className="adm-ve-sect">
        <span className="adm-ve-k">SIZES</span>
        <div className="adm-ve-chips">
          {sizes.map((s, i) => (
            <span className="adm-ve-chip" key={i}>
              {s}
              <button type="button" className="adm-ve-x" title="Remove this size" onClick={() => setSizes((rs) => rs.filter((_, j) => j !== i))}>✕</button>
            </span>
          ))}
          <input
            className="adm-ve-name"
            placeholder="add size ↵"
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSizes(sizeInput) } }}
          />
          {Object.entries(SIZE_PRESETS).map(([k, list]) => (
            <button type="button" key={k} className="adm-btn ghost sm" onClick={() => addSizes(list.join(','))}>＋ {k}</button>
          ))}
        </div>
      </div>

      {/* ── the grid ── */}
      <div className="adm-ve-gridwrap">
        <table className="adm-ve-grid">
          <thead>
            <tr>
              <th>COLOUR × DESIGN</th>
              {effSizes.map((sz, i) => <th key={i}>{sz || 'ONE SIZE'}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {effColours.flatMap((c) =>
              effDesigns.map((d) => {
                const off = !!dropped[pairKey(c, d)]
                return (
                  <tr key={pairKey(c, d)} className={off ? 'off' : ''}>
                    <td className="adm-ve-pair">
                      {c && <i className="adm-dot" style={{ background: c.hex || '#888' }} />}
                      {c ? c.name || '—' : 'ALL'}{d ? ` · ${d}` : ''}
                    </td>
                    {effSizes.map((sz, i) => (
                      <td key={i}>
                        {off ? (
                          <span className="adm-ve-offcell">—</span>
                        ) : (
                          <div className="cmb-cell">
                            <input
                              type="number" min="0"
                              value={cellAt(c, d, sz)}
                              onChange={(e) => setCell(c, d, sz, e.target.value)}
                            />
                            <input
                              type="number" min="0" step="1"
                              className="cmb-cell-price"
                              placeholder={p.price ? `${p.price}` : 'price'}
                              title="Price for this exact line — clear it to charge the product price"
                              value={priceAt(c, d, sz)}
                              onChange={(e) => setPriceAt(c, d, sz, e.target.value)}
                            />
                          </div>
                        )}
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className={`adm-ve-toggle ${off ? 'off' : ''}`}
                        title={off ? 'This pairing is switched off — click to make it' : "Switch this pairing off (it won't be offered at all)"}
                        onClick={() => setDropped((x) => {
                          const k = pairKey(c, d); const n = { ...x }
                          if (n[k]) delete n[k]; else n[k] = true
                          return n
                        })}
                      >
                        {off ? 'OFF' : 'ON'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="adm-var-foot">
        <span className="adm-note">
          grid total: <b>{total}</b>
          {dirty ? (
            <>
              {' · '}
              <b>+{plan.inserts.length}</b> new, <b>{plan.updates.length}</b> changed,{' '}
              <b className={plan.deletes.length ? 'adm-ve-del' : ''}>−{plan.deletes.length}</b> removed
            </>
          ) : ' · nothing to save'}
        </span>
        {msg && <span className={`adm-note ${msg.ok ? '' : 'adm-ve-del'}`}>{msg.text}</span>}
        <button type="button" className="adm-btn" disabled={!dirty || saving} onClick={save}>
          {saving ? 'SAVING…' : dirty ? 'SAVE GRID' : 'SAVED ✓'}
        </button>
      </div>
      <p className="adm-note">
        Existing lines keep their row id, so their photo stays attached. Switching a pairing OFF removes it from the
        shop entirely — it reads as unavailable, never “sold out”. New pairings inherit their colour's photo; to give
        one its own shot, add it from ADD STOCK. The small box under each count is that line's own price — leave it
        blank to charge the product price, or set it to make one size or colour cost more.
      </p>
    </div>
  )
}

// capsule slugs read like URLs; show them as words
const capsuleName = (id) =>
  String(id || '').split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')

function Ledger() {
  const { busy, data, err, reload } = useLoad(fetchAllProducts)
  const [q, setQ] = useState('')
  const [album, setAlbum] = useState('all')
  const [view, setView] = useState('all') // all | low | out | hidden
  const [sort, setSort] = useState({ key: 'title', dir: 1 })
  const [open, setOpen] = useState(null) // product id with the variant grid open
  if (err) return <Err err={err} retry={reload} />
  const all = data || []
  const albumIds = [...new Set(all.map((p) => p.album_id).filter(Boolean))].sort()
  const isLow = (p) => (p.stock ?? 0) > 0 && p.stock <= 2
  const isOut = (p) => (p.stock ?? 0) === 0 || p.status === 'soldout'
  const products = all
    .filter(
      (p) =>
        (album === 'all' || p.album_id === album) &&
        (view === 'all' ||
          (view === 'low' && isLow(p)) ||
          (view === 'out' && isOut(p)) ||
          (view === 'hidden' && p.status === 'hidden')) &&
        `${p.title} ${p.album_id} ${p.category || ''}`.toLowerCase().includes(q.toLowerCase())
    )
    .sort((x, y) => {
      const k = sort.key
      const av = k === 'title' ? String(x.title || '') : k === 'album' ? String(x.album_id || '') : Number(x[k] ?? 0)
      const bv = k === 'title' ? String(y.title || '') : k === 'album' ? String(y.album_id || '') : Number(y[k] ?? 0)
      return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * sort.dir
    })
  // header cells double as sort toggles
  const Th = ({ k, children }) => (
    <th>
      <button
        type="button"
        className={`adm-sort ${sort.key === k ? 'on' : ''}`}
        onClick={() => setSort((c) => ({ key: k, dir: c.key === k ? -c.dir : 1 }))}
      >
        {children}
        <i>{sort.key === k ? (sort.dir === 1 ? '▲' : '▼') : '↕'}</i>
      </button>
    </th>
  )
  const units = products.reduce((s, p) => s + (p.stock || 0), 0)
  const value = products.reduce((s, p) => s + (p.stock || 0) * Number(p.sale_price ?? p.price ?? 0), 0)
  const lowCount = products.filter((p) => (p.stock ?? 0) > 0 && p.stock <= 2).length
  const outCount = products.filter((p) => (p.stock ?? 0) === 0 || p.status === 'soldout').length

  const save = async (id, patch) => {
    try {
      await updateProduct(id, patch)
    } catch (e) {
      alert(e.message)
      reload()
    }
  }

  const exportCsv = () => {
    const csv = ['title,capsule,category,price,sale_price,stock,status,variants']
      .concat(products.map((p) => [
        p.title, p.album_id, p.category || '', p.price, p.sale_price ?? '', p.stock, p.status,
        (p.product_variants || []).map((v) => { const i = parseVariant(v); return `${i.name}${i.design ? '/' + i.design : ''}${i.size ? '/' + i.size : ''}:${v.stock ?? 0}` }).join(' | '),
      ].map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')))
      .join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'vinyl-fashion-stock.csv'
    a.click()
  }

  return (
    <>
      <div className="adm-stats">
        <Stat k="PRODUCTS" v={products.length} />
        <Stat k="UNITS" v={units} />
        <Stat k="LOW / OUT" v={`${lowCount} / ${outCount}`} />
        <Stat k="STOCK VALUE" v={npr(value)} gold />
      </div>
      <div className="adm-toolbar">
        <input type="search" placeholder="Search stock ledger…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={album} onChange={(e) => setAlbum(e.target.value)}>
          <option value="all">All capsules</option>
          {albumIds.map((id) => <option key={id} value={id}>{capsuleName(id)}</option>)}
        </select>
        <div className="adm-chips">
          {[
            ['all', 'ALL', all.length],
            ['low', 'LOW', all.filter(isLow).length],
            ['out', 'OUT', all.filter(isOut).length],
            ['hidden', 'HIDDEN', all.filter((p) => p.status === 'hidden').length],
          ].map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              className={`adm-chip ${view === key ? 'on' : ''}`}
              onClick={() => setView(key)}
            >
              {label} <b>{n}</b>
            </button>
          ))}
        </div>
        <button className="adm-btn ghost" onClick={exportCsv}>⤓ EXPORT CSV</button>
        <button className="adm-btn ghost" onClick={reload}>↻</button>
      </div>
      <div className="adm-card" style={{ padding: 6 }}>
        <table className="adm-table">
          <thead><tr>
            <Th k="title">PRODUCT</Th>
            <Th k="album">CAPSULE</Th>
            <Th k="price">PRICE</Th>
            <th>SALE</th>
            <Th k="stock">STOCK</Th>
            <th>STATUS</th><th>VARIANTS</th><th>PHOTOS</th><th />
          </tr></thead>
          <tbody>
            {products.map((p) => {
              const vCount = (p.product_variants || []).filter(isStockRow).length
              return (
              <Fragment key={p.id}>
              <tr className={open === p.id ? 'is-open' : ''}>
                <td><b>{p.title}</b>{p.category ? <span className="adm-note"> · {p.category}</span> : null}</td>
                <td>{p.album_id ? capsuleName(p.album_id) : '—'}</td>
                <td><input type="number" defaultValue={p.price} onBlur={(e) => Number(e.target.value) !== Number(p.price) && save(p.id, { price: Number(e.target.value) })} /></td>
                <td><input type="number" defaultValue={p.sale_price ?? ''} placeholder="—" onBlur={(e) => save(p.id, { sale_price: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                <td>
                  <span className={`adm-stock-cell ${(p.stock ?? 0) === 0 ? 'out' : p.stock <= 2 ? 'low' : ''}`}>
                    <input type="number" defaultValue={p.stock} onBlur={(e) => Number(e.target.value) !== Number(p.stock) && save(p.id, { stock: Number(e.target.value) })} />
                    {(p.stock ?? 0) === 0 ? <b>OUT</b> : p.stock <= 2 ? <b>LOW</b> : null}
                  </span>
                </td>
                <td>
                  <select defaultValue={p.status} onChange={(e) => save(p.id, { status: e.target.value })}>
                    {['active', 'hidden', 'soldout'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  {vCount
                    ? <button type="button" className="adm-btn ghost sm" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? '▾' : '▸'} {vCount}</button>
                    : <span className="adm-mono">—</span>}
                </td>
                <td className="adm-mono">{(p.images || []).length}</td>
                <td className="adm-row-acts">
                  <button className="adm-btn ghost sm" title="Duplicate (lands hidden)" onClick={() => duplicateProduct(p).then(reload).catch((e) => alert(e.message))}>⧉</button>
                  <button className="adm-btn danger" onClick={() => window.confirm(`Remove “${p.title}”?`) && deleteProduct(p.id).then(reload)}>✕</button>
                </td>
              </tr>
              {open === p.id && (
                <tr className="adm-var-tr"><td colSpan="9"><VariantEditor key={p.id} p={p} onChanged={reload} /></td></tr>
              )}
              </Fragment>
            )})}
            {!busy && !products.length && (
              <tr><td colSpan="9" className="adm-note" style={{ padding: 20 }}>
                {all.length ? 'Nothing matches those filters.' : 'Ledger is empty — add stock first.'}
              </td></tr>
            )}
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

  // The shelf in the order the storefront actually reads it. Ties break
  // by id so the list can never shuffle between renders.
  const ordered = [...rows].sort(
    (x, y) => (x.sort ?? 0) - (y.sort ?? 0) || String(x.id).localeCompare(String(y.id))
  )
  const posOf = new Map(ordered.map((a, i) => [a.id, i]))

  // Move a capsule to a position and renumber the shelf contiguously —
  // but write only the rows that actually shift, so nudging one capsule
  // never rewrites all 110.
  const moveTo = async (id, toIdx) => {
    const from = ordered.findIndex((a) => a.id === id)
    if (from < 0) return
    const to = Math.max(0, Math.min(ordered.length - 1, toIdx))
    if (to === from) return
    const next = [...ordered]
    next.splice(to, 0, ...next.splice(from, 1))
    const was = new Map(ordered.map((a) => [a.id, a.sort ?? 0]))
    const patches = next
      .map((a, i) => ({ id: a.id, sort: i }))
      .filter((pch) => was.get(pch.id) !== pch.sort)
    try {
      await Promise.all(patches.map((pch) => updateAlbumRow(pch.id, { sort: pch.sort })))
      reload()
    } catch (e) { alert(e.message) }
  }

  const shown = ordered.filter((a) => {
    // "open" means what the shopper sees: live AND not behind a sticker
    if (filter === 'live' && (a.status !== 'live' || a.effects?.comingSoon)) return false
    if (filter === 'draft' && a.status === 'live') return false
    if (filter === 'soon' && !a.effects?.comingSoon) return false
    const hay = `${a.capsule_no} ${a.artist} ${a.title} ${a.featured}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })
  const selected = shown.find((a) => a.id === selectedId) || shown[0] || null
  const FILTERS = [
    ['all', 'ALL', rows.length],
    ['live', 'OPEN', rows.filter((a) => a.status === 'live' && !a.effects?.comingSoon).length],
    ['soon', 'COMING SOON', rows.filter((a) => a.effects?.comingSoon).length],
    ['draft', 'DRAFT', rows.filter((a) => a.status !== 'live').length],
  ]

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
      <div className="adm-toolbar">
        <input
          type="search"
          placeholder={`Search ${rows.length} capsules — artist, title, song…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="adm-chips">
          {FILTERS.map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              className={`adm-chip ${filter === key ? 'on' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label} <b>{n}</b>
            </button>
          ))}
        </div>
        {(q || filter !== 'all') && (
          <span className="adm-note">
            {shown.length} shown
            <button type="button" className="adm-btn ghost sm" style={{ marginLeft: 8 }}
              onClick={() => { setQ(''); setFilter('all') }}>CLEAR</button>
          </span>
        )}
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
            {shown.map((a) => {
              const pos = posOf.get(a.id) ?? 0
              return (
                <div key={a.id} className={`adm-studio-item ${selected.id === a.id ? 'on' : ''}`}>
                  <button
                    type="button"
                    className="adm-studio-pick"
                    onClick={() => setSelectedId(a.id)}
                  >
                    <span className="pick-pos" title="Position on the shop shelf">{pos + 1}</span>
                    {a.artwork ? <img src={a.artwork.replace('1200x1200bb', '420x420bb')} alt="" /> : <span className="pick-art" />}
                    <span className="pick-copy">
                      <b>{a.capsule_no ? `${a.capsule_no} · ` : ''}{a.title}</b>
                      <small>{a.artist} · {a.year}</small>
                    </span>
                    {a.effects?.comingSoon && <span className="pill draft">soon</span>}
                  </button>
                  <span className="pick-moves">
                    <button type="button" title="Move one place earlier on the shelf"
                      disabled={pos === 0} onClick={() => moveTo(a.id, pos - 1)}>▲</button>
                    <button type="button" title="Move one place later on the shelf"
                      disabled={pos === ordered.length - 1} onClick={() => moveTo(a.id, pos + 1)}>▼</button>
                  </span>
                </div>
              )
            })}
          </aside>
          <AlbumRow
            key={selected.id}
            a={selected}
            position={(posOf.get(selected.id) ?? 0) + 1}
            shelfCount={ordered.length}
            onMove={moveTo}
            onSaved={reload}
          />
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

function AlbumRow({ a, open = true, onToggle = () => {}, onSaved, position = 1, shelfCount = 1, onMove }) {
  const seed = () => ({
    artist: a.artist || '', title: a.title || '', display_title: a.display_title || '',
    year: a.year ?? '', label: a.label || '', capsule_no: a.capsule_no || '', featured: a.featured || '',
    story: a.story || '', status: a.status || 'live', position,
    palette: { ...(a.palette || {}) }, fonts: { ...(a.fonts || {}) },
    ticker: [...(a.ticker || [])], notes: (a.notes || []).map((n) => ({ ...n })), artwork: a.artwork || '',
    comingSoon: !!a.effects?.comingSoon, comingSoonText: a.effects?.comingSoonText || 'COMING SOON',
    preorder: !!a.effects?.preorder, preorderText: a.effects?.preorderText || 'PRE-ORDER',
    preorderNote: a.effects?.preorderNote || 'SHIPS IN 2–3 WEEKS',
    capsuleTitle: a.effects?.capsuleTitle || '',
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
        featured: edit.featured, story: edit.story, status: edit.status,
        palette: edit.palette, fonts: edit.fonts, ticker: edit.ticker.filter(Boolean),
        notes: edit.notes.filter((n) => n.text), artwork: edit.artwork || null,
        effects: {
          ...a.effects,
          comingSoon: edit.comingSoon, comingSoonText: edit.comingSoonText,
          // a locked capsule can't also be taking pre-orders
          preorder: !edit.comingSoon && edit.preorder,
          preorderText: edit.preorderText.trim() || 'PRE-ORDER',
          preorderNote: edit.preorderNote.trim(),
          capsuleTitle: edit.capsuleTitle.trim(),
        },
        clip: edit.clipStart !== '' || edit.clipEnd !== '' || edit.clipSrc
          ? { start: Number(edit.clipStart) || 0, ...(edit.clipEnd !== '' ? { duration: Math.max(0.5, Number(edit.clipEnd) - (Number(edit.clipStart) || 0)) } : {}), ...(edit.clipSrc ? { src: edit.clipSrc } : {}) }
          : {},
      })
      // Position is a place on the shelf, not a stored number — moving
      // renumbers the neighbours too, so it goes through the shelf
      // reorder rather than being written straight onto this row.
      const want = Math.round(Number(edit.position))
      if (onMove && Number.isFinite(want) && want !== position) {
        await onMove(a.id, Math.max(0, Math.min(shelfCount - 1, want - 1)))
      }
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
        <button
          type="button"
          className={`adm-soon-toggle ${a.effects?.comingSoon ? 'soon' : 'open'}`}
          title={a.effects?.comingSoon ? 'Coming soon — click to make shoppable' : 'Shoppable — click to flip to coming soon'}
          onClick={(e) => {
            e.stopPropagation()
            updateAlbumRow(a.id, { effects: { ...a.effects, comingSoon: !a.effects?.comingSoon } })
              .then(onSaved)
              .catch((err) => alert(err.message))
          }}
        >
          {a.effects?.comingSoon ? '◷ SOON' : a.effects?.preorder ? '◆ PRE-ORDER' : '● OPEN'}
        </button>
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
          <div className="adm-field full"><label>CAPSULE HEADING (the big "… COLLECTION" line on the album page — empty = album title)</label>
            <input value={edit.capsuleTitle} onChange={(e) => set('capsuleTitle', e.target.value)} placeholder={`e.g. ${(edit.title || 'FROZEN').toUpperCase()}`} />
          </div>
          <div className="adm-field"><label>YEAR</label><input value={edit.year} onChange={(e) => set('year', e.target.value)} /></div>
          <div className="adm-field"><label>LABEL</label><input value={edit.label} onChange={(e) => set('label', e.target.value)} /></div>
          <div className="adm-field">
            <label>SHELF POSITION (1 = first record in the crate)</label>
            <input
              type="number" min="1" max={shelfCount}
              value={edit.position}
              onChange={(e) => set('position', e.target.value)}
            />
            <small className="adm-note">now #{position} of {shelfCount} — save to move it</small>
          </div>
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
          {/* pre-order only means anything on a capsule shoppers can open */}
          {!edit.comingSoon && (
            <>
              <div className="adm-field"><label>PRE-ORDER</label>
                <select value={edit.preorder ? 'yes' : 'no'} onChange={(e) => set('preorder', e.target.value === 'yes')}>
                  <option value="no">no — sell from stock</option>
                  <option value="yes">yes — taking reservations</option>
                </select>
              </div>
              {edit.preorder && (
                <>
                  <div className="adm-field"><label>PRE-ORDER BADGE</label>
                    <input value={edit.preorderText} onChange={(e) => set('preorderText', e.target.value)} placeholder="PRE-ORDER" />
                  </div>
                  <div className="adm-field full"><label>SHIP WINDOW (shown next to the badge everywhere)</label>
                    <input value={edit.preorderNote} onChange={(e) => set('preorderNote', e.target.value)} placeholder="SHIPS IN 2–3 WEEKS" />
                  </div>
                  <p className="adm-note full">
                    While a capsule is on pre-order its pieces ignore stock counts — nothing reads SOLD OUT and no
                    “only N left” nudge appears. Colour×design pairings you switched off in the grid stay unavailable.
                  </p>
                </>
              )}
            </>
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
          <div className="adm-field full"><label>FEATURED SONG — the name shown on “DROP THE NEEDLE”</label>
            {tracks.length > 0 && (
              <select
                value={tracks.some((t) => t.name === edit.featured) ? edit.featured : ''}
                onChange={(e) => e.target.value && set('featured', e.target.value)}
                style={{ marginBottom: 6 }}
              >
                <option value="">— quick-pick a track —</option>
                {tracks.map((t) => <option key={t.id} value={t.name}>{t.num}. {t.name}</option>)}
              </select>
            )}
            <input
              value={edit.featured}
              onChange={(e) => set('featured', e.target.value)}
              placeholder="or type any name — e.g. the title of your uploaded song"
            />
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
  ['brand', 'notice', 'ANNOUNCEMENT BAR (shows over the shop wall · empty = hidden)', 'FIRST PRESSING — ICEMAN CAPSULE OUT NOW'],
  ['contact', 'whatsapp', 'WHATSAPP (intl, no +)', '9779747716756'],
  ['contact', 'whatsappDisplay', 'WHATSAPP (display)', '+977 97-4771-6756'],
  ['contact', 'instagram', 'INSTAGRAM HANDLE (no @)', 'vinylfashion.np'],
  ['contact', 'email', 'EMAIL', 'hello@vinylfashion.com'],
  ['contact', 'city', 'CITY LINE', 'KATHMANDU'],
]

// The order line is the one setting that silently loses money when it's
// wrong — a number missing its country code just opens a chat with
// nobody. Show what wa.me will actually do with it, before saving.
function WaCheck({ value }) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return <small className="adm-note">No number — the ORDER buttons will go nowhere.</small>
  const problem =
    String(value || '') !== digits
      ? 'Remove the +, spaces and dashes — wa.me wants digits only.'
      : digits.length < 10
        ? 'Too short to be a full international number.'
        : digits.startsWith('0')
          ? 'Starts with 0 — use the country code instead of a trunk prefix.'
          : null
  return (
    <small className={problem ? 'adm-warn-inline' : 'adm-note'}>
      {problem || (
        <>
          opens <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">wa.me/{digits}</a>
          {' '}— open it once and check it reaches you
        </>
      )}
    </small>
  )
}

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
            {['brand', 'contact'].map((group) => (
              <Fragment key={group}>
                <div className="adm-sect-head full">
                  <span>{group === 'brand' ? '1' : '2'}</span>
                  {group === 'brand' ? 'BRAND' : 'CONTACT & ORDER ROUTING'}
                  <em>
                    {group === 'brand'
                      ? 'the name, tagline and announcement bar on the shop wall'
                      : 'where every ORDER button sends the shopper'}
                  </em>
                </div>
                {SETTING_FIELDS.filter(([g]) => g === group).map(([g, key, label, ph]) => (
                  <div className="adm-field" key={`${g}.${key}`}>
                    <label>{label}</label>
                    <input
                      value={form[g][key] ?? ''}
                      placeholder={ph}
                      onChange={(e) =>
                        setForm({ ...form, [g]: { ...form[g], [key]: e.target.value } })
                      }
                    />
                    {key === 'whatsapp' && <WaCheck value={form.contact.whatsapp} />}
                  </div>
                ))}
              </Fragment>
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
