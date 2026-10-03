import { useEffect, useState } from 'react'
import { PencilLine, Sparkles, Volume2 } from 'lucide-react'
import type { LearningGameAttempt } from './contracts.ts'
import type { AssessmentFeedback, StructuredWritingProps } from './ProductionGameShared.tsx'
import { AutoAssessmentFeedback, validProductionRounds } from './ProductionGameShared.tsx'
import { summarizeLearningGame } from './model.ts'
import { LearningGameComplete, LearningGameEmpty, LearningGameShell } from './GameShell.tsx'
import { playGameSound } from './gameFeel.ts'

export function CorrectionRescue({
  rounds,
  playAudio,
  copyCount = 3,
  title = 'Correction Rescue',
  eyebrow = 'Tier 1 · Writing',
  onExit,
  onAttempt,
  onComplete,
}: StructuredWritingProps & { readonly copyCount?: number }) {
  const requiredCopies = Math.max(1, Math.floor(copyCount))
  const [index, setIndex] = useState(0)
  const [copiesFinished, setCopiesFinished] = useState(0)
  const [phase, setPhase] = useState<'copy' | 'hidden'>('copy')
  const [entry, setEntry] = useState('')
  const [barrierHit, setBarrierHit] = useState(false)
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [feedback, setFeedback] = useState<AssessmentFeedback | null>(null)
  const round = rounds[index]
  const valid = validProductionRounds(rounds)
  const complete = valid && index >= rounds.length

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      if (feedback === 'correct') setIndex((current) => current + 1)
      setCopiesFinished(0)
      setPhase('copy')
      setEntry('')
      setBarrierHit(false)
      setFeedback(null)
    }, feedback === 'correct' ? 1000 : 1900)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function assess(correct: boolean, response: string) {
    if (!round || feedback) return
    const attempt: LearningGameAttempt = {
      gameId: 'correction-rescue',
      promptId: round.id,
      targetId: round.targetId,
      correct,
      response,
      assessmentMode: 'automatic',
    }
    setAttempts((current) => [...current, attempt])
    onAttempt?.(attempt)
    playGameSound(correct ? 'correct' : 'incorrect')
    setFeedback(correct ? 'correct' : 'incorrect')
  }

  function updateCopy(value: string) {
    if (!round || feedback || barrierHit) return
    setEntry(value)
    if (value.trim() !== round.targetText.trim()) return
    const next = copiesFinished + 1
    setBarrierHit(true)
    setCopiesFinished(next)
    playGameSound('progress')
    window.setTimeout(() => {
      setEntry('')
      setBarrierHit(false)
      if (next >= requiredCopies) setPhase('hidden')
    }, 560)
  }

  function checkRescue() {
    if (!round || phase !== 'hidden' || !entry.trim()) return
    assess(entry.trim() === round.targetText.trim(), entry.trim())
  }

  const summary = summarizeLearningGame('correction-rescue', attempts)
  return <LearningGameShell gameId="correction-rescue" title={title} eyebrow={eyebrow} progress={`${Math.min(index + (feedback === 'correct' ? 1 : 0), rounds.length)}/${rounds.length} mastered`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete summary={summary} message="The correction targets have been rescued." onDone={() => onComplete(summary)} /> : round ? <section className="lg-card lg-production-card lg-rescue-card">
      <p className="lg-round-label">Rescue {index + 1} of {rounds.length}</p>
      <div className="lg-rescue-scene" aria-hidden="true">
        <span className={phase === 'hidden' ? 'is-rescued' : ''}>★</span>
        <div>{Array.from({ length: requiredCopies }, (_, step) => <i key={step} className={`${step < copiesFinished ? 'is-cleared' : ''}${barrierHit && step === copiesFinished - 1 ? ' is-breaking' : ''}`} />)}</div>
      </div>
      {feedback ? <AutoAssessmentFeedback feedback={feedback} lastRound={index + 1 === rounds.length} /> : <>
      {phase === 'copy' && <>
        <div className="lg-rescue-meter" aria-label={`${copiesFinished} of ${requiredCopies} copies complete`}>
          {Array.from({ length: requiredCopies }, (_, step) => <span key={step} className={step < copiesFinished ? 'is-complete' : ''} />)}
        </div>
        <h2>Type the target to break each barrier</h2>
        <div className="lg-reveal-word" lang="zh-Hans">{round.targetText}</div>
        {playAudio && <button className="lg-audio" type="button" onClick={() => void playAudio(round.audioText || round.targetText)}><Volume2 size={20} /> Hear the word</button>}
        <label className={`lg-writing-console is-rescue${barrierHit ? ' is-hit' : ''}`}>
          <span>Barrier {Math.min(copiesFinished + 1, requiredCopies)} of {requiredCopies}</span>
          <input value={entry} onChange={(event) => updateCopy(event.target.value)} autoFocus autoComplete="off" spellCheck={false} lang="zh-Hans" placeholder="Copy to strike…" />
          <i aria-hidden="true" />
        </label>
      </>}
      {phase === 'hidden' && <>
        <div className="lg-rescue-ready" aria-hidden="true"><Sparkles size={28} /><span>Path clear</span></div>
        <h2>Final rescue: type it from memory</h2>
        <label className="lg-writing-console is-rescue-final">
          <span>The target is hidden</span>
          <input value={entry} onChange={(event) => setEntry(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') checkRescue() }} autoFocus autoComplete="off" spellCheck={false} lang="zh-Hans" placeholder="Type from memory…" />
          <i aria-hidden="true" />
        </label>
        <button className="lg-primary" type="button" disabled={!entry.trim()} onClick={checkRescue}><PencilLine size={18} /> Complete rescue</button>
      </>}
      </>}
    </section> : null}
  </LearningGameShell>
}
