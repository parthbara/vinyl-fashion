import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/env'

// Dust motes drifting through the spotlight. One small canvas,
// capped particle count, paused whenever the tab is hidden.
export default function DustCanvas() {
  const ref = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = 0
    let h = 0
    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const count = w < 768 ? 28 : 54
    const dust = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.4 + Math.random() * 1.3,
      vx: -0.06 + Math.random() * 0.12,
      vy: -0.1 - Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
      a: 0.08 + Math.random() * 0.35,
    }))

    let t = 0
    const draw = () => {
      if (!running) return
      t += 0.016
      ctx.clearRect(0, 0, w, h)
      // brightest inside the spotlight cone (upper center)
      const cx = w * 0.5
      const cy = h * 0.3
      const reach = Math.max(w, h) * 0.6
      for (const p of dust) {
        p.x += p.vx + Math.sin(t * 0.6 + p.phase) * 0.08
        p.y += p.vy
        if (p.y < -8) {
          p.y = h + 8
          p.x = Math.random() * w
        }
        if (p.x < -8) p.x = w + 8
        if (p.x > w + 8) p.x = -8
        const d = Math.hypot(p.x - cx, p.y - cy)
        const light = Math.max(0, 1 - d / reach)
        ctx.globalAlpha = p.a * (0.25 + light * 0.75)
        ctx.fillStyle = 'rgb(255, 226, 180)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    const onVis = () => {
      running = !document.hidden
      if (running) raf = requestAnimationFrame(draw)
      else cancelAnimationFrame(raf)
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('resize', resize)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="dust" aria-hidden="true" />
}
