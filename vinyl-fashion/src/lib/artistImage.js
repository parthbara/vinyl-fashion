// ── Artist photos (Deezer public API) ────────────────────────────
// iTunes gives album art but no artist photos, so the "artist" cards
// used to fall back to an album cover. Deezer's free API has real
// artist portraits; it blocks CORS, so we use its official JSONP mode
// (a plain <script>, immune to CORS/ad-blockers). Results cache in
// localStorage for a month — a given artist is fetched once per device.

import { useEffect, useState } from 'react'

const MEM = new Map() // name(lower) → url|null, dedupes within a session
const CACHE_PREFIX = 'vf.artist.v1.'
const TTL = 30 * 24 * 3600 * 1000

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = `__vfDeezer${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const clean = () => {
      delete window[cb]
      script.remove()
    }
    window[cb] = (json) => {
      clean()
      resolve(json)
    }
    script.onerror = () => {
      clean()
      reject(new Error('jsonp failed'))
    }
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${cb}`
    document.head.appendChild(script)
    setTimeout(() => {
      if (window[cb]) {
        clean()
        reject(new Error('jsonp timeout'))
      }
    }, 9000)
  })
}

// Deezer returns a placeholder portrait (empty artist hash) when it has
// no real photo — treat that as "no image" so callers can fall back.
const isRealPhoto = (u) => !!u && !u.includes('/images/artist//')

export async function fetchArtistImage(name) {
  const key = (name || '').toLowerCase().trim()
  if (!key) return null
  if (MEM.has(key)) return MEM.get(key)
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_PREFIX + key))
    if (c && Date.now() - c.t < TTL) {
      MEM.set(key, c.u)
      return c.u
    }
  } catch {
    /* corrupt cache — refetch */
  }
  let url = null
  try {
    const json = await jsonp(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1&output=jsonp`
    )
    const a = json?.data?.[0]
    const pic = a?.picture_xl || a?.picture_big || null
    url = isRealPhoto(pic) ? pic : null
  } catch {
    url = null
  }
  MEM.set(key, url)
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), u: url }))
  } catch {
    /* storage full — fine */
  }
  return url
}

// Returns { url, ready }. `ready` is false until the lookup settles, so
// callers can hold off on the album-cover fallback instead of flashing
// it and then swapping to the real portrait.
export function useArtistImage(name) {
  const key = (name || '').toLowerCase().trim()
  const [state, setState] = useState(() =>
    MEM.has(key) ? { url: MEM.get(key), ready: true } : { url: null, ready: false }
  )
  useEffect(() => {
    let live = true
    if (MEM.has(key)) {
      setState({ url: MEM.get(key), ready: true })
      return
    }
    setState({ url: null, ready: false })
    fetchArtistImage(name).then((u) => live && setState({ url: u, ready: true }))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state
}
