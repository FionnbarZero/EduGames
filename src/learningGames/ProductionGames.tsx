import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
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
import { GameArtwork } from './GameArtwork.tsx'
import { playGameSound } from './gameFeel.ts'

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
    <div className="lg-feedback-energy" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>
    <span className="lg-feedback-emblem" aria-hidden="true">{feedback === 'correct' ? '✓' : '↻'}</span>
    <strong>{feedback === 'correct' ? 'Target mastered!' : 'Learning moment — one more try.'}</strong>
    <span className="lg-feedback-detail">{feedback === 'correct' ? 'Mastery +1' : 'This target stays in practice until it feels solid.'}</span>
    <span className="lg-auto-status">{feedback === 'correct' ? lastRound ? 'Preparing your result…' : 'Next challenge coming up…' : 'Resetting for your retry…'}</span>
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
    assess: (correct: boolean, response?: string) => void
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
      assessmentMode: gameId === 'dictation-streak' ? 'automatic' : 'self-assessment',
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
      {feedback ? <AutoAssessmentFeedback feedback={feedback} lastRound={index + 1 === rounds.length} /> : directResponse ? directResponse(round, { onAssess: assess, index, total: rounds.length }) : !revealed ? prompt(round, {
        reveal: () => setRevealed(true),
        playAudio,
        index,
        total: rounds.length,
        streak,
        bestStreak,
        assess,
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

  const captureStyle = { '--capture-progress': `${((4 - remainingSeconds) / 4) * 100}%` } as CSSProperties
  return <div className={`lg-voice-combat is-${state}`} style={captureStyle}>
    <div className="lg-record-orb">
      <Mic className={`lg-production-icon${state === 'recording' ? ' is-recording' : ''}`} size={34} aria-hidden="true" />
      <i aria-hidden="true" />
    </div>
    <div className="lg-live-wave" aria-hidden="true">{Array.from({ length: 19 }, (_, index) => <i key={index} style={{ '--wave-index': index } as CSSProperties} />)}</div>
    <p className="lg-kicker">Voice attack charging</p>
    <h2>Read this word aloud</h2>
    <div className="lg-prompt-word lg-combat-word" lang="zh-Hans">{round.targetText}</div>
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
  </div>
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
    completionMessage="Every reading target is now mastered."
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
    completionMessage="Every writing target is now mastered."
    prompt={(round, controls) => <DictationConsole round={round} playAudio={controls.playAudio!} streak={controls.streak} onAssess={controls.assess} />}
  />
}

function DictationConsole({ round, playAudio, streak, onAssess }: {
  readonly round: ProductionGameRound
  readonly playAudio: PlayLearningAudio
  readonly streak: number
  readonly onAssess: (correct: boolean, response?: string) => void
}) {
  const [answer, setAnswer] = useState('')

  useEffect(() => {
    void playAudio(round.audioText || round.targetText)
  }, [playAudio, round.audioText, round.id, round.targetText])

  function submit(event: FormEvent) {
    event.preventDefault()
    const response = answer.trim()
    if (!response) return
    onAssess(response === round.targetText.trim(), response)
  }

  return <form className="lg-dictation-console" onSubmit={submit}>
    <div className="lg-sonic-display" aria-hidden="true">
      <i /><i /><i /><i /><i /><i /><i /><i /><i />
      <span>{streak ? `${streak}×` : 'GO'}</span>
    </div>
    <p className="lg-kicker">Incoming transmission</p>
    <h2>{round.instruction || 'Hear it. Type it. Lock it in.'}</h2>
    <button className="lg-audio" type="button" onClick={() => void playAudio(round.audioText || round.targetText)}><Headphones size={20} /> Replay transmission</button>
    <label className="lg-answer-terminal">
      <span>Your answer</span>
      <input value={answer} onChange={(event) => setAnswer(event.target.value)} autoFocus autoComplete="off" spellCheck={false} lang="zh-Hans" placeholder="Type what you heard" />
      <i aria-hidden="true" />
    </label>
    <button className="lg-primary lg-launch-answer" type="submit" disabled={!answer.trim()}><PencilLine size={18} /> Launch answer</button>
  </form>
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
