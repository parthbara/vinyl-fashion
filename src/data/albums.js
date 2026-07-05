// ─────────────────────────────────────────────────────────────────
//  THE CRATE — source of truth for every album / clothing capsule.
//  Add an album here (palette + fonts + capsule) and the whole site
//  picks it up: shop crate, cinematic, themed page, ticker.
//
//  artwork  : baked hi-res fallback (iTunes CDN). Runtime order:
//             /covers/<id>.jpg  →  live iTunes lookup  →  this URL
//  audio    : drop /audio/<id>/<track-slug>.mp3 to override the
//             30-second iTunes preview with your own full file.
//  featured : default spotlight song per capsule — swap freely.
// ─────────────────────────────────────────────────────────────────

const art = (u) => u.replace('100x100bb', '1200x1200bb')

export const ALBUMS = [
  {
    id: 'mbdtf',
    collectionId: 1443160553,
    artist: 'KANYE WEST',
    title: 'My Beautiful Dark Twisted Fantasy',
    displayTitle: 'My Beautiful\nDark Twisted\nFantasy',
    year: 2010,
    label: 'ROC-A-FELLA / DEF JAM',
    capsuleNo: '001',
    featured: 'Runaway',
    story:
      'Opulence with a wound. Crimson, gold leaf and black velvet — tailoring for beautiful, dark, twisted evenings.',
    artwork: art(
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d1/74/da/d174dacf-5782-dfe2-19f7-ce037dcd0237/00602527584935.rgb.jpg/100x100bb.jpg'
    ),
    palette: {
      bg0: '#190304',
      bg1: '#7e0d12',
      ink: '#f6e3c8',
      accent: '#e01f26',
      accent2: '#d8a548',
      glow: '#c31017',
      paper: '#26060a',
    },
    fonts: {
      display: "'Playfair Display', 'Georgia', serif",
      body: "'Inter', system-ui, sans-serif",
      displayCase: 'uppercase',
      displayTracking: '0.04em',
      displayWeight: 700,
    },
    ticker: ['DARK FANTASY', 'POWER', 'ALL OF THE LIGHTS', 'RUNAWAY', 'DEVIL IN A NEW DRESS', 'LOST IN THE WORLD'],
    capsule: [
      { type: 'jacket', name: 'RUNAWAY VARSITY' },
      { type: 'tee', name: 'POWER TEE' },
      { type: 'knit', name: 'DEVIL IN A NEW DRESS KNIT' },
      { type: 'hoodie', name: 'MONSTER HOODIE' },
      { type: 'cap', name: 'HELL OF A LIFE CAP' },
      { type: 'shorts', name: 'LOST IN THE WORLD CARGO' },
    ],
  },
  {
    id: 'channel-orange',
    collectionId: 1440765580,
    artist: 'FRANK OCEAN',
    title: 'channel ORANGE',
    displayTitle: 'channel\nORANGE',
    year: 2012,
    label: 'DEF JAM',
    capsuleNo: '002',
    featured: 'Thinkin Bout You',
    story:
      "Summer '12 through a car windshield. Sun-faded cotton, heat-haze orange, terry cloth and chrome.",
    artwork: art(
      'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/04/f8/63/04f863fc-2852-604f-c910-a97ac069506b/12UMGIM40339.rgb.jpg/100x100bb.jpg'
    ),
    palette: {
      bg0: '#1d0800',
      bg1: '#93300a',
      ink: '#fff3e9',
      accent: '#ff5a12',
      accent2: '#ffb07a',
      glow: '#ff6a1a',
      paper: '#2a1008',
    },
    fonts: {
      display: "'Archivo', 'Helvetica Neue', sans-serif",
      body: "'Inter', system-ui, sans-serif",
      displayCase: 'none',
      displayTracking: '-0.01em',
      displayWeight: 900,
    },
    ticker: ['THINKIN BOUT YOU', 'SWEET LIFE', 'SUPER RICH KIDS', 'PYRAMIDS', 'LOST', 'FORREST GUMP'],
    capsule: [
      { type: 'tee', name: 'THINKIN BOUT YOU TEE' },
      { type: 'jacket', name: 'PYRAMIDS TRACK JACKET' },
      { type: 'knit', name: 'SWEET LIFE POLO' },
      { type: 'longsleeve', name: 'SUPER RICH KIDS RUGBY' },
      { type: 'hoodie', name: 'LOST HOODIE' },
      { type: 'shorts', name: 'FORREST GUMP RUNNERS' },
    ],
  },
  {
    id: 'blonde',
    collectionId: 1146195596,
    artist: 'FRANK OCEAN',
    title: 'Blonde',
    displayTitle: 'blond',
    year: 2016,
    label: 'BOYS DON’T CRY',
    capsuleNo: '003',
    featured: 'Nights',
    story:
      'Bleached light and quiet. Garment-washed neutrals, raw hems, pieces that feel like memory.',
    artwork: art(
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bb/45/68/bb4568f3-68cd-619d-fbcb-4e179916545d/BlondCover-Final.jpg/100x100bb.jpg'
    ),
    palette: {
      bg0: '#e9e7df',
      bg1: '#c6ccbd',
      ink: '#191b19',
      accent: '#5c705f',
      accent2: '#8b998b',
      glow: '#f4f2ea',
      paper: '#f2f0e8',
    },
    fonts: {
      display: "'Inter', 'Helvetica Neue', sans-serif",
      body: "'Inter', system-ui, sans-serif",
      displayCase: 'lowercase',
      displayTracking: '0.28em',
      displayWeight: 200,
    },
    ticker: ['NIKES', 'IVY', 'PINK + WHITE', 'SOLO', 'NIGHTS', 'WHITE FERRARI', 'GODSPEED'],
    capsule: [
      { type: 'longsleeve', name: 'NIKES LONGSLEEVE' },
      { type: 'knit', name: 'IVY CREWNECK' },
      { type: 'tee', name: 'PINK + WHITE TEE' },
      { type: 'hoodie', name: 'SOLO HOODIE' },
      { type: 'jacket', name: 'NIGHTS WORK JACKET' },
      { type: 'cap', name: 'GODSPEED CAP' },
    ],
  },
  {
    id: 'honestly-nevermind',
    collectionId: 1630221591,
    artist: 'DRAKE',
    title: 'Honestly, Nevermind',
    displayTitle: 'honestly,\nnevermind',
    year: 2022,
    label: 'OVO SOUND / REPUBLIC',
    capsuleNo: '004',
    featured: 'Massive',
    story:
      'For the club at 4AM and the beach at 7. Breathable whites, pool blues, movement first.',
    artwork: art(
      'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/6d/31/ab/6d31abaf-7a07-05f1-13ad-72ec520b6bfb/22UMGIM67374.rgb.jpg/100x100bb.jpg'
    ),
    palette: {
      bg0: '#04060f',
      bg1: '#142060',
      ink: '#eef2ff',
      accent: '#3d5afe',
      accent2: '#9db4ff',
      glow: '#2743ff',
      paper: '#0a1030',
    },
    fonts: {
      display: "'Great Vibes', cursive",
      body: "'Space Grotesk', system-ui, sans-serif",
      displayCase: 'lowercase',
      displayTracking: '0.01em',
      displayWeight: 400,
    },
    ticker: ['FALLING BACK', 'TEXTS GO GREEN', 'CURRENTS', 'MASSIVE', 'STICKY', 'JIMMY COOKS'],
    capsule: [
      { type: 'tee', name: 'MASSIVE CLUB TEE' },
      { type: 'hoodie', name: 'TEXTS GO GREEN HOODIE' },
      { type: 'longsleeve', name: 'STICKY MESH LS' },
      { type: 'shorts', name: 'CURRENTS SWIM SHORTS' },
      { type: 'jacket', name: 'JIMMY COOKS JERSEY' },
      { type: 'knit', name: 'FALLING BACK KNIT' },
    ],
  },
]

// The shop's own resting theme — a warm, dim listening room.
export const SHOP_THEME = {
  palette: {
    bg0: '#0d0b09',
    bg1: '#1a1410',
    ink: '#f2ece2',
    accent: '#d8a548',
    accent2: '#8a6f4d',
    glow: '#ffb45e',
    paper: '#171310',
  },
  fonts: {
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    displayCase: 'uppercase',
    displayTracking: '0.18em',
    displayWeight: 700,
  },
}

export const byId = (id) => ALBUMS.find((a) => a.id === id)
