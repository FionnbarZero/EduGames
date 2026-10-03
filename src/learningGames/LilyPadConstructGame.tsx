import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  LearningGameAttempt,
  LearningGameBaseProps,
  PlayLearningAudio,
  SelectionGameRound,
} from './contracts.ts'
import { LearningGameEmpty, LearningGameShell } from './GameShell.tsx'
import { summarizeLearningGame, validSelectionRounds } from './model.ts'

const GAME_ID = 'lily-pad-path'
const CONSTRUCT_GAME_URL = '/construct/lily-pad-path/index.html'

type ConstructMessage = {
  readonly type?: string
  readonly gameId?: string
  readonly attempt?: LearningGameAttempt
  readonly attempts?: readonly LearningGameAttempt[]
}

type LilyPadConstructGameProps = LearningGameBaseProps & {
  readonly rounds: readonly SelectionGameRound[]
  readonly playAudio?: PlayLearningAudio
}

function isLearningGameAttempt(value: unknown): value is LearningGameAttempt {
  if (!value || typeof value !== 'object') return false
  const attempt = value as Partial<LearningGameAttempt>
  return attempt.gameId === GAME_ID
    && typeof attempt.promptId === 'string'
    && typeof attempt.targetId === 'string'
    && typeof attempt.correct === 'boolean'
    && (typeof attempt.response === 'string' || Array.isArray(attempt.response))
    && attempt.assessmentMode === 'automatic'
}

export function LilyPadConstructGame({
  rounds,
  onExit,
  onAttempt,
  onComplete,
  title = 'Lily-Pad Path',
  eyebrow = 'Construct 3 adventure',
}: LilyPadConstructGameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const attemptsRef = useRef<LearningGameAttempt[]>([])
  const completedRef = useRef(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [ready, setReady] = useState(false)

  const sendStart = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'EDUGAMES_START',
      gameId: GAME_ID,
      rounds,
    }, window.location.origin)
  }, [rounds])

  useEffect(() => {
    function receiveConstructMessage(event: MessageEvent<ConstructMessage>) {
      if (event.source !== iframeRef.current?.contentWindow) return
      const message = event.data
      if (!message || message.gameId !== GAME_ID) return

      if (message.type === 'EDUGAMES_CONSTRUCT_READY') {
        setReady(true)
        sendStart()
        return
      }

      if (message.type === 'EDUGAMES_ATTEMPT' && isLearningGameAttempt(message.attempt)) {
        attemptsRef.current = [...attemptsRef.current, message.attempt]
        setAttemptCount(attemptsRef.current.length)
        onAttempt?.(message.attempt)
        return
      }

      if (message.type === 'EDUGAMES_COMPLETE' && !completedRef.current) {
        completedRef.current = true
        const reportedAttempts = Array.isArray(message.attempts)
          ? message.attempts.filter(isLearningGameAttempt)
          : attemptsRef.current
        onComplete(summarizeLearningGame(GAME_ID, reportedAttempts))
      }
    }

    window.addEventListener('message', receiveConstructMessage)
    return () => window.removeEventListener('message', receiveConstructMessage)
  }, [onAttempt, onComplete, sendStart])

  if (!validSelectionRounds(rounds)) {
    return <LearningGameEmpty onExit={onExit} />
  }

  return <LearningGameShell
    gameId={GAME_ID}
    title={title}
    eyebrow={eyebrow}
    progress={`${Math.min(attemptCount, rounds.length)}/${rounds.length} crossings`}
    onExit={onExit}
  >
    <section className="lg-construct-card" aria-label="Lily-Pad Path game">
      {!ready && <div className="lg-construct-loading" role="status">
        <span aria-hidden="true">✦</span>
        <strong>Opening the enchanted pond…</strong>
      </div>}
      <iframe
        ref={iframeRef}
        className={`lg-construct-frame${ready ? ' is-ready' : ''}`}
        src={CONSTRUCT_GAME_URL}
        title="Lily-Pad Path — Construct 3 game"
        allow="autoplay"
        onLoad={sendStart}
      />
    </section>
  </LearningGameShell>
}
