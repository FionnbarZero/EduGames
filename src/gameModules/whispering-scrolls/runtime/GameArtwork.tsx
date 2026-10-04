import type { CSSProperties } from 'react'

type GameArtworkProps = {
  readonly progress?: number
  readonly total?: number
}

function ProgressBeacons({ progress, total }: { readonly progress: number, readonly total: number }) {
  return <div className="lg-art-beacons" aria-hidden="true">
    {Array.from({ length: Math.max(1, total) }, (_, index) => <i key={index} className={index < progress ? 'is-lit' : index === progress ? 'is-current' : ''} />)}
  </div>
}

function WhisperingScrollArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <circle className="art-scroll-moon" cx="350" cy="37" r="29" />
    <path className="art-scroll-roofs" d="M0 124h74l38-29 29 21 43-37 45 39 42-27 49 33h100v26H0z" />
    <g className="art-scroll-bamboo"><path d="M33 131 48 21m-3 23 22-17M42 68 18 48m21 48 24-20M384 132 373 30m3 27-20-16m22 45 21-18" /></g>
    <g className="art-scroll-ninja">
      <circle cx="94" cy="66" r="25" />
      <path d="M69 63h50v16H69z" />
      <path className="art-scroll-eyes" d="M79 70h10m9 0h10" />
      <path d="M70 88h47l18 44H52z" />
      <path className="art-scroll-hands" d="m73 99 44 12m-2-12-40 13" />
      <path className="art-scroll-scarf" d="m112 55 48-14-29 25 35 6-51 7" />
    </g>
    <g className="art-open-scroll">
      <rect x="170" y="25" width="154" height="102" rx="7" />
      <path className="art-scroll-rolls" d="M169 25h20v102h-20q-17-51 0-102Zm155 0h-20v102h20q17-51 0-102Z" />
      <path className="art-scroll-ink" d="M207 47h79m-79 46h79" />
      <text x="247" y="86">读</text>
      <circle className="art-scroll-seal" cx="295" cy="104" r="10" />
    </g>
    <g className="art-whisper-wind"><path d="M130 42q28-19 52 0t49 0M139 58q18-12 34 0m-38 66q22 13 43 0" /></g>
  </svg>
}

export function GameArtwork({ progress = 0, total = 3 }: GameArtworkProps) {
  const safeTotal = Math.max(1, total)
  const safeProgress = Math.min(safeTotal, Math.max(0, progress))
  const ratio = safeProgress / safeTotal
  const style = {
    '--art-progress': `${ratio * 100}%`,
    '--art-ratio': ratio,
    '--art-scroll-shift': `${ratio * 11}px`,
    '--art-scroll-glow': .35 + ratio * .65,
  } as CSSProperties

  return <div className="lg-game-art lg-art-read-aloud-boss-rush" style={style} aria-hidden="true">
    <div className="lg-art-scene"><WhisperingScrollArt /></div>
    <ProgressBeacons progress={safeProgress} total={safeTotal} />
  </div>
}
