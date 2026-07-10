// ── Brand configuration ─────────────────────────────────────────
// Rename the brand here when you decide on a name — nothing else
// in the codebase hardcodes it.
export const BRAND = {
  name: 'VINYL FASHION',
  mark: 'VF', // monogram used on record labels / small badges
  tagline: 'WEAR THE SOUND',
  est: 'EST. MMXXVI',
  notice: '', // announcement bar over the shop wall — empty hides it
}

// ── Contact / order routing ─────────────────────────────────────
// WhatsApp number in full international format (no +, spaces, or
// leading zeros) for wa.me links; display form is cosmetic.
export const CONTACT = {
  whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER || '9779818981912',
  whatsappDisplay: '+977 98-1898-1912',
  instagram: 'vinylfashion.np', // ← your handle, no @
  email: 'hello@vinylfashion.com',
  city: 'KATHMANDU',
}

// Build a click-to-chat link with an optional pre-filled message.
export const waLink = (message = '') =>
  `https://wa.me/${CONTACT.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`
