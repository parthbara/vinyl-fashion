import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BRAND, waLink } from '../config'
import { useAlbums } from '../lib/useAlbums'
import { useArtistImage } from '../lib/artistImage'
import { useCoverPalette } from '../lib/palette'

import { warmAlbumArt } from '../lib/preload'
import baked from '../data/tracks.json'
import VinylSleeve from './VinylSleeve'
import CoverImage from './CoverImage'
import DustCanvas from './DustCanvas'
import Ticker from './Ticker'
import * as sfx from '../lib/sfx'

// One canonical form for artist/title matching: lowercase, diacritics
// stripped, punctuation collapsed — so "DRAKE"/"Drake", "KISS"/"Kiss",
// "Beyoncé"/"Beyonce" and "AC/DC"/"ac dc" all file together.
const nameKey = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

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
  const rawAlbums = useAlbums()
  // available records first, Coming-Soon ones sink to the bottom of the
  // wall (stable — keeps each group's own order)
  const albums = useMemo(
    () => [...rawAlbums].sort((a, b) => (a.comingSoon ? 1 : 0) - (b.comingSoon ? 1 : 0)),
    [rawAlbums]
  )
  const [hoverId, setHoverId] = useState(null)
  const [soonPeek, setSoonPeek] = useState(null)
  const [results, setResults] = useState(null) // query string for the results page
  const [artistView, setArtistView] = useState(null) // artist name for the artist page
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

  // a big crate (bulk-imported Coming-Soon wall) must not eagerly warm
  // dozens of covers — only pre-warm the first shelf; the rest lazy-load
  const dense = albums.length > 24
  useEffect(() => {
    const t = setTimeout(() => albums.slice(0, 12).forEach((a) => warmAlbumArt(a, 'low')), 600)
    return () => clearTimeout(t)
  }, [albums])

  // one index over artist / album / every baked track name, shared by
  // the quick dropdown and the full results page.
  const searchIndex = useMemo(
    () =>
      albums.map((a) => ({
        a,
        hay: `${nameKey(a.artist)} ${nameKey(a.title)}`,
        artistKey: nameKey(a.artist),
        titleKey: nameKey(a.title),
        tracks: (baked[String(a.collectionId)]?.tracks || []).map((t) => t.name),
      })),
    [albums]
  )

  // compact list for the type-ahead dropdown (max 6)
  const quickSearch = useMemo(
    () => (q) => {
      const ql = nameKey(q)
      if (ql.length < 2) return []
      const out = []
      for (const e of searchIndex) {
        if (e.hay.includes(ql)) out.push({ album: e.a, song: null })
        else {
          const song = e.tracks.find((t) => t.toLowerCase().includes(ql))
          if (song) out.push({ album: e.a, song })
        }
      }
      return out.slice(0, 6)
    },
    [searchIndex]
  )

  // full grouped result set (albums / artists / songs) for the results
  // page you land on when you press Enter — Spotify-style.
  const fullSearch = useMemo(
    () => (q) => {
      const ql = nameKey(q)
      if (ql.length < 1) return { albums: [], artists: [], songs: [] }
      const albumHits = []
      const songHits = []
      const artistMap = new Map()
      for (const e of searchIndex) {
        const artistMatch = e.artistKey.includes(ql)
        if (e.titleKey.includes(ql) || artistMatch) albumHits.push(e.a)
        if (artistMatch && !artistMap.has(e.artistKey)) {
          artistMap.set(e.artistKey, { artist: e.a.artist, album: e.a })
        }
        for (const t of e.tracks) {
          if (t.toLowerCase().includes(ql)) songHits.push({ album: e.a, song: t })
        }
      }
      return {
        albums: albumHits,
        artists: [...artistMap.values()],
        songs: songHits.slice(0, 14),
      }
    },
    [searchIndex]
  )

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

  // pick from the full results page: close it, then open the record
  const pickFromResults = (album) => {
    setResults(null)
    openFromSearch(album)
  }

  // pick from an artist page: close everything, then open the record
  const pickFromArtist = (album) => {
    setArtistView(null)
    setResults(null)
    openFromSearch(album)
  }

  // normalized match: seeds ("DRAKE"), iTunes imports ("Drake"), accents
  // and punctuation variants all file under the same artist page
  const artistAlbums = useMemo(() => {
    if (!artistView) return []
    const key = nameKey(artistView)
    return albums.filter((a) => nameKey(a.artist) === key)
  }, [artistView, albums])

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
    <section className={`shop ${dimmed ? 'is-dimmed' : ''} ${dense ? 'is-dense' : ''}`}>
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
        <SearchBox search={quickSearch} onPick={openFromSearch} onSubmit={setResults} />
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
                    dense={dense}
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

      {results != null && (
        <SearchResults
          query={results}
          data={fullSearch(results)}
          onPick={pickFromResults}
          onArtist={setArtistView}
          onClose={() => setResults(null)}
        />
      )}

      {artistView && (
        <ArtistView
          artist={artistView}
          albums={artistAlbums}
          onPick={pickFromArtist}
          onClose={() => setArtistView(null)}
        />
      )}
    </section>
  )
}

