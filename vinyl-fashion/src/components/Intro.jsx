import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { BRAND } from '../config'
import * as sfx from '../lib/sfx'
import { hasFinePointer, prefersReducedMotion } from '../lib/env'

// The needle-drop moment. Grooves trace themselves in the dark, a
// gold record label sets with the wordmark arced around it (clearing
// the spindle), the disc tilts to the cursor like it's under glass —
// click to drop the needle and fall into the shop.
export default function Intro({ onEnter }) {
  const rootRef = useRef(null)
  const tiltRef = useRef(null)
  const svgRef = useRef(null)
  const labelRef = useRef(null)
  const [ready, setReady] = useState(false)
  const leavingRef = useRef(false)
  const quick = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setReady(true)
      return
    }
    const grooves = svgRef.current.querySelectorAll('.groove')
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
        labelRef.current,
        { opacity: 0, scale: 0.62, transformOrigin: '50% 50%' },
        { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.7)' },
        0.75
      )
      .call(() => setReady(true), null, 1.5)
    return () => tl.kill()
  }, [])

  // Under-glass parallax: the disc leans toward the pointer.
  // Desktop-only — on touch this would fire during swipes for nothing.
  const fine = hasFinePointer()
  useEffect(() => {
    if (!ready || !fine || prefersReducedMotion()) return
    const el = tiltRef.current
    quick.current = {
      rx: gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }),
      ry: gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' }),
    }
    return () => {
      quick.current = null
    }
  }, [ready])

  const onMove = (e) => {
    if (!quick.current) return
    const nx = e.clientX / window.innerWidth - 0.5
    const ny = e.clientY / window.innerHeight - 0.5
    quick.current.ry(nx * 18)
    quick.current.rx(-ny * 14)
  }

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
      onPointerMove={fine ? onMove : undefined}
    >
      <div className="intro-center">
        <div className="intro-disc-wrap">
          <span className="intro-glow" aria-hidden="true" />
          <div className="intro-tilt" ref={tiltRef}>
            <svg
              ref={svgRef}
              className="intro-disc"
              viewBox="0 0 400 400"
              aria-label={BRAND.name}
            >
              <defs>
                <radialGradient id="introLabel" cx="42%" cy="36%" r="72%">
                  <stop offset="0%" stopColor="#e7c072" />
                  <stop offset="55%" stopColor="#c79a42" />
                  <stop offset="100%" stopColor="#9c7128" />
                </radialGradient>
                <path id="introArcTop" d="M 124 200 A 76 76 0 0 1 276 200" fill="none" />
              </defs>

              <circle className="groove" cx="200" cy="200" r="186" />
              <circle className="groove" cx="200" cy="200" r="158" />
              <circle className="groove" cx="200" cy="200" r="130" />

              <g ref={labelRef} className="intro-label-group">
                <circle cx="200" cy="200" r="106" fill="url(#introLabel)" />
                <circle
                  className="intro-label-ring"
                  cx="200"
                  cy="200"
                  r="100"
                  fill="none"
                />
                <ellipse
                  className="intro-label-gloss"
                  cx="172"
                  cy="164"
                  rx="52"
                  ry="30"
                />
                <g className="intro-orbit" aria-hidden="true">
                  <ellipse cx="200" cy="136" rx="54" ry="15" fill="rgba(255, 255, 255, 0.14)" />
                </g>
                <text className="intro-arc" textAnchor="middle">
                  <textPath href="#introArcTop" startOffset="50%">
                    {BRAND.name}
                  </textPath>
                </text>
                <text className="intro-arc-sub" x="200" y="250" textAnchor="middle">
                  {BRAND.tagline}
                </text>
                <text className="intro-arc-mini" x="200" y="268" textAnchor="middle">
                  33⅓ RPM · STEREO
                </text>
                <circle className="intro-hole" cx="200" cy="200" r="7" />
              </g>
            </svg>
          </div>
        </div>

        <p className={`intro-sub ${ready ? 'is-ready' : ''}`}>
          {BRAND.est} · SIDE A · 33⅓ RPM
        </p>
        <button
          className={`intro-enter ${ready ? 'is-ready' : ''}`}
          onClick={enter}
          data-cursor="play"
        >
          <span className="intro-enter-tri" aria-hidden="true" />
          ENTER THE SHOP
        </button>
        <p className={`intro-note ${ready ? 'is-ready' : ''}`}>
          BEST WITH SOUND ON · HEADPHONES RECOMMENDED
        </p>
      </div>
    </div>
  )
}
