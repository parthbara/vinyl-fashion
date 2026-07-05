import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { BRAND } from '../config'
import * as sfx from '../lib/sfx'
import { prefersReducedMotion } from '../lib/env'

// The needle-drop moment. A groove traces itself in the dark, the
// wordmark stamps in like a label print, and clicking ENTER (the
// user gesture that unlocks audio) drops you into the shop.
export default function Intro({ onEnter }) {
  const rootRef = useRef(null)
  const svgRef = useRef(null)
  const wordRef = useRef(null)
  const [ready, setReady] = useState(false)
  const leavingRef = useRef(false)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setReady(true)
      return
    }
    const grooves = svgRef.current.querySelectorAll('.groove')
    const letters = wordRef.current.querySelectorAll('span')
    const tl = gsap.timeline()
    grooves.forEach((c) => {
      const len = c.getTotalLength()
      gsap.set(c, { strokeDasharray: len, strokeDashoffset: len })
    })
    tl.to(grooves, {
      strokeDashoffset: 0,
      duration: 1.5,
      ease: 'power2.inOut',
      stagger: 0.12,
    })
      .fromTo(
        letters,
        { opacity: 0, y: 18, rotationX: -50 },
        { opacity: 1, y: 0, rotationX: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.035 },
        0.7
      )
      .call(() => setReady(true), null, 1.6)
    return () => tl.kill()
  }, [])

  const enter = () => {
    if (leavingRef.current) return
    leavingRef.current = true
    sfx.unlock()
    sfx.needleDrop()
    sfx.whoosh(1.0)
    if (prefersReducedMotion()) return void onEnter()
    gsap
      .timeline({ onComplete: onEnter })
      .to(svgRef.current, { rotation: 25, scale: 0.9, duration: 0.7, ease: 'power2.in' }, 0)
      .to(
        rootRef.current,
        {
          clipPath: 'circle(0% at 50% 46%)',
          duration: 0.75,
          ease: 'power3.inOut',
        },
        0.08
      )
  }

  return (
    <div
      className="intro"
      ref={rootRef}
      style={{ clipPath: 'circle(142% at 50% 46%)' }}
      onClick={ready ? enter : undefined}
    >
      <div className="intro-center">
        <svg
          ref={svgRef}
          className="intro-disc"
          viewBox="0 0 400 400"
          aria-hidden="true"
        >
          <circle className="groove" cx="200" cy="200" r="186" />
          <circle className="groove" cx="200" cy="200" r="158" />
          <circle className="groove" cx="200" cy="200" r="130" />
          <circle className="intro-label" cx="200" cy="200" r="106" />
          <circle className="intro-hole" cx="200" cy="200" r="7" />
        </svg>
        <div className="intro-word" ref={wordRef} aria-label={BRAND.name}>
          {BRAND.name.split('').map((ch, i) => (
            <span key={i}>{ch === ' ' ? ' ' : ch}</span>
          ))}
        </div>
        <p className={`intro-sub ${ready ? 'is-ready' : ''}`}>
          {BRAND.est} · {BRAND.tagline}
        </p>
        <button
          className={`intro-enter ${ready ? 'is-ready' : ''}`}
          onClick={enter}
          data-cursor="play"
        >
          ENTER THE SHOP
        </button>
        <p className={`intro-note ${ready ? 'is-ready' : ''}`}>
          BEST WITH SOUND ON · HEADPHONES RECOMMENDED
        </p>
      </div>
    </div>
  )
}
