import { useMemo, useState } from 'react'
import { coverCandidates } from '../lib/itunes'
import { useAlbumData } from '../lib/useAlbumData'

// Album art with a graceful fallback chain:
// /covers/<id>.jpg (your file) → live iTunes art → baked URL → palette block.
export default function CoverImage({ album, className = '', draggable = false }) {
  const data = useAlbumData(album)
  const candidates = useMemo(
    () => coverCandidates(album, data?.artwork),
    [album, data]
  )
  const [failed, setFailed] = useState(0)

  if (failed >= candidates.length) {
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
      src={candidates[failed]}
      alt={`${album.artist} — ${album.title}`}
      draggable={draggable}
      loading="eager"
      onError={() => setFailed((n) => n + 1)}
    />
  )
}
