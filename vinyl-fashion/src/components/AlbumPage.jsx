import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { BRAND, CONTACT, waLink } from '../config'
import { useAlbumData } from '../lib/useAlbumData'
import { findTrack } from '../lib/itunes'
import { useAudio } from '../lib/player'
import { prefersReducedMotion } from '../lib/env'
import CoverImage from './CoverImage'
import VinylDisc from './VinylDisc'
import Turntable from './Turntable'
import CapsuleGrid from './CapsuleGrid'
import * as sfx from '../lib/sfx'

// A whole storefront re-skinned to one record — clothes first.
// A sticky record rail (cover, story, now-spinning) holds the vibe
// while the capsule grid owns the viewport. The page mounts hidden
// during the cinematic and reveals as the deck flies to its dock.
export default function AlbumPage({ album, revealOrigin, closing, onClose, onClosed }) {
  const rootRef = useRef(null)
  const dockRef = useRef(null)
  const revealedRef = useRef(false)
  const data = useAlbumData(album)
  const tracks = data?.tracks ?? []
  const featured = findTrack(tracks, album.featured) || tracks[0]
  const { nowPlaying, isPlaying, playTrack, pause, resume } = useAudio()

  const thisAlbumLoaded = nowPlaying?.albumId === album.id
  const playingThis = thisAlbumLoaded && isPlaying

  // turntable = the single play/pause control
  const toggle = () => {
    if (playingThis) pause()
    else if (thisAlbumLoaded) resume()
    else if (featured) playTrack(album, featured)
  }

  // the hero chip only STARTS the needle — pausing lives on the deck
  const startNeedle = () => {
    if (playingThis) return
    if (thisAlbumLoaded) resume()
    else if (featured) playTrack(album, featured)
  }

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Reveal: the cinematic hands off mid-flight — page fades up and
  // the garments pop in while the deck is still gliding to its dock.
  useLayoutEffect(() => {
    if (!revealOrigin || revealedRef.current) return
    revealedRef.current = true
    const root = rootRef.current
    if (prefersReducedMotion()) {
      gsap.set(root, { visibility: 'visible', opacity: 1 })
      gsap.set(dockRef.current, { autoAlpha: 1 })
      return
    }
    const tl = gsap.timeline()
    tl.set(dockRef.current, { autoAlpha: 0 }, 0)
      .set(root, { visibility: 'visible' }, 0)
      .fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'power1.out' }, 0)
      .fromTo(
        root.querySelectorAll('[data-reveal]'),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', stagger: 0.07 },
        0.12
      )
      .fromTo(
        root.querySelectorAll('.garment, .liner-note'),
        { opacity: 0, y: 30, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.5)', stagger: 0.055 },
        0.28
      )
    return () => tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealOrigin])

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

  // tuck the corner deck away once you reach the footer, so it never
  // sits on top of the RETURN button / fine print
  const [dockTucked, setDockTucked] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight > window.innerHeight + 240
      const nearBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 200
      setDockTucked(scrollable && nearBottom)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const titleLines = album.displayTitle.split('\n')
  const songName = (thisAlbumLoaded ? nowPlaying.track.name : featured?.name || album.featured)
  const staged = !revealOrigin && !closing

  return (
    <main
      className={`album-page theme-${album.id} ${staged ? 'is-staged' : ''}`}
      ref={rootRef}
    >
      <div className="album-bg" aria-hidden="true">
        <CoverImage album={album} lowRes className="album-bg-art" />
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
      </nav>

      <div className="album-body">
        <aside className="album-rail">
          <div className="hero-art" data-reveal>
            <VinylDisc album={album} spinning={playingThis} className="hero-disc" />
            <div className="hero-cover-frame">
              <CoverImage album={album} size="mid" className="hero-cover" />
            </div>
          </div>
          <p className="hero-kicker" data-reveal>
            {[album.year, album.label].filter(Boolean).join(' · ')}
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
              data-cursor={playingThis ? undefined : 'play'}
              onClick={startNeedle}
            >
              <span className="ns-eq">
                <i />
                <i />
                <i />
              </span>
              {playingThis ? 'NOW SPINNING' : 'DROP THE NEEDLE'} — {songName.toUpperCase()}
            </button>
          </div>
        </aside>

        <CapsuleGrid album={album} featuredName={featured?.name} />
      </div>

      <footer className="album-foot">
        <div className="foot-grid">
          <div className="foot-col">
            <span className="foot-brand">{BRAND.name}</span>
            <span className="foot-line dim">{BRAND.tagline} · {BRAND.est} · {CONTACT.city}</span>
            <span className="foot-line dim">{album.title.toUpperCase()}</span>
          </div>
          <div className="foot-col">
            <span className="foot-k">ORDERS & CARE</span>
            <a
              className="foot-line"
              href={waLink(`Hi ${BRAND.name}! I have a question.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              WHATSAPP · {CONTACT.whatsappDisplay}
            </a>
            <a
              className="foot-line"
              href={`https://instagram.com/${CONTACT.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              INSTAGRAM · @{CONTACT.instagram.toUpperCase()}
            </a>
            <a className="foot-line" href={`mailto:${CONTACT.email}`}>
              {CONTACT.email.toUpperCase()}
            </a>
          </div>
          <div className="foot-col">
            <span className="foot-k">THE FINE PRINT</span>
            <span className="foot-line dim">LIMITED PRESSINGS · MADE TO ORDER</span>
            <span className="foot-line dim">DELIVERY ACROSS NEPAL · NPR PRICING</span>
            <span className="foot-line dim">ORDERS CONFIRMED PERSONALLY ON WHATSAPP</span>
          </div>
        </div>
        <div className="foot-base">
          <span>© MMXXVI {BRAND.name} — ALL RIGHTS PRESSED</span>
          <button className="back-btn" data-cursor="back" onClick={onClose}>
            RETURN THE RECORD ⟵
          </button>
        </div>
      </footer>

      <div className={`dock-tt ${dockTucked ? 'is-tucked' : ''}`} ref={dockRef}>
        <Turntable album={album} size="dock" playing={playingThis} onToggle={toggle} />
        <span className="dock-label">{playingThis ? 'ON THE PLATTER' : 'NEEDLE UP'}</span>
      </div>
    </main>
  )
}
