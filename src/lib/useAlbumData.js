import { useEffect, useState } from 'react'
import { fetchAlbumData } from './itunes'

// One shared in-flight promise per album — every component that asks
// for the same album's data rides the same fetch.
const inflight = new Map()

export function useAlbumData(album) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let live = true
    if (!inflight.has(album.id)) inflight.set(album.id, fetchAlbumData(album))
    inflight.get(album.id).then((d) => {
      if (live) setData(d)
    })
    return () => {
      live = false
    }
  }, [album])
  return data
}
