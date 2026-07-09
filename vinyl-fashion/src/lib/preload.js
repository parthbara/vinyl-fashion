// Warm the browser's image cache ahead of need. Sized: the crate
// warms 'low' on idle (cheap), a sleeve hover warms 'mid' so the
// cinematic and album hero paint from cache.
import { coverCandidates } from './itunes'

const SIZES = { low: '420x420bb', mid: '800x800bb', full: '1200x1200bb' }
const warmed = new Set()

export function warmAlbumArt(album, size = 'low') {
  const key = `${album.id}:${size}`
  if (warmed.has(key)) return
  warmed.add(key)
  const dim = SIZES[size] || SIZES.low
  for (const url of coverCandidates(album)) {
    const img = new Image()
    img.src = url.replace('1200x1200bb', dim)
    img.decode?.().catch(() => {})
  }
}