// An artist page — every pressing filed under one name.
function ArtistView({ artist, albums, onPick, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  // real artist portrait (Deezer) → album cover fallback, but only once
  // the lookup settles so the cover doesn't flash in first
  const { url, ready } = useArtistImage(artist)
  const hero = url || (ready ? albums[0]?.artwork.replace('1200x1200bb', '600x600bb') : null)

  return createPortal(
    <div className="sr-overlay" role="dialog" aria-label={`${artist} — albums`}>
      <div
        className="artist-hero"
        style={hero ? { backgroundImage: `url(${hero})` } : undefined}
      >
        <button className="sr-close artist-close" data-cursor="back" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <div className="artist-hero-text">
          <span className="sr-head-kicker">ARTIST</span>
          <h2 className="artist-name">{artist}</h2>
          <p className="artist-count">
            {albums.length} PRESSING{albums.length === 1 ? '' : 'S'} IN THE CRATE
          </p>
        </div>
      </div>

      <div className="sr-scroll">
        <section className="sr-block">
          <h3 className="sr-block-title">DISCOGRAPHY</h3>
          <div className="sr-grid">
            {albums.map((album) => (
              <button
                key={album.id}
                className="sr-album"
                data-cursor="open"
                onClick={() => onPick(album)}
              >
                <img src={album.artwork.replace('1200x1200bb', '300x300bb')} alt="" loading="lazy" />
                <b>{album.title}</b>
                <i>
                  {album.year}
                  {album.comingSoon && ' · ◷ SOON'}
                </i>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>,
    document.body
  )
}

// One artist result: a real Deezer portrait, album cover as fallback.
function ArtistChip({ artist, album, onArtist }) {
  const { url, ready } = useArtistImage(artist)
  // hold the album-cover fallback until Deezer settles → no flash
  const src = url || (ready ? album.artwork.replace('1200x1200bb', '300x300bb') : null)
  return (
    <button className="sr-artist" data-cursor="open" onClick={() => onArtist(artist)}>
      {src ? <img src={src} alt="" loading="lazy" /> : <span className="sr-artist-ph" />}
      <b>{artist}</b>
      <i>ARTIST</i>
    </button>
  )
}

// The results page — press Enter in search and land here, Spotify-style:
// artists, albums and songs grouped, each opening its record.
function SearchResults({ query, data, onPick, onArtist, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const { albums, artists, songs } = data
  const empty = !albums.length && !artists.length && !songs.length
  const top = albums[0] || artists[0]?.album || songs[0]?.album

  return createPortal(
    <div className="sr-overlay" role="dialog" aria-label={`Search results for ${query}`}>
      <div className="sr-head">
        <div className="sr-head-text">
          <span className="sr-head-kicker">SEARCH RESULTS</span>
          <h2 className="sr-head-q">“{query}”</h2>
        </div>
        <button className="sr-close" data-cursor="back" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </div>

      {empty ? (
        <div className="sr-empty">
          NOTHING IN THE CRATE FOR “{query.trim().toUpperCase()}”
        </div>
      ) : (
        <div className="sr-scroll">
          {top && (
            <section className="sr-block">
              <h3 className="sr-block-title">TOP RESULT</h3>
              <button className="sr-top" data-cursor="open" onClick={() => onPick(top)}>
                <img src={top.artwork.replace('1200x1200bb', '300x300bb')} alt="" loading="lazy" />
                <span className="sr-top-text">
                  <b>{top.title}</b>
                  <i>{top.artist}</i>
                  <em>{top.comingSoon ? `◷ ${top.comingSoonText}` : 'ALBUM'}</em>
                </span>
              </button>
            </section>
          )}

          {artists.length > 0 && (
            <section className="sr-block">
              <h3 className="sr-block-title">ARTISTS</h3>
              <div className="sr-row">
                {artists.map(({ artist, album }) => (
                  <ArtistChip key={artist} artist={artist} album={album} onArtist={onArtist} />
                ))}
              </div>
            </section>
          )}

          {albums.length > 0 && (
            <section className="sr-block">
              <h3 className="sr-block-title">ALBUMS</h3>
              <div className="sr-grid">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    className="sr-album"
                    data-cursor="open"
                    onClick={() => onPick(album)}
                  >
                    <img src={album.artwork.replace('1200x1200bb', '300x300bb')} alt="" loading="lazy" />
                    <b>{album.title}</b>
                    <i>
                      {album.artist} · {album.year}
                      {album.comingSoon && ' · ◷ SOON'}
                    </i>
                  </button>
                ))}
              </div>
            </section>
          )}

          {songs.length > 0 && (
            <section className="sr-block">
              <h3 className="sr-block-title">SONGS</h3>
              <ul className="sr-songs">
                {songs.map(({ album, song }, i) => (
                  <li key={`${album.id}-${i}`}>
                    <button className="sr-song" data-cursor="open" onClick={() => onPick(album)}>
                      <img src={album.artwork.replace('1200x1200bb', '100x100bb')} alt="" loading="lazy" />
                      <span className="sr-song-text">
                        <b>{song}</b>
                        <i>{album.artist} — {album.title}</i>
                      </span>
                      <span className="sr-song-play" aria-hidden="true">▶</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>,
    document.body
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

  // morph the teaser to the record's own cover colours; until extraction
  // settles, sit on a neutral dark base (never the stored default — that
  // caused a red flash on imported records)
  const { palette: extracted, ready } = useCoverPalette(album)
  const NEUTRAL = { bg0: '#0a0807', bg1: '#211c18', ink: '#f6f1ea', accent: '#d8a548' }
  const p = extracted || (ready ? album.palette : NEUTRAL)
  return createPortal(
    <div className="qv-overlay" onClick={onClose} role="dialog" aria-label={`${album.title} — coming soon`}>
      <div
        className="soon-peek"
        onClick={(e) => e.stopPropagation()}
        style={{ background: `linear-gradient(158deg, ${p.bg1}, ${p.bg0})`, color: p.ink, transition: 'background 0.5s ease, color 0.5s ease' }}
      >
        <button className="qv-x" aria-label="Close" data-cursor="back" onClick={onClose}>✕</button>
        <div className="soon-peek-art">
          <CoverImage album={album} size="mid" />
        </div>
        <div className="soon-peek-body">
          <span className="soon-peek-tag" style={{ color: p.accent, borderColor: p.accent }}>
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
    </div>,
    document.body
  )
}

function SearchBox({ search, onPick, onSubmit }) {
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
        enterKeyHint="search"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter' && q.trim().length >= 1) {
            setOpen(false)
            onSubmit(q.trim())
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
          {results.length > 0 && (
            <button
              className="search-all"
              onMouseDown={(e) => {
                e.preventDefault()
                setOpen(false)
                onSubmit(q.trim())
              }}
            >
              SEE ALL RESULTS <span className="search-all-key">↵</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
