import { useEffect, useState } from 'react'
import { RotateCcw, Undo2 } from 'lucide-react'
import type {
  LearningGameAttempt,
  LearningGameBaseProps,
  SequenceGameRound,
} from './contracts.ts'
import {
  sequenceIsCorrect,
  summarizeLearningGame,
  validSequenceRounds,
} from './model.ts'
import {
  LearningGameComplete,
  LearningGameEmpty,
  LearningGameShell,
} from './GameShell.tsx'
import { playGameSound } from './gameFeel.ts'

export function SentenceScramble({
  rounds,
  title = 'Sentence Scramble',
  eyebrow = 'Tier 2 · Reading',
  onExit,
  onAttempt,
  onComplete,
}: LearningGameBaseProps & { readonly rounds: readonly SequenceGameRound[] }) {
  const [index, setIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [checked, setChecked] = useState(false)
  const round = rounds[index]
  const valid = validSequenceRounds(rounds)
  const complete = valid && index >= rounds.length
  const correct = Boolean(round && checked && sequenceIsCorrect(round, selectedIds))

  useEffect(() => {
    if (!checked) return
    const timer = window.setTimeout(() => {
      if (correct) setIndex((current) => current + 1)
      setSelectedIds([])
      setChecked(false)
    }, correct ? 1000 : 2400)
    return () => window.clearTimeout(timer)
  }, [checked, correct])

  function select(tokenId: string) {
    if (checked || selectedIds.includes(tokenId)) return
    const next = [...selectedIds, tokenId]
    setSelectedIds(next)
    playGameSound('select')
    if (round && next.length === round.tokens.length) resolve(next)
  }

  function remove(tokenId: string) {
    if (checked) return
    setSelectedIds((current) => current.filter((id) => id !== tokenId))
  }

  function undo() {
    if (checked) return
    setSelectedIds((current) => current.slice(0, -1))
  }

  function reset() {
    if (checked) return
    setSelectedIds([])
  }

  function resolve(response: readonly string[]) {
    if (!round || response.length !== round.tokens.length) return
    const isCorrect = sequenceIsCorrect(round, response)
    const attempt: LearningGameAttempt = {
      gameId: 'sentence-scramble',
      promptId: round.id,
      targetId: round.targetId,
      correct: isCorrect,
      response,
      assessmentMode: 'automatic',
    }
    setAttempts((current) => [...current, attempt])
    setChecked(true)
    playGameSound(isCorrect ? 'correct' : 'incorrect')
    onAttempt?.(attempt)
  }

  const summary = summarizeLearningGame('sentence-scramble', attempts)
  return <LearningGameShell gameId="sentence-scramble" title={title} eyebrow={eyebrow} progress={`${Math.min(index + (correct ? 1 : 0), rounds.length)}/${rounds.length} mastered`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete
      summary={summary}
      message="You rebuilt every approved sentence."
      onDone={() => onComplete(summary)}
    /> : round ? <section className="lg-card lg-scramble-card">
      <p className="lg-round-label">Sentence {index + 1} of {rounds.length}</p>
      <div className="lg-mission-banner"><span>Sentence forge</span><strong>{round.cueText || 'Build the sentence in reading order'}</strong></div>
      <div className={`lg-sentence-forge${checked ? correct ? ' is-complete' : ' is-jammed' : ''}`}>
      <div className="lg-forge-arm" aria-hidden="true"><i /><b /></div>
      <div className="lg-sequence-answer" aria-label="Your sentence">
        {selectedIds.length ? selectedIds.map((id) => {
          const token = round.tokens.find((candidate) => candidate.id === id)
          return token ? <button key={id} type="button" disabled={checked} onClick={() => remove(id)}>{token.label}</button> : null
        }) : <span>Tap a tile to start the assembly line</span>}
        {Array.from({ length: Math.max(0, round.tokens.length - selectedIds.length) }, (_, slot) => <i className="lg-empty-slot" key={slot} aria-hidden="true" />)}
      </div>
      <div className="lg-sequence-tools">
        <button type="button" disabled={checked || selectedIds.length === 0} onClick={undo}><Undo2 size={15} /> Undo</button>
        <button type="button" disabled={checked || selectedIds.length === 0} onClick={reset}><RotateCcw size={15} /> Reset</button>
      </div>
      <div className="lg-token-bank lg-conveyor-bank" aria-label="Available sentence parts">
        <span className="lg-conveyor-track" aria-hidden="true" />
        {round.tokens.map((token) => <button
          key={token.id}
          type="button"
          disabled={checked || selectedIds.includes(token.id)}
          onClick={() => select(token.id)}
        >{token.label}</button>)}
      </div>
      {!checked && <p className="lg-auto-lock-note"><strong>{selectedIds.length}/{round.tokens.length}</strong> tiles loaded · checks automatically</p>}
      </div>
      {checked && <div className={`lg-feedback is-${correct ? 'correct' : 'incorrect'} is-auto`} role="status">
        <strong>{correct ? 'Sentence mastered!' : 'Learning moment — check the reading order.'}</strong>
        {!correct && <span className="lg-correction-line" lang="zh-Hans">{round.correctTokenIds.map((id) => round.tokens.find((token) => token.id === id)?.label).join(' ')}</span>}
        <span className="lg-feedback-detail">{correct ? 'Mastery +1' : 'You’ll rebuild this same sentence next.'}</span>
        <span className="lg-auto-status">{correct ? 'Next sentence coming up…' : <><RotateCcw size={14} /> Resetting for your retry…</>}</span>
      </div>}
    </section> : null}
  </LearningGameShell>
}
