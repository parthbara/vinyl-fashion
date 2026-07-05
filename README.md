# VINYL FASHION — Wear the Sound

A clothing brand storefront styled as a vinyl record shop. Each clothing
capsule is themed after an album: pull a sleeve from the crate, the case
opens, the record drops onto a turntable, the song starts, and the whole
site floods with that album's palette and typography.

**Capsules:** My Beautiful Dark Twisted Fantasy · channel ORANGE · Blonde · Honestly, Nevermind

## Run it

```bash
npm install
npm run dev      # → http://localhost:5173
```

## Where the controls live

| What | Where |
|---|---|
| The song that plays for everyone (per album) | `featured: '...'` in [src/data/albums.js](src/data/albums.js) |
| Brand name / tagline | [src/config.js](src/config.js) |
| Palettes, fonts, capsule garment names, story blurbs | [src/data/albums.js](src/data/albums.js) |
| Add album #5 | append one object to `ALBUMS` in [src/data/albums.js](src/data/albums.js) |

There is intentionally **no visitor tracklist** — the house picks the song;
visitors can only pause (lift the needle).

## Art & audio

- Covers + 30-second song previews stream from the **iTunes Search API**
  (official artwork, no key, cached in localStorage for 7 days).
- Drop your own files to override: `public/covers/<album-id>.jpg` for art,
  `public/audio/<album-id>/<track-slug>.mp3` for full-length songs.
- All SFX (crackle, needle drop, whoosh) are synthesized with the Web Audio
  API at runtime — no audio files in the repo.
- Note: real album art + previews are fine for a personal project; get a
  licensing check before commercial launch.

## Stack

Vite + React 18 · GSAP 3 (cinematics) · hand-rolled CSS with per-album
CSS-variable themes · Web Audio API. No WebGL — the vinyl is CSS 3D, so it
stays smooth on integrated graphics.

## Roadmap

- **P2** — lock one song per album, design the real capsule per song
- **P3** — product pages, cart/checkout, product photography
- **P4** — more albums, drops with countdowns
