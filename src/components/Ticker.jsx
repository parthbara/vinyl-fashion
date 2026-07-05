// Infinite record-shop marquee. Content is rendered twice and slid
// -50% on a linear loop, so the seam never shows.
export default function Ticker({ items }) {
  const row = items.map((s, i) => (
    <span className="ticker-item" key={i}>
      {s}
      <i className="ticker-dot">◦</i>
    </span>
  ))
  const dur = Math.max(24, items.join('').length * 0.55)
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-row" style={{ '--ticker-dur': `${dur}s` }}>
        {row}
        {row}
      </div>
    </div>
  )
}
