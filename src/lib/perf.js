// ── Adaptive quality ─────────────────────────────────────────────
// Measures real frame rate shortly after boot; if the machine can't
// hold a smooth clip (weak GPU, browser with hardware acceleration
// disabled, battery saver), <html> gets .perf-lite and the expensive
// atmosphere (blend-mode grain, sheens, halos, filters, dust) switches
// off via CSS. The site stays beautiful — it just stops paying for
// effects the device can't afford. Re-checks once after 10s in case
// the first sample caught startup work.

const SAMPLE_MS = 1200
const LITE_FPS = 42

function sample() {
  return new Promise((resolve) => {
    let frames = 0
    let t0 = 0
    const tick = (t) => {
      if (!t0) t0 = t
      frames++
      if (t - t0 < SAMPLE_MS) requestAnimationFrame(tick)
      else resolve(frames / ((t - t0) / 1000))
    }
    requestAnimationFrame(tick)
  })
}

export function watchPerf() {
  if (typeof window === 'undefined') return
  let checked = 0
  const run = async () => {
    if (document.hidden) return // rAF is throttled — sample would lie
    checked++
    const fps = await sample()
    if (document.hidden) return
    if (fps < LITE_FPS) {
      document.documentElement.classList.add('perf-lite')
    } else if (checked === 1) {
      // healthy first sample — confirm once after things settle
      setTimeout(run, 10000)
    }
  }
  // let the intro settle before sampling
  setTimeout(run, 2200)
}
