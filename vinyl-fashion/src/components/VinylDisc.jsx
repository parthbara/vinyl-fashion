import { forwardRef } from 'react'
import CoverImage from './CoverImage'

// The record itself — grooves, sheen, label and spindle hole are all
// CSS; only the label art is an image.
const VinylDisc = forwardRef(function VinylDisc(
  { album, spinning = false, className = '' },
  ref
) {
  return (
    <div
      ref={ref}
      className={`disc ${spinning ? 'disc-spin' : ''} ${className}`}
    >
      <div className="disc-body">
        <div className="disc-label">
          {/* label art is always small on screen — low tier is plenty */}
          <CoverImage album={album} size="low" className="disc-label-art" />
        </div>
        <span className="disc-hole" />
      </div>
      <div className="disc-sheen" />
    </div>
  )
})

export default VinylDisc
