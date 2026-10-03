import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { RotateCcw } from 'lucide-react'
import type { LearningGameAttempt } from './contracts.ts'
import type { PairGameProps } from './PairGameShared.ts'
import { memoryDeck, summarizeLearningGame, validGamePairs } from './model.ts'
import { LearningGameComplete, LearningGameEmpty, LearningGameShell } from './GameShell.tsx'
import { playGameSound } from './gameFeel.ts'

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
  }, [deck, flippedIds, pairMatch, twoFlipped])

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
