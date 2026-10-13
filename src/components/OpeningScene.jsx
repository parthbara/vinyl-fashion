import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import CoverImage from './CoverImage'
import VinylDisc from './VinylDisc'
import Turntable from './Turntable'
import * as sfx from '../lib/sfx'
import { useAudio } from '../lib/player'
import { useAlbumData } from '../lib/useAlbumData'
import { findTrack } from '../lib/itunes'
import { hasFinePointer, prefersReducedMotion } from '../lib/env'

gsap.registerPlugin(Flip)

// The open-the-case cinematic:
// sleeve flies from the crate → gatefold opens → record slides out
// and lands on a rising turntable → needle drops, song starts →
// the album page fades up underneath while the whole deck glides
// down into its corner dock and the clothes pop in.
// Click anywhere to fast-forward.
export default function OpeningScene({ album, originRect, onReveal, onComplete }) {
  const overlayRef = useRef(null)
  const stageRef = useRef(null)
  const sleeveRef = useRef(null)
  const frontRef = useRef(null)
  const linerRef = useRef(null)
  const discRef = useRef(null)
  const ttWrapRef = useRef(null)
  const nowRef = useRef(null)

  const tlRef = useRef(null)
  const startedRef = useRef(false)
  const skippedRef = useRef(false)
  const needleRef = useRef(false)
  const dataRef = useRef(null)

  const [ttPlaying, setTtPlaying] = useState(false)
  const { playTrack } = useAudio()
  const data = useAlbumData(album)
  dataRef.current = data

  const tryPlay = () => {
    if (startedRef.current) return
    const d = dataRef.current
    if (!d?.tracks?.length) return
    const track = findTrack(d.tracks, album.featured) || d.tracks[0]
    startedRef.current = true
    playTrack(album, track)
  }

  // If the needle already dropped but the track data arrived late,
  // start the music as soon as it lands.
  useEffect(() => {
    if (needleRef.current) tryPlay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useLayoutEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const S = Math.min(vw * 0.56, vh * 0.5, 430)
    // Phones/tablets: some mobile GPUs mis-render the 3D gatefold
    // (flattened preserve-3d → glitched mirrored panel), so they get
    // a flat 2D cover-slide instead. Same beats, zero 3D risk.
    const simple = !hasFinePointer() || Math.min(vw, vh) < 700
    const sleeve = sleeveRef.current
    sleeve.style.width = `${S}px`
    sleeve.style.height = `${S}px`

    if (prefersReducedMotion()) {
      needleRef.current = true
      tryPlay()
      onReveal({ x: vw / 2, y: vh / 2 })
      gsap.set(overlayRef.current, { opacity: 0 })
      gsap.delayedCall(0.2, onComplete)
      return
    }

    // Measure the platter at its natural (final) position, then
    // shove the deck below the frame for its entrance.
    const platter = ttWrapRef.current.querySelector('[data-tt-platter]')
    const pr = platter.getBoundingClientRect()
    const pcx = pr.left + pr.width / 2
    const pcy = pr.top + pr.height / 2
    gsap.set(ttWrapRef.current, { yPercent: 140 })

    const discEl = discRef.current
    const flightScale = (pr.width * 0.92) / (S * 0.94)

    const tx = (vw - S) / 2
    const ty = Math.max(20, vh * 0.4 - S / 2)

    // Deck→dock handoff. The album page is already mounted (hidden)
    // underneath, so its corner dock has a real on-screen box we can
    // fly toward. GSAP Flip.fit does the measure+match in one call —
    // no manual bounding-box math, and it's correct at any viewport.
    let spin = null
    const flips = []

    const handoff = () => {
      const dockDeck = document.querySelector('.album-page .dock-tt .turntable')
      const dockDisc = document.querySelector('.album-page .dock-tt [data-tt-platter]')
      spin?.kill() // Flip owns the transform now; CSS spins the dock disc
      const opts = { duration: 1.0, ease: 'power3.inOut', absolute: true }
      if (dockDeck) flips.push(Flip.fit(ttWrapRef.current, dockDeck, opts))
      if (dockDisc) flips.push(Flip.fit(discEl, dockDisc, { ...opts, scale: true }))
    }
    const swapToDock = () => {
      const dock = document.querySelector('.album-page .dock-tt')
      if (dock) gsap.set(dock, { autoAlpha: 1 })
      sfx.tick()
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete,
    })
    tlRef.current = tl

    tl.set(sleeve, {
      x: originRect.left,
      y: originRect.top,
      scale: originRect.width / S,
      transformOrigin: '0 0',
    })
      .call(() => sfx.whoosh(0.9), null, 0.02)
      // 1 — fly to center
      .to(sleeve, { x: tx, y: ty, scale: 1, duration: 0.65 }, 0)
      // 2 — gatefold opens (3D fold on desktop, flat slide on touch).
      // The leaf swings 120° — past 90° — around its left hinge under
      // the parent's centered perspective, so it opens like a real
      // gatefold with no blow-up. At the frame it crosses 90° (edge-on,
      // invisible) we swap the front face for the back layer via
      // opacity — no backface-visibility, no nested 3D, nothing for a
      // compositor to mangle.
      .to(
        frontRef.current,
        simple
          ? { xPercent: -76, rotation: -4, duration: 0.8, ease: 'power2.inOut' }
          : { rotationY: -120, duration: 0.85, ease: 'power2.inOut' },
        0.6
      )
      .call(
        () => {
          if (simple) return
          const panel = frontRef.current
          gsap.set(panel.querySelector('.os-front-face'), { opacity: 0 })
          gsap.set(panel.querySelector('.os-front-back'), { opacity: 1 })
        },
        null,
        1.11 // ≈ the instant rotationY crosses -90° (panel edge-on)
      )
      .call(() => sfx.pop(), null, 0.75)
      .fromTo(
        linerRef.current,
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' },
        0.95
      )
      // 3 — record slides out of the mouth
      .to(discEl, { x: S * 0.58, rotation: 40, duration: 0.6, ease: 'power2.out' }, 1.0)
      // 4 — deck rises
      .to(ttWrapRef.current, { yPercent: 0, duration: 0.75, ease: 'back.out(1.05)' }, 1.05)
      .add('landing', 1.7)
      // 5 — flight to the platter (function values resolve at start)
      .to(
        discEl,
        {
          x: () => {
            const d = discEl.getBoundingClientRect()
            return gsap.getProperty(discEl, 'x') + (pcx - (d.left + d.width / 2))
          },
          y: () => {
            const d = discEl.getBoundingClientRect()
            return gsap.getProperty(discEl, 'y') + (pcy - (d.top + d.height / 2))
          },
          scale: flightScale,
          rotation: 220,
          duration: 0.8,
          ease: 'power2.inOut',
        },
        'landing'
      )
      .call(() => sfx.tick(), null, 'landing+=0.8')
      // 6 — tonearm swings in (CSS transition via is-playing)
      .call(() => setTtPlaying(true), null, 'landing+=0.85')
      // keep the record spinning from here on (standalone tween — an
      // infinite repeat inside the timeline would block onComplete)
      .call(
        () => {
          spin = gsap.to(discEl, { rotation: '+=360', duration: 1.8, ease: 'none', repeat: -1 })
        },
        null,
        'landing+=0.85'
      )
      .call(
        () => {
          needleRef.current = true
          sfx.needleDrop()
          tryPlay()
        },
        null,
        'landing+=1.15'
      )
      .fromTo(
        nowRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
        'landing+=1.2'
      )
      // 7 — handoff: album page fades up underneath, the sleeve bows
      // out, and the whole spinning deck glides down into its dock.
      .add('handoff', 'landing+=2.0')
      .call(() => onReveal({ x: pcx, y: pcy }), null, 'handoff-=0.05')
      .call(() => sfx.whoosh(0.6), null, 'handoff')
      .to(
        [sleeveRef.current, nowRef.current],
        { autoAlpha: 0, y: '-=28', duration: 0.45, ease: 'power2.in' },
        'handoff'
      )
      .call(handoff, null, 'handoff+=0.1')
      .call(swapToDock, null, 'handoff+=1.12')
      .to(overlayRef.current, { autoAlpha: 0, duration: 0.28, ease: 'power1.in' }, 'handoff+=1.12')

    return () => {
      tl.kill()
      spin?.kill()
      flips.forEach((f) => f?.kill())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fast-forward only up to just before the handoff, then let it play
  // at normal speed — the Flip flight runs on its own clock and must
  // not be scrubbed through.
  const skip = () => {
    const tl = tlRef.current
    if (!tl || skippedRef.current) return
    const stop = (tl.labels.handoff ?? tl.duration()) - 0.05
    if (tl.time() >= stop) return
    skippedRef.current = true
    tl.tweenTo(stop, {
      duration: Math.min(0.6, (stop - tl.time()) / 6.5),
      ease: 'power1.in',
      onComplete: () => tl.play(),
    })
  }

  return (
    <div className="open-scene" ref={overlayRef} onPointerDown={skip}>
      <div className="os-stage" ref={stageRef}>
        <div className="os-sleeve" ref={sleeveRef}>
          <div className="os-inside">
            <div className="os-liner" ref={linerRef}>
              <span className="os-liner-no">{album.artist}</span>
              <h3 className="os-liner-title">{album.title}</h3>
              <p className="os-liner-story">{album.story}</p>
              <span className="os-liner-side">SIDE A · 33⅓ RPM · STEREO</span>
            </div>
            <span className="os-mouth" />
          </div>
          <div className="os-disc" ref={discRef}>
            <VinylDisc album={album} />
          </div>
          <div className="os-front" ref={frontRef}>
            <div className="os-front-face">
              <CoverImage album={album} size="mid" className="os-front-art" />
            </div>
            <div className="os-front-back" />
          </div>
        </div>
        <div className="os-tt" ref={ttWrapRef}>
          <Turntable album={album} size="stage" playing={ttPlaying} showDisc={false} />
        </div>
        <div className="os-nowspinning" ref={nowRef}>
          <span className="ns-eq">
            <i />
            <i />
            <i />
          </span>
          NOW SPINNING — {album.featured.toUpperCase()}
        </div>
      </div>
      <span className="os-skip">CLICK TO SKIP</span>
    </div>
  )
}
