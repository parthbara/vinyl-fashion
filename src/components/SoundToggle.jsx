import { useAudio } from '../lib/player'
import * as sfx from '../lib/sfx'

// Hi-fi style sound switch with little VU bars that dance while
// music is playing.
export default function SoundToggle() {
  const { soundOn, setSound, isPlaying } = useAudio()
  return (
    <button
      className={`sound-toggle ${soundOn ? 'on' : 'off'} ${isPlaying && soundOn ? 'live' : ''}`}
      onClick={() => {
        setSound(!soundOn)
        sfx.tick()
      }}
      aria-pressed={soundOn}
      aria-label={soundOn ? 'Mute sound' : 'Enable sound'}
    >
      <span className="vu">
        <i />
        <i />
        <i />
      </span>
      <span className="sound-label">{soundOn ? 'SOUND ON' : 'SOUND OFF'}</span>
    </button>
  )
}
