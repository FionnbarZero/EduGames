import type { CSSProperties } from 'react'
import type { LearningGameId } from './contracts.ts'

type GameArtworkProps = {
  readonly gameId: LearningGameId
  readonly progress?: number
  readonly total?: number
  readonly compact?: boolean
}

function ProgressBeacons({ progress, total }: { readonly progress: number, readonly total: number }) {
  return <div className="lg-art-beacons" aria-hidden="true">
    {Array.from({ length: Math.max(1, total) }, (_, index) => <i key={index} className={index < progress ? 'is-lit' : index === progress ? 'is-current' : ''} />)}
  </div>
}

function SpeedArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <circle className="art-ninja-moon" cx="315" cy="58" r="43" />
    <path className="art-ninja-roofs" d="M0 124h77l36-30 24 18 52-45 57 48 38-24 52 33h84v26H0z" />
    <g className="art-ninja-hero">
      <path d="M104 40c32 0 51 19 51 47v34H53V87c0-28 19-47 51-47Z" />
      <path className="art-ninja-mask" d="M60 73c25-17 65-17 89 0l-12 28H72Z" />
      <path className="art-ninja-eye" d="M76 81h24m10 0h23" />
      <path className="art-ninja-scarf" d="m142 58 58-19-35 37 44 7-64 12" />
    </g>
    <g className="art-ninja-star star-one"><path d="m239 34 8 15 17-4-9 15 12 12-18-1-5 17-7-16-17 5 10-15-12-12 18 2z" /></g>
    <g className="art-ninja-star star-two"><path d="m362 83 6 11 13-3-7 11 9 9-13-1-4 12-5-12-13 4 7-12-9-8 13 1z" /></g>
    <path className="art-ninja-slash" d="M181 109 286 25" />
  </svg>
}

function BlastArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <circle className="art-strike-moon" cx="346" cy="34" r="27" />
    <path className="art-strike-ground" d="M0 126h420v24H0z" />
    <g className="art-strike-ninja">
      <circle cx="96" cy="56" r="31" />
      <path d="M63 53h66v20H63z" />
      <path className="art-strike-eyes" d="M77 62h14m10 0h14" />
      <path d="M76 84h40l19 43H56z" />
      <path className="art-strike-arm" d="m117 91 48-17" />
      <path className="art-strike-scarf" d="m124 44 55-20-35 33 42 5-60 11" />
    </g>
    <g className="art-training-dummy">
      <circle cx="324" cy="64" r="35" />
      <path d="M324 99v32m-38 0h76" />
      <circle className="art-dummy-ring" cx="324" cy="64" r="18" />
      <circle className="art-dummy-center" cx="324" cy="64" r="6" />
    </g>
    <path className="art-flying-shuriken" d="m218 48 9 17 19-5-11 17 14 14-20-2-6 19-8-18-19 6 11-17-14-13 20 2z" />
    <path className="art-strike-trail" d="M161 76c35-15 53-18 72-13" />
  </svg>
}

function LilyArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <path className="art-water-line w1" d="M15 117c46-17 78 15 125 0s82 15 128 0 83 16 137 0" />
    <path className="art-water-line w2" d="M50 136c39-12 67 10 107 0s70 10 109 0 67 10 109 0" />
    <g className="art-reeds"><path d="M35 122V58m0 28-18-21m19 38 20-27M392 121V52m0 29 18-22m-18 43-20-28" /></g>
    <ellipse className="art-pad p1" cx="102" cy="111" rx="50" ry="16" /><ellipse className="art-pad p2" cx="220" cy="117" rx="51" ry="16" /><ellipse className="art-pad p3" cx="337" cy="108" rx="50" ry="16" />
    <g className="art-frog">
      <ellipse cx="211" cy="82" rx="39" ry="29" /><circle cx="190" cy="56" r="17" /><circle cx="230" cy="56" r="17" />
      <circle className="art-frog-eye" cx="190" cy="54" r="6" /><circle className="art-frog-eye" cx="230" cy="54" r="6" />
      <path d="M197 84q14 12 28 0" /><path d="m181 94-24 16m82-16 24 16" />
    </g>
  </svg>
}

function MemoryArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <circle className="art-lantern-sun" cx="210" cy="55" r="39" />
    <path className="art-lantern-hills" d="M0 119 61 73l50 34 68-63 58 58 63-45 53 54 67-32v71H0Z" />
    <path className="art-pergola-roof" d="M23 45h374l-33-19H56Zm26 8h322v11H49Z" />
    <path className="art-pergola-post" d="M61 59v82m298-82v82M43 141h334" />
    <path className="art-lantern-wire" d="M64 69q146 45 292 0" />
    {[102, 156, 210, 264, 318].map((x, index) => <g key={x} className={`art-hanging-lantern l${index + 1}`}>
      <path d={`M${x} ${82 + Math.abs(2 - index) * 5}v13`} />
      <rect x={x - 13} y={94 + Math.abs(2 - index) * 5} width="26" height="33" rx="11" />
      <path d={`M${x - 9} ${130 + Math.abs(2 - index) * 5}h18m-9-3v13`} />
    </g>)}
  </svg>
}

function ContextArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <path className="art-context-track" d="M34 108h352M58 124l26-32m23 32 26-32m23 32 26-32m23 32 26-32m23 32 26-32m23 32 26-32" />
    <g className="art-context-runner"><circle cx="113" cy="39" r="14" /><path d="m111 54 22 23 26-14m-27 14-24 25m25-25 15 30m-38-46-19 22" /></g>
    <g className="art-context-gate"><path d="M268 108V38h86v70" /><rect x="284" y="54" width="54" height="33" rx="7" /><path d="M295 70h32" /></g>
    <path className="art-context-scan" d="M278 96h68" />
  </svg>
}

function ScrambleArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <ellipse className="art-sushi-plate" cx="210" cy="117" rx="172" ry="27" />
    <g className="art-sushi-piece is-salmon" transform="translate(79 54)"><rect className="rice" width="76" height="58" rx="23" /><path className="topping" d="M-5 13Q38-9 81 13v25Q38 19-5 38z" /><rect className="nori" x="25" y="5" width="26" height="50" rx="4" /><path className="word" d="M31 29h14m-7-9v19" /></g>
    <g className="art-sushi-piece is-tuna" transform="translate(172 45)"><rect className="rice" width="76" height="67" rx="23" /><path className="topping" d="M-5 15Q38-8 81 15v26Q38 21-5 41z" /><rect className="nori" x="23" y="7" width="30" height="54" rx="4" /><path className="word" d="M30 29h16m-8-9v26m-9-7h18" /></g>
    <g className="art-sushi-piece is-egg" transform="translate(265 57)"><rect className="rice" width="76" height="55" rx="23" /><path className="topping" d="M-4 7h84v31H-4z" /><rect className="nori" x="25" y="3" width="26" height="48" rx="4" /><path className="word" d="M31 26h14m-7-8v17" /></g>
    <path className="art-chopsticks" d="M124 4 315 71M134-2l187 57" />
  </svg>
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

function DictationArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <g className="art-headphones"><path d="M130 88V68a80 58 0 0 1 160 0v20" /><rect x="103" y="75" width="39" height="57" rx="16" /><rect x="278" y="75" width="39" height="57" rx="16" /></g>
    <g className="art-wave"><path d="M157 88h14l8-28 14 55 13-82 15 94 13-63 12 24h18" /></g>
    <path className="art-pencil" d="m319 27 40 40-77 63-32 6 8-31z" /><path className="art-pencil-tip" d="m250 136 18-5-13-14z" />
  </svg>
}

function StrokeArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <g className="art-stroke-grid"><rect x="116" y="16" width="128" height="118" rx="8" /><path d="M180 17v116M117 75h126M117 17l126 116M243 17 117 133" /></g>
    <g className="art-stroke-character"><path d="M183 34c-2 24-11 48-30 70-8 9-15 15-24 20" /><path d="M179 65c15 24 35 44 58 59" /></g>
    <path className="art-stroke-brush" d="m278 25 45 27-55 66-28 14 5-31z" /><path className="art-stroke-brush-tip" d="m240 132 18-8-14-14z" />
    <g className="art-stroke-sparks"><circle cx="329" cy="27" r="4" /><circle cx="342" cy="45" r="3" /><circle cx="304" cy="17" r="2" /></g>
  </svg>
}

function ArtworkFor({ gameId }: { readonly gameId: LearningGameId }) {
  switch (gameId) {
    case 'speed-match': return <SpeedArt />
    case 'target-blast': return <BlastArt />
    case 'lily-pad-path': return <LilyArt />
    case 'memory-flip': return <MemoryArt />
    case 'context-gap-dash': return <ContextArt />
    case 'sentence-scramble': return <ScrambleArt />
    case 'read-aloud-boss-rush': return <WhisperingScrollArt />
    case 'dictation-streak': return <DictationArt />
    case 'speller-bee': return <DictationArt />
    case 'copy-hide-write-combo': return <StrokeArt />
  }
}

export function GameArtwork({ gameId, progress = 0, total = 3, compact = false }: GameArtworkProps) {
  const safeTotal = Math.max(1, total)
  const safeProgress = Math.min(safeTotal, Math.max(0, progress))
  const ratio = safeProgress / safeTotal
  const style = {
    '--art-progress': `${ratio * 100}%`,
    '--art-ratio': ratio,
    '--art-ninja-shift': `${ratio * 34}px`,
    '--art-frog-shift': `${-110 + ratio * 220}px`,
    '--art-runner-shift': `${ratio * 115}px`,
    '--art-asteroid-opacity': 1 - ratio * .3,
    '--art-asteroid-scale': 1 - ratio * .12,
    '--art-scroll-shift': `${ratio * 11}px`,
    '--art-scroll-glow': .35 + ratio * .65,
  } as CSSProperties

  return <div className={`lg-game-art lg-art-${gameId}${compact ? ' is-compact' : ''}`} style={style} aria-hidden="true">
    <div className="lg-art-scene"><ArtworkFor gameId={gameId} /></div>
    {!compact && <ProgressBeacons progress={safeProgress} total={safeTotal} />}
  </div>
}
