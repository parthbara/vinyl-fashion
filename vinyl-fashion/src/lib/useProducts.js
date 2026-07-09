import { useEffect, useState } from 'react'
import { fetchProducts } from './db'

// Live catalogue for an album. Returns null until (and unless) real
// products load — callers render the placeholder capsule in that case,
// so the page never waits on the network.
export function useProducts(albumId) {
  const [products, setProducts] = useState(null)
  useEffect(() => {
    let live = true
    fetchProducts(albumId)
      .then((p) => live && setProducts(p))
      .catch(() => live && setProducts(null))
    return () => {
      live = false
    }
  }, [albumId])
  return products
}
