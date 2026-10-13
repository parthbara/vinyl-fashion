import { useEffect, useState } from 'react'
import { fetchAlbums, SEED } from './db'

// The live crate. Renders instantly with the built-in seed, then
// swaps in whatever the DB / Album Studio holds (edits, new capsules,
// coming-soon flags). Re-fetches when the admin fires 'vf:albums'.
// last DB result, kept across mounts so returning from an album doesn't
// flash the seed-6 before the full crate re-loads
let cachedAlbums = null

export function useAlbums() {
  // the normalized seed, so coming-soon capsules don't flash as
  // available on the first paint before the DB list lands
  const [albums, setAlbums] = useState(cachedAlbums || SEED)
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
