import { useEffect, useRef } from 'react'

// ── Escape closes the topmost layer only ─────────────────────────
// Each overlay used to attach its own window keydown listener, so one
// press fired all of them at once — dismissing a teaser also tore down
// the search results and artist page behind it. Handlers register on a
// stack instead: the most recently mounted one wins, everything under
// it stays put.

const stack = []

function onKey(e) {
  if (e.key !== 'Escape') return
  const top = stack[stack.length - 1]
  if (!top) return
  // keep the press from reaching anything below this layer
  e.stopPropagation()
  top()
}

export function useEscape(onClose) {
  // hold the latest handler in a ref so an inline arrow at the call
  // site doesn't re-register (and reorder) the stack on every render
  const ref = useRef(onClose)
  ref.current = onClose

  useEffect(() => {
    const entry = () => ref.current()
    if (!stack.length) window.addEventListener('keydown', onKey)
    stack.push(entry)
    return () => {
      const i = stack.indexOf(entry)
      if (i !== -1) stack.splice(i, 1)
      if (!stack.length) window.removeEventListener('keydown', onKey)
    }
  }, [])
}
