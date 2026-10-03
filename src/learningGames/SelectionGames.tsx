import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Trophy, Volume2 } from 'lucide-react'
import type {
  ContextGameRound,
  LearningGameAttempt,
  LearningGameBaseProps,
  LearningGameId,
  PlayLearningAudio,
  SelectionGameRound,
} from './contracts.ts'
import { summarizeLearningGame, validSelectionRounds } from './model.ts'
import {
  LearningGameEmpty,
  LearningGameShell,
} from './GameShell.tsx'
import { playGameSound } from './gameFeel.ts'
import { ContextGapPhaserGame } from './ContextGapPhaserGame.tsx'
import { LilyPadPhaserGame } from './LilyPadPhaserGame.tsx'

type SelectionGameProps = LearningGameBaseProps & {
  readonly rounds: readonly SelectionGameRound[]
  readonly playAudio?: PlayLearningAudio
}

type SelectionRunnerProps = SelectionGameProps & {
  readonly gameId: Extract<LearningGameId, 'target-blast' | 'lily-pad-path' | 'context-gap-dash'>
  readonly defaultTitle: string
  readonly defaultEyebrow: string
  readonly renderCue: (
    round: SelectionGameRound,
    index: number,
    total: number,
    selectedChoiceId: string | null,
  ) => ReactNode
  readonly choiceClassName?: string
  readonly completionMessage: string
  readonly validateRounds?: (rounds: readonly SelectionGameRound[]) => boolean
}

function SelectionPlayfield({ gameId, round, selectedChoiceId, onChoose }: {
  readonly gameId: SelectionRunnerProps['gameId']
  readonly round: SelectionGameRound
  readonly selectedChoiceId: string | null
  readonly onChoose: (choiceId: string) => void
}) {
  const selectedIndex = round.choices.findIndex((choice) => choice.id === selectedChoiceId)
  const correct = Boolean(selectedChoiceId && selectedChoiceId === round.correctChoiceId)
  const impactCopy = gameId === 'target-blast'
    ? correct ? 'DIRECT HIT' : 'TARGET MISSED'
    : gameId === 'lily-pad-path'
      ? correct ? 'SAFE LANDING' : 'SPLASH — TRY AGAIN'
      : correct ? 'GATE OPEN' : 'WRONG GATE'
  const stageStyle = { '--selected-lane': Math.max(0, selectedIndex) } as CSSProperties

  return <div className={`lg-active-playfield lg-${gameId}-playfield${selectedChoiceId ? ` lane-${Math.max(0, selectedIndex)} ${correct ? 'is-success' : 'is-miss'}` : ''}`} style={stageStyle}>
    {gameId === 'target-blast' && <>
      <div className="lg-player-craft" aria-hidden="true"><i /><b /><span /></div>
      <div className="lg-shot-beam" aria-hidden="true" />
      <div className="lg-space-dust" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
    </>}
    {gameId === 'lily-pad-path' && <>
      <div className="lg-pond-ripples" aria-hidden="true"><i /><i /><i /></div>
      <div className="lg-frog-start-pad" aria-hidden="true" />
      <div className="lg-play-frog" aria-hidden="true"><i /><i /><b /><span /></div>
    </>}
    {gameId === 'context-gap-dash' && <>
      <div className="lg-speed-lines" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="lg-dash-runner" aria-hidden="true"><i /><b /><span /></div>
    </>}
    <div className="lg-world-choice-grid" role="group" aria-label="Answer choices">
      {round.choices.map((choice, choiceIndex) => {
        const selected = selectedChoiceId === choice.id
        const answer = Boolean(selectedChoiceId) && round.correctChoiceId === choice.id
        const choiceStyle = { '--choice-index': choiceIndex } as CSSProperties
        return <button
          key={choice.id}
          type="button"
          style={choiceStyle}
          className={`lg-world-choice${selected ? choice.id === round.correctChoiceId ? ' is-correct' : ' is-incorrect' : ''}${answer ? ' is-answer' : ''}`}
          disabled={Boolean(selectedChoiceId)}
          aria-label={choice.accessibleLabel || choice.label}
          onClick={() => onChoose(choice.id)}
        ><span>{choice.label}</span><i aria-hidden="true" /></button>
      })}
    </div>
    {selectedChoiceId && <div className={`lg-impact-callout is-${correct ? 'correct' : 'incorrect'}`} role="status">
      <strong>{impactCopy}</strong>
      <span>{correct ? '+1 mastery' : `Lock onto ${round.choices.find((choice) => choice.id === round.correctChoiceId)?.label}`}</span>
    </div>}
  </div>
}

