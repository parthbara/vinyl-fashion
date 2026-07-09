import { useCallback, useEffect, useState } from 'react'
import { SHOP_THEME } from './data/albums'
import { applyTheme, setThemeInstant } from './lib/theme'
import { useAudio } from './lib/player'
import * as sfx from './lib/sfx'
import Intro from './components/Intro'
import Shop from './components/Shop'
import OpeningScene from './components/OpeningScene'
import AlbumPage from './components/AlbumPage'
import GrainOverlay from './components/GrainOverlay'
import CustomCursor from './components/CustomCursor'
import FloatingActions from './components/FloatingActions'

// Scene machine: intro → shop → opening (cinematic) → album → closing → shop.
export default function App() {
  const [phase, setPhase] = useState('intro')
  const [active, setActive] = useState(null)
  const [, bumpSettings] = useState(0)

  // re-render when admin-edited site settings arrive from the DB
  useEffect(() => {
    const bump = () => bumpSettings((n) => n + 1)
    window.addEventListener('vf:settings', bump)
    return () => window.removeEventListener('vf:settings', bump)
  }, [])
  const [originRect, setOriginRect] = useState(null)
  const [revealOrigin, setRevealOrigin] = useState(null)
  const { stop } = useAudio()

  useEffect(() => {
    setThemeInstant(SHOP_THEME)
  }, [])

  // Unlock the Web Audio context at the first real gesture, so the
  // scroll-to-enter intro (wheel isn't a "user gesture") still gets
  // sound as early as the browser allows.
  useEffect(() => {
    const unlock = () => sfx.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // The shop and cinematic are fixed scenes; only album pages scroll.
  useEffect(() => {
    document.body.classList.toggle('no-scroll', phase !== 'album' && phase !== 'closing')
  }, [phase])

  const handleOpen = useCallback((album, rect) => {
    setPhase((p) => {
      if (p !== 'shop') return p
      sfx.unlock()
      setActive(album)
      setOriginRect(rect)
      applyTheme(album, { duration: 1.5 })
      return 'opening'
    })
  }, [])

  const handleReveal = useCallback((origin) => setRevealOrigin(origin), [])
  const handleOpened = useCallback(() => setPhase('album'), [])

  const handleClose = useCallback(() => {
    setPhase('closing')
    applyTheme(SHOP_THEME, { duration: 1.0 })
    sfx.whoosh(0.7)
    stop(0.7)
  }, [stop])

  const handleClosed = useCallback(() => {
    setActive(null)
    setOriginRect(null)
    setRevealOrigin(null)
    window.scrollTo(0, 0)
    setPhase('shop')
  }, [])

  const showShop = phase === 'intro' || phase === 'shop' || phase === 'opening'
  // Mount the album page as soon as the cinematic starts (hidden) so
  // its images decode and layout settles before the reveal — the old
  // mid-animation mount was the source of the landing stutter.
  const showAlbum = active && (phase === 'opening' || phase === 'album' || phase === 'closing')

  return (
    <>
      {showShop && (
        <Shop
          onOpen={handleOpen}
          dimmed={phase === 'opening'}
          openingId={phase === 'opening' ? active?.id : null}
        />
      )}
      {showAlbum && (
        <AlbumPage
          album={active}
          revealOrigin={revealOrigin}
          closing={phase === 'closing'}
          onClose={handleClose}
          onClosed={handleClosed}
        />
      )}
      {phase === 'opening' && (
        <OpeningScene
          album={active}
          originRect={originRect}
          onReveal={handleReveal}
          onComplete={handleOpened}
        />
      )}
      {phase === 'intro' && <Intro onEnter={() => setPhase('shop')} />}
      {phase !== 'intro' && phase !== 'opening' && <FloatingActions />}
      <GrainOverlay />
      <CustomCursor />
    </>
  )
}
