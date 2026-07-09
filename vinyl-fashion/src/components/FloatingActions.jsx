import { useEffect, useRef, useState } from 'react'
import { ALBUMS } from '../data/albums'
import { BRAND, CONTACT, waLink } from '../config'
import * as sfx from '../lib/sfx'

// nariposhak-style corner dock: a small AI style assistant and a
// WhatsApp button. The assistant is a lightweight local helper for
// now (keyword-matches the crate, always offers a human on WhatsApp)
// — a real model can slot in behind `answer()` later.
const GREETING = {
  from: 'bot',
  text: `Hey — I'm the ${BRAND.name} atelier assistant. Ask about any capsule, sizing, or a drop date, or tap WhatsApp to reach a human.`,
}

const SUGGESTIONS = ['What capsules are out?', 'When do clothes drop?', 'Talk to a human']

function answer(raw) {
  const q = raw.toLowerCase()

  const album = ALBUMS.find(
    (a) =>
      q.includes(a.title.toLowerCase()) ||
      q.includes(a.artist.toLowerCase()) ||
      a.artist.toLowerCase().split(' ').some((w) => w.length > 2 && q.includes(w))
  )
  if (album) {
    return `The ${album.title} capsule (cut to ${album.artist}) — ${album.story} Pieces are in development; tap WhatsApp for first dibs when it drops.`
  }
  if (/(drop|release|when|available|stock|buy|order)/.test(q)) {
    return 'Each capsule releases with its record. Drop dates are TBA and announced to WhatsApp first — message us to get on the list.'
  }
  if (/(size|sizing|fit|measurement)/.test(q)) {
    return 'Full size runs land with each drop. Tell us your usual size on WhatsApp and we\'ll flag the right fit for you.'
  }
  if (/(capsule|out|collection|what|catalog|catalogue)/.test(q)) {
    return `Four capsules are live to explore: ${ALBUMS.map((a) => a.title).join(', ')}. Pull any record in the shop to see its pieces.`
  }
  if (/(hi|hello|hey|yo|namaste)/.test(q)) {
    return 'Hey! Ask me about a capsule or a drop date — or tap WhatsApp to talk to the team.'
  }
  return 'Good question — the team can answer that fastest on WhatsApp. Tap the green button below and we\'ll jump in.'
}

export default function FloatingActions() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const dockRef = useRef(null)

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // ESC and click-outside dismiss the panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onDown = (e) => {
      if (dockRef.current && !dockRef.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const send = (text) => {
    const clean = text.trim()
    if (!clean) return
    sfx.tick()
    const reply = answer(clean)
    setMessages((m) => [...m, { from: 'me', text: clean }, { from: 'bot', typing: true }])
    setDraft('')
    // brief "typing" beat so replies feel considered, not canned
    setTimeout(() => {
      setMessages((m) => {
        const next = [...m]
        const i = next.findIndex((x) => x.typing)
        if (i >= 0) next[i] = { from: 'bot', text: reply }
        else next.push({ from: 'bot', text: reply })
        return next
      })
    }, 650)
  }

  return (
    <div className="fab-dock" ref={dockRef}>
      {open && (
        <div className="assistant" role="dialog" aria-label="Atelier assistant">
          <header className="assistant-head">
            <span className="assistant-orb" aria-hidden="true" />
            <div className="assistant-id">
              <b>ATELIER ASSISTANT</b>
              <span>{BRAND.name} · usually replies in minutes</span>
            </div>
            <button className="assistant-x" aria-label="Close chat" onClick={() => setOpen(false)}>
              ✕
            </button>
          </header>

          <div className="assistant-log" ref={scrollRef}>
            {messages.map((m, i) =>
              m.typing ? (
                <div key={i} className="bubble bot typing" aria-label="Assistant is typing">
                  <i />
                  <i />
                  <i />
                </div>
              ) : (
                <div key={i} className={`bubble ${m.from}`}>
                  {m.text}
                </div>
              )
            )}
          </div>

          <div className="assistant-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>

          <form
            className="assistant-input"
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about a capsule…"
              aria-label="Message the assistant"
            />
            <button type="submit" aria-label="Send" data-cursor="play">
              ➤
            </button>
          </form>

          <a
            className="assistant-wa"
            href={waLink(`Hi ${BRAND.name}! I have a question about a capsule.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WaIcon /> Continue on WhatsApp
          </a>
        </div>
      )}

      <div className="fab-buttons">
        <a
          className="fab fab-wa"
          href={waLink(`Hi ${BRAND.name}! I'd like to place an order.`)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Order on WhatsApp"
        >
          <WaIcon />
          <span className="fab-label">ORDER · WHATSAPP</span>
        </a>
        <button
          className={`fab fab-ai ${open ? 'is-open' : ''}`}
          onClick={() => {
            sfx.tick()
            setOpen((o) => !o)
          }}
          aria-label={open ? 'Close assistant' : 'Open assistant'}
        >
          {open ? <span className="fab-x">✕</span> : <AiIcon />}
          {!open && <span className="fab-dot" aria-hidden="true" />}
          <span className="fab-label">{open ? 'CLOSE' : 'ASK THE ATELIER'}</span>
        </button>
      </div>
    </div>
  )
}

function WaIcon() {
  // Official WhatsApp glyph (simple-icons), white on green — the mark
  // people actually recognize.
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  )
}

function AiIcon() {
  // One large four-point star filling the gold label.
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 1.4c.66 5.7 3.9 8.94 9.6 9.6v1c-5.7.66-8.94 3.9-9.6 9.6h-1c-.66-5.7-3.9-8.94-9.6-9.6v-1c5.7-.66 8.94-3.9 9.6-9.6h1z"
      />
    </svg>
  )
}
