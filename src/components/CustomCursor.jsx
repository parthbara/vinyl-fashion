import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { hasFinePointer, prefersReducedMotion } from '../lib/env'

const LABELS = { open: 'OPEN', play: 'PLAY', pause: 'PAUSE', back: 'BACK' }

// A stylus-tip cursor: quick dot + trailing ring. Elements opt in to
// modes with data-cursor="open|play|pause|back".
export default function CustomCursor() {
  const ringRef = useRef(null)
  const dotRef = useRef(null)
  const [mode, setMode] = useState(null)
  const [enabled] = useState(() => hasFinePointer() && !prefersReducedMotion())

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-custom-cursor')

    const ringX = gsap.quickTo(ringRef.current, 'x', { duration: 0.35, ease: 'power3' })
    const ringY = gsap.quickTo(ringRef.current, 'y', { duration: 0.35, ease: 'power3' })
    const dotX = gsap.quickTo(dotRef.current, 'x', { duration: 0.08, ease: 'power2' })
    const dotY = gsap.quickTo(dotRef.current, 'y', { duration: 0.08, ease: 'power2' })

    let seen = false
    const move = (e) => {
      if (!seen) {
        // don't show the cursor pair until the pointer actually moves
        seen = true
        gsap.set([ringRef.current, dotRef.current], {
          x: e.clientX,
          y: e.clientY,
          autoAlpha: 1,
        })
      }
      ringX(e.clientX)
      ringY(e.clientY)
      dotX(e.clientX)
      dotY(e.clientY)
    }
    const over = (e) => {
      const hit = e.target.closest('[data-cursor]')
      setMode(hit ? hit.dataset.cursor : null)
    }
    const down = () => gsap.fromTo(ringRef.current, { scale: 0.82 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' })

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    return () => {
      document.documentElement.classList.remove('has-custom-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      window.removeEventListener('pointerdown', down)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div ref={ringRef} className={`cursor-ring ${mode ? 'is-active' : ''}`} aria-hidden="true">
        <span className="cursor-label">{LABELS[mode] || ''}</span>
      </div>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
