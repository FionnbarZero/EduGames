import { useEffect, useMemo, useState } from 'react'
import { Volume2 } from 'lucide-react'
import type { LearningGameAttempt } from './contracts.ts'
import type { PairGameProps } from './PairGameShared.ts'
import { summarizeLearningGame, validGamePairs } from './model.ts'
import { LearningGameComplete, LearningGameEmpty, LearningGameShell } from './GameShell.tsx'
import { playGameSound } from './gameFeel.ts'

type SpeedMatchCard = {
  readonly id: string
  readonly pairId: string
  readonly label: string
  readonly accessibleLabel?: string
  readonly audioText: string
  readonly audioLanguage: 'zh-CN' | 'en-US'
  readonly kind: 'word' | 'meaning'
}

function shuffled<T>(values: readonly T[]) {
  const next = [...values]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

export function SpeedMatch({
  pairs,
  playAudio,
  title = 'Speed Match',
  eyebrow = 'Ninja word dojo',
  onExit,
  onAttempt,
  onComplete,
}: PairGameProps) {
  const cards = useMemo<readonly SpeedMatchCard[]>(() => {
    const words = pairs.map((pair) => ({
      id: pair.left.id,
      pairId: pair.id,
      label: pair.left.label,
      accessibleLabel: pair.left.accessibleLabel,
      audioText: pair.left.label,
      audioLanguage: 'zh-CN' as const,
      kind: 'word' as const,
    }))
    const meanings = pairs.map((pair) => ({
      id: pair.right.id,
      pairId: pair.id,
      label: pair.right.label,
      accessibleLabel: pair.right.accessibleLabel,
      audioText: pair.right.label,
      audioLanguage: 'en-US' as const,
      kind: 'meaning' as const,
    }))
    return shuffled([...words, ...meanings])
  }, [pairs])
  const [selectedCardIds, setSelectedCardIds] = useState<readonly string[]>([])
  const [matchedPairIds, setMatchedPairIds] = useState<readonly string[]>([])
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [lastMessage, setLastMessage] = useState('Choose two matching words.')
  const valid = validGamePairs(pairs)
  const complete = valid && matchedPairIds.length === pairs.length && !feedback

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      setSelectedCardIds([])
      setFeedback(null)
    }, feedback === 'correct' ? 900 : 1500)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function resolve(first: SpeedMatchCard, second: SpeedMatchCard) {
    const pair = pairs.find((candidate) => candidate.id === first.pairId)
    if (!pair) return
    const correct = first.pairId === second.pairId
    playGameSound(correct ? 'correct' : 'incorrect')
    const attempt: LearningGameAttempt = {
      gameId: 'speed-match',
      promptId: pair.id,
      targetId: pair.targetId,
      correct,
      response: [first.id, second.id],
      assessmentMode: 'automatic',
    }
    setAttempts((current) => [...current, attempt])
    onAttempt?.(attempt)
    setFeedback(correct ? 'correct' : 'incorrect')
    setLastMessage(correct
      ? `${first.label} ↔ ${second.label} — match mastered!`
      : 'Not a match yet — listen again and try those words once more.')
    if (correct) setMatchedPairIds((current) => current.includes(pair.id) ? current : [...current, pair.id])
  }

  function choose(card: SpeedMatchCard) {
    if (feedback || matchedPairIds.includes(card.pairId) || selectedCardIds.includes(card.id)) return
    const next = [...selectedCardIds, card.id]
    setSelectedCardIds(next)
    playGameSound('select')
    if (next.length === 2) {
      const first = cards.find((candidate) => candidate.id === next[0])
      if (first) resolve(first, card)
    }
  }

  const summary = summarizeLearningGame('speed-match', attempts)
  return <LearningGameShell gameId="speed-match" title={title} eyebrow={eyebrow} progress={`${matchedPairIds.length}/${pairs.length} mastered`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete
      summary={summary}
      message="Every pair has been matched."
      onDone={() => onComplete(summary)}
    /> : <section className="lg-card lg-speed-card">
      <div className="lg-ninja-mission">
        <div className="lg-ninja-copy">
          <span>Shadow match mission</span>
          <strong>Find the eight hidden pairs</strong>
          <small>Click a word seal to hear and select it. Choose two that match.</small>
        </div>
        <div className="lg-ninja-moon" aria-hidden="true" />
        <div className="lg-ninja-silhouette" aria-hidden="true"><i /><b /><em /></div>
        <span className="lg-shuriken is-one" aria-hidden="true">✦</span>
        <span className="lg-shuriken is-two" aria-hidden="true">✦</span>
        <div className="lg-ninja-rooftops" aria-hidden="true"><i /><i /><i /></div>
      </div>
      <div className="lg-stat-row" aria-live="polite">
        <span><strong>{matchedPairIds.length}</strong> seals captured</span>
        <span><strong>{pairs.length - matchedPairIds.length}</strong> pairs remain</span>
        <span><strong>{attempts.filter((attempt) => !attempt.correct).length}</strong> retries</span>
      </div>
      <div className={`lg-circuit-board lg-speed-field${feedback ? ` is-${feedback}` : ''}`}>
        {cards.map((card) => <button
          key={card.id}
          type="button"
          className={`lg-choice lg-circuit-tile is-${card.kind}${selectedCardIds.includes(card.id) ? ' is-selected' : ''}${matchedPairIds.includes(card.pairId) ? ' is-matched' : ''}`}
          disabled={matchedPairIds.includes(card.pairId) || Boolean(feedback)}
          aria-label={`${card.accessibleLabel || card.label}. Click to hear and select.`}
          onClick={() => {
            void playAudio?.(card.audioText, card.audioLanguage)
            choose(card)
          }}
        ><Volume2 size={15} aria-hidden="true" /><span lang={card.kind === 'word' ? 'zh-Hans' : undefined}>{card.label}</span><i aria-hidden="true" /></button>)}
      </div>
      {feedback && <div className={`lg-feedback is-${feedback} is-auto`} role="status">
        <strong>{lastMessage}</strong>
        <span className="lg-feedback-detail">{feedback === 'correct' ? 'Word seal captured!' : 'The word seals are returning to the field.'}</span>
        <span className="lg-auto-status">{feedback === 'correct' ? 'Smoke cleared · keep moving…' : 'Resetting for your next strike…'}</span>
      </div>}
    </section>}
  </LearningGameShell>
}
