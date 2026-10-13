// ── Dynamic font loading ─────────────────────────────────────────
// So an album can use *any* Google font (Album Studio) without editing
// index.html. Given a CSS font-family value we pull the primary family
// and inject a Google Fonts stylesheet once. Families already shipped
// in index.html, plus generic/system stacks, are skipped.

const loaded = new Set([
  // pre-seeded: already linked in index.html
  'inter',
  'space grotesk',
  'playfair display',
  'archivo',
  'great vibes',
  'ibm plex mono',
  'oswald',
  'bungee',
])

const GENERIC = new Set([
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  '-apple-system',
  'blinkmacsystemfont',
  'helvetica neue',
  'helvetica',
  'arial',
  'georgia',
  'times new roman',
  'inherit',
  'initial',
])

export function primaryFamily(fontFamily = '') {
  return String(fontFamily)
    .split(',')[0]
    .trim()
    .replace(/^["']|["']$/g, '')
}

// Ensure a family is available, injecting a Google Fonts <link> once.
export function ensureFont(fontFamily, weights = [200, 300, 400, 600, 700, 900]) {
  const family = primaryFamily(fontFamily)
  const key = family.toLowerCase()
  if (!family || GENERIC.has(key) || loaded.has(key)) return
  loaded.add(key)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}` +
    `:wght@${weights.join(';')}&display=swap`
  document.head.appendChild(link)
}

// Load both faces of a theme's typography.
export function ensureThemeFonts(fonts) {
  if (!fonts) return
  ensureFont(fonts.display)
  ensureFont(fonts.body)
}