const JOURNEY_COPY = {
  'target-blast': {
    start: 'Launch zone',
    destination: 'Star Harbor',
    moving: 'Charting a safe course',
    arrived: 'Docking route unlocked',
  },
  'lily-pad-path': {
    start: 'Home pond',
    destination: 'Celebration shore',
    moving: 'Hopping toward safe shore',
    arrived: 'Safe passage unlocked',
  },
  'context-gap-dash': {
    start: 'Starting line',
    destination: 'Victory Stadium',
    moving: 'Racing toward the finish',
    arrived: 'Finish gate unlocked',
  },
} as const

function JourneyActor({ gameId }: { readonly gameId: SelectionRunnerProps['gameId'] }) {
  return <span className={`lg-journey-actor is-${gameId}`} aria-hidden="true"><i /><b /><em /></span>
}

function SelectionJourney({ gameId, mastered, total }: {
  readonly gameId: SelectionRunnerProps['gameId']
  readonly mastered: number
  readonly total: number
}) {
  const copy = JOURNEY_COPY[gameId]
  const journeyStyle = { '--journey-progress': `${total ? (mastered / total) * 100 : 0}%` } as CSSProperties
  return <section className={`lg-journey-map is-${gameId}`} style={journeyStyle} aria-label={`${mastered} of ${total} checkpoints reached`}>
    <div className="lg-journey-copy">
      <span>{copy.start}</span>
      <strong>{mastered === total ? copy.arrived : copy.moving}</strong>
      <span>{copy.destination}</span>
    </div>
    <div className="lg-journey-route" aria-hidden="true">
      <i className="lg-journey-fill" />
      {Array.from({ length: total + 1 }, (_, checkpoint) => <i key={checkpoint} className={`lg-route-checkpoint${checkpoint <= mastered ? ' is-cleared' : ''}`} />)}
      <JourneyActor gameId={gameId} />
      <span className="lg-journey-destination"><i /><b /></span>
    </div>
  </section>
}

function SelectionJourneyComplete({ gameId, summary, message, onDone }: {
  readonly gameId: SelectionRunnerProps['gameId']
  readonly summary: ReturnType<typeof summarizeLearningGame>
  readonly message: string
  readonly onDone: () => void
}) {
  const accuracy = summary.attempted ? Math.round((summary.correct / summary.attempted) * 100) : 0
  const copy = JOURNEY_COPY[gameId]
  return <section className={`lg-card lg-journey-complete is-${gameId}`} aria-live="polite">
    <div className="lg-finale-sky" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
    </div>
    <div className="lg-finale-stage" aria-hidden="true">
      <JourneyActor gameId={gameId} />
      <span className="lg-finale-destination"><i /><b /><em /></span>
      <span className="lg-finale-rays"><i /><i /><i /><i /><i /><i /></span>
    </div>
    <div className="lg-finale-copy">
      <span className="lg-finale-trophy"><Trophy size={28} /></span>
      <p className="lg-kicker">10 checkpoints cleared</p>
      <h2>{copy.destination} reached!</h2>
      <p>{message} Your character made it safely and the whole route is now glowing.</p>
      <div className="lg-complete-stats">
        <span><strong>{accuracy}%</strong> attempt accuracy</span>
        <span><strong>{summary.attempted - summary.correct}</strong> learning retries</span>
      </div>
      <button className="lg-primary" type="button" onClick={onDone}>Celebrate and return</button>
    </div>
  </section>
}

