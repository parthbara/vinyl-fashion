// ── Client-side image downscale + compress ───────────────────────
// Runs before product photos are uploaded (admin Add Stock / Ledger).
// Tuned "good, not harsh": keeps a large-ish long edge and a high
// quality setting so garment detail survives, while trimming the
// multi-MB phone photos that would otherwise blow the storage bucket.

const DEFAULTS = {
  maxDimension: 1600, // longest edge, px — plenty for product zoom
  quality: 0.82, // 0..1 — gentle; 0.82 keeps fabric texture crisp
  mimeType: 'image/webp', // best size/quality; set 'image/jpeg' to force JPEG
}

// Returns a new File (or the original if compressing wouldn't help).
export async function compressImage(file, opts = {}) {
  const { maxDimension, quality, mimeType } = { ...DEFAULTS, ...opts }
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') {
    return file // leave GIFs / non-images untouched
  }

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file // decode failed — upload the original rather than lose it
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality))
  // Re-encoding can occasionally grow an already-small/optimized file;
  // if we didn't downscale and it got bigger, keep the original.
  if (!blob || (scale === 1 && blob.size >= file.size)) return file

  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext
  return new File([blob], name, { type: mimeType, lastModified: Date.now() })
}

// Convenience for multi-file carousels; compresses in parallel.
export function compressImages(files, opts = {}) {
  return Promise.all(Array.from(files, (f) => compressImage(f, opts)))
}
