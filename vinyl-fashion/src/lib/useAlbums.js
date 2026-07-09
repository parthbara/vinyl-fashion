import { useEffect, useState } from 'react'
import { ALBUMS } from '../data/albums'
import { fetchAlbums } from './db'

// The live crate. Renders instantly with the built-in seed, then
// swaps in whatever the DB / Album Studio holds (edits, new capsules,
// coming-soon flags). Re-fetches when the admin fires 'vf:albums'.
export function useAlbums() {
  const [albums, setAlbums] = useState(ALBUMS)
  useEffect(() => {
    let live = true
    const load = () =>
      fetchAlbums()
        .then((a) => live && a?.length && setAlbums(a))
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
