import { useEffect, useState } from 'react'
import { Headphones, Mic, PencilLine, Sparkles, Volume2 } from 'lucide-react'
import type {
  LearningGameAttempt,
  LearningGameBaseProps,
  LearningGameId,
  PlayLearningAudio,
  ProductionGameRound,
  RenderReadingCapture,
  RenderReadingResponse,
} from './contracts.ts'
import { summarizeLearningGame } from './model.ts'
import {
  LearningGameComplete,
  LearningGameEmpty,
  LearningGameShell,
  SelfAssessmentButtons,
} from './GameShell.tsx'

function validProductionRounds(rounds: readonly ProductionGameRound[]) {
  return rounds.length > 0
    && new Set(rounds.map((round) => round.id)).size === rounds.length
    && rounds.every((round) => round.id && round.targetId && round.targetText)
}

type AssessmentFeedback = 'correct' | 'incorrect'

function AutoAssessmentFeedback({ feedback, lastRound }: {
  readonly feedback: AssessmentFeedback
  readonly lastRound: boolean
}) {
  return <div className={`lg-feedback is-${feedback} is-auto lg-assessment-feedback`} role="status">
    <strong>{feedback === 'correct' ? 'Nice work!' : 'Marked for more practice.'}</strong>
    <span className="lg-auto-status">{lastRound ? 'Preparing your result…' : 'Next prompt coming up…'}</span>
  </div>
}

type ProductionRunnerProps = LearningGameBaseProps & {
  readonly gameId: Extract<LearningGameId, 'read-aloud-boss-rush' | 'dictation-streak'>
  readonly rounds: readonly ProductionGameRound[]
  readonly playAudio?: PlayLearningAudio
  readonly defaultTitle: string
  readonly defaultEyebrow: string
  readonly prompt: (round: ProductionGameRound, controls: {
    reveal: () => void
    playAudio?: PlayLearningAudio
    index: number
    total: number
    streak: number
    bestStreak: number
  }) => React.ReactNode
  readonly directResponse?: RenderReadingResponse
  readonly completionMessage: string
}

