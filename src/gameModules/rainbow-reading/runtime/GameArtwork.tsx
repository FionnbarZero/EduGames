import type { CSSProperties } from 'react'

type GameArtworkProps = {
  readonly progress?: number
  readonly total?: number
}

export function GameArtwork({ progress = 0, total = 6 }: GameArtworkProps) {
  const safeTotal = Math.max(1, total)
  const safeProgress = Math.min(safeTotal, Math.max(0, progress))
  const style = { '--rainbow-progress': safeProgress / safeTotal } as CSSProperties

  return <div className="lg-rainbow-map" style={style} aria-label={`${safeProgress} of ${safeTotal} rainbow jewels completed`}>
    <svg viewBox="0 0 720 210" aria-hidden="true">
      <defs>
        <linearGradient id="rainbow-sky" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4fb" /><stop offset="1" stopColor="#dff7ff" /></linearGradient>
      </defs>
      <rect width="720" height="210" rx="30" fill="url(#rainbow-sky)" />
      <path className="lg-rainbow-band red" d="M30 46C226 28 378 79 684 184" />
      <path className="lg-rainbow-band orange" d="M30 58C226 40 378 91 684 196" />
      <path className="lg-rainbow-band yellow" d="M30 70C226 52 378 103 684 208" />
      <path className="lg-rainbow-band green" d="M30 82C226 64 378 115 684 220" />
      <path className="lg-rainbow-band blue" d="M30 94C226 76 378 127 684 232" />
      <path className="lg-rainbow-band purple" d="M30 106C226 88 378 139 684 244" />
      <g className="lg-rainbow-clouds"><circle cx="51" cy="175" r="31" /><circle cx="80" cy="179" r="40" /><circle cx="111" cy="178" r="28" /><circle cx="629" cy="34" r="27" /><circle cx="654" cy="30" r="35" /><circle cx="683" cy="35" r="25" /></g>
    </svg>
    <div className="lg-rainbow-jewel-row" aria-hidden="true">
      {Array.from({ length: safeTotal }, (_, index) => <i key={index} className={index < safeProgress ? 'is-complete' : index === safeProgress ? 'is-current' : ''}><b /></i>)}
    </div>
  </div>
}
