import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import CoverImage from './CoverImage'
import VinylDisc from './VinylDisc'
import * as sfx from '../lib/sfx'
import { prefersReducedMotion } from '../lib/env'

// One record in the crate: a CSS-3D jacket with the disc tucked
// behind it. Floats idle, tilts toward the cursor, lifts on hover
// with the vinyl sliding out — click pulls it from the crate.
export default function VinylSleeve({ album, index, onOpen, onHover, hidden }) {
  const floatRef = useRef(null)
  const tiltRef = useRef(null)
  const jacketRef = useRef(null)
  const discRef = useRef(null)
  const quick = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = tiltRef.current
    quick.current = {
      rx: gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }),
      ry: gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' }),
    }
    // idle breathing, staggered per slot
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
  }, [index])

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
    sfx.tick()
    if (prefersReducedMotion()) return
    gsap.to(tiltRef.current, { y: -26, scale: 1.055, duration: 0.55, ease: 'back.out(1.6)' })
    gsap.to(discRef.current, { yPercent: -44, duration: 0.6, ease: 'power3.out' })
  }

  const onLeave = () => {
    onHover(null)
    if (prefersReducedMotion()) return
    quick.current?.rx(0)
    quick.current?.ry(0)
    gsap.to(tiltRef.current, { y: 0, scale: 1, duration: 0.6, ease: 'power3.out' })
    gsap.to(discRef.current, { yPercent: 0, duration: 0.55, ease: 'power3.inOut' })
  }

  const open = () => {
    onOpen(album, jacketRef.current.getBoundingClientRect())
  }

  return (
    <div
      className={`sleeve-slot ${hidden ? 'is-ghost' : ''}`}
      style={{ '--i': index }}
      data-cursor="open"
      role="button"
      tabIndex={0}
      aria-label={`Open ${album.artist} — ${album.title} capsule`}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
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
          <div className="sleeve-disc" ref={discRef}>
            <VinylDisc album={album} />
          </div>
          <div className="jacket" ref={jacketRef}>
            <CoverImage album={album} className="jacket-cover" />
            <span className="jacket-sheen" />
            <span className="jacket-mouth" />
            <span className="jacket-wear" />
          </div>
          <div className="sleeve-shadow" />
        </div>
      </div>
      <div className="slot-meta">
        <span className="slot-no">CAPSULE {album.capsuleNo}</span>
        <span className="slot-artist">{album.artist}</span>
        <span className="slot-title">{album.title}</span>
      </div>
    </div>
  )
}
