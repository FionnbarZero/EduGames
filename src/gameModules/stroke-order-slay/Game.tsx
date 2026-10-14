import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react'
import { ArrowRight, Eraser, Play, RotateCcw, Undo2, Volume2 } from 'lucide-react'
import type {
  LearningGameAttempt,
  LearningGameBaseProps,
  PlayLearningAudio,
  StrokeOrderGameRound,
  StrokePoint,
} from './runtime/contracts'
import { LearningGameComplete, LearningGameEmpty, LearningGameShell, SelfAssessmentButtons } from './runtime/GameShell'
import { AutoAssessmentFeedback, type AssessmentFeedback } from './runtime/AssessmentFeedback'
import { playGameSound } from './runtime/gameFeel'
import { summarizeLearningGame } from './runtime/model'
import { strokeMatchesGuide } from './runtime/strokeAssessment'
import { displayPointToStroke, getStrokeLayout, type StrokeLayout } from './runtime/strokeLayout'
import { getStrokeOrderSlayProfile, type StrokeOrderSlayProfileId } from './profiles'
import { KinderRounds } from './data/kinderRounds'
import { Grade2Rounds } from './data/grade2Rounds'
import { Grade5Rounds } from './data/grade5Rounds'

type StrokePhase = 'practice' | 'compare'
type NarrationState = 'idle' | 'playing' | 'ready' | 'error'
type InkStroke = StrokePoint[]
type InkDrawing = InkStroke[]

const profileGameIds = {
  kinder: 'stroke-order-slay-kinder',
  'grade-2': 'stroke-order-slay-grade-2',
  'grade-5': 'stroke-order-slay-grade-5',
} as const

function validStrokeOrderRounds(rounds: readonly StrokeOrderGameRound[]) {
  return rounds.length > 0
    && new Set(rounds.map((round) => round.id)).size === rounds.length
    && rounds.every((round) => round.id
      && round.targetId
      && round.targetText
      && round.strokes.length > 0
      && round.strokes.every((stroke) => stroke.length >= 2))
}

function strokePath(points: readonly StrokePoint[]) {
  return points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ')
}

function serializeStroke(stroke: readonly StrokePoint[]) {
  return stroke.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' ')
}

function PracticeGrid() {
  return <g className="lg-stroke-grid-lines" aria-hidden="true">
    <rect x="3" y="3" width="94" height="94" rx="2" />
    <path d="M50 3v94M3 50h94M3 3l94 94M97 3 3 97" />
  </g>
}

function pointFromClient(clientX: number, clientY: number, bounds: DOMRect, layout: StrokeLayout): StrokePoint {
  return displayPointToStroke([
    ((clientX - bounds.left) / bounds.width) * 100,
    ((clientY - bounds.top) / bounds.height) * 100,
  ], layout)
}

function appendDistinctPoint(points: InkStroke, point: StrokePoint) {
  const previous = points[points.length - 1]
  if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) >= .18) points.push(point)
}

function simplifyStroke(points: readonly StrokePoint[]) {
  if (points.length <= 2) return [...points]
  const simplified: StrokePoint[] = [points[0]]
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = simplified[simplified.length - 1]
    const point = points[index]
    if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) >= .3) simplified.push(point)
  }
  const finalPoint = points[points.length - 1]
  if (simplified[simplified.length - 1] !== finalPoint) simplified.push(finalPoint)
  return simplified
}

