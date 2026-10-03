import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { RotateCcw } from 'lucide-react'
import type {
  GameChoice,
  GamePair,
  LearningGameAttempt,
  LearningGameBaseProps,
} from './contracts.ts'
import { memoryDeck, summarizeLearningGame, validGamePairs } from './model.ts'
import {
  LearningGameComplete,
  LearningGameEmpty,
  LearningGameShell,
} from './GameShell.tsx'
import { playGameSound } from './gameFeel.ts'

type PairGameProps = LearningGameBaseProps & {
  readonly pairs: readonly GamePair[]
}

export function SpeedMatch({
  pairs,
  title = 'Speed Match',
  eyebrow = 'Receptive challenge',
  onExit,
  onAttempt,
  onComplete,
}: PairGameProps) {
  const [selectedLeft, setSelectedLeft] = useState<GameChoice | null>(null)
  const [selectedRight, setSelectedRight] = useState<GameChoice | null>(null)
  const [matchedPairIds, setMatchedPairIds] = useState<readonly string[]>([])
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [lastMessage, setLastMessage] = useState('Pick one tile from each side.')
  const rightPairs = useMemo(() => {
    if (pairs.length < 3) return [...pairs].reverse()
    const split = Math.ceil(pairs.length / 2)
    return [...pairs.slice(split), ...pairs.slice(0, split)]
  }, [pairs])
  const valid = validGamePairs(pairs)
  const complete = valid && matchedPairIds.length === pairs.length && !feedback

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      setSelectedLeft(null)
      setSelectedRight(null)
      setFeedback(null)
    }, feedback === 'correct' ? 950 : 2100)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function resolve(left: GameChoice, right: GameChoice) {
    const pair = pairs.find((candidate) => candidate.left.id === left.id)
    if (!pair) return
    const correct = pair.right.id === right.id
    playGameSound(correct ? 'correct' : 'incorrect')
    const attempt: LearningGameAttempt = {
      gameId: 'speed-match',
      promptId: pair.id,
      targetId: pair.targetId,
      correct,
      response: [left.id, right.id],
      assessmentMode: 'automatic',
    }
    const nextAttempts = [...attempts, attempt]
    setAttempts(nextAttempts)
    onAttempt?.(attempt)
    setFeedback(correct ? 'correct' : 'incorrect')
    setLastMessage(correct
      ? `${left.label} ↔ ${right.label} — match mastered!`
      : `Learning moment — ${left.label} pairs with ${pair.right.label}.`)
    if (correct) setMatchedPairIds((current) => current.includes(pair.id) ? current : [...current, pair.id])
  }

  function chooseLeft(choice: GameChoice) {
    if (feedback || matchedPairIds.some((id) => pairs.find((pair) => pair.id === id)?.left.id === choice.id)) return
    setSelectedLeft(choice)
    if (!selectedRight) playGameSound('select')
    if (selectedRight) resolve(choice, selectedRight)
  }

  function chooseRight(choice: GameChoice) {
    if (feedback || matchedPairIds.some((id) => pairs.find((pair) => pair.id === id)?.right.id === choice.id)) return
    setSelectedRight(choice)
    if (!selectedLeft) playGameSound('select')
    if (selectedLeft) resolve(selectedLeft, choice)
  }

  const summary = summarizeLearningGame('speed-match', attempts)
  return <LearningGameShell gameId="speed-match" title={title} eyebrow={eyebrow} progress={`${matchedPairIds.length}/${pairs.length} mastered`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete
      summary={summary}
      message="Every pair has been matched."
      onDone={() => onComplete(summary)}
    /> : <section className="lg-card lg-speed-card">
      <div className="lg-mission-banner"><span>Power grid</span><strong>Complete the circuits</strong></div>
      <div className="lg-stat-row" aria-live="polite">
        <span><strong>{matchedPairIds.length}</strong> matched</span>
        <span><strong>{attempts.filter((attempt) => !attempt.correct).length}</strong> retries</span>
      </div>
      <div className={`lg-circuit-board${feedback ? ` is-${feedback}` : ''}`}>
        <div className="lg-match-column lg-circuit-bank">
          <span className="lg-lane-label">Targets</span>
          {pairs.map((pair) => <button
            key={pair.left.id}
            type="button"
            className={`lg-choice lg-circuit-tile${selectedLeft?.id === pair.left.id ? ' is-selected' : ''}${matchedPairIds.includes(pair.id) ? ' is-matched' : ''}`}
            disabled={matchedPairIds.includes(pair.id) || Boolean(feedback)}
            aria-label={pair.left.accessibleLabel || pair.left.label}
            onClick={() => chooseLeft(pair.left)}
          ><i aria-hidden="true" /><span>{pair.left.label}</span><b aria-hidden="true">›</b></button>)}
        </div>
        <div className="lg-circuit-core" aria-hidden="true">
          <i /><i /><i />
          <strong>{matchedPairIds.length}</strong>
          <span>of {pairs.length}</span>
          {(selectedLeft || selectedRight) && <div className="lg-circuit-preview"><b>{selectedLeft?.label || '·'}</b><em>×</em><b>{selectedRight?.label || '·'}</b></div>}
        </div>
        <div className="lg-match-column lg-circuit-bank">
          <span className="lg-lane-label">Matches</span>
          {rightPairs.map((pair) => <button
            key={pair.right.id}
            type="button"
            className={`lg-choice lg-circuit-tile${selectedRight?.id === pair.right.id ? ' is-selected' : ''}${matchedPairIds.includes(pair.id) ? ' is-matched' : ''}`}
            disabled={matchedPairIds.includes(pair.id) || Boolean(feedback)}
            aria-label={pair.right.accessibleLabel || pair.right.label}
            onClick={() => chooseRight(pair.right)}
          ><b aria-hidden="true">‹</b><span>{pair.right.label}</span><i aria-hidden="true" /></button>)}
        </div>
      </div>
      {feedback && <div className={`lg-feedback is-${feedback} is-auto`} role="status">
        <strong>{lastMessage}</strong>
        <span className="lg-feedback-detail">{feedback === 'correct' ? 'Mastery +1' : 'The correct pair will stay in play.'}</span>
        <span className="lg-auto-status">{feedback === 'correct' ? 'Loading the next pair…' : 'Resetting for your retry…'}</span>
      </div>}
    </section>}
  </LearningGameShell>
}

