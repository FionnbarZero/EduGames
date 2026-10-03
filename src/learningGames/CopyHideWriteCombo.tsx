import { useEffect, useState } from 'react'
import { PencilLine, Sparkles, Volume2 } from 'lucide-react'
import type { LearningGameAttempt } from './contracts.ts'
import type { AssessmentFeedback, StructuredWritingProps } from './ProductionGameShared.tsx'
import { AutoAssessmentFeedback, validProductionRounds } from './ProductionGameShared.tsx'
import { summarizeLearningGame } from './model.ts'
import { LearningGameComplete, LearningGameEmpty, LearningGameShell } from './GameShell.tsx'
import { playGameSound } from './gameFeel.ts'

export function CopyHideWriteCombo({
  rounds,
  playAudio,
  title = 'Copy–Hide–Write Combo',
  eyebrow = 'Tier 1 · Writing',
  onExit,
  onAttempt,
  onComplete,
}: StructuredWritingProps) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'copy' | 'write'>('copy')
  const [entry, setEntry] = useState('')
  const [copyConfirmed, setCopyConfirmed] = useState(false)
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [feedback, setFeedback] = useState<AssessmentFeedback | null>(null)
  const round = rounds[index]
  const valid = validProductionRounds(rounds)
  const complete = valid && index >= rounds.length

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      if (feedback === 'correct') setIndex((current) => current + 1)
      setPhase('copy')
      setEntry('')
      setCopyConfirmed(false)
      setFeedback(null)
    }, feedback === 'correct' ? 1000 : 1900)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function assess(correct: boolean, response: string) {
    if (!round || feedback) return
    const attempt: LearningGameAttempt = {
      gameId: 'copy-hide-write-combo',
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

  function updateEntry(value: string) {
    if (!round || feedback || copyConfirmed) return
    setEntry(value)
    if (value.trim() !== round.targetText.trim()) return
    if (phase === 'copy') {
      setCopyConfirmed(true)
      playGameSound('progress')
      window.setTimeout(() => {
        setPhase('write')
        setEntry('')
        setCopyConfirmed(false)
      }, 650)
    } else {
      assess(true, value.trim())
    }
  }

  function checkMemoryAttempt() {
    if (!round || phase !== 'write' || !entry.trim()) return
    assess(entry.trim() === round.targetText.trim(), entry.trim())
  }

  const summary = summarizeLearningGame('copy-hide-write-combo', attempts)
  return <LearningGameShell gameId="copy-hide-write-combo" title={title} eyebrow={eyebrow} progress={`${Math.min(index + (feedback === 'correct' ? 1 : 0), rounds.length)}/${rounds.length} mastered`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete summary={summary} message="Every copy-and-memory combo is complete." onDone={() => onComplete(summary)} /> : round ? <section className="lg-card lg-production-card lg-copy-card">
      <p className="lg-round-label">Combo {index + 1} of {rounds.length}</p>
      <div className="lg-phase-steps" aria-label={`Current step: ${phase}`}>
        <span className={phase === 'copy' ? 'is-current' : 'is-complete'}><b>1</b>Trace signal</span>
        <span className={phase === 'write' && !feedback ? 'is-current' : feedback ? 'is-complete' : ''}><b>2</b>Memory input</span>
        <span className={feedback ? 'is-current' : ''}><b>3</b>Verify</span>
      </div>
      {feedback ? <AutoAssessmentFeedback feedback={feedback} lastRound={index + 1 === rounds.length} /> : <>
      {phase === 'copy' && <>
        <h2>Trace the glowing target</h2>
        <div className={`lg-hologram-copy${copyConfirmed ? ' is-locked' : ''}`}>
          <div className="lg-reveal-word" lang="zh-Hans">{round.targetText}</div>
          <span aria-hidden="true" />
        </div>
        {playAudio && <button className="lg-audio" type="button" onClick={() => void playAudio(round.audioText || round.targetText)}><Volume2 size={20} /> Hear the word</button>}
        <label className="lg-writing-console">
          <span>Copy it exactly — the target hides automatically</span>
          <input value={entry} onChange={(event) => updateEntry(event.target.value)} autoFocus autoComplete="off" spellCheck={false} lang="zh-Hans" placeholder="Start copying…" />
          <i aria-hidden="true" />
        </label>
      </>}
      {phase === 'write' && <>
        <div className="lg-hidden-glyph" aria-hidden="true"><Sparkles size={28} /><span>Target encrypted</span></div>
        <h2>Rebuild it from memory</h2>
        <label className="lg-writing-console is-memory">
          <span>Press Enter or launch when ready</span>
          <input value={entry} onChange={(event) => updateEntry(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') checkMemoryAttempt() }} autoFocus autoComplete="off" spellCheck={false} lang="zh-Hans" placeholder="Type from memory…" />
          <i aria-hidden="true" />
        </label>
        <button className="lg-primary" type="button" disabled={!entry.trim()} onClick={checkMemoryAttempt}><PencilLine size={18} /> Verify memory</button>
      </>}
      </>}
    </section> : null}
  </LearningGameShell>
}
