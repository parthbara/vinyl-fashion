// Hand-drawn garment silhouettes for capsule placeholders.
// They inherit currentColor so each album palette tints them.
const SHAPES = {
  tee: (
    <>
      <path d="M36 16 L43 12 Q50 19 57 12 L64 16 L79 29 L70 40 L65 34 L65 85 L35 85 L35 34 L30 40 L21 29 Z" />
      <path className="detail" d="M43 12 Q50 22 57 12" />
    </>
  ),
  longsleeve: (
    <>
      <path d="M36 15 L43 11 Q50 18 57 11 L64 15 L75 25 L80 62 L69 64 L66 36 L66 86 L34 86 L34 36 L31 64 L20 62 L25 25 Z" />
      <path className="detail" d="M20 58 L31 60 M69 60 L80 58" />
    </>
  ),
  hoodie: (
    <>
      <path d="M50 7 Q37 9 34 21 L25 26 L17 60 L28 64 L32 46 L32 87 L68 87 L68 46 L72 64 L83 60 L75 26 L66 21 Q63 9 50 7 Z" />
      <path className="detail" d="M40 24 Q50 34 60 24 Q59 14 50 13 Q41 14 40 24 Z M39 64 L61 64 L57 78 L43 78 Z M47 34 L46 44 M53 34 L54 44" />
    </>
  ),
  jacket: (
    <>
      <path d="M33 15 L45 11 L50 17 L55 11 L67 15 L80 28 L72 39 L67 33 L67 86 L53 86 L53 30 L47 30 L47 86 L33 86 L33 33 L28 39 L20 28 Z" />
      <path className="detail" d="M45 11 L47 30 M55 11 L53 30 M37 50 L43 50 M57 50 L63 50" />
    </>
  ),
  knit: (
    <>
      <path d="M36 15 L44 11 Q50 16 56 11 L64 15 L76 26 L79 60 L69 62 L66 38 L66 86 L34 86 L34 38 L31 62 L21 60 L24 26 Z" />
      <path className="detail" d="M34 80 L66 80 M34 74 L66 74 M44 11 Q50 20 56 11" />
    </>
  ),
  cap: (
    <>
      <path d="M22 54 Q22 28 47 26 Q71 28 73 51 L73 57 Q50 66 30 60 L22 57 Z" />
      <path d="M22 54 L10 58 Q7 62 13 64 L30 60" />
      <path className="detail" d="M47 26 L46 58 M60 29 L58 60" />
    </>
  ),
  shorts: (
    <>
      <path d="M30 20 L70 20 L75 70 L54 73 L50 46 L46 73 L25 70 Z" />
      <path className="detail" d="M30 27 L70 27 M62 48 L68 48" />
    </>
  ),
}

export default function GarmentSvg({ type }) {
  return (
    <svg className="garment-svg" viewBox="0 0 100 100" aria-hidden="true">
      {SHAPES[type] || SHAPES.tee}
    </svg>
  )
}
