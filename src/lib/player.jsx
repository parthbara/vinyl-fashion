// ── The house sound system ───────────────────────────────────────
// One <audio> element for the whole site so music survives scene
// transitions. One song per album — set by the house (albums.js),
// not the visitor — looping softly over the crackle bed.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import gsap from 'gsap'
import * as sfx from './sfx'
import { resolveTrackSrc } from './itunes'

const MUSIC_VOLUME = 0.9 // default level before the visitor touches the slider

// Keep one context identity across Vite HMR re-evaluations — a hot
// update to this module used to mint a NEW context, so mounted
// consumers read null and crashed the tree until a full reload.
const AudioCtx = (globalThis.__vfAudioCtx ??= createContext(null))

// Never let a torn provider (HMR edge, tests) take the site down —
// worst case the controls no-op until the next reload.
const NOOP_AUDIO = {
  soundOn: false,
  setSound: () => {},
  nowPlaying: null,
  isPlaying: false,
  volume: MUSIC_VOLUME,
  setVolume: () => {},
  playTrack: () => {},
  pause: () => {},
  resume: () => {},
  stop: () => {},
}
export const useAudio = () => useContext(AudioCtx) ?? NOOP_AUDIO

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
  // visitor-set playback level (0..1). Held in a ref so the volume
  // fade-ins always ease toward the CURRENT target, and mirrored in
  // state so the slider re-renders.
  const volumeRef = useRef(0)
  const [volume, setVolumeState] = useState(() => {
    // NB: Number(null) === 0, so parse the raw string — a visitor who
    // never touched the slider must NOT start muted. A stored 0 (muted
    // last session) also resets to the default: mute is a session action.
    const raw = localStorage.getItem('vf.volume')
    const saved = raw == null ? NaN : Number(raw)
    const v = Number.isFinite(saved) && saved > 0 && saved <= 1 ? saved : MUSIC_VOLUME
    volumeRef.current = v
    return v
  })
  const pendingRef = useRef(null) // track queued after a blocked autoplay
  const playTrackRef = useRef(null)
  // Optional playback window {start, end} in seconds — the IG-story
  // style "play this portion of the song" set per album (Studio
  // writes album.clip = { start, duration }).
  const clipRef = useRef(null)

  const ensureEl = () => {
    if (!elRef.current) {
      const el = new Audio()
      el.preload = 'auto'
      el.loop = true
      el.addEventListener('timeupdate', () => {
        const c = clipRef.current
        if (!c) return
        // passed the window's end → wrap to its start
        if (c.end && el.currentTime >= c.end) el.currentTime = c.start
        // native loop restarted at 0 before the window → jump in
        else if (el.currentTime < c.start - 0.75) el.currentTime = c.start
      })
      elRef.current = el
    }
    return elRef.current
  }

  const playTrack = useCallback(async (album, track) => {
    if (!track) return
    sfx.unlock()
    const el = ensureEl()
    // A full-length song uploaded in the Studio (album.clip.src) wins
    // over the 30-second iTunes preview — so a clip window can point
    // at ANY part of the track, not just the preview snippet.
    let src = await resolveTrackSrc(album, track)
    if (album.clip?.src) src = album.clip.src
    // arm the album's clip window (if any) before playback starts
    const rawClip = album.clip
    const clip =
      rawClip && (rawClip.start > 0 || rawClip.duration > 0)
        ? {
            start: Math.max(0, rawClip.start || 0),
            end: rawClip.duration ? Math.max(0, rawClip.start || 0) + rawClip.duration : null,
          }
        : null
    clipRef.current = clip
    gsap.killTweensOf(el)
    el.src = src
    el.volume = 0
    el.muted = !soundOnRef.current
    try {
      await el.play()
      if (clip && Math.abs(el.currentTime - clip.start) > 0.4) {
        try {
          el.currentTime = clip.start
        } catch {
          /* not seekable yet — the timeupdate guard will catch it */
        }
      }
      pendingRef.current = null
      gsap.to(el, { volume: volumeRef.current, duration: 1.4, ease: 'power1.in' })
      sfx.startCrackle()
      setNowPlaying({ albumId: album.id, track })
      setIsPlaying(true)
    } catch {
      // strict autoplay (often iOS): queue it and recover on next tap
      pendingRef.current = { album, track }
    }
  }, [])
  playTrackRef.current = playTrack

  // Recover a blocked track on the next real user gesture.
  useEffect(() => {
    const retry = () => {
      const p = pendingRef.current
      if (p) {
        pendingRef.current = null
        playTrackRef.current?.(p.album, p.track)
      }
    }
    window.addEventListener('pointerdown', retry)
    window.addEventListener('keydown', retry)
    return () => {
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
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
      gsap.to(el, { volume: volumeRef.current, duration: 0.8, ease: 'power1.in' })
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

  // Live volume from the album-page slider. Applies immediately (killing
  // any in-progress fade so the drag wins) and persists for next visit.
  const setVolume = useCallback((v) => {
    const vol = Math.max(0, Math.min(1, v))
    volumeRef.current = vol
    setVolumeState(vol)
    localStorage.setItem('vf.volume', String(vol))
    const el = elRef.current
    if (el && !el.paused) {
      gsap.killTweensOf(el)
      el.volume = vol
    }
  }, [])

  const value = useMemo(
    () => ({ soundOn, setSound, nowPlaying, isPlaying, volume, setVolume, playTrack, pause, resume, stop }),
    [soundOn, setSound, nowPlaying, isPlaying, volume, setVolume, playTrack, pause, resume, stop]
  )

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>
}
