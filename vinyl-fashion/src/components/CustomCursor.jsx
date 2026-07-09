import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { hasFinePointer, prefersReducedMotion } from '../lib/env'

const LABELS = { open: 'OPEN', play: 'PLAY', pause: 'PAUSE', back: 'BACK' }

// A stylus-tip cursor: the dot is written straight to the transform on
// every pointermove (zero latency), the ring chases with a very short
// tween. Elements opt in to modes with data-cursor="open|play|pause|back".
export default function CustomCursor() {
  const ringRef = useRef(null)
  const dotRef = useRef(null)
  const [mode, setMode] = useState(null)
  const [enabled] = useState(() => hasFinePointer() && !prefersReducedMotion())

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-custom-cursor')

    const ringX = gsap.quickTo(ringRef.current, 'x', { duration: 0.13, ease: 'power3' })
    const ringY = gsap.quickTo(ringRef.current, 'y', { duration: 0.13, ease: 'power3' })

    let seen = false
    const move = (e) => {
      const x = e.clientX
      const y = e.clientY
      const dot = dotRef.current
      if (!seen) {
        // don't show the cursor pair until the pointer actually moves
        seen = true
        gsap.set(ringRef.current, { x, y, autoAlpha: 1 })
        dot.style.visibility = 'visible'
        dot.style.opacity = '1'
      }
      ringX(x)
      ringY(y)
      dot.style.transform = `translate(${x}px, ${y}px)` // instant, no tween
    }
    const over = (e) => {
      const hit = e.target.closest('[data-cursor]')
      setMode(hit ? hit.dataset.cursor : null)
    }
    const down = () => gsap.fromTo(ringRef.current, { scale: 0.88 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' })

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
        <span className="cursor-ring-c">
          <span className="cursor-label">{LABELS[mode] || ''}</span>
        </span>
      </div>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
