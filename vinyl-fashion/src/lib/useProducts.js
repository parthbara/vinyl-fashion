import { useEffect, useState } from 'react'
import { fetchProducts } from './db'

// Live catalogue for an album. `undefined` while the fetch is in
// flight, then the product array — or null when this album has none
// (callers show the placeholder capsule). The distinction lets pages
// hold the "COMING SOON" messaging until we actually know.
export function useProducts(albumId) {
  const [products, setProducts] = useState(undefined)
  useEffect(() => {
    let live = true
    setProducts(undefined)
    fetchProducts(albumId)
      .then((p) => live && setProducts(p))
      .catch(() => live && setProducts(null))
    return () => {
      live = false
    }
  }, [albumId])
  return products
}
