import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { BRAND, waLink } from '../config'
import { useProducts } from '../lib/useProducts'
import GarmentSvg from './GarmentSvg'
import * as sfx from '../lib/sfx'

const npr = (n) => `NPR ${Number(n).toLocaleString()}`

// The clothes — front and center on the album page. Renders real
// products from the DB once they exist; until then (or offline) the
// placeholder capsule silhouettes. Every piece opens a quick-view
// with an image carousel, design/colour/size pickers and a WhatsApp
// order line — a shop, not a mock.
export default function CapsuleGrid({ album, featuredName }) {
  const products = useProducts(album.id)
  const live = products && products.length > 0
  const items = live ? products : album.capsule
  const notes = album.notes ?? []
  const [view, setView] = useState(null) // item in the quick-view

  const openView = (item) => {
    sfx.pop()
    setView(item)
  }

  const cells = []
  items.forEach((item, i) => {
    cells.push(
      <article
        className="garment"
        key={item.id || item.name}
        style={{ '--i': i }}
        role="button"
        tabIndex={0}
        data-cursor="open"
        aria-label={`View ${item.name}`}
        onClick={() => openView(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openView(item)
          }
        }}
      >
        <div className="garment-stage">
          {live && item.image ? (
            <img className="garment-photo" src={item.image} alt={item.name} loading="lazy" />
          ) : (
            <GarmentSvg type={item.type} />
          )}
          {live && item.soldOut && <span className="garment-flag">SOLD OUT</span>}
        </div>
        <h4 className="garment-name">{item.name}</h4>
        {live ? (
          <div className="garment-buy">
            <span className="garment-price">
              {item.salePrice ? (
                <>
                  <s>{npr(item.price)}</s> {npr(item.salePrice)}
                </>
              ) : item.price ? (
                npr(item.price)
              ) : (
                '—'
              )}
            </span>
            <span className="garment-order">{item.soldOut ? 'DETAILS' : 'ORDER'}</span>
          </div>
        ) : (
          <p className="garment-price">— COMING SOON —</p>
        )}
      </article>
    )
    notes
      .filter((n) => n.after === i)
      .forEach((n, j) => {
        cells.push(
          <aside className="liner-note" key={`note-${i}-${j}`}>
            <span className="liner-note-kicker">{n.kicker}</span>
            <p className="liner-note-text">{n.text}</p>
          </aside>
        )
      })
  })

  return (
    <section className="capsule" id="capsule">
      <header className="capsule-head">
        <p className="capsule-kicker" data-reveal>
          THE CAPSULE
        </p>
        <h3 className="capsule-title" data-reveal>
          {(album.capsuleTitle || album.title).toUpperCase()} COLLECTION
        </h3>
        <p className="capsule-note" data-reveal>
          {live
            ? `${items.length} PIECE${items.length === 1 ? '' : 'S'} · CUT TO ${album.title.toUpperCase()}`
            : `SIX PIECES IN DEVELOPMENT · CUT TO ${album.title.toUpperCase()} · DROP DATE TBA`}
        </p>
      </header>
      <div className="capsule-grid">{cells}</div>
      {view && <QuickView album={album} item={view} live={live} onClose={() => setView(null)} />}
    </section>
  )
}

