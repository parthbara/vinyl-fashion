// ── iTunes Search API integration ────────────────────────────────
// The six seed capsules ship with their tracklists BAKED into the
// bundle (src/data/tracks.json) — music never depends on Apple's API
// at runtime (it rate-limits hard and ad-blockers/Brave Shields kill
// it with CORS errors, which silenced the shop). The live lookup only
// runs for future Studio-added albums, with fetch → JSONP fallback
// (JSONP is a plain <script>, immune to CORS blocking).

import baked from '../data/tracks.json'

const CACHE_PREFIX = 'vf.itunes.v1.'
const CACHE_TTL = 7 * 24 * 3600 * 1000

function parseLookup(json, album) {
  const col = json.results.find((r) => r.wrapperType === 'collection')
  const tracks = json.results
    .filter((r) => r.wrapperType === 'track' && r.previewUrl)
    .sort((a, b) => a.trackNumber - b.trackNumber)
    .map((t) => ({
      id: t.trackId,
      num: t.trackNumber,
      name: t.trackName,
      duration: t.trackTimeMillis,
      previewUrl: t.previewUrl,
    }))
  return {
    artwork: col ? col.artworkUrl100.replace('100x100bb', '1200x1200bb') : album.artwork,
    tracks,
  }
}

// CORS-proof fallback: Apple's ancient-but-official JSONP support.
function jsonpLookup(id) {
  return new Promise((resolve, reject) => {
    const cb = `__vfItunes${id}_${Date.now()}`
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
    script.src = `https://itunes.apple.com/lookup?id=${id}&entity=song&limit=200&callback=${cb}`
    document.head.appendChild(script)
    setTimeout(() => {
      if (window[cb]) {
        clean()
        reject(new Error('jsonp timeout'))
      }
    }, 12000)
  })
}

// Admin/Studio: look up a whole collection by iTunes id and return
// its metadata + tracklist (fetch → JSONP fallback for CORS). Used to
// auto-fill a new capsule from just a collection id.
export async function lookupCollection(id) {
  let json
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=200`)
    json = await res.json()
  } catch {
    json = await jsonpLookup(id)
  }
  const col = json?.results?.find((r) => r.wrapperType === 'collection')
  if (!col) return null
  const tracks = json.results
    .filter((r) => r.wrapperType === 'track' && r.previewUrl)
    .sort((a, b) => a.trackNumber - b.trackNumber)
    .map((t) => ({ id: t.trackId, num: t.trackNumber, name: t.trackName, previewUrl: t.previewUrl }))
  return {
    collectionId: Number(id),
    artist: col.artistName,
    title: col.collectionName,
    year: Number((col.releaseDate || '').slice(0, 4)) || null,
    artwork: col.artworkUrl100.replace('100x100bb', '1200x1200bb'),
    tracks,
  }
}

export async function fetchAlbumData(album) {
  // 1 — baked (all seed capsules land here; instant, offline-proof)
  const b = baked[String(album.collectionId)]
  if (b?.tracks?.length) return b

  // 2 — localStorage cache
  const key = CACHE_PREFIX + album.collectionId
  try {
    const cached = JSON.parse(localStorage.getItem(key))
    if (cached && Date.now() - cached.t < CACHE_TTL) return cached.d
  } catch {
    /* corrupt cache — refetch */
  }

  // 3 — live lookup: fetch, then JSONP if CORS/rate-limit kills it
  try {
    let json
    try {
      const res = await fetch(
        `https://itunes.apple.com/lookup?id=${album.collectionId}&entity=song&limit=200`
      )
      json = await res.json()
    } catch {
      json = await jsonpLookup(album.collectionId)
    }
    const d = parseLookup(json, album)
    try {
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), d }))
    } catch {
      /* storage full — fine, just skip caching */
    }
    return d
  } catch {
    // offline / blocked — baked artwork, empty tracklist
    return { artwork: album.artwork, tracks: [] }
  }
}

// Cover art candidates, in priority order:
// your own file in /public/covers → live iTunes art → baked fallback.
export function coverCandidates(album, liveArtwork) {
  return [...new Set([`/covers/${album.id}.jpg`, liveArtwork, album.artwork])].filter(Boolean)
}

// Find the featured track by name (prefix beats substring).
export function findTrack(tracks, name) {
  if (!tracks?.length || !name) return null
  const q = name.toLowerCase()
  return (
    tracks.find((t) => t.name.toLowerCase().startsWith(q)) ||
    tracks.find((t) => t.name.toLowerCase().includes(q)) ||
    null
  )
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const audioSrcCache = new Map()

// Full-song override: if /public/audio/<album>/<track-slug>.mp3 exists
// it wins over the 30s preview.
export async function resolveTrackSrc(album, track) {
  const key = `${album.id}/${track.id}`
  if (audioSrcCache.has(key)) return audioSrcCache.get(key)
  let src = track.previewUrl
  try {
    const local = `/audio/${album.id}/${slug(track.name)}.mp3`
    const head = await fetch(local, { method: 'HEAD' })
    if (head.ok && (head.headers.get('content-type') || '').startsWith('audio')) {
      src = local
    }
  } catch {
    /* no local override */
  }
  audioSrcCache.set(key, src)
  return src
}