function SelectionRunner({
  gameId,
  defaultTitle,
  defaultEyebrow,
  renderCue,
  choiceClassName = '',
  completionMessage,
  validateRounds = validSelectionRounds,
  rounds,
  playAudio,
  title,
  eyebrow,
  onExit,
  onAttempt,
  onComplete,
}: SelectionRunnerProps) {
  const [index, setIndex] = useState(0)
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const round = rounds[index]
  const valid = validateRounds(rounds)
  const complete = valid && index >= rounds.length
  const selectedCorrect = Boolean(round && selectedChoiceId === round.correctChoiceId)

  useEffect(() => {
    if (!selectedChoiceId || !round) return
    const timer = window.setTimeout(() => {
      if (selectedCorrect) setIndex((current) => current + 1)
      setSelectedChoiceId(null)
    }, selectedCorrect ? 950 : 2100)
    return () => window.clearTimeout(timer)
  }, [round, selectedChoiceId, selectedCorrect])

  function choose(choiceId: string) {
    if (!round || selectedChoiceId) return
    const correct = choiceId === round.correctChoiceId
    playGameSound(correct ? 'correct' : 'incorrect')
    const attempt: LearningGameAttempt = {
      gameId,
      promptId: round.id,
      targetId: round.targetId,
      correct,
      response: choiceId,
      assessmentMode: 'automatic',
    }
    setSelectedChoiceId(choiceId)
    setAttempts((current) => [...current, attempt])
    const nextStreak = correct ? streak + 1 : 0
    setStreak(nextStreak)
    setBestStreak((current) => Math.max(current, nextStreak))
    onAttempt?.(attempt)
  }

  const summary = summarizeLearningGame(gameId, attempts)
  const mastered = Math.min(index + (selectedCorrect ? 1 : 0), rounds.length)
  const correctChoice = round?.choices.find((choice) => choice.id === round.correctChoiceId)
  return <LearningGameShell
    gameId={gameId}
    title={title || defaultTitle}
    eyebrow={eyebrow || defaultEyebrow}
    progress={`${mastered}/${rounds.length} mastered`}
    onExit={onExit}
  >
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <SelectionJourneyComplete
      gameId={gameId}
      summary={summary}
      message={completionMessage}
      onDone={() => onComplete(summary)}
    /> : round ? <section className={`lg-card ${choiceClassName}`}>
      {renderCue(round, index, rounds.length, selectedChoiceId ? round.correctChoiceId : null)}
      <SelectionJourney gameId={gameId} mastered={mastered} total={rounds.length} />
      {round.audioText && playAudio && <button className="lg-audio" type="button" onClick={() => void playAudio(round.audioText!)}><Volume2 size={20} /> Hear the prompt</button>}
      <div className="lg-stat-row">
        <span><strong>{streak}</strong> momentum</span>
        <span><strong>{bestStreak}</strong> best run</span>
      </div>
      <SelectionPlayfield gameId={gameId} round={round} selectedChoiceId={selectedChoiceId} onChoose={choose} />
      {selectedChoiceId && <div className={`lg-feedback is-${selectedCorrect ? 'correct' : 'incorrect'} is-auto`} role="status">
        <strong>{selectedCorrect ? `Locked in — ${correctChoice?.label || round.targetText}` : `Learning moment — the answer is ${correctChoice?.label || round.targetText}`}</strong>
        <span className="lg-feedback-detail">{selectedCorrect ? 'Mastery +1' : 'Study the highlighted answer. You’ll try this one again.'}</span>
        <span className="lg-auto-status">{selectedCorrect ? index + 1 === rounds.length ? 'Preparing your result…' : 'Next challenge coming up…' : 'Resetting for your retry…'}</span>
      </div>}
    </section> : null}
  </LearningGameShell>
}

export function TargetBlast(props: SelectionGameProps) {
  return <SelectionRunner
    {...props}
    gameId="target-blast"
    defaultTitle="Target Blast"
    defaultEyebrow="Receptive challenge"
    choiceClassName="lg-blast-card"
    completionMessage="You found the correct targets."
    renderCue={(round, index, total) => <>
      <p className="lg-round-label">Target {index + 1} of {total}</p>
      <h2>{round.cueText || 'Blast the correct answer'}</h2>
    </>}
  />
}

export function LilyPadPath(props: SelectionGameProps) {
  return <LilyPadPhaserGame {...props} />
}

export function ContextGapDash({ rounds, ...props }: Omit<SelectionGameProps, 'rounds'> & { readonly rounds: readonly ContextGameRound[] }) {
  return <ContextGapPhaserGame {...props} rounds={rounds} />
}
