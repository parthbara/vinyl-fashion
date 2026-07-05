import { useMemo, useState } from 'react'
import { ALBUMS } from '../data/albums'
import { BRAND } from '../config'
import VinylSleeve from './VinylSleeve'
import DustCanvas from './DustCanvas'
import Ticker from './Ticker'
import SoundToggle from './SoundToggle'

// The listening room. Ambient light layers (one per album) sit
// behind everything and cross-fade toward whichever record the
// visitor is holding.
export default function Shop({ onOpen, dimmed, openingId }) {
  const [hoverId, setHoverId] = useState(null)
  const hovered = ALBUMS.find((a) => a.id === hoverId)

  const tickerItems = useMemo(
    () => [
      BRAND.tagline,
      ...ALBUMS.map((a) => `${a.artist} — ${a.title}`),
      'FOUR CAPSULES · LIMITED PRESSINGS',
      '33⅓ RPM · STEREO',
      'PULL · PLAY · WEAR',
    ],
    []
  )

  return (
    <section className={`shop ${dimmed ? 'is-dimmed' : ''}`}>
      <div className="ambient">
        <div className="ambient-base" />
        {ALBUMS.map((a) => (
          <div
            key={a.id}
            className={`ambient-glow ${hoverId === a.id ? 'is-on' : ''}`}
            style={{
              background: `radial-gradient(58% 46% at 50% 26%, ${a.palette.glow}55 0%, ${a.palette.glow}18 45%, transparent 72%),
                           radial-gradient(70% 30% at 50% 100%, ${a.palette.glow}22 0%, transparent 70%)`,
            }}
          />
        ))}
        <div className="spotlight" />
        <div className="floorline" />
      </div>
      <DustCanvas />

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
        <SoundToggle />
      </header>

      <div className="shop-stage">
        <p className="stage-kicker">RECORDS IN STOCK — SIDE A</p>
        <div className="crate">
          {ALBUMS.map((album, i) => (
            <VinylSleeve
              key={album.id}
              album={album}
              index={i}
              onOpen={onOpen}
              onHover={setHoverId}
              hidden={openingId === album.id}
            />
          ))}
        </div>
        <div className="crate-rail" />
        <div className="stage-meta" key={hoverId || 'idle'}>
          {hovered ? (
            <>
              <b>{hovered.artist}</b> — {hovered.title} · CAPSULE {hovered.capsuleNo} ·{' '}
              {hovered.year} · {hovered.label}
            </>
          ) : (
            <>PULL A RECORD FROM THE CRATE</>
          )}
        </div>
      </div>

      <footer className="shop-foot">
        <span className="foot-badge">33⅓ RPM</span>
        <Ticker items={tickerItems} />
        <span className="foot-badge">④ IN STOCK</span>
      </footer>
    </section>
  )
}
