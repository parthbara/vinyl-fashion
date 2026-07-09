// ── Cover → theme palette ────────────────────────────────────────
// Album Studio helper: derive a starting 7-slot palette from a cover
// image so a new capsule instantly has the site's "x factor". The user
// then nudges the slots. Dependency-free (canvas sampling). Returns
// null if the image can't be read (e.g. a cross-origin cover taints the
// canvas) so the Studio can fall back to manual entry.

import { useEffect, useState } from 'react'

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
const hex = (r, g, b) => '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
function lum([r, g, b]) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}
function sat([r, g, b]) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const l = (max + min) / 2
  if (max === min) return 0
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min)
}

function loadImage(src) {
  if (src instanceof HTMLImageElement) return Promise.resolve(src)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = typeof src === 'string' ? src : URL.createObjectURL(src)
  })
}

export async function extractPalette(src) {
  let img
  try {
    img = await loadImage(src)
  } catch {
    return null
  }
  const n = 56
  const canvas = document.createElement('canvas')
  canvas.width = n
  canvas.height = n
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, n, n)

  let data
  try {
    data = ctx.getImageData(0, 0, n, n).data
  } catch {
    return null // tainted canvas
  }

  const px = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    px.push([data[i], data[i + 1], data[i + 2]])
  }
  if (!px.length) return null

  const avg = px.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / px.length)
  const vibrant = px.reduce((best, p) => (sat(p) * (0.4 + lum(p)) > sat(best) * (0.4 + lum(best)) ? p : best))
  const darkest = px.reduce((a, p) => (lum(p) < lum(a) ? p : a))
  const lightest = px.reduce((a, p) => (lum(p) > lum(a) ? p : a))

  const black = [10, 8, 7]
  const bg0 = mix(darkest, black, 0.55)
  const bg1 = mix(vibrant, black, 0.62)
  const paper = mix(bg0, [255, 255, 255], 0.06)
  const ink = mix(lightest, [255, 255, 255], 0.4)
  const accent = vibrant
  const accent2 = mix(vibrant, avg, 0.5)
  const glow = mix(vibrant, [255, 255, 255], 0.28)

  return {
    bg0: hex(...bg0),
    bg1: hex(...bg1),
    ink: hex(...ink),
    accent: hex(...accent),
    accent2: hex(...accent2),
    glow: hex(...glow),
    paper: hex(...paper),
  }
}

// ── Live cover palette (storefront) ──────────────────────────────
// Imported capsules ship with a generic default palette, so their
// Coming-Soon teaser looked identical for every album. This derives a
// palette straight from the cover at display time and caches it per
// device, so each teaser morphs to its own record's colours.
const PMEM = new Map()
const PCACHE = 'vf.palette.v1.'
const PTTL = 30 * 24 * 3600 * 1000

export async function coverPalette(album) {
  const key = album?.id
  if (!key) return null
  if (PMEM.has(key)) return PMEM.get(key)
  try {
    const c = JSON.parse(localStorage.getItem(PCACHE + key))
    if (c && Date.now() - c.t < PTTL) {
      PMEM.set(key, c.p)
      return c.p
    }
  } catch {
    /* corrupt cache — re-extract */
  }
  const src = (album.artwork || '').replace('1200x1200bb', '200x200bb') || null
  let p = null
  if (src) p = await extractPalette(src)
  PMEM.set(key, p)
  try {
    if (p) localStorage.setItem(PCACHE + key, JSON.stringify({ t: Date.now(), p }))
  } catch {
    /* storage full — fine */
  }
  return p
}

// Returns a cover-derived palette (or null until it resolves); callers
// fall back to the album's stored palette meanwhile.
export function useCoverPalette(album) {
  const [p, setP] = useState(() => PMEM.get(album?.id) ?? null)
  useEffect(() => {
    let live = true
    coverPalette(album).then((res) => live && res && setP(res))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album?.id])
  return p
}
