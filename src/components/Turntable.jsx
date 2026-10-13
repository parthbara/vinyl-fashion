import { forwardRef } from 'react'
import VinylDisc from './VinylDisc'

// A deck in two sizes: `stage` (the cinematic hero) and `dock`
// (the little now-playing corner unit on album pages).
// `showDisc={false}` lets the OpeningScene fly its own record in.
const Turntable = forwardRef(function Turntable(
  { album, playing = false, size = 'stage', onToggle, showDisc = true },
  ref
) {
  return (
    <div
      ref={ref}
      className={`turntable tt-${size} ${playing ? 'is-playing' : ''}`}
      onClick={onToggle}
      data-cursor={onToggle ? (playing ? 'pause' : 'play') : undefined}
      role={onToggle ? 'button' : undefined}
      aria-label={onToggle ? (playing ? 'Pause record' : 'Play record') : undefined}
    >
      <div className="tt-plinth">
        <div className="tt-platter" data-tt-platter>
          <span className="tt-strobe" />
          {showDisc && album && (
            <VinylDisc album={album} spinning={playing} className="tt-disc" />
          )}
          <span className="tt-spindle" />
        </div>
        <div className="tt-arm-base">
          <div className="tt-arm">
            <span className="tt-counterweight" />
            <span className="tt-pivot" />
            <span className="tt-headshell" />
          </div>
        </div>
        <span className="tt-speed">33⅓</span>
        <span className={`tt-power ${playing ? 'on' : ''}`} />
      </div>
    </div>
  )
})

export default Turntable
