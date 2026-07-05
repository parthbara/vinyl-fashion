// ── Procedural sound design ──────────────────────────────────────
// Every sound effect is synthesized with the Web Audio API at
// runtime — vinyl crackle, needle drops, transition whooshes.
// Zero audio files shipped, zero copyright headaches.

let ctx = null
let master = null
let crackleGain = null
let crackleSource = null
let enabled = true

// Must be called from a user gesture (click) before anything sounds.
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = enabled ? 1 : 0
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
}

export function setEnabled(on) {
  enabled = on
  if (ctx && master) {
    master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05)
  }
}

function noiseBuffer(seconds, fill) {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  fill(buf.getChannelData(0))
  return buf
}

// Endless dusty-groove bed that sits under the music.
export function startCrackle() {
  if (!ctx || crackleSource) return
  const buf = noiseBuffer(4, (data) => {
    let pop = 0
    for (let i = 0; i < data.length; i++) {
      if (Math.random() < 0.00007) pop = 0.35 + Math.random() * 0.65
      pop *= 0.88
      data[i] = (Math.random() * 2 - 1) * 0.012 + pop * (Math.random() * 2 - 1)
    }
  })
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 420
  crackleGain = ctx.createGain()
  crackleGain.gain.value = 0
  src.connect(hp).connect(crackleGain).connect(master)
  src.start()
  crackleSource = src
  crackleGain.gain.setTargetAtTime(0.32, ctx.currentTime, 0.4)
}

export function stopCrackle() {
  if (!ctx || !crackleSource) return
  const src = crackleSource
  crackleSource = null
  crackleGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15)
  setTimeout(() => {
    try {
      src.stop()
    } catch {
      /* already stopped */
    }
  }, 700)
}

// The tonearm landing: low thump + surface click + a couple of pops.
export function needleDrop() {
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(72, t)
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.22)
  const og = ctx.createGain()
  og.gain.setValueAtTime(0.5, t)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  osc.connect(og).connect(master)
  osc.start(t)
  osc.stop(t + 0.32)

  burst(0.035, 2200, 0.22, 0)
  setTimeout(() => pop(), 140)
  setTimeout(() => pop(), 320)
}

export function needleLift() {
  if (!ctx) return
  burst(0.02, 3000, 0.12, 0)
  burst(0.09, 900, 0.08, 0.02)
}

// Filtered-noise sweep for scene transitions.
export function whoosh(dur = 0.8) {
  if (!ctx) return
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(dur, (d) => {
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  })
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 0.7
  bp.frequency.setValueAtTime(220, t)
  bp.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.8)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.3, t + dur * 0.35)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bp).connect(g).connect(master)
  src.start(t)
}

// Tiny UI click.
export function tick() {
  burst(0.006, 3400, 0.07, 0)
}

// Single vinyl pop.
export function pop() {
  burst(0.014, 1500, 0.25, 0)
}

function burst(dur, freq, vol, delay) {
  if (!ctx) return
  const t = ctx.currentTime + delay
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(dur, (d) => {
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    }
  })
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = 0.9
  const g = ctx.createGain()
  g.gain.value = vol
  src.connect(f).connect(g).connect(master)
  src.start(t)
}
