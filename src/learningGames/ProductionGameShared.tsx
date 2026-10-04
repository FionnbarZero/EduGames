import { useEffect, useState, type ReactNode } from 'react'
import { Volume2 } from 'lucide-react'
import type {
  LearningGameAttempt,
  LearningGameBaseProps,
  LearningGameId,
  PlayLearningAudio,
  ProductionGameRound,
  RenderReadingResponse,
} from './contracts.ts'
import { summarizeLearningGame } from './model.ts'
import { LearningGameComplete, LearningGameEmpty, LearningGameShell, SelfAssessmentButtons } from './GameShell.tsx'
import { GameArtwork } from './GameArtwork.tsx'
import { playGameSound } from './gameFeel.ts'

export function validProductionRounds(rounds: readonly ProductionGameRound[]) {
  return rounds.length > 0
    && new Set(rounds.map((round) => round.id)).size === rounds.length
    && rounds.every((round) => round.id && round.targetId && round.targetText)
}

export type AssessmentFeedback = 'correct' | 'incorrect'

export function AutoAssessmentFeedback({ feedback, lastRound }: {
  readonly feedback: AssessmentFeedback
  readonly lastRound: boolean
}) {
  return <div className={`lg-feedback is-${feedback} is-auto lg-assessment-feedback`} role="status">
    <div className="lg-feedback-energy" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
    <span className="lg-feedback-emblem" aria-hidden="true">{feedback === 'correct' ? '✓' : '↻'}</span>
    <strong>{feedback === 'correct' ? 'Target mastered!' : 'Learning moment — one more try.'}</strong>
    <span className="lg-feedback-detail">{feedback === 'correct' ? 'Mastery +1' : 'This target stays in practice until it feels solid.'}</span>
    <span className="lg-auto-status">{feedback === 'correct' ? lastRound ? 'Preparing your result…' : 'Next challenge coming up…' : 'Resetting for your retry…'}</span>
  </div>
}

export type ProductionRunnerControls = {
  readonly reveal: () => void
  readonly playAudio?: PlayLearningAudio
  readonly index: number
  readonly total: number
  readonly streak: number
  readonly bestStreak: number
  readonly assess: (correct: boolean, response?: string) => void
}

type ProductionRunnerProps = LearningGameBaseProps & {
  readonly gameId: Extract<LearningGameId, 'read-aloud-boss-rush' | 'dictation-streak' | 'speller-bee'>
  readonly rounds: readonly ProductionGameRound[]
  readonly playAudio?: PlayLearningAudio
  readonly assessmentMode?: LearningGameAttempt['assessmentMode']
  readonly defaultTitle: string
  readonly defaultEyebrow: string
  readonly prompt: (round: ProductionGameRound, controls: ProductionRunnerControls) => ReactNode
  readonly directResponse?: RenderReadingResponse
  readonly completionMessage: string
}

export function ProductionRunner({
  gameId,
  rounds,
  playAudio,
  assessmentMode = 'automatic',
  defaultTitle,
  defaultEyebrow,
  prompt,
  directResponse,
  completionMessage,
  title,
  eyebrow,
  onExit,
  onAttempt,
  onComplete,
}: ProductionRunnerProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [feedback, setFeedback] = useState<AssessmentFeedback | null>(null)
  const round = rounds[index]
  const valid = validProductionRounds(rounds)
  const complete = valid && index >= rounds.length

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      if (feedback === 'correct') setIndex((current) => current + 1)
      setRevealed(false)
      setFeedback(null)
    }, feedback === 'correct' ? 1000 : 1900)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function assess(correct: boolean, response = correct ? 'correct' : 'practice-again') {
    if (!round || feedback) return
    const attempt: LearningGameAttempt = {
      gameId,
      promptId: round.id,
      targetId: round.targetId,
      correct,
      response,
      assessmentMode,
    }
    setAttempts((current) => [...current, attempt])
    const nextStreak = correct ? streak + 1 : 0
    setStreak(nextStreak)
    setBestStreak((current) => Math.max(current, nextStreak))
    onAttempt?.(attempt)
    playGameSound(correct ? 'correct' : 'incorrect')
    setFeedback(correct ? 'correct' : 'incorrect')
  }

  const summary = summarizeLearningGame(gameId, attempts)
  return <LearningGameShell gameId={gameId} title={title || defaultTitle} eyebrow={eyebrow || defaultEyebrow} progress={`${Math.min(index + (feedback === 'correct' ? 1 : 0), rounds.length)}/${rounds.length} mastered`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete
      summary={summary}
      message={completionMessage}
      onDone={() => onComplete(summary)}
    /> : round ? <section className={`lg-card lg-production-card lg-${gameId}`}>
      <p className="lg-round-label">Prompt {index + 1} of {rounds.length}</p>
      <div className="lg-stat-row">
        <span><strong>{streak}</strong> momentum</span>
        <span><strong>{bestStreak}</strong> best run</span>
      </div>
      {gameId === 'read-aloud-boss-rush' && <GameArtwork gameId={gameId} progress={index + (feedback === 'correct' ? 1 : 0)} total={rounds.length} />}
      {feedback ? <AutoAssessmentFeedback feedback={feedback} lastRound={index + 1 === rounds.length} /> : !revealed ? prompt(round, {
        reveal: () => setRevealed(true),
        playAudio,
        index,
        total: rounds.length,
        streak,
        bestStreak,
        assess,
      }) : directResponse ? directResponse(round, { onAssess: assess, index, total: rounds.length }) : <>
        <p className="lg-kicker">Compare with the target</p>
        <div className="lg-reveal-word" lang="zh-Hans">{round.targetText}</div>
        {playAudio && <button className="lg-audio" type="button" onClick={() => void playAudio(round.audioText || round.targetText)}><Volume2 size={20} /> Hear the model</button>}
        <p>How did your response compare?</p>
        <SelfAssessmentButtons onAnswer={assess} />
      </>}
    </section> : null}
  </LearningGameShell>
}

export type StructuredWritingProps = LearningGameBaseProps & {
  readonly rounds: readonly ProductionGameRound[]
  readonly playAudio?: PlayLearningAudio
}
