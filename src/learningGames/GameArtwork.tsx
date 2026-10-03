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
    <path className="art-speed-rail" d="M82 75H338" />
    <g className="art-speed-node art-speed-left"><circle cx="82" cy="75" r="34" /><path d="m67 76 12 12 22-27" /></g>
    <g className="art-speed-node art-speed-right"><circle cx="338" cy="75" r="34" /><path d="M322 64h32M322 76h24M322 88h28" /></g>
    <path className="art-speed-bolt" d="m225 28-38 51h29l-22 45 51-62h-31z" />
    <circle className="art-spark s1" cx="143" cy="49" r="4" /><circle className="art-spark s2" cx="282" cy="105" r="3" />
  </svg>
}

function BlastArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <g className="art-stars"><circle cx="74" cy="25" r="2" /><circle cx="181" cy="31" r="3" /><circle cx="292" cy="18" r="2" /><circle cx="367" cy="53" r="3" /><circle cx="242" cy="126" r="2" /></g>
    <g className="art-ship">
      <path className="art-ship-flame" d="M86 78 42 60l19 19-19 20z" />
      <path className="art-ship-body" d="M62 79c27-45 70-50 112-20l20 20-20 20c-42 30-85 25-112-20Z" />
      <circle className="art-ship-window" cx="137" cy="69" r="16" />
      <path className="art-ship-fin" d="m105 99 25 34 18-42z" />
    </g>
    <g className="art-asteroid">
      <path d="m298 39 42-7 35 25 2 42-34 25-45-11-20-34z" />
      <circle cx="328" cy="61" r="8" /><circle cx="350" cy="92" r="12" /><circle cx="309" cy="96" r="6" />
      <path className="art-target-ring" d="M327 31a52 52 0 1 1 0 96 52 52 0 1 1 0-96Z" />
    </g>
    <path className="art-laser" d="M186 79H298" />
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
    <path className="art-vault-ring" d="M210 16a59 59 0 1 1 0 118 59 59 0 1 1 0-118Z" />
    <path className="art-vault-ring inner" d="M210 39a36 36 0 1 1 0 72 36 36 0 1 1 0-72Z" />
    <path className="art-vault-spoke" d="M210 45v60M180 75h60m-51-22 42 44m0-44-42 44" />
    <g className="art-memory-card c1"><rect x="53" y="42" width="72" height="88" rx="12" /><path d="m89 62 7 14 16 2-12 11 4 16-15-8-15 8 4-16-12-11 16-2z" /></g>
    <g className="art-memory-card c2"><rect x="295" y="27" width="72" height="88" rx="12" /><path d="m331 47 7 14 16 2-12 11 4 16-15-8-15 8 4-16-12-11 16-2z" /></g>
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
    <path className="art-conveyor" d="M34 106h352v24H34z" /><circle cx="72" cy="118" r="16" /><circle cx="348" cy="118" r="16" />
    <g className="art-tile t1"><rect x="75" y="51" width="69" height="52" rx="10" /><path d="M92 77h35" /></g>
    <g className="art-tile t2"><rect x="164" y="38" width="69" height="65" rx="10" /><path d="M181 69h35" /></g>
    <g className="art-tile t3"><rect x="253" y="55" width="69" height="48" rx="10" /><path d="M270 79h35" /></g>
    <path className="art-claw" d="M198 0v32m-17 0h34l-5 17h-24z" />
  </svg>
}

function BossArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <g className="art-boss-aura"><path d="M210 8v18M150 25l12 17m108-17-12 17M116 64l22 5m166-5-22 5" /></g>
    <g className="art-boss">
      <path className="art-boss-horns" d="m146 60-30-35 42 16m116 19 30-35-42 16" />
      <path className="art-boss-head" d="M151 46q59-39 118 0l18 67-40 27h-74l-40-27z" />
      <path className="art-boss-brow" d="m165 76 32 9m58-9-32 9" /><circle className="art-boss-eye" cx="184" cy="87" r="8" /><circle className="art-boss-eye" cx="236" cy="87" r="8" />
      <path className="art-boss-mouth" d="M177 111h66l-12 19h-42z" /><path className="art-boss-tooth" d="m188 112 8 12 8-12m12 0 8 12 8-12" />
    </g>
    <g className="art-mic"><path d="M73 74v30m-18-13q18 20 36 0M73 104v18M58 122h30" /><rect x="62" y="38" width="22" height="57" rx="11" /></g>
  </svg>
}

function DictationArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <g className="art-headphones"><path d="M130 88V68a80 58 0 0 1 160 0v20" /><rect x="103" y="75" width="39" height="57" rx="16" /><rect x="278" y="75" width="39" height="57" rx="16" /></g>
    <g className="art-wave"><path d="M157 88h14l8-28 14 55 13-82 15 94 13-63 12 24h18" /></g>
    <path className="art-pencil" d="m319 27 40 40-77 63-32 6 8-31z" /><path className="art-pencil-tip" d="m250 136 18-5-13-14z" />
  </svg>
}

function CopyArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <g className="art-copy-book"><path d="M73 37q68-14 137 20v78q-69-34-137-20z" /><path d="M347 37q-68-14-137 20v78q69-34 137-20z" /><path d="M210 57v78" /></g>
    <g className="art-copy-glyph"><rect x="166" y="17" width="88" height="82" rx="15" /><path d="M185 49h50m-25-20v50m-17-15h34" /></g>
    <path className="art-copy-scan" d="M155 90h110" />
  </svg>
}

function RescueArt() {
  return <svg viewBox="0 0 420 150" role="presentation">
    <path className="art-rescue-ground" d="M20 130h380" />
    <g className="art-castle"><path d="M264 54h96v76h-96z" /><path d="M254 54V30h24v24m68 0V30h24v24" /><path d="M294 130V91q18-24 36 0v39" /><path d="M276 73h18m36 0h18" /></g>
    <g className="art-rescue-star"><path d="m101 25 16 33 36 5-26 25 6 36-32-17-32 17 6-36-26-25 36-5z" /><circle cx="89" cy="72" r="4" /><circle cx="113" cy="72" r="4" /><path d="M89 88q12 10 24 0" /></g>
    <path className="art-rescue-path" d="M140 108c42-30 69 27 117-5" />
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
    case 'read-aloud-boss-rush': return <BossArt />
    case 'dictation-streak': return <DictationArt />
    case 'copy-hide-write-combo': return <CopyArt />
    case 'correction-rescue': return <RescueArt />
  }
}

export function GameArtwork({ gameId, progress = 0, total = 3, compact = false }: GameArtworkProps) {
  const safeTotal = Math.max(1, total)
  const safeProgress = Math.min(safeTotal, Math.max(0, progress))
  const ratio = safeProgress / safeTotal
  const style = {
    '--art-progress': `${ratio * 100}%`,
    '--art-ratio': ratio,
    '--art-ship-shift': `${ratio * 34}px`,
    '--art-frog-shift': `${-110 + ratio * 220}px`,
    '--art-runner-shift': `${ratio * 115}px`,
    '--art-rescue-shift': `${ratio * 135}px`,
    '--art-asteroid-opacity': 1 - ratio * .3,
    '--art-asteroid-scale': 1 - ratio * .12,
    '--art-boss-aura-opacity': 1 - ratio * .7,
    '--art-boss-scale': 1 - ratio * .14,
    '--art-boss-opacity': 1 - ratio * .25,
  } as CSSProperties

  return <div className={`lg-game-art lg-art-${gameId}${compact ? ' is-compact' : ''}`} style={style} aria-hidden="true">
    <div className="lg-art-scene"><ArtworkFor gameId={gameId} /></div>
    {!compact && <ProgressBeacons progress={safeProgress} total={safeTotal} />}
  </div>
}
