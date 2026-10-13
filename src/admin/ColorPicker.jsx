// ── In-page colour picker ────────────────────────────────────────
// A self-contained saturation/value square + hue wheel, hex box, RGB
// readout and (where supported) an eyedropper. Used by the Add-Stock
// colour rows so a colour is picked visually, named, then given its
// own photo — no OS colour dialog.

import { useCallback, useEffect, useRef, useState } from 'react'

// ── colour maths ────────────────────────────────────────────────
function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)))
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')
}
function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}
function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}
const hsvToHex = (h, s, v) => {
  const { r, g, b } = hsvToRgb(h, s, v)
  return rgbToHex(r, g, b)
}

export default function ColorPicker({ value, onChange }) {
  // hue/sat/val is the source of truth while interacting; seeded from
  // the incoming hex and re-synced only when it changes externally.
  const [hsv, setHsv] = useState(() => {
    const rgb = hexToRgb(value) || { r: 136, g: 136, b: 136 }
    return rgbToHsv(rgb)
  })
  const [hexText, setHexText] = useState(value || '#888888')
  const svRef = useRef(null)
  const draggingRef = useRef(false)

  // external hex change (preset, typed value) → resync the square/wheel
  useEffect(() => {
    if (!value) return
    if (value.toLowerCase() === hsvToHex(hsv.h, hsv.s, hsv.v).toLowerCase()) return
    const rgb = hexToRgb(value)
    if (rgb) {
      setHsv(rgbToHsv(rgb))
      setHexText(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emit = useCallback(
    (next) => {
      const hex = hsvToHex(next.h, next.s, next.v)
      setHsv(next)
      setHexText(hex)
      onChange?.(hex)
    },
    [onChange]
  )

  const pointToSV = useCallback(
    (e) => {
      const box = svRef.current?.getBoundingClientRect()
      if (!box) return
      const x = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width))
      const y = Math.max(0, Math.min(1, (e.clientY - box.top) / box.height))
      emit({ h: hsv.h, s: x, v: 1 - y })
    },
    [emit, hsv.h]
  )

  const onSvDown = (e) => {
    draggingRef.current = true
    svRef.current?.setPointerCapture?.(e.pointerId)
    pointToSV(e)
  }
  const onSvMove = (e) => {
    if (draggingRef.current) pointToSV(e)
  }
  const onSvUp = () => {
    draggingRef.current = false
  }

  const commitHex = () => {
    const rgb = hexToRgb(hexText)
    if (rgb) emit(rgbToHsv(rgb))
    else setHexText(hsvToHex(hsv.h, hsv.s, hsv.v))
  }

  const eyedrop = async () => {
    if (!window.EyeDropper) return
    try {
      const res = await new window.EyeDropper().open()
      const rgb = hexToRgb(res.sRGBHex)
      if (rgb) emit(rgbToHsv(rgb))
    } catch {
      /* cancelled */
    }
  }

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v)
  const hueHex = hsvToHex(hsv.h, 1, 1)

  return (
    <div className="cp" onClick={(e) => e.stopPropagation()}>
      <div
        ref={svRef}
        className="cp-sv"
        style={{ background: hueHex }}
        onPointerDown={onSvDown}
        onPointerMove={onSvMove}
        onPointerUp={onSvUp}
        onPointerLeave={onSvUp}
      >
        <div className="cp-sv-white" />
        <div className="cp-sv-black" />
        <div
          className="cp-sv-dot"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvToHex(hsv.h, hsv.s, hsv.v) }}
        />
      </div>

      <div className="cp-hue-row">
        {window.EyeDropper && (
          <button type="button" className="cp-eye" onClick={eyedrop} title="Pick from screen">
            ⦿
          </button>
        )}
        <input
          type="range"
          className="cp-hue"
          min="0"
          max="360"
          step="1"
          value={Math.round(hsv.h)}
          aria-label="Hue"
          onChange={(e) => emit({ ...hsv, h: Number(e.target.value) })}
        />
      </div>

      <div className="cp-foot">
        <span className="cp-preview" style={{ background: hsvToHex(hsv.h, hsv.s, hsv.v) }} />
        <input
          className="cp-hex"
          value={hexText}
          onChange={(e) => setHexText(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitHex()
            }
          }}
          spellCheck={false}
        />
        <span className="cp-rgb">
          {clamp255(rgb.r)} · {clamp255(rgb.g)} · {clamp255(rgb.b)}
        </span>
      </div>
    </div>
  )
}