// ── quick-view ───────────────────────────────────────────────────
function QuickView({ album, item, live, onClose }) {
  const [size, setSize] = useState(null)
  const [design, setDesign] = useState(null)
  const [color, setColor] = useState(null)
  const [idx, setIdx] = useState(0)
  const [nudge, setNudge] = useState(null) // 'size' | 'color' | 'design' — shake the skipped row

  const purchasable = live && item.price && !item.soldOut
  const designs = item.designs || []
  const colors = item.colors || []
  // only REAL sizes — never invent S/M/L that don't exist in stock
  const sizes = item.sizes || []

  // ── per-combo availability (colour × design × size lines) ──────
  // Each variant row is one real combo with its own stock. A filter
  // field left null means "any". If no row constrains a combo we treat
  // it as available (sparse data from simple/legacy products).
  const vrows = item.variantRows || []
  const stockFor = ({ color: fc = null, design: fd = null, size: fs = null }) => {
    const rows = vrows.filter(
      (r) =>
        (fc == null || r.color === fc) &&
        (fd == null || r.design === fd) &&
        (fs == null || r.size === fs)
    )
    if (!rows.length) return { stock: null, matched: false }
    return { stock: rows.reduce((s, r) => s + (r.stock || 0), 0), matched: true }
  }
  const isOut = (filter) => {
    const { stock, matched } = stockFor(filter)
    return matched && stock <= 0
  }
  // each axis respects what's already picked on the others
  const colorOut = (cName) => isOut({ color: cName, design })
  const designOut = (dLabel) => isOut({ color, design: dLabel })
  const sizeOut = (sz) => isOut({ color, design, size: sz })
  // the photo index for a colour×design combo, if one was uploaded
  const comboImg = (cName, dLabel) => {
    const row = vrows.find(
      (r) => (cName == null || r.color === cName) && (dLabel == null || r.design === dLabel) && r.imgIdx != null
    )
    return row ? row.imgIdx : null
  }
  const images = useMemo(() => (item.images?.length ? item.images : item.image ? [item.image] : []), [item])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  const step = (d) => {
    if (images.length < 2) return
    sfx.tick()
    setIdx((n) => (n + d + images.length) % images.length)
  }
  // images upload order = design images first, then colour images, so a
  // variant button jumps to its matching photo by index when it exists.
  const jump = (target) => {
    if (target >= 0 && target < images.length) setIdx(target)
  }

  const price = item.salePrice || item.price
  const spec = `${design ? ` · ${design}` : ''}${color ? ` · ${color}` : ''}${size ? ` · size ${size}` : ''}`
  const capsuleLink = `${window.location.origin}${window.location.pathname}#${album.id}`
  const message = purchasable
    ? `Hi ${BRAND.name}! I'd like to order the ${item.name} from the ${album.title} capsule${spec} — ${npr(price)}. (${capsuleLink})`
    : item.soldOut
      ? `Hi ${BRAND.name}! Is the ${item.name} (${album.title} capsule) getting a restock?`
      : `Hi ${BRAND.name}! Put me on the list for the ${item.name} from the ${album.title} capsule.`

  // a real order names its colour, design and size — hold the button
  const needColor = purchasable && colors.length > 0 && !color
  const needDesign = purchasable && designs.length > 0 && !design
  const needSize = purchasable && sizes.length > 0 && !size
  const gateOrder = (e) => {
    if (!purchasable || (!needColor && !needDesign && !needSize)) return
    e.preventDefault()
    sfx.pop()
    const what = needColor ? 'color' : needDesign ? 'design' : 'size'
    setNudge(what)
    setTimeout(() => setNudge(null), 650)
  }

  // stock for the current selection (as specific as they've picked)
  const remaining = (() => {
    if (!purchasable) return null
    const { stock, matched } = stockFor({ color, design, size })
    return matched ? stock : item.stock ?? null
  })()

  // portal to <body>: inside the page, sibling sections (footer) stack
  // above the capsule section and paint over the modal
  return createPortal(
    <div className="qv-overlay" onClick={onClose} role="dialog" aria-label={item.name}>
      <div className="qv-card" onClick={(e) => e.stopPropagation()}>
        <button className="qv-x" aria-label="Close" data-cursor="back" onClick={onClose}>
          ✕
        </button>
        <div className="qv-media">
          {images.length ? (
            <div className="qv-carousel">
              <img key={images[idx]} src={images[idx]} alt={item.name} />
              {images.length > 1 && (
                <>
                  <button className="qv-arw prev" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>
                  <button className="qv-arw next" aria-label="Next photo" onClick={() => step(1)}>›</button>
                  <div className="qv-dots">
                    {images.map((_, i) => (
                      <span key={i} className={i === idx ? 'on' : ''} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="qv-svg">
              <GarmentSvg type={item.type} />
            </div>
          )}
          {images.length > 1 && (
            <div className="qv-thumbs">
              {images.map((src, i) => (
                <button
                  key={src}
                  className={`qv-thumb ${i === idx ? 'on' : ''}`}
                  onClick={() => setIdx(i)}
                  aria-label={`Photo ${i + 1}`}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="qv-body">
          <p className="qv-kicker">{album.artist} · {album.title.toUpperCase()}</p>
          <h3 className="qv-name">{item.name}</h3>
          <p className="qv-price">
            {purchasable ? (
              item.salePrice ? (
                <>
                  <s>{npr(item.price)}</s> {npr(item.salePrice)}
                </>
              ) : (
                npr(item.price)
              )
            ) : item.soldOut ? (
              'SOLD OUT — RESTOCK ON REQUEST'
            ) : (
              'IN DEVELOPMENT · DROP DATE TBA'
            )}
          </p>
          {purchasable && remaining != null && remaining > 0 && remaining <= 3 && (
            <p className="qv-left">⚡ ONLY {remaining} LEFT{size || color ? ' IN THIS PICK' : ''}</p>
          )}
          <p className="qv-desc">{item.description || `Cut to ${album.title} — ${album.story}`}</p>
          {item.caption && <p className="qv-caption">“{item.caption}”</p>}

          {purchasable && designs.length > 0 && (
            <>
              <p className="qv-pick-label">DESIGN</p>
              <div className={`qv-sizes ${nudge === 'design' ? 'nudge' : ''}`} role="group" aria-label="Design">
                {designs.map((d, di) => {
                  const out = designOut(d)
                  return (
                    <button
                      key={d}
                      className={`qv-size wide ${design === d ? 'on' : ''} ${out ? 'out' : ''}`}
                      disabled={out}
                      onClick={() => {
                        sfx.tick()
                        const on = design === d
                        setDesign(on ? null : d)
                        // jump to this colour×design's photo, else the design slot
                        if (!on) jump(comboImg(color, d) ?? di)
                      }}
                    >
                      {d}
                      {out && <span className="qv-out-tag">SOLD OUT</span>}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {purchasable && colors.length > 0 && (
            <>
              <p className="qv-pick-label">COLOUR</p>
              <div className={`qv-sizes ${nudge === 'color' ? 'nudge' : ''}`} role="group" aria-label="Colour">
                {colors.map((c, ci) => {
                  const out = colorOut(c.name)
                  return (
                    <button
                      key={c.name}
                      className={`qv-size wide ${color === c.name ? 'on' : ''} ${out ? 'out' : ''}`}
                      disabled={out}
                      onClick={() => {
                        sfx.tick()
                        const on = color === c.name
                        const nextColor = on ? null : c.name
                        setColor(nextColor)
                        // picking a colour drops a design/size dead under it
                        if (!on) {
                          const keepDesign = design && !isOut({ color: nextColor, design })
                          if (design && !keepDesign) setDesign(null)
                          if (size && isOut({ color: nextColor, design, size })) setSize(null)
                          // the exact combo photo if a design's held, else the
                          // colour's own photo, else the old order guess
                          jump(comboImg(nextColor, keepDesign ? design : null) ?? c.imgIdx ?? designs.length + ci)
                        }
                      }}
                    >
                      {c.hex && <i className="qv-swatch" style={{ background: c.hex }} aria-hidden="true" />}
                      {c.name}
                      {out && <span className="qv-out-tag">SOLD OUT</span>}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {purchasable && sizes.length > 0 && (
            <>
              <p className="qv-pick-label">SIZE</p>
              <div className={`qv-sizes ${nudge === 'size' ? 'nudge' : ''}`} role="group" aria-label="Size">
                {sizes.map((s) => {
                  const out = sizeOut(s)
                  return (
                    <button
                      key={s}
                      className={`qv-size ${size === s ? 'on' : ''} ${out ? 'out' : ''}`}
                      disabled={out}
                      onClick={() => {
                        sfx.tick()
                        setSize(size === s ? null : s)
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {purchasable && !sizes.length && <p className="qv-pick-label">SIZE · ONE SIZE</p>}

          <a
            className={`qv-order ${needColor || needDesign || needSize ? 'gated' : ''}`}
            data-cursor="play"
            href={waLink(message)}
            onClick={gateOrder}
            target="_blank"
            rel="noopener noreferrer"
          >
            {purchasable
              ? needColor ? 'PICK A COLOUR FIRST'
                : needDesign ? 'PICK A DESIGN FIRST'
                : needSize ? 'PICK A SIZE FIRST'
                : 'ORDER ON WHATSAPP'
              : item.soldOut ? 'ASK FOR A RESTOCK' : 'GET NOTIFIED ON WHATSAPP'}
          </a>
          <p className="qv-note">
            NO ONLINE PAYMENT — EVERY ORDER IS CONFIRMED PERSONALLY ON WHATSAPP.
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
