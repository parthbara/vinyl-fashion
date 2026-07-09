import { useEffect, useState } from 'react'
import { ALBUMS } from '../data/albums'
import { fetchAlbums } from './db'

// The live crate. Renders instantly with the built-in seed, then
// swaps in whatever the DB / Album Studio holds (edits, new capsules,
// coming-soon flags). Re-fetches when the admin fires 'vf:albums'.
// last DB result, kept across mounts so returning from an album doesn't
// flash the seed-6 before the full crate re-loads
let cachedAlbums = null

export function useAlbums() {
  const [albums, setAlbums] = useState(cachedAlbums || ALBUMS)
  useEffect(() => {
    let live = true
    const load = () =>
      fetchAlbums()
        .then((a) => {
          if (live && a?.length) {
            cachedAlbums = a
            setAlbums(a)
          }
        })
        .catch(() => {})
    load()
    window.addEventListener('vf:albums', load)
    return () => {
      live = false
      window.removeEventListener('vf:albums', load)
    }
  }, [])
  return albums
}
