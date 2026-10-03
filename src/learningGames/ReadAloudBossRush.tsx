import { useEffect, useState, type CSSProperties } from 'react'
import { Mic, Volume2 } from 'lucide-react'
import type {
  LearningGameBaseProps,
  PlayLearningAudio,
  ProductionGameRound,
  RenderReadingCapture,
  RenderReadingResponse,
} from './contracts.ts'
import { ProductionRunner } from './ProductionGameShared.tsx'

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