function ProductionRunner({
  gameId,
  rounds,
  playAudio,
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
      setIndex((current) => current + 1)
      setRevealed(false)
      setFeedback(null)
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function assess(correct: boolean) {
    if (!round || feedback) return
    const attempt: LearningGameAttempt = {
      gameId,
      promptId: round.id,
      targetId: round.targetId,
      correct,
      response: correct ? 'correct' : 'practice-again',
      assessmentMode: 'self-assessment',
    }
    setAttempts((current) => [...current, attempt])
    const nextStreak = correct ? streak + 1 : 0
    setStreak(nextStreak)
    setBestStreak((current) => Math.max(current, nextStreak))
    onAttempt?.(attempt)
    setFeedback(correct ? 'correct' : 'incorrect')
  }

  const summary = summarizeLearningGame(gameId, attempts)
  return <LearningGameShell title={title || defaultTitle} eyebrow={eyebrow || defaultEyebrow} progress={`${Math.min(index, rounds.length)}/${rounds.length}`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete
      summary={summary}
      message={completionMessage}
      onDone={() => onComplete(summary)}
    /> : round ? <section className={`lg-card lg-production-card lg-${gameId}`}>
      <p className="lg-round-label">Prompt {index + 1} of {rounds.length}</p>
      <div className="lg-stat-row">
        <span><strong>{streak}</strong> streak</span>
        <span><strong>{bestStreak}</strong> best</span>
      </div>
      {feedback ? <AutoAssessmentFeedback feedback={feedback} lastRound={index + 1 === rounds.length} /> : directResponse ? directResponse(round, { onAssess: assess, index, total: rounds.length }) : !revealed ? prompt(round, {
        reveal: () => setRevealed(true),
        playAudio,
        index,
        total: rounds.length,
        streak,
        bestStreak,
      }) : <>
        <p className="lg-kicker">Compare with the target</p>
        <div className="lg-reveal-word" lang="zh-Hans">{round.targetText}</div>
        {playAudio && <button className="lg-audio" type="button" onClick={() => void playAudio(round.audioText || round.targetText)}><Volume2 size={20} /> Hear the model</button>}
        <p>How did your response compare?</p>
        <SelfAssessmentButtons onAnswer={assess} />
      </>}
    </section> : null}
  </LearningGameShell>
}

const READ_ALOUD_INSTRUCTIONS = 'Read each word you see aloud. Recording will start automatically and stop after four seconds.'

function ReadAloudBriefing({ onComplete }: { readonly onComplete: () => void }) {
  useEffect(() => {
    let finished = false
    let fallbackTimer = 0

    function finish() {
      if (finished) return
      finished = true
      window.clearTimeout(fallbackTimer)
      window.setTimeout(onComplete, 350)
    }

    if (typeof SpeechSynthesisUtterance === 'undefined') {
      fallbackTimer = window.setTimeout(finish, 1200)
      return () => window.clearTimeout(fallbackTimer)
    }

    const instruction = new SpeechSynthesisUtterance(READ_ALOUD_INSTRUCTIONS)
    instruction.lang = 'en-US'
    instruction.rate = 0.92
    instruction.addEventListener('end', finish)
    instruction.addEventListener('error', finish)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(instruction)
    fallbackTimer = window.setTimeout(finish, 9000)

    return () => {
      window.clearTimeout(fallbackTimer)
      instruction.removeEventListener('end', finish)
      instruction.removeEventListener('error', finish)
      window.speechSynthesis.cancel()
    }
  }, [onComplete])

  return <div className="lg-read-aloud-briefing" role="status" aria-live="polite">
    <Volume2 className="lg-production-icon" size={42} aria-hidden="true" />
    <p className="lg-kicker">Listen first</p>
    <h2>Read each word you see aloud</h2>
    <p>Recording starts automatically for every word and ends after four seconds.</p>
    <span className="lg-briefing-status"><span aria-hidden="true" /> Playing instructions…</span>
  </div>
}

type ReadAloudCaptureState = 'requesting' | 'recording' | 'unavailable'

function TimedReadAloudCapture({ round, onReady, onRecording }: {
  readonly round: ProductionGameRound
  readonly onReady: () => void
  readonly onRecording?: (round: ProductionGameRound, recording: Blob) => void
}) {
  const [state, setState] = useState<ReadAloudCaptureState>('requesting')
  const [remainingSeconds, setRemainingSeconds] = useState(4)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let disposed = false
    let recorder: MediaRecorder | null = null
    let stream: MediaStream | null = null
    let stopTimer = 0
    let countdownTimer = 0

    async function record() {
      setState('requesting')
      setRemainingSeconds(4)
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setState('unavailable')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        const chunks: BlobPart[] = []
        recorder = new MediaRecorder(stream)
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data.size) chunks.push(event.data)
        })
        recorder.addEventListener('stop', () => {
          window.clearTimeout(stopTimer)
          window.clearInterval(countdownTimer)
          stream?.getTracks().forEach((track) => track.stop())
          if (disposed) return
          const recording = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
          onRecording?.(round, recording)
          onReady()
        })

        const startedAt = performance.now()
        recorder.start()
        setState('recording')
        countdownTimer = window.setInterval(() => {
          const elapsed = (performance.now() - startedAt) / 1000
          setRemainingSeconds(Math.max(0, 4 - elapsed))
        }, 100)
        stopTimer = window.setTimeout(() => {
          if (recorder?.state === 'recording') recorder.stop()
        }, 4000)
      } catch {
        stream?.getTracks().forEach((track) => track.stop())
        if (!disposed) setState('unavailable')
      }
    }

    void record()
    return () => {
      disposed = true
      window.clearTimeout(stopTimer)
      window.clearInterval(countdownTimer)
      if (recorder?.state === 'recording') recorder.stop()
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [onReady, onRecording, retryKey, round])

  return <>
    <Mic className={`lg-production-icon${state === 'recording' ? ' is-recording' : ''}`} size={42} aria-hidden="true" />
    <h2>Read this word aloud</h2>
    <div className="lg-prompt-word" lang="zh-Hans">{round.targetText}</div>
    {state === 'requesting' && <div className="lg-recording-status is-requesting" role="status">
      <span aria-hidden="true" /> Preparing the microphone…
    </div>}
    {state === 'recording' && <div className="lg-recording-status is-recording" role="timer" aria-live="polite">
      <span aria-hidden="true" /> Recording · {remainingSeconds.toFixed(1)} seconds
    </div>}
    {state === 'unavailable' && <div className="lg-microphone-error" role="alert">
      <strong>Microphone access is needed.</strong>
      <p>Allow microphone access, then try again.</p>
      <button className="lg-primary" type="button" onClick={() => setRetryKey((current) => current + 1)}>Try microphone again</button>
    </div>}
  </>
}

