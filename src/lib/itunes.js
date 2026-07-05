// ── iTunes Search API integration ────────────────────────────────
// Official artwork + 30-second track previews, no API key needed.
// Responses are cached in localStorage for a week so reloads are
// instant and we stay friendly with Apple's rate limits.

const CACHE_PREFIX = 'vf.itunes.v1.'
const CACHE_TTL = 7 * 24 * 3600 * 1000

export async function fetchAlbumData(album) {
  const key = CACHE_PREFIX + album.collectionId
  try {
    const cached = JSON.parse(localStorage.getItem(key))
    if (cached && Date.now() - cached.t < CACHE_TTL) return cached.d
  } catch {
    /* corrupt cache — refetch */
  }

  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?id=${album.collectionId}&entity=song&limit=200`
    )
    const json = await res.json()
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
    const d = {
      artwork: col
        ? col.artworkUrl100.replace('100x100bb', '1200x1200bb')
        : album.artwork,
      tracks,
    }
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
