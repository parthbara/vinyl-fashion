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
//  clip     : optional { start, duration } in seconds — play only
//             that portion of the featured audio, IG-story style
//             (loops within the window). Set from the Studio later.
// ─────────────────────────────────────────────────────────────────

const art = (u) => u.replace('100x100bb', '1200x1200bb')

const DEFAULT_GARMENT_TYPES = ['tee', 'hoodie', 'longsleeve', 'jacket', 'knit', 'cap']

export const makePlaceholderCapsule = (count = 6) =>
  Array.from({ length: count }, (_, i) => ({
    type: DEFAULT_GARMENT_TYPES[i % DEFAULT_GARMENT_TYPES.length],
    name: `GARMENT NO. ${i + 1}`,
  }))

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
    // Editorial inserts rendered between garments (after item index `after`).
    notes: [
      {
        after: 1,
        kicker: 'LINER NOTES · 001',
        text: 'Cut for beautiful, dark, twisted evenings — crimson silk linings, gold thread at the cuff, black velvet that drinks the light. Every piece numbered like a pressing.',
      },
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
    notes: [
      {
        after: 1,
        kicker: 'LINER NOTES · 002',
        text: "Dyed in heat-haze: sun-faded oranges pulled from a summer '12 windshield. Terry cloth, chrome zips, cotton left out in the sun on purpose.",
      },
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
    notes: [
      {
        after: 1,
        kicker: 'LINER NOTES · 003',
        text: 'Garment-washed until the color remembers instead of shouts. Raw hems left to fray on their own schedule. Wear it like a memory.',
      },
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
      bg0: '#0b0718',
      bg1: '#5b2a86',
      ink: '#fdf2ff',
      accent: '#ff62c0',
      accent2: '#5fe0d6',
      glow: '#ff9a6b',
      paper: '#1a1030',
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
    notes: [
      {
        after: 1,
        kicker: 'LINER NOTES · 004',
        text: 'Club-to-beach engineering: quick-dry mesh, chlorine-safe blues, seams that move at 124 BPM. For the floor at 4AM and the water at 7.',
      },
    ],
  },
  {
    id: 'iceman',
    collectionId: 6769649287,
    artist: 'DRAKE',
    title: 'Iceman',
    displayTitle: 'ICEMAN',
    year: 2026,
    label: 'OVO SOUND / REPUBLIC',
    capsuleNo: '005',
    featured: 'Whisper My Name',
    story:
      'Cut from a glacier. Diamond-cold blues, brushed silver and frost-white technical layers — dressed for the coldest room in the building.',
    artwork: art(
      'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/7f/39/61/7f396123-be56-bc11-eaab-976441808e58/26UMGIM63622.rgb.jpg/100x100bb.jpg'
    ),
    palette: {
      bg0: '#040910',
      bg1: '#0b3a63',
      ink: '#eaf6ff',
      accent: '#57c9f4',
      accent2: '#8fb3cf',
      glow: '#7ee0ff',
      paper: '#081420',
    },
    fonts: {
      display: "'Oswald', 'Helvetica Neue', sans-serif",
      body: "'Space Grotesk', system-ui, sans-serif",
      displayCase: 'uppercase',
      displayTracking: '0.06em',
      displayWeight: 600,
    },
    ticker: ['MAKE THEM CRY', 'DUST', 'WHISPER MY NAME', 'RAN TO ATLANTA', 'WHAT DID I MISS?', 'MAKE THEM REMEMBER'],
    capsule: [
      { type: 'jacket', name: 'ICEMAN PUFFER' },
      { type: 'hoodie', name: 'WHISPER MY NAME HOODIE' },
      { type: 'tee', name: 'MAKE THEM CRY TEE' },
      { type: 'longsleeve', name: 'DUST THERMAL LS' },
      { type: 'knit', name: 'BURNING BRIDGES KNIT' },
      { type: 'cap', name: 'WHAT DID I MISS? CAP' },
    ],
    notes: [
      {
        after: 1,
        kicker: 'LINER NOTES · 005',
        text: 'Frost-white technical layers and diamond-cold blues, built for the coldest room in the building. Brushed silver hardware, sealed seams, zero warmth wasted.',
      },
    ],
  },
  {
    id: 'graduation',
    collectionId: 1442845779,
    artist: 'KANYE WEST',
    title: 'Graduation',
    displayTitle: 'GRADUATION',
    year: 2007,
    label: 'ROC-A-FELLA / DEF JAM',
    capsuleNo: '006',
    featured: 'I Wonder',
    story:
      'Cap-and-gown cosmic pop. Murakami magentas, diploma gold and dropout-bear purples — tailoring for the graduation you throw for yourself.',
    artwork: art(
      'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/39/25/2d/39252d65-2d50-b991-0962-f7a98a761271/00602517483507.rgb.jpg/100x100bb.jpg'
    ),
    palette: {
      bg0: '#150425',
      bg1: '#7a1f9e',
      ink: '#fdeeff',
      accent: '#f4b63e',
      accent2: '#ff5ea8',
      glow: '#c04bd6',
      paper: '#210a35',
    },
    fonts: {
      display: "'Bungee', 'Arial Black', sans-serif",
      body: "'Space Grotesk', system-ui, sans-serif",
      displayCase: 'none',
      displayTracking: '0.02em',
      displayWeight: 400,
    },
    ticker: ['GOOD MORNING', 'CHAMPION', 'STRONGER', 'I WONDER', 'GOOD LIFE', "CAN'T TELL ME NOTHING", 'FLASHING LIGHTS', 'HOMECOMING'],
    capsule: [
      { type: 'hoodie', name: 'DROPOUT BEAR HOODIE' },
      { type: 'tee', name: 'STRONGER TEE' },
      { type: 'jacket', name: 'CHAMPION VARSITY' },
      { type: 'knit', name: 'GOOD LIFE KNIT' },
      { type: 'cap', name: 'HOMECOMING CAP' },
      { type: 'longsleeve', name: 'FLASHING LIGHTS LS' },
    ],
    notes: [
      {
        after: 1,
        kicker: 'LINER NOTES · 006',
        text: 'Diploma gold on cosmic magenta — Murakami-bright graphics, cap-and-gown cuts and a dropout-bear crest on every piece. Throw your own graduation.',
      },
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