export function ReadAloudBossRush({
  rounds,
  playAudio,
  renderCapture,
  renderResponse,
  onRecording,
  ...props
}: LearningGameBaseProps & {
  readonly rounds: readonly ProductionGameRound[]
  readonly playAudio?: PlayLearningAudio
  readonly renderCapture?: RenderReadingCapture
  readonly renderResponse?: RenderReadingResponse
  readonly onRecording?: (round: ProductionGameRound, recording: Blob) => void
}) {
  const [briefingComplete, setBriefingComplete] = useState(false)

  return <ProductionRunner
    {...props}
    rounds={rounds}
    playAudio={playAudio}
    gameId="read-aloud-boss-rush"
    defaultTitle="Read-Aloud Boss Rush"
    defaultEyebrow="Tier 2 · Reading"
    completionMessage="Every reading response has been compared."
    directResponse={renderResponse}
    prompt={(round, controls) => briefingComplete ? <>
      <div className="lg-boss-meter" aria-label={`${controls.total - controls.index} boss power segments remaining`}><span style={{ width: `${((controls.total - controls.index) / controls.total) * 100}%` }} /></div>
      {renderCapture
        ? renderCapture(round, { onReady: controls.reveal })
        : <TimedReadAloudCapture key={round.id} round={round} onReady={controls.reveal} onRecording={onRecording} />}
    </> : <ReadAloudBriefing onComplete={() => setBriefingComplete(true)} />}
  />
}

export function DictationStreak({
  rounds,
  playAudio,
  ...props
}: LearningGameBaseProps & {
  readonly rounds: readonly ProductionGameRound[]
  readonly playAudio: PlayLearningAudio
}) {
  return <ProductionRunner
    {...props}
    rounds={rounds}
    playAudio={playAudio}
    gameId="dictation-streak"
    defaultTitle="Dictation Streak"
    defaultEyebrow="Tier 1 · Writing"
    completionMessage="You finished the writing streak."
    prompt={(round, controls) => <>
      <PencilLine className="lg-production-icon" size={42} aria-hidden="true" />
      <h2>{round.instruction || 'Listen, then write the word'}</h2>
      <div className="lg-streak-flames" aria-label={`${controls.streak} correct-answer streak`}>
        {Array.from({ length: Math.min(Math.max(controls.streak, 1), 5) }, (_, index) => <span key={index} className={index < controls.streak ? 'is-lit' : ''}>🔥</span>)}
      </div>
      <p>Write on the response surface selected by the activity.</p>
      <button className="lg-audio" type="button" onClick={() => void controls.playAudio?.(round.audioText || round.targetText)}><Headphones size={20} /> Hear the word</button>
      <button className="lg-primary" type="button" onClick={controls.reveal}>Reveal and check</button>
    </>}
  />
}