export function MemoryFlip({
  pairs,
  title = 'Memory Flip',
  eyebrow = 'Receptive challenge',
  onExit,
  onAttempt,
  onComplete,
}: PairGameProps) {
  const deck = useMemo(() => memoryDeck(pairs), [pairs])
  const [flippedIds, setFlippedIds] = useState<readonly string[]>([])
  const [matchedPairIds, setMatchedPairIds] = useState<readonly string[]>([])
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const twoFlipped = flippedIds.length === 2
  const flippedCards = flippedIds.map((id) => deck.find((card) => card.id === id)).filter((card) => Boolean(card))
  const pairMatch = twoFlipped && flippedCards[0]?.pairId === flippedCards[1]?.pairId
  const valid = validGamePairs(pairs)
  const complete = valid && matchedPairIds.length === pairs.length

  useEffect(() => {
    if (!twoFlipped) return
    const timer = window.setTimeout(() => {
      const first = deck.find((card) => card.id === flippedIds[0])
      const second = deck.find((card) => card.id === flippedIds[1])
      if (first && second && first.pairId === second.pairId) {
        setMatchedPairIds((current) => current.includes(first.pairId) ? current : [...current, first.pairId])
      }
      setFlippedIds([])
    }, pairMatch ? 1050 : 1450)
    return () => window.clearTimeout(timer)
  }, [deck, flippedIds, twoFlipped])

  function flip(cardId: string) {
    if (twoFlipped || flippedIds.includes(cardId)) return
    const card = deck.find((candidate) => candidate.id === cardId)
    if (!card || matchedPairIds.includes(card.pairId)) return
    playGameSound('flip')
    const next = [...flippedIds, cardId]
    setFlippedIds(next)
    if (next.length !== 2) return
    const first = deck.find((candidate) => candidate.id === next[0])
    const second = deck.find((candidate) => candidate.id === next[1])
    if (!first || !second) return
    const correct = first.pairId === second.pairId
    window.setTimeout(() => playGameSound(correct ? 'correct' : 'incorrect'), 180)
    const pair = pairs.find((candidate) => candidate.id === first.pairId) || pairs.find((candidate) => candidate.id === second.pairId)
    if (!pair) return
    const attempt: LearningGameAttempt = {
      gameId: 'memory-flip',
      promptId: pair.id,
      targetId: pair.targetId,
      correct,
      response: next,
      assessmentMode: 'automatic',
    }
    setAttempts((current) => [...current, attempt])
    onAttempt?.(attempt)
  }

  const summary = summarizeLearningGame('memory-flip', attempts)
  return <LearningGameShell gameId="memory-flip" title={title} eyebrow={eyebrow} progress={`${matchedPairIds.length}/${pairs.length} mastered`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete
      summary={summary}
      message="You remembered every matching location."
      onDone={() => onComplete(summary)}
    /> : <section className="lg-card lg-memory-game">
      <div className="lg-mission-banner"><span>Memory vault</span><strong>Recover every linked glyph</strong></div>
      <div className="lg-stat-row">
        <span><strong>{matchedPairIds.length}</strong> pairs found</span>
        <span><strong>{attempts.length}</strong> turns</span>
      </div>
      <div className="lg-memory-vault">
        <div className="lg-vault-core" aria-hidden="true"><i style={{ '--vault-progress': `${(matchedPairIds.length / pairs.length) * 100}%` } as CSSProperties} /><strong>{matchedPairIds.length}/{pairs.length}</strong><span>vault open</span></div>
        <div className="lg-memory-grid">
        {deck.map((card, cardIndex) => {
          const visible = flippedIds.includes(card.id) || matchedPairIds.includes(card.pairId)
          return <button
            key={card.id}
            type="button"
            className={`lg-memory-card${visible ? ' is-visible' : ''}${matchedPairIds.includes(card.pairId) ? ' is-matched' : ''}`}
            disabled={twoFlipped || matchedPairIds.includes(card.pairId)}
            aria-label={visible ? card.face.accessibleLabel || card.face.label : 'Hidden memory tile'}
            onClick={() => flip(card.id)}
          ><span className="lg-card-back" aria-hidden="true"><b>{String(cardIndex + 1).padStart(2, '0')}</b><i /></span><span className="lg-card-face" aria-hidden={!visible}>{card.face.label}</span></button>
        })}
        </div>
      </div>
      {twoFlipped && <div className={`lg-feedback is-${pairMatch ? 'correct' : 'incorrect'} is-auto`} role="status">
        <strong>{pairMatch ? 'Pair locked in!' : 'Learning moment — remember both spots.'}</strong>
        <span className="lg-feedback-detail">{pairMatch ? 'Mastery +1' : 'Each turn makes the map clearer.'}</span>
        <span className="lg-auto-status">{pairMatch ? 'Saving the match…' : <><RotateCcw size={14} /> Turning them back…</>}</span>
      </div>}
    </section>}
  </LearningGameShell>
}
