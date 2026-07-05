import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { BRAND } from '../config'
import { useAlbumData } from '../lib/useAlbumData'
import { findTrack } from '../lib/itunes'
import { useAudio } from '../lib/player'
import { prefersReducedMotion } from '../lib/env'
import CoverImage from './CoverImage'
import VinylDisc from './VinylDisc'
import Turntable from './Turntable'
import CapsuleGrid from './CapsuleGrid'
import SoundToggle from './SoundToggle'
import * as sfx from '../lib/sfx'

// A whole storefront re-skinned to one record. Compact hero, then
// straight into the clothing. The house picks the song (albums.js);
// visitors can only lift the needle.
export default function AlbumPage({ album, revealOrigin, closing, onClose, onClosed }) {
  const rootRef = useRef(null)
  const data = useAlbumData(album)
  const tracks = data?.tracks ?? []
  const featured = findTrack(tracks, album.featured) || tracks[0]
  const { nowPlaying, isPlaying, playTrack, pause, resume } = useAudio()

  const thisAlbumLoaded = nowPlaying?.albumId === album.id
  const playingThis = thisAlbumLoaded && isPlaying

  const toggle = () => {
    if (playingThis) pause()
    else if (thisAlbumLoaded) resume()
    else if (featured) playTrack(album, featured)
  }

  // Entrance: iris in from the record's center, then settle content.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    const root = rootRef.current
    if (prefersReducedMotion()) return
    const { x, y } = revealOrigin || {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    }
    const tl = gsap.timeline()
    tl.fromTo(
      root,
      { clipPath: `circle(0px at ${x}px ${y}px)` },
      {
        clipPath: `circle(142% at ${x}px ${y}px)`,
        duration: 1.05,
        ease: 'power2.inOut',
        clearProps: 'clipPath',
      }
    ).fromTo(
      root.querySelectorAll('[data-reveal]'),
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 },
      0.45
    )
    return () => tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Exit: quiet fade back to the shop.
  useEffect(() => {
    if (!closing) return
    const done = () => onClosed()
    if (prefersReducedMotion()) return void done()
    gsap.to(rootRef.current, {
      opacity: 0,
      scale: 0.985,
      y: 14,
      duration: 0.55,
      ease: 'power2.in',
      onComplete: done,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing])

  const titleLines = album.displayTitle.split('\n')
  const songName = (thisAlbumLoaded ? nowPlaying.track.name : featured?.name || album.featured)

  return (
    <main className={`album-page theme-${album.id}`} ref={rootRef}>
      <div className="album-bg" aria-hidden="true">
        <CoverImage album={album} className="album-bg-art" />
        <div className="album-bg-wash" />
      </div>

      <nav className="album-nav">
        <button
          className="back-btn"
          data-cursor="back"
          onClick={() => {
            sfx.tick()
            onClose()
          }}
        >
          <span className="back-arrow">⟵</span> RETURN THE RECORD
        </button>
        <span className="album-brand">{BRAND.name}</span>
        <SoundToggle />
      </nav>

      <header className="album-hero">
        <div className="hero-text">
          <p className="hero-kicker" data-reveal>
            CAPSULE {album.capsuleNo} · {album.year} · {album.label}
          </p>
          <h2 className="hero-title" data-reveal>
            {titleLines.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </h2>
          <p className="hero-artist" data-reveal>
            {album.artist}
          </p>
          <p className="hero-story" data-reveal>
            {album.story}
          </p>
          <div className="hero-actions" data-reveal>
            <button
              className={`now-chip ${playingThis ? 'live' : ''}`}
              data-cursor={playingThis ? 'pause' : 'play'}
              onClick={toggle}
            >
              <span className="ns-eq">
                <i />
                <i />
                <i />
              </span>
              {playingThis ? 'NOW SPINNING' : 'DROP THE NEEDLE'} — {songName.toUpperCase()}
            </button>
          </div>
        </div>
        <div className="hero-art" data-reveal>
          <VinylDisc album={album} spinning={playingThis} className="hero-disc" />
          <div className="hero-cover-frame">
            <CoverImage album={album} className="hero-cover" />
          </div>
        </div>
      </header>

      <CapsuleGrid album={album} featuredName={featured?.name} />

      <footer className="album-foot">
        <span>
          {BRAND.name} · CAPSULE {album.capsuleNo} · {album.title.toUpperCase()}
        </span>
        <button className="back-btn" data-cursor="back" onClick={onClose}>
          RETURN THE RECORD ⟵
        </button>
      </footer>

      <div className="dock-tt" data-reveal>
        <Turntable album={album} size="dock" playing={playingThis} onToggle={toggle} />
        <span className="dock-label">{playingThis ? 'ON THE PLATTER' : 'NEEDLE UP'}</span>
      </div>
    </main>
  )
}
