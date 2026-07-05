import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import CoverImage from './CoverImage'
import VinylDisc from './VinylDisc'
import Turntable from './Turntable'
import * as sfx from '../lib/sfx'
import { useAudio } from '../lib/player'
import { useAlbumData } from '../lib/useAlbumData'
import { findTrack } from '../lib/itunes'
import { prefersReducedMotion } from '../lib/env'

// The open-the-case cinematic:
// sleeve flies from the crate → gatefold opens → record slides out
// and lands on a rising turntable → needle drops, song starts →
// camera dives through the spindle hole into the album page.
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
      // 2 — gatefold opens
      .to(frontRef.current, { rotationY: -148, duration: 0.8, ease: 'power2.inOut' }, 0.6)
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
      .call(
        () => {
          needleRef.current = true
          sfx.needleDrop()
          tryPlay()
        },
        null,
        'landing+=1.15'
      )
      // keep the record visually spinning from here
      .to(discEl, { rotation: '+=360', duration: 1.9, ease: 'none' }, 'landing+=0.85')
      .fromTo(
        nowRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
        'landing+=1.2'
      )
      .add('push', 'landing+=2.0')
      .call(() => onReveal({ x: pcx, y: pcy }), null, 'push-=0.05')
      .set(stageRef.current, { transformOrigin: `${pcx}px ${pcy}px` }, 'push')
      .to(stageRef.current, { scale: 6.5, duration: 1.0, ease: 'power3.in' }, 'push')
      .to(overlayRef.current, { opacity: 0, duration: 0.55, ease: 'power1.in' }, 'push+=0.45')

    return () => tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skip = () => {
    const tl = tlRef.current
    if (tl && tl.progress() < 0.92 && tl.timeScale() === 1) tl.timeScale(6.5)
  }

  return (
    <div className="open-scene" ref={overlayRef} onPointerDown={skip}>
      <div className="os-stage" ref={stageRef}>
        <div className="os-sleeve" ref={sleeveRef}>
          <div className="os-inside">
            <div className="os-liner" ref={linerRef}>
              <span className="os-liner-no">CAPSULE {album.capsuleNo}</span>
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
              <CoverImage album={album} className="os-front-art" />
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
