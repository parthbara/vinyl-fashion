// ── The house sound system ───────────────────────────────────────
// One <audio> element for the whole site so music survives scene
// transitions. One song per album — set by the house (albums.js),
// not the visitor — looping softly over the crackle bed.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import gsap from 'gsap'
import * as sfx from './sfx'
import { resolveTrackSrc } from './itunes'

const MUSIC_VOLUME = 0.9
const AudioCtx = createContext(null)
export const useAudio = () => useContext(AudioCtx)

export function AudioProvider({ children }) {
  const elRef = useRef(null)
  const soundOnRef = useRef(true)

  const [soundOn, setSoundOnState] = useState(() => {
    const on = localStorage.getItem('vf.sound') !== 'off'
    soundOnRef.current = on
    return on
  })
  const [nowPlaying, setNowPlaying] = useState(null) // { albumId, track }
  const [isPlaying, setIsPlaying] = useState(false)

  const ensureEl = () => {
    if (!elRef.current) {
      const el = new Audio()
      el.preload = 'auto'
      el.loop = true
      elRef.current = el
    }
    return elRef.current
  }

  const playTrack = useCallback(async (album, track) => {
    if (!track) return
    sfx.unlock()
    const el = ensureEl()
    const src = await resolveTrackSrc(album, track)
    gsap.killTweensOf(el)
    el.src = src
    el.volume = 0
    el.muted = !soundOnRef.current
    try {
      await el.play()
      gsap.to(el, { volume: MUSIC_VOLUME, duration: 1.4, ease: 'power1.in' })
      sfx.startCrackle()
      setNowPlaying({ albumId: album.id, track })
      setIsPlaying(true)
    } catch {
      /* playback blocked or src unreachable */
    }
  }, [])

  const pause = useCallback(() => {
    const el = elRef.current
    if (!el) return
    sfx.needleLift()
    sfx.stopCrackle()
    gsap.killTweensOf(el)
    gsap.to(el, {
      volume: 0,
      duration: 0.3,
      ease: 'power1.out',
      onComplete: () => el.pause(),
    })
    setIsPlaying(false)
  }, [])

  const resume = useCallback(async () => {
    const el = elRef.current
    if (!el || !el.src) return
    sfx.unlock()
    sfx.needleDrop()
    sfx.startCrackle()
    try {
      await el.play()
      gsap.killTweensOf(el)
      gsap.to(el, { volume: MUSIC_VOLUME, duration: 0.8, ease: 'power1.in' })
      setIsPlaying(true)
    } catch {
      /* blocked */
    }
  }, [])

  const stop = useCallback((fade = 0.6) => {
    const el = elRef.current
    sfx.stopCrackle()
    if (el) {
      gsap.killTweensOf(el)
      gsap.to(el, {
        volume: 0,
        duration: fade,
        ease: 'power1.out',
        onComplete: () => el.pause(),
      })
    }
    setNowPlaying(null)
    setIsPlaying(false)
  }, [])

  const setSound = useCallback((on) => {
    soundOnRef.current = on
    setSoundOnState(on)
    localStorage.setItem('vf.sound', on ? 'on' : 'off')
    sfx.unlock()
    sfx.setEnabled(on)
    if (elRef.current) elRef.current.muted = !on
  }, [])

  const value = useMemo(
    () => ({ soundOn, setSound, nowPlaying, isPlaying, playTrack, pause, resume, stop }),
    [soundOn, setSound, nowPlaying, isPlaying, playTrack, pause, resume, stop]
  )

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>
}
