import { useEffect, useMemo, useRef, useState } from 'react'
import { BRAND, waLink } from '../config'
import { useAlbums } from '../lib/useAlbums'
import { warmAlbumArt } from '../lib/preload'
import baked from '../data/tracks.json'
import VinylSleeve from './VinylSleeve'
import CoverImage from './CoverImage'
import DustCanvas from './DustCanvas'
import Ticker from './Ticker'
import SoundToggle from './SoundToggle'
import * as sfx from '../lib/sfx'

const chunk = (arr, n) => {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

// The listening room — a record-shop wall. Shelves stack row after
// row (built for dozens of pressings) inside a vertically scrolling
// wall; mobile keeps the single swipe crate. The crate is DB-driven
// (Album Studio) with the seed as instant fallback.
export default function Shop({ onOpen, dimmed, openingId }) {
  const albums = useAlbums()
  const [hoverId, setHoverId] = useState(null)
  const [soonPeek, setSoonPeek] = useState(null)
  const hovered = albums.find((a) => a.id === hoverId)

  const lastGlowRef = useRef(albums[0])
  useEffect(() => {
    if (hovered) lastGlowRef.current = hovered
  }, [hovered])
  const glowAlbum = hovered || lastGlowRef.current || albums[0]

  const calcCols = () =>
    window.innerWidth <= 760 ? 0 : window.innerWidth < 1180 ? 4 : 5
  const [cols, setCols] = useState(calcCols)
  useEffect(() => {
    const onR = () => setCols(calcCols())
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  // balance the shelves: 6 albums at 5-wide → 3+3, not 5+1; 20 → 5×4
  const rows = useMemo(() => {
    if (!cols) return [albums]
    const rowCount = Math.ceil(albums.length / cols)
    return chunk(albums, Math.ceil(albums.length / rowCount))
  }, [cols, albums])

  useEffect(() => {
    const t = setTimeout(() => albums.forEach((a) => warmAlbumArt(a, 'low')), 600)
    return () => clearTimeout(t)
  }, [albums])

  // search across artist / album / every baked track name
  const search = useMemo(() => {
    const index = albums.map((a) => ({
      a,
      hay: `${a.artist} ${a.title}`.toLowerCase(),
      tracks: (baked[String(a.collectionId)]?.tracks || []).map((t) => t.name),
    }))
    return (q) => {
      const ql = q.trim().toLowerCase()
      if (ql.length < 2) return []
      const out = []
      for (const e of index) {
        if (e.hay.includes(ql)) out.push({ album: e.a, song: null })
        else {
          const song = e.tracks.find((t) => t.toLowerCase().includes(ql))
          if (song) out.push({ album: e.a, song })
        }
      }
      return out.slice(0, 6)
    }
  }, [albums])

  const tickerItems = useMemo(
    () => [
      BRAND.tagline,
      ...albums.map((a) => `${a.artist} — ${a.title}`),
      `${albums.length} CAPSULES · LIMITED PRESSINGS`,
      '33⅓ RPM · STEREO',
      'PULL · PLAY · WEAR',
    ],
    [albums]
  )

  const openFromSearch = (album) => {
    if (album.comingSoon) {
      sfx.pop()
      setSoonPeek(album)
      return
    }
    sfx.tick()
    const slot = document.querySelector(`[data-sleeve="${album.id}"]`)
    const jacket = slot?.querySelector('.jacket')
    if (jacket) {
      slot.scrollIntoView({ block: 'center', behavior: 'instant' })
      onOpen(album, jacket.getBoundingClientRect())
    } else {
      const s = Math.min(window.innerWidth, window.innerHeight) * 0.3
      onOpen(album, { left: window.innerWidth / 2 - s / 2, top: window.innerHeight / 2 - s / 2, width: s })
    }
  }

  return (
    <section className={`shop ${dimmed ? 'is-dimmed' : ''}`}>
      <div className="ambient">
        <div className="ambient-base" />
        <div
          className={`ambient-glow ${hovered ? 'is-on' : ''}`}
          style={{
            background: `radial-gradient(58% 46% at 50% 26%, ${glowAlbum.palette.glow}55 0%, ${glowAlbum.palette.glow}18 45%, transparent 72%),
                         radial-gradient(70% 30% at 50% 100%, ${glowAlbum.palette.glow}22 0%, transparent 70%)`,
          }}
        />
        <div className="spotlight" />
        <div className="floorline" />
      </div>
      <DustCanvas paused={dimmed} />

      <header className="shop-head">
        <div className="brand">
          <span className="brand-mark">{BRAND.mark}</span>
          <div className="brand-text">
            <h1 className="brand-name">{BRAND.name}</h1>
            <span className="brand-sub">
              {BRAND.est} · {BRAND.tagline}
            </span>
          </div>
        </div>
        <SearchBox search={search} onPick={openFromSearch} />
        <SoundToggle />
      </header>

      <div className="shop-stage">
        <p className="stage-kicker">SIDE A · {albums.length} PRESSINGS</p>
        <div className="shelf-wall">
          {rows.map((row, r) => (
            <div className="shelf" key={r}>
              <div className={`crate ${cols ? 'is-row' : ''}`}>
                {row.map((album, i) => (
                  <VinylSleeve
                    key={album.id}
                    album={album}
                    index={r * (cols || 1) + i}
                    onOpen={onOpen}
                    onSoon={setSoonPeek}
                    onHover={setHoverId}
                    hidden={openingId === album.id}
                  />
                ))}
              </div>
              <div className="crate-rail">
                <span className="rail-tag">SHELF {String(r + 1).padStart(2, '0')}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="stage-meta" key={hoverId || 'idle'}>
          {hovered ? (
            <>
              <b>{hovered.artist}</b> — {hovered.title} · {hovered.year}
              {hovered.comingSoon && <em className="meta-soon"> · {hovered.comingSoonText}</em>}
            </>
          ) : (
            <>PULL A RECORD FROM THE CRATE</>
          )}
        </div>
      </div>

      <footer className="shop-foot">
        <Ticker items={tickerItems} />
      </footer>

      {soonPeek && <ComingSoonPeek album={soonPeek} onClose={() => setSoonPeek(null)} />}
    </section>
  )
}

// Coming-soon records aren't dead ends — they capture interest. A
// themed teaser with the cover, the story and a WhatsApp notify line.
function ComingSoonPeek({ album, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const p = album.palette
  return (
    <div className="qv-overlay" onClick={onClose} role="dialog" aria-label={`${album.title} — coming soon`}>
      <div
        className="soon-peek"
        onClick={(e) => e.stopPropagation()}
        style={{ background: `linear-gradient(158deg, ${p.bg1}, ${p.bg0})`, color: p.ink }}
      >
        <button className="qv-x" aria-label="Close" data-cursor="back" onClick={onClose}>✕</button>
        <div className="soon-peek-art">
          <CoverImage album={album} size="mid" />
        </div>
        <div className="soon-peek-body">
          <span className="soon-peek-tag" style={{ background: p.accent, color: p.bg0 }}>
            ◷ {album.comingSoonText}
          </span>
          <h3 className="soon-peek-title">{album.title}</h3>
          <p className="soon-peek-artist">{album.artist} · {album.year}</p>
          <p className="soon-peek-story">
            {album.story || 'A new capsule cut to the record. The full wardrobe drops soon — be first in line.'}
          </p>
          <a
            className="soon-peek-btn"
            data-cursor="play"
            style={{ background: p.accent, color: p.bg0 }}
            href={waLink(`Hi ${BRAND.name}! Notify me the moment the ${album.title} capsule drops.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            NOTIFY ME WHEN IT DROPS
          </a>
          <p className="soon-peek-note">FIRST PRESSINGS ARE LIMITED · WHATSAPP GETS FIRST DIBS</p>
        </div>
      </div>
    </div>
  )
}

function SearchBox({ search, onPick }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const results = useMemo(() => search(q), [q, search])

  return (
    <div className="shop-search">
      <span className="search-glyph" aria-hidden="true">
        ⌕
      </span>
      <input
        type="search"
        placeholder="ARTIST · ALBUM · SONG"
        aria-label="Search the crate"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter' && results[0]) {
            setOpen(false)
            onPick(results[0].album)
          }
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className="search-pop">
          {results.length ? (
            results.map(({ album, song }) => (
              <button
                key={album.id}
                className="search-hit"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setOpen(false)
                  setQ('')
                  onPick(album)
                }}
              >
                <img src={album.artwork.replace('1200x1200bb', '100x100bb')} alt="" loading="lazy" />
                <span className="hit-text">
                  <b>
                    {album.artist} — {album.title}
                  </b>
                  {song && <i>♪ {song}</i>}
                  {album.comingSoon && <i>◷ {album.comingSoonText}</i>}
                </span>
                <span className="hit-no">{album.year}</span>
              </button>
            ))
          ) : (
            <div className="search-none">NOTHING IN THE CRATE FOR “{q.trim().toUpperCase()}”</div>
          )}
        </div>
      )}
    </div>
  )
}
