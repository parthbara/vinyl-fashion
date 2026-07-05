// ── Full-site theme takeover ─────────────────────────────────────
// Every color on the site reads from CSS variables on <html>.
// applyTheme() tweens the palette (GSAP animates custom properties)
// and swaps the typography at the midpoint of the flood.

import gsap from 'gsap'

const PALETTE_KEYS = ['bg0', 'bg1', 'ink', 'accent', 'accent2', 'glow', 'paper']

function setFonts(fonts) {
  const root = document.documentElement.style
  root.setProperty('--font-display', fonts.display)
  root.setProperty('--font-body', fonts.body)
  root.setProperty('--display-case', fonts.displayCase)
  root.setProperty('--display-tracking', fonts.displayTracking)
  root.setProperty('--display-weight', String(fonts.displayWeight))
}

export function applyTheme(theme, { duration = 1.2, ease = 'power2.inOut' } = {}) {
  const root = document.documentElement
  const vars = {}
  PALETTE_KEYS.forEach((k) => (vars['--' + k] = theme.palette[k]))
  gsap.to(root, { ...vars, duration, ease, overwrite: 'auto' })
  gsap.delayedCall(duration * 0.45, () => setFonts(theme.fonts))
}

export function setThemeInstant(theme) {
  const root = document.documentElement
  PALETTE_KEYS.forEach((k) => root.style.setProperty('--' + k, theme.palette[k]))
  setFonts(theme.fonts)
}
