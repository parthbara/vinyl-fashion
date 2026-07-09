import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import CoverImage from './CoverImage'
import VinylDisc from './VinylDisc'
import * as sfx from '../lib/sfx'
import { warmAlbumArt } from '../lib/preload'
import { hasFinePointer, prefersReducedMotion } from '../lib/env'

// One record in the crate: a CSS-3D jacket with the disc tucked
// behind it. Floats idle, tilts toward the cursor, lifts on hover
// with the vinyl sliding out — click pulls it from the crate.
export default function VinylSleeve({ album, index, onOpen, onSoon, onHover, hidden, dense = false }) {
  const floatRef = useRef(null)
  const tiltRef = useRef(null)
  const jacketRef = useRef(null)
  const discRef = useRef(null)
  const quick = useRef(null)
  // Tilt/hover choreography is pointer-driven; on touch it only fires
  // during scrolls and burns frames — desktop-only.
  const fine = hasFinePointer()

  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = tiltRef.current
    quick.current = {
      rx: gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }),
      ry: gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' }),
    }
    // idle breathing, staggered per slot — skipped on a dense wall
    // (dozens of infinite tweens is the thing that actually janks)
    if (dense) return
    const float = gsap.to(floatRef.current, {
      y: -9,
      duration: 2.6 + index * 0.35,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: index * 0.4,
    })
    return () => {
      float.kill()
    }
  }, [index, dense])

  const onMove = (e) => {
    if (!quick.current) return
    const r = tiltRef.current.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width - 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5
    quick.current.ry(nx * 16)
    quick.current.rx(-ny * 12)
  }

  const onEnter = () => {
    onHover(album.id)
    warmAlbumArt(album, 'mid') // cinematic + hero paint from cache
    sfx.tick()
    if (prefersReducedMotion()) return
    // gentle in a dense wall — a small lift + the record easing up
    gsap.to(tiltRef.current, { y: -14, scale: 1.045, duration: 0.5, ease: 'back.out(1.5)' })
    if (discRef.current) gsap.to(discRef.current, { yPercent: -26, duration: 0.55, ease: 'power3.out' })
  }

  const onLeave = () => {
    onHover(null)
    if (prefersReducedMotion()) return
    quick.current?.rx(0)
    quick.current?.ry(0)
    gsap.to(tiltRef.current, { y: 0, scale: 1, duration: 0.6, ease: 'power3.out' })
    if (discRef.current) gsap.to(discRef.current, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' })
  }

  const open = () => {
    if (album.comingSoon) {
      // not for sale yet — nudge, then open the notify-me teaser
      sfx.pop()
      if (!prefersReducedMotion()) {
        gsap.fromTo(tiltRef.current, { rotationZ: -2.5 }, { rotationZ: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' })
      }
      onSoon?.(album)
      return
    }
    onOpen(album, jacketRef.current.getBoundingClientRect())
  }

  return (
    <div
      className={`sleeve-slot ${hidden ? 'is-ghost' : ''} ${album.comingSoon ? 'is-soon' : ''}`}
      data-sleeve={album.id}
      style={{ '--i': index }}
      data-cursor={album.comingSoon ? undefined : 'open'}
      role="button"
      tabIndex={0}
      aria-label={album.comingSoon ? `${album.title} — ${album.comingSoonText}` : `Open ${album.artist} — ${album.title} capsule`}
      onPointerMove={fine ? onMove : undefined}
      onPointerEnter={fine ? onEnter : undefined}
      onPointerLeave={fine ? onLeave : undefined}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
    >
      <div className="sleeve-float" ref={floatRef}>
        <div className="sleeve3d" ref={tiltRef}>
          {!dense && (
            <div className="sleeve-disc" ref={discRef}>
              <VinylDisc album={album} loading="eager" />
            </div>
          )}
          <div className="jacket" ref={jacketRef}>
            <CoverImage album={album} size="low" className="jacket-cover" loading={dense ? 'lazy' : 'eager'} />
            <span className="jacket-sheen" />
            <span className="jacket-mouth" />
            <span className="jacket-wear" />
            {album.comingSoon && (
              <span className="soon-sticker">
                <b>{album.comingSoonText}</b>
              </span>
            )}
          </div>
          <div className="sleeve-shadow" />
        </div>
      </div>
      <div className="slot-meta">
        <span className="slot-artist">{album.artist}</span>
        <span className="slot-title">{album.title}</span>
      </div>
    </div>
  )
}
