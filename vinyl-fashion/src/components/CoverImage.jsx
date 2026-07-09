import { useMemo, useState } from 'react'
import { coverCandidates } from '../lib/itunes'

// Rendition tiers — sleeves and disc labels never need 1200px.
// Serving ~420px to a 200px sleeve cut the first paint by megabytes.
const SIZES = { full: '1200x1200bb', mid: '800x800bb', low: '420x420bb' }

// URLs that already failed once — skipped on every later render so
// remounts of the same album never repeat a dead request.
const deadUrls = new Set()

// Album art with a graceful fallback chain:
// /covers/<id>.jpg (your file) → baked iTunes URL → palette block.
// (No network lookup here — that only happens when an album opens.)
export default function CoverImage({
  album,
  className = '',
  draggable = false,
  size = 'full',
  lowRes = false, // legacy alias for size="low"
  loading = 'eager', // 'lazy' in dense grids (the crate wall) to defer offscreen fetches
}) {
  const [, bump] = useState(0)
  const dim = SIZES[lowRes ? 'low' : size] || SIZES.full
  const candidates = useMemo(
    () => coverCandidates(album).map((u) => u.replace('1200x1200bb', dim)),
    [album, dim]
  )
  const src = candidates.find((u) => !deadUrls.has(u))

  if (!src) {
    return (
      <div
        className={`cover-fallback ${className}`}
        style={{
          background: `linear-gradient(160deg, ${album.palette.bg1}, ${album.palette.bg0})`,
          color: album.palette.ink,
        }}
      >
        <span>{album.title}</span>
      </div>
    )
  }

  return (
    <img
      className={className}
      src={src}
      alt={`${album.artist} — ${album.title}`}
      draggable={draggable}
      loading={loading}
      decoding="async"
      onError={() => {
        deadUrls.add(src)
        bump((n) => n + 1)
      }}
    />
  )
}
