// ── Site settings ────────────────────────────────────────────────
// Brand + contact live in the site_settings table (key 'site') and
// are edited from the admin console. On boot we render instantly with
// the config.js defaults, then merge the DB values in and nudge React
// (window 'vf:settings') — no flash, no blocking fetch.

import { getSupabase, hasSupabase } from './supabase'
import { BRAND, CONTACT } from '../config'

export const SETTINGS_KEY = 'site'

export async function loadSiteSettings() {
  if (!hasSupabase) return
  try {
    const s = await getSupabase()
    const { data } = await s
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()
    if (data?.value) {
      Object.assign(BRAND, data.value.brand || {})
      Object.assign(CONTACT, data.value.contact || {})
      window.dispatchEvent(new Event('vf:settings'))
    }
  } catch {
    /* offline / not configured — defaults stand */
  }
}
