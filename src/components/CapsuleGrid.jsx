import GarmentSvg from './GarmentSvg'

// Placeholder capsule — real garments arrive once the featured
// song per album is locked in. Layout and art direction are final.
export default function CapsuleGrid({ album, featuredName }) {
  return (
    <section className="capsule" id="capsule">
      <header className="capsule-head">
        <p className="capsule-kicker">THE CAPSULE</p>
        <h3 className="capsule-title">
          {(featuredName || album.featured).toUpperCase()} COLLECTION
        </h3>
        <p className="capsule-note">
          SIX PIECES IN DEVELOPMENT · CUT TO {album.title.toUpperCase()} · DROP DATE TBA
        </p>
      </header>
      <div className="capsule-grid">
        {album.capsule.map((item, i) => (
          <article className="garment" key={item.name} style={{ '--i': i }}>
            <div className="garment-stage">
              <GarmentSvg type={item.type} />
              <span className="garment-tag">{album.capsuleNo}·{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h4 className="garment-name">{item.name}</h4>
            <p className="garment-price">— COMING SOON —</p>
          </article>
        ))}
      </div>
    </section>
  )
}