type StructuredWritingProps = LearningGameBaseProps & {
  readonly rounds: readonly ProductionGameRound[]
  readonly playAudio?: PlayLearningAudio
}

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
  const [phase, setPhase] = useState<'copy' | 'write' | 'assess'>('copy')
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [feedback, setFeedback] = useState<AssessmentFeedback | null>(null)
  const round = rounds[index]
  const valid = validProductionRounds(rounds)
  const complete = valid && index >= rounds.length

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      setIndex((current) => current + 1)
      setPhase('copy')
      setFeedback(null)
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function assess(correct: boolean) {
    if (!round || feedback) return
    const attempt: LearningGameAttempt = {
      gameId: 'copy-hide-write-combo',
      promptId: round.id,
      targetId: round.targetId,
      correct,
      response: correct ? 'correct' : 'practice-again',
      assessmentMode: 'self-assessment',
    }
    setAttempts((current) => [...current, attempt])
    onAttempt?.(attempt)
    setFeedback(correct ? 'correct' : 'incorrect')
  }

  const summary = summarizeLearningGame('copy-hide-write-combo', attempts)
  const phases = ['copy', 'write', 'assess'] as const
  return <LearningGameShell title={title} eyebrow={eyebrow} progress={`${Math.min(index, rounds.length)}/${rounds.length}`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete summary={summary} message="Every copy-and-memory combo is complete." onDone={() => onComplete(summary)} /> : round ? <section className="lg-card lg-production-card lg-copy-card">
      <p className="lg-round-label">Combo {index + 1} of {rounds.length}</p>
      <div className="lg-phase-steps" aria-label={`Current step: ${phase}`}>
        {phases.map((step, stepIndex) => <span key={step} className={step === phase ? 'is-current' : phases.indexOf(phase) > stepIndex ? 'is-complete' : ''}>
          <b>{stepIndex + 1}</b>{step === 'copy' ? 'Look & copy' : step === 'write' ? 'Hide & write' : 'Check'}
        </span>)}
      </div>
      {feedback ? <AutoAssessmentFeedback feedback={feedback} lastRound={index + 1 === rounds.length} /> : <>
      {phase === 'copy' && <>
        <Sparkles className="lg-production-icon" size={42} aria-hidden="true" />
        <h2>Look carefully and copy</h2>
        <div className="lg-reveal-word" lang="zh-Hans">{round.targetText}</div>
        {playAudio && <button className="lg-audio" type="button" onClick={() => void playAudio(round.audioText || round.targetText)}><Volume2 size={20} /> Hear the word</button>}
        <button className="lg-primary" type="button" onClick={() => setPhase('write')}>Hide the word</button>
      </>}
      {phase === 'write' && <>
        <PencilLine className="lg-production-icon" size={42} aria-hidden="true" />
        <h2>Now write it from memory</h2>
        <p>The target stays hidden until the response is finished.</p>
        <button className="lg-primary" type="button" onClick={() => setPhase('assess')}>Reveal and compare</button>
      </>}
      {phase === 'assess' && <>
        <p className="lg-kicker">The target was</p>
        <div className="lg-reveal-word" lang="zh-Hans">{round.targetText}</div>
        <SelfAssessmentButtons onAnswer={assess} />
      </>}
      </>}
    </section> : null}
  </LearningGameShell>
}

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
  const [phase, setPhase] = useState<'copy' | 'hidden' | 'assess'>('copy')
  const [attempts, setAttempts] = useState<readonly LearningGameAttempt[]>([])
  const [feedback, setFeedback] = useState<AssessmentFeedback | null>(null)
  const round = rounds[index]
  const valid = validProductionRounds(rounds)
  const complete = valid && index >= rounds.length

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      setIndex((current) => current + 1)
      setCopiesFinished(0)
      setPhase('copy')
      setFeedback(null)
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function finishCopy() {
    const next = copiesFinished + 1
    setCopiesFinished(next)
    if (next >= requiredCopies) setPhase('hidden')
  }

  function assess(correct: boolean) {
    if (!round || feedback) return
    const attempt: LearningGameAttempt = {
      gameId: 'correction-rescue',
      promptId: round.id,
      targetId: round.targetId,
      correct,
      response: correct ? 'correct' : 'practice-again',
      assessmentMode: 'self-assessment',
    }
    setAttempts((current) => [...current, attempt])
    onAttempt?.(attempt)
    setFeedback(correct ? 'correct' : 'incorrect')
  }

  const summary = summarizeLearningGame('correction-rescue', attempts)
  return <LearningGameShell title={title} eyebrow={eyebrow} progress={`${Math.min(index, rounds.length)}/${rounds.length}`} onExit={onExit}>
    {!valid ? <LearningGameEmpty onExit={onExit} /> : complete ? <LearningGameComplete summary={summary} message="The correction targets have been rescued." onDone={() => onComplete(summary)} /> : round ? <section className="lg-card lg-production-card lg-rescue-card">
      <p className="lg-round-label">Rescue {index + 1} of {rounds.length}</p>
      <div className="lg-rescue-scene" aria-hidden="true">
        <span className={phase === 'assess' ? 'is-rescued' : ''}>★</span>
        <div>{Array.from({ length: requiredCopies }, (_, step) => <i key={step} className={step < copiesFinished ? 'is-cleared' : ''} />)}</div>
      </div>
      {feedback ? <AutoAssessmentFeedback feedback={feedback} lastRound={index + 1 === rounds.length} /> : <>
      {phase === 'copy' && <>
        <div className="lg-rescue-meter" aria-label={`${copiesFinished} of ${requiredCopies} copies complete`}>
          {Array.from({ length: requiredCopies }, (_, step) => <span key={step} className={step < copiesFinished ? 'is-complete' : ''} />)}
        </div>
        <h2>Copy this target</h2>
        <div className="lg-reveal-word" lang="zh-Hans">{round.targetText}</div>
        {playAudio && <button className="lg-audio" type="button" onClick={() => void playAudio(round.audioText || round.targetText)}><Volume2 size={20} /> Hear the word</button>}
        <button className="lg-primary" type="button" onClick={finishCopy}>Copy {copiesFinished + 1} finished</button>
      </>}
      {phase === 'hidden' && <>
        <PencilLine className="lg-production-icon" size={42} aria-hidden="true" />
        <h2>Write it once with the target hidden</h2>
        <button className="lg-primary" type="button" onClick={() => setPhase('assess')}>Reveal and compare</button>
      </>}
      {phase === 'assess' && <>
        <p className="lg-kicker">The target was</p>
        <div className="lg-reveal-word" lang="zh-Hans">{round.targetText}</div>
        <SelfAssessmentButtons onAnswer={assess} />
      </>}
      </>}
    </section> : null}
  </LearningGameShell>
}