function StrokePad({
  round,
  strokes,
  onStrokesChange,
  showGuide,
  animationKey,
  label,
  validateStroke,
  onStrokeAccepted,
  onStrokeRejected,
  animationStepSeconds,
  resetKey = 0,
  rejectedStroke = null,
  suppliedStrokeCount = 0,
  inputDisabled = false,
  validated = false,
}: {
  readonly round: StrokeOrderGameRound
  readonly strokes: InkDrawing
  readonly onStrokesChange?: Dispatch<SetStateAction<InkDrawing>>
  readonly showGuide: boolean
  readonly animationKey: number
  readonly label: string
  readonly validateStroke?: (stroke: InkStroke, strokeIndex: number) => boolean
  readonly onStrokeAccepted?: () => void
  readonly onStrokeRejected?: (stroke: InkStroke) => void
  readonly animationStepSeconds: number
  readonly resetKey?: number
  readonly rejectedStroke?: InkStroke | null
  readonly suppliedStrokeCount?: number
  readonly inputDisabled?: boolean
  readonly validated?: boolean
}) {
  const padElement = useRef<SVGSVGElement | null>(null)
  const activePointer = useRef<number | null>(null)
  const activePoints = useRef<InkStroke>([])
  const activePath = useRef<SVGPathElement | null>(null)
  const padBounds = useRef<DOMRect | null>(null)
  const paintFrame = useRef<number | null>(null)
  const interactive = Boolean(onStrokesChange)
  const layout = useMemo(() => getStrokeLayout(round.strokes), [round.strokes])

  const cancelActiveStroke = useCallback(() => {
    const pointerId = activePointer.current
    activePointer.current = null
    activePoints.current = []
    padBounds.current = null
    if (paintFrame.current !== null) {
      window.cancelAnimationFrame(paintFrame.current)
      paintFrame.current = null
    }
    activePath.current?.removeAttribute('d')
    if (pointerId !== null && padElement.current?.hasPointerCapture(pointerId)) {
      padElement.current.releasePointerCapture(pointerId)
    }
  }, [])

  // Clear live ink before the browser can paint or finish an old pointer gesture.
  useLayoutEffect(() => {
    cancelActiveStroke()
    return cancelActiveStroke
  }, [cancelActiveStroke, resetKey, round.id])

  function paintActiveStroke() {
    paintFrame.current = null
    if (activePointer.current !== null) activePath.current?.setAttribute('d', strokePath(activePoints.current))
  }

  function scheduleActivePaint() {
    if (paintFrame.current === null) paintFrame.current = window.requestAnimationFrame(paintActiveStroke)
  }

  function beginStroke(event: ReactPointerEvent<SVGSVGElement>) {
    if (!onStrokesChange || inputDisabled || activePointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointer.current = event.pointerId
    padBounds.current = event.currentTarget.getBoundingClientRect()
    activePoints.current = [pointFromClient(event.clientX, event.clientY, padBounds.current, layout)]
    scheduleActivePaint()
  }

  function continueStroke(event: ReactPointerEvent<SVGSVGElement>) {
    if (!onStrokesChange || activePointer.current !== event.pointerId || !padBounds.current) return
    event.preventDefault()
    const coalesced = typeof event.nativeEvent.getCoalescedEvents === 'function'
      ? event.nativeEvent.getCoalescedEvents()
      : []
    const samples = coalesced.length > 0 ? coalesced : [event.nativeEvent]
    samples.forEach((sample) => appendDistinctPoint(
      activePoints.current,
      pointFromClient(sample.clientX, sample.clientY, padBounds.current!, layout),
    ))
    scheduleActivePaint()
  }

  function endStroke(event: ReactPointerEvent<SVGSVGElement>) {
    if (activePointer.current !== event.pointerId) return
    if (padBounds.current) {
      appendDistinctPoint(
        activePoints.current,
        pointFromClient(event.clientX, event.clientY, padBounds.current, layout),
      )
    }
    const completedStroke = simplifyStroke(activePoints.current)
    cancelActiveStroke()
    if (completedStroke.length >= 2) {
      if (!validateStroke || validateStroke(completedStroke, strokes.length)) {
        onStrokesChange?.((current) => [...current, completedStroke])
        onStrokeAccepted?.()
      } else {
        onStrokeRejected?.(completedStroke)
      }
    }
  }

  function cancelStroke(event: ReactPointerEvent<SVGSVGElement>) {
    if (activePointer.current === event.pointerId) cancelActiveStroke()
  }

  function losePointerCapture(event: ReactPointerEvent<SVGSVGElement>) {
    if (activePointer.current !== event.pointerId) return
    // Some embedded browsers release capture before delivering pointerup.
    // A released button finishes the stroke; capture loss while held cancels it.
    if (event.buttons === 0) endStroke(event)
    else cancelActiveStroke()
  }

  return <div className={`lg-stroke-pad${interactive ? ' is-interactive' : ' is-saved'}${showGuide ? ' has-guide' : ''}`}>
    <svg
      ref={padElement}
      viewBox="0 0 100 100"
      role={interactive ? 'application' : 'img'}
      aria-label={label}
      tabIndex={interactive ? 0 : undefined}
      onPointerDown={beginStroke}
      onPointerMove={continueStroke}
      onPointerUp={endStroke}
      onPointerCancel={cancelStroke}
      onLostPointerCapture={losePointerCapture}
    >
      <PracticeGrid />
      <g transform={`translate(${layout.offsetX} ${layout.offsetY}) scale(${layout.scale})`}>
      {suppliedStrokeCount > 0 && <g className="lg-supplied-ink" aria-label={`${suppliedStrokeCount} supplied strokes`}>
        {round.strokes.slice(0, suppliedStrokeCount).map((stroke, index) => <path key={`supplied-${index}`} d={strokePath(stroke)} />)}
      </g>}
      {showGuide && <g className="lg-stroke-guide" key={`${round.id}-${animationKey}`} aria-hidden="true">
        {round.strokes.slice(suppliedStrokeCount).map((stroke, index) => <path
          key={`${round.id}-guide-${index}`}
          d={strokePath(stroke)}
          pathLength={1}
          style={{ animationDelay: `${index * animationStepSeconds}s` }}
        />)}
        {round.strokes.slice(suppliedStrokeCount).map((stroke, index) => <g className="lg-stroke-marker" key={`${round.id}-marker-${index}`} style={{ animationDelay: `${index * animationStepSeconds}s` }}>
          <circle cx={stroke[0][0]} cy={stroke[0][1]} r="4.3" />
          <text x={stroke[0][0]} y={stroke[0][1] + 1.7}>{suppliedStrokeCount + index + 1}</text>
        </g>)}
      </g>}
      {rejectedStroke && <g className="lg-stroke-retry-ink" aria-label="Incorrect stroke">
        <path d={strokePath(rejectedStroke)} />
      </g>}
      <g className={`lg-student-ink${validateStroke || validated ? ' is-validated' : ''}`}>
        {strokes.map((stroke, index) => <path key={`ink-${index}`} d={strokePath(stroke)} />)}
        {interactive && <path className="lg-active-ink" ref={activePath} />}
      </g>
      </g>
    </svg>
  </div>
}

function ReferencePad({ round }: { readonly round: StrokeOrderGameRound }) {
  const layout = getStrokeLayout(round.strokes)
  return <div className="lg-stroke-pad is-reference">
    <svg viewBox="0 0 100 100" role="img" aria-label={`Correct character: ${round.targetText}`}>
      <PracticeGrid />
      <text className="lg-reference-character" x="50" y="76" textAnchor="middle">{round.targetText}</text>
      <g transform={`translate(${layout.offsetX} ${layout.offsetY}) scale(${layout.scale})`}>
      {round.strokes.map((stroke, index) => <g className="lg-reference-marker" key={`${round.id}-reference-${index}`}>
        <circle cx={stroke[0][0]} cy={stroke[0][1]} r="4.3" />
        <text x={stroke[0][0]} y={stroke[0][1] + 1.7}>{index + 1}</text>
      </g>)}
      </g>
    </svg>
  </div>
}

function DrawingTools({ drawing, setDrawing, onReset, hasRejectedStroke = false }: {
  readonly drawing: InkDrawing
  readonly setDrawing: Dispatch<SetStateAction<InkDrawing>>
  readonly onReset: () => void
  readonly hasRejectedStroke?: boolean
}) {
  return <div className="lg-stroke-tools">
    <button type="button" aria-label="Undo stroke" disabled={!drawing.length && !hasRejectedStroke} onClick={() => {
      onReset()
      if (!hasRejectedStroke) setDrawing((current) => current.slice(0, -1))
    }}><Undo2 size={18} /> Undo</button>
    <button type="button" aria-label="Clear pad" onClick={() => {
      onReset()
      setDrawing([])
    }}><Eraser size={18} /> Clear</button>
  </div>
}

function VocabularyContext({ round, audioState, onPlay }: {
  readonly round: StrokeOrderGameRound
  readonly audioState: NarrationState
  readonly onPlay: () => void
}) {
  const characters = Array.from(round.word || round.targetText)
  return <div className="lg-vocabulary-context" aria-label={`Vocabulary word ${round.word || round.targetText}, ${round.pinyin || ''}, meaning ${round.meaning}`}>
    <div className="lg-vocabulary-main">
      <h2 className="lg-vocabulary-word" lang="zh-Hans">{characters.map((character, index) => <b
        className={index === (round.wordCharacterIndex || 0) ? 'is-current' : ''}
        key={`${character}-${index}`}
      >{character}</b>)}</h2>
      <div className="lg-vocabulary-details"><span>{round.pinyin}</span><strong>{round.meaning}</strong></div>
    </div>
    <button className="lg-audio" type="button" onClick={onPlay} aria-label={`Hear ${round.word || round.targetText}`}>
      <Volume2 size={21} /><span>{audioState === 'playing' ? 'Playing…' : audioState === 'error' ? 'Retry audio' : 'Listen'}</span>
    </button>
  </div>
}

export type StrokeOrderSlayProps = LearningGameBaseProps & {
  readonly rounds: readonly StrokeOrderGameRound[]
  readonly playAudio?: PlayLearningAudio
  readonly profileId?: StrokeOrderSlayProfileId
}

export function StrokeOrderSlay({
  rounds,
  playAudio,
  title,
  eyebrow,
  onExit,
  onAttempt,
  onComplete,
  profileId,
}: StrokeOrderSlayProps) {
  const profile = getStrokeOrderSlayProfile(profileId || 'grade-2')
  const gameId = profileId ? profileGameIds[profileId] : 'copy-hide-write-combo'
  const visibleTitle = title || (profileId ? profile.title : 'Stroke-order Slay')
  const visibleEyebrow = eyebrow || (profileId ? profile.eyebrow : 'Tier 1 · Touch Writing')
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<StrokePhase>('practice')
  const [chainLength, setChainLength] = useState(1)
  const [drawing, setDrawing] = useState<InkDrawing>([])
  const [rejectedStroke, setRejectedStroke] = useState<InkStroke | null>(null)
  const [savedDrawing, setSavedDrawing] = useState<InkDrawing>([])
  const [padResetKey, setPadResetKey] = useState(0)
  const [animationKey, setAnimationKey] = useState(0)
  const [narrationKey, setNarrationKey] = useState(0)
  const [narrationState, setNarrationState] = useState<NarrationState>('idle')
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [feedback, setFeedback] = useState<AssessmentFeedback | null>(null)
  const [strokeError, setStrokeError] = useState(false)
  const narrationRequestRef = useRef(0)
  const round = rounds[index]
  const valid = validStrokeOrderRounds(rounds)
  const complete = valid && index >= rounds.length
  const requiredStrokes = Math.min(chainLength, round?.strokes.length || 1)
  const suppliedStrokeCount = Math.max(0, (round?.strokes.length || 0) - requiredStrokes)
  const wholeCharacter = suppliedStrokeCount === 0
  const stageComplete = drawing.length === requiredStrokes
  const currentStep = phase === 'compare' ? 'compare' : wholeCharacter ? 'write' : 'chain'
  const nextStrokeNumber = suppliedStrokeCount + drawing.length + 1
  const showGuide = !wholeCharacter || profile.memoryGuideVisible

  const playCurrentNarration = useCallback(() => {
    if (!round || !playAudio) return
    const request = ++narrationRequestRef.current
    setNarrationState('playing')
    void Promise.resolve(playAudio(round.audioText || round.targetText)).then(
      () => {
        if (request === narrationRequestRef.current) setNarrationState('ready')
      },
      () => {
        if (request === narrationRequestRef.current) setNarrationState('error')
      },
    )
  }, [playAudio, round])

  useEffect(() => {
    playCurrentNarration()
    return () => { narrationRequestRef.current += 1 }
  }, [index, narrationKey, playCurrentNarration])

  useEffect(() => {
    if (!rejectedStroke) return
    // Leave enough time to see the error; cancel stale removal on retry or Clear.
    const timer = window.setTimeout(() => setRejectedStroke(null), 700)
    return () => window.clearTimeout(timer)
  }, [rejectedStroke])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      if (feedback === 'correct') setIndex((current) => current + 1)
      else setNarrationKey((current) => current + 1)
      setPhase('practice')
      setChainLength(1)
      setDrawing([])
      setRejectedStroke(null)
      setSavedDrawing([])
      setAnimationKey((current) => current + 1)
      setStrokeError(false)
      setFeedback(null)
    }, feedback === 'correct' ? 1000 : 1900)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function assess(correct: boolean) {
    if (!round || feedback || !savedDrawing.length) return
    const attempt: LearningGameAttempt = {
      gameId,
      promptId: round.id,
      targetId: round.targetId,
      correct,
      response: savedDrawing.map(serializeStroke),
      assessmentMode: 'self-assessment',
    }
    setAttempts((current) => [...current, attempt])
    onAttempt?.(attempt)
    playGameSound(correct ? 'correct' : 'incorrect')
    setFeedback(correct ? 'correct' : 'incorrect')
  }

  function resetCurrentPad() {
    setPadResetKey((current) => current + 1)
    setStrokeError(false)
    setRejectedStroke(null)
  }

  function advanceStage() {
    if (!stageComplete || !round) return
    playGameSound('progress')
    resetCurrentPad()
    if (wholeCharacter) {
      setSavedDrawing(drawing.map((stroke) => [...stroke]))
      setPhase('compare')
    } else {
      setChainLength((current) => current + 1)
      setDrawing([])
      setAnimationKey((current) => current + 1)
    }
  }

  const summary = summarizeLearningGame(gameId, attempts)
  return <LearningGameShell
    gameId={gameId}
    title={visibleTitle}
    eyebrow={visibleEyebrow}
    progress={`${Math.min(index + (feedback === 'correct' ? 1 : 0), rounds.length)}/${rounds.length} completed`}
    onExit={onExit}
  >
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete
      summary={summary}
      message={profileId ? profile.completionMessage : 'Every stroke-order challenge is complete.'}
      onDone={() => onComplete(summary)}
    /> : round ? <section className={`lg-card lg-production-card lg-stroke-order-card lg-stroke-profile-${profile.id}`}>
      <div className="lg-stroke-roundbar">
        <p className="lg-round-label">Character {index + 1} / {rounds.length}</p>
        <div className="lg-phase-steps" aria-label={`Current step: ${currentStep}`}>
          <span aria-current={currentStep === 'chain' ? 'step' : undefined} className={currentStep === 'chain' ? 'is-current' : 'is-complete'}><b>1</b>Build</span>
          <span aria-current={currentStep === 'write' ? 'step' : undefined} className={currentStep === 'write' ? 'is-current' : currentStep === 'compare' ? 'is-complete' : ''}><b>2</b>Whole</span>
          <span aria-current={currentStep === 'compare' ? 'step' : undefined} className={currentStep === 'compare' && !feedback ? 'is-current' : feedback ? 'is-complete' : ''}><b>3</b>Compare</span>
        </div>
      </div>
      <VocabularyContext round={round} audioState={narrationState} onPlay={playCurrentNarration} />
      {feedback ? <AutoAssessmentFeedback feedback={feedback} lastRound={index + 1 === rounds.length} /> : phase === 'practice' ? <div className="lg-stroke-workspace">
        <StrokePad
          key={`${round.id}-chain-${requiredStrokes}`}
          round={round}
          strokes={drawing}
          onStrokesChange={setDrawing}
          showGuide={showGuide}
          suppliedStrokeCount={suppliedStrokeCount}
          inputDisabled={stageComplete}
          animationKey={animationKey}
          animationStepSeconds={profile.animationStepSeconds}
          resetKey={padResetKey}
          rejectedStroke={rejectedStroke}
          label={`Backward chaining · stage ${requiredStrokes} of ${round.strokes.length} · ${suppliedStrokeCount} supplied strokes · ${drawing.length}/${requiredStrokes} strokes written`}
          validateStroke={(stroke, strokeIndex) => {
            const guide = round.strokes[suppliedStrokeCount + strokeIndex]
            return Boolean(guide && strokeMatchesGuide(stroke, guide, profile.assessment))
          }}
          onStrokeAccepted={() => {
            setRejectedStroke(null)
            setStrokeError(false)
          }}
          onStrokeRejected={(stroke) => {
            setRejectedStroke(stroke)
            setStrokeError(true)
            playGameSound('incorrect')
          }}
        />
        <div className="lg-stroke-actions">
          <p className={`lg-stroke-status${strokeError ? ' is-error' : ''}`} role="status">
            <span className="lg-chain-stage">{wholeCharacter ? 'Whole character' : requiredStrokes === 1 ? 'Last stroke' : `Last ${requiredStrokes} strokes`}</span>
            <strong>{drawing.length} / {requiredStrokes}</strong>
            <span>{stageComplete ? 'Complete!' : `${strokeError ? 'Retry' : 'Write'} stroke ${nextStrokeNumber}`}</span>
          </p>
          <DrawingTools drawing={drawing} setDrawing={setDrawing} onReset={resetCurrentPad} hasRejectedStroke={Boolean(rejectedStroke)} />
          {showGuide ? <button className="lg-stroke-replay" type="button" aria-label="Replay stroke order" onClick={() => setAnimationKey((current) => current + 1)}><Play size={18} /> Replay</button> : <button type="button" className="lg-stroke-replay" onClick={() => {
            resetCurrentPad()
            setChainLength(1)
            setDrawing([])
            setNarrationKey((current) => current + 1)
          }}><RotateCcw size={18} /> Practice again</button>}
          <button className="lg-primary" type="button" disabled={!stageComplete} onClick={advanceStage}>
            {wholeCharacter ? 'Compare' : suppliedStrokeCount === 1 ? 'Next: whole character' : `Next: last ${requiredStrokes + 1} strokes`} <ArrowRight size={18} />
          </button>
        </div>
      </div> : <div className="lg-stroke-review">
        <div className="lg-stroke-comparison">
          <section><strong>Your writing</strong><StrokePad round={round} strokes={savedDrawing} showGuide={false} validated animationKey={animationKey} animationStepSeconds={profile.animationStepSeconds} label={`${savedDrawing.length} saved strokes`} /></section>
          <section className="is-target"><strong>Correct character</strong><ReferencePad round={round} /></section>
        </div>
        <SelfAssessmentButtons incorrectLabel={profile.incorrectLabel} correctLabel={profile.correctLabel} onAnswer={assess} />
      </div>}
    </section> : null}
  </LearningGameShell>
}

type GradeVariantProps = Omit<StrokeOrderSlayProps, 'profileId'>
type GradeVariantWithDefaultRoundsProps = Omit<GradeVariantProps, 'rounds'> & { readonly rounds?: readonly StrokeOrderGameRound[] }

export function StrokeOrderSlayKinder({ rounds = KinderRounds, ...props }: GradeVariantWithDefaultRoundsProps) {
  return <StrokeOrderSlay {...props} rounds={rounds} profileId="kinder" />
}

export function StrokeOrderSlayGrade2({ rounds = Grade2Rounds, ...props }: GradeVariantWithDefaultRoundsProps) {
  return <StrokeOrderSlay {...props} rounds={rounds} profileId="grade-2" />
}

export function StrokeOrderSlayGrade5({ rounds = Grade5Rounds, ...props }: GradeVariantWithDefaultRoundsProps) {
  return <StrokeOrderSlay {...props} rounds={rounds} profileId="grade-5" />
}
