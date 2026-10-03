import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { RotateCcw } from 'lucide-react'
import type { LearningGameAttempt } from './contracts.ts'
import type { PairGameProps } from './PairGameShared.ts'
import { memoryDeck, summarizeLearningGame, validGamePairs } from './model.ts'
import { LearningGameComplete, LearningGameEmpty, LearningGameShell } from './GameShell.tsx'
import { playGameSound, preloadLanternSounds } from './gameFeel.ts'

export function MemoryFlip({
  pairs,
  title = 'Memory Lanterns',
  eyebrow = 'Sunset lantern challenge',
  onExit,
  onAttempt,
  onComplete,
}: PairGameProps) {
  const festivalPairs = useMemo(() => pairs.slice(0, 5), [pairs])
  const deck = useMemo(() => memoryDeck(festivalPairs), [festivalPairs])
  const [flippedIds, setFlippedIds] = useState<readonly string[]>([])
  const [matchedPairIds, setMatchedPairIds] = useState<readonly string[]>([])
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const twoFlipped = flippedIds.length === 2
  const flippedCards = flippedIds.map((id) => deck.find((card) => card.id === id)).filter((card) => Boolean(card))
  const pairMatch = twoFlipped && flippedCards[0]?.pairId === flippedCards[1]?.pairId
  const valid = validGamePairs(festivalPairs)
  const complete = valid && matchedPairIds.length === festivalPairs.length

  useEffect(() => {
    preloadLanternSounds()
  }, [])

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

  useEffect(() => {
    if (!complete) return
    const timer = window.setTimeout(() => playGameSound('lantern-victory'), 360)
    return () => window.clearTimeout(timer)
  }, [complete])

  function flip(cardId: string) {
    if (twoFlipped || flippedIds.includes(cardId)) return
    const card = deck.find((candidate) => candidate.id === cardId)
    if (!card || matchedPairIds.includes(card.pairId)) return
    const next = [...flippedIds, cardId]
    setFlippedIds(next)
    // Paint the character first. Starting media inside the click handler can
    // make React wait for the browser's audio pipeline before revealing it.
    if (next.length === 1) window.requestAnimationFrame(() => playGameSound('lantern-flip'))
    if (next.length !== 2) return
    const first = deck.find((candidate) => candidate.id === next[0])
    const second = deck.find((candidate) => candidate.id === next[1])
    if (!first || !second) return
    const correct = first.pairId === second.pairId
    window.setTimeout(() => playGameSound(correct ? 'lantern-match' : 'lantern-miss'), 180)
    const pair = festivalPairs.find((candidate) => candidate.id === first.pairId) || festivalPairs.find((candidate) => candidate.id === second.pairId)
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
  return <LearningGameShell gameId="memory-flip" title={title} eyebrow={eyebrow} progress={`${matchedPairIds.length}/${festivalPairs.length} pairs lit`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete
      summary={summary}
      message="Every matching lantern is glowing across the sunset courtyard."
      onDone={() => onComplete(summary)}
    /> : <section className="lg-card lg-memory-game">
      <div className="lg-mission-banner"><span>Lantern festival</span><strong>Light all five matching pairs</strong></div>
      <div className="lg-stat-row">
        <span><strong>{matchedPairIds.length}/5</strong> pairs glowing</span>
        <span><strong>{attempts.length}</strong> turns</span>
      </div>
      <div className="lg-lantern-courtyard">
        <div className="lg-lantern-sky" aria-hidden="true"><i className="lg-setting-sun" /><i className="lg-sunset-cloud is-one" /><i className="lg-sunset-cloud is-two" /><i className="lg-distant-hills" /></div>
        <div className="lg-lantern-buildings" aria-hidden="true">
          <span className="is-left"><i /><b /><em /></span>
          <span className="is-center"><i /><b /><em /></span>
          <span className="is-right"><i /><b /><em /></span>
        </div>
        <div className="lg-pergola" aria-hidden="true"><i /><i /><b /><b /><em /></div>
        <div className="lg-lantern-wires" aria-hidden="true"><i /><i /></div>
        <div className="lg-memory-grid">
          {deck.map((card, cardIndex) => {
            const visible = flippedIds.includes(card.id) || matchedPairIds.includes(card.pairId)
            return <button
              key={card.id}
              type="button"
              className={`lg-memory-card lg-lantern-card${visible ? ' is-visible' : ''}${matchedPairIds.includes(card.pairId) ? ' is-matched' : ''}`}
              style={{ '--lantern-index': cardIndex, '--lantern-delay': `${-(cardIndex % 5) * .23}s` } as CSSProperties}
              disabled={twoFlipped || matchedPairIds.includes(card.pairId)}
              aria-label={visible ? card.face.accessibleLabel || card.face.label : `Hidden lantern ${cardIndex + 1}`}
              onClick={() => flip(card.id)}
            >
              <span className="lg-card-back" aria-hidden="true"><b>{cardIndex + 1}</b><i>福</i><em /></span>
              <span className="lg-card-face" aria-hidden={!visible}><b>{card.face.label}</b><i /><em /></span>
            </button>
          })}
        </div>
      </div>
      {twoFlipped && <div className={`lg-feedback is-${pairMatch ? 'correct' : 'incorrect'} is-auto`} role="status">
        <strong>{pairMatch ? 'The lanterns glow together!' : 'Keep their places in mind.'}</strong>
        <span className="lg-feedback-detail">{pairMatch ? 'A matching pair joins the festival.' : 'The lanterns will dim so you can try again.'}</span>
        <span className="lg-auto-status">{pairMatch ? 'Lighting the pair…' : <><RotateCcw size={14} /> Lowering the light…</>}</span>
      </div>}
    </section>}
  </LearningGameShell>
}
