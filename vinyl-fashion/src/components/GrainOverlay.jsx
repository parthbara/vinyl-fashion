// Analog film grain + vignette, sitting over everything.
// The grain is a tiny tiling SVG-noise texture jittered with a
// steps() animation — no per-frame canvas work, virtually free.
export default function GrainOverlay() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </>
  )
}
