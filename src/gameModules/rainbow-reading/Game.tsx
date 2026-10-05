import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { CheckCircle2, Egg, Gem, Headphones, Mic, MicOff, Rainbow, RefreshCw, SkipForward, Sparkles, Volume2 } from 'lucide-react'
import type {
  LearningGameBaseProps,
  PlayLearningAudio,
  ProductionGameRound,
  RenderReadingCapture,
  RenderReadingResponse,
} from './runtime/contracts'
import { ProductionRunner } from './runtime/ProductionGameShared'
import { SelfAssessmentButtons } from './runtime/GameShell'
import {
  normalizeSpokenText,
  readAloudOutcome,
  scoreRecordedWord,
  transcriptEvidence,
  type AcousticWordScore,
  type ReadAloudModel,
} from './runtime/readAloudScoring'

const RECORDING_SECONDS = 6
const MIN_SPEECH_MILLISECONDS = 450
const TRAILING_SILENCE_MILLISECONDS = 700
const MIN_SPEECH_FRAMES = 8
const READ_ALOUD_INSTRUCTION_AUDIO = new URL('./assets/instructions.wav', import.meta.url).href
const RAINBOW_CREATURE_SPRITES = new URL('./assets/rainbow-creatures.webp', import.meta.url).href
const READ_ALOUD_MODELS: readonly ReadAloudModel[] = [
  { text: 'air', url: new URL('./assets/air.wav', import.meta.url).href },
  { text: 'means', url: new URL('./assets/means.wav', import.meta.url).href },
  { text: 'years', url: new URL('./assets/years.wav', import.meta.url).href },
  { text: 'here', url: new URL('./assets/here.wav', import.meta.url).href },
  { text: 'eager', url: new URL('./assets/eager.wav', import.meta.url).href },
  { text: 'change', url: new URL('./assets/change.wav', import.meta.url).href },
]

function creatureSpriteStyle(index: number) {
  const bannerCenters = [
    ['55%', '61%'],
    ['51%', '61%'],
    ['44%', '61%'],
    ['56%', '58%'],
    ['49.5%', '58%'],
    ['44%', '58%'],
  ] as const
  const [wordX, wordY] = bannerCenters[index % bannerCenters.length]
  return {
    backgroundImage: `url(${RAINBOW_CREATURE_SPRITES})`,
    backgroundPosition: `${(index % 3) * 50}% ${index < 3 ? 0 : 100}%`,
    '--rainbow-word-x': wordX,
    '--rainbow-word-y': wordY,
  } as CSSProperties
}

function ReadAloudBriefing({ onComplete, instructionAudioUrl, privacyNotice }: {
  readonly onComplete: () => void
  readonly instructionAudioUrl: string
  readonly privacyNotice: string
}) {
  const [instructionState, setInstructionState] = useState<'playing' | 'ready' | 'blocked'>('playing')
  const instructionAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(instructionAudioUrl)
    instructionAudioRef.current = audio
    audio.preload = 'auto'
    audio.volume = 1
    audio.onended = () => setInstructionState('ready')
    audio.onerror = () => setInstructionState('blocked')
    void audio.play().catch(() => setInstructionState('blocked'))

    return () => {
      audio.pause()
      audio.onended = null
      audio.onerror = null
      if (instructionAudioRef.current === audio) instructionAudioRef.current = null
    }
  }, [instructionAudioUrl])

  function playInstructions() {
    const audio = instructionAudioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setInstructionState('playing')
    void audio.play().catch(() => setInstructionState('blocked'))
  }

  function startRecording() {
    instructionAudioRef.current?.pause()
    onComplete()
  }

  return <div className="lg-read-aloud-briefing">
    <div className="lg-rainbow-briefing-mark" aria-hidden="true"><Gem size={38} /><Rainbow size={48} /><Egg size={38} /></div>
    <p className="lg-kicker">Rainbow keeper briefing</p>
    <h2>Crack the jewel eggs</h2>
    <p>Choose each jewel to hatch a kawaii rainbow creature. Read the English word on its banner before the six-second recording window closes, then compare your voice with the model.</p>
    <div className="lg-voice-privacy" role="note"><Mic size={18} aria-hidden="true" /><span><strong>Before using the microphone:</strong> {privacyNotice}</span></div>
    <span className="lg-briefing-status" role="status" aria-live="polite"><span aria-hidden="true" /> {instructionState === 'playing' ? 'The rainbow keeper is speaking…' : instructionState === 'blocked' ? 'Tap “Hear the rainbow keeper” to listen.' : 'Ready to choose a jewel'}</span>
    <button className="lg-audio" type="button" onClick={playInstructions}><Volume2 size={18} /> Hear the rainbow keeper</button>
    <button className="lg-primary lg-start-recording" type="button" onClick={startRecording}><Gem size={18} /> Show the jewel rainbow</button>
  </div>
}

type SpeechRecognitionResultLike = {
  readonly 0?: { readonly transcript?: string }
  readonly isFinal?: boolean
}

type SpeechRecognitionEventLike = {
  readonly resultIndex?: number
  readonly results?: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecordedReading = {
  readonly blob: Blob
  readonly transcript: string
  readonly microphoneLabel: string
}

type ReadAloudCaptureState = 'requesting' | 'recording' | 'checking' | 'silent' | 'unavailable'

function microphoneErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) return 'The microphone could not start. Check your browser and system sound settings.'
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'Microphone access is blocked. Allow it in the address bar and in System Settings, then try again.'
  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') return 'No microphone was found. Connect or enable a microphone, then try again.'
  if (error.name === 'NotReadableError' || error.name === 'TrackStartError') return 'The microphone is busy or muted. Close other audio apps, then try again.'
  return 'The microphone could not start. Check your browser and system sound settings.'
}

async function recordingHasAudibleSpeech(recording: Blob) {
  let audioContext: AudioContext | null = null
  try {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) return null
    audioContext = new AudioContextConstructor()
    const buffer = await audioContext.decodeAudioData(await recording.arrayBuffer())
    const samples = buffer.getChannelData(0)
    const frameSize = Math.max(256, Math.round(buffer.sampleRate * .025))
    let voicedFrames = 0
    let peak = 0
    for (let start = 0; start < samples.length; start += frameSize) {
      const end = Math.min(samples.length, start + frameSize)
      let squaredTotal = 0
      for (let index = start; index < end; index += 1) {
        const magnitude = Math.abs(samples[index])
        peak = Math.max(peak, magnitude)
        squaredTotal += samples[index] * samples[index]
      }
      if (Math.sqrt(squaredTotal / Math.max(1, end - start)) >= .012) voicedFrames += 1
    }
    return peak >= .035 && voicedFrames >= 3
  } catch {
    return null
  } finally {
    await audioContext?.close().catch(() => undefined)
  }
}

function TimedReadAloudCapture({ round, creatureIndex, onReady, onCapture, onFallback, meterAudioContext }: {
  readonly round: ProductionGameRound
  readonly creatureIndex: number
  readonly onReady: () => void
  readonly onCapture: (round: ProductionGameRound, recording: RecordedReading) => void
  readonly onFallback: (round: ProductionGameRound) => void
  readonly meterAudioContext: AudioContext | null
}) {
  const [state, setState] = useState<ReadAloudCaptureState>('requesting')
  const [remainingSeconds, setRemainingSeconds] = useState(RECORDING_SECONDS)
  const [inputLevel, setInputLevel] = useState(0)
  const [microphoneLabel, setMicrophoneLabel] = useState('Microphone')
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const stopRecordingRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    let disposed = false
    let recorder: MediaRecorder | null = null
    let stream: MediaStream | null = null
    let stopTimer = 0
    let countdownTimer = 0
    let meterFrame = 0
    let ownedAudioContext: AudioContext | null = null
    let recognition: SpeechRecognitionLike | null = null
    let recognitionStarted = false
    let transcript = ''
    let speechFrames = 0
    let speechStartedAt: number | null = null
    let lastSpeechAt: number | null = null
    let autoStopRequested = false
    let meterStarted = false
    let resolveRecognition: ((value: string) => void) | null = null
    const recognitionFinished = new Promise<string>((resolve) => { resolveRecognition = resolve })

    function finishRecognition() {
      resolveRecognition?.(transcript.trim())
      resolveRecognition = null
    }

    async function record() {
      setState('requesting')
      setRemainingSeconds(RECORDING_SECONDS)
      setInputLevel(0)
      setErrorMessage('')
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setErrorMessage('This browser does not support microphone recording. Open the game in a current version of Chrome, Edge, or Safari.')
        setState('unavailable')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        const audioTrack = stream.getAudioTracks()[0]
        setMicrophoneLabel(audioTrack?.label || 'Microphone')

        try {
          const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          if (AudioContextConstructor) {
            const activeAudioContext = meterAudioContext || new AudioContextConstructor()
            if (!meterAudioContext) ownedAudioContext = activeAudioContext
            await activeAudioContext.resume()
            const analyser = activeAudioContext.createAnalyser()
            analyser.fftSize = 512
            activeAudioContext.createMediaStreamSource(stream).connect(analyser)
            const samples = new Float32Array(analyser.fftSize)
            let lastMeterUpdate = 0
            meterStarted = true
            const updateMeter = (timestamp: number) => {
              analyser.getFloatTimeDomainData(samples)
              let squaredTotal = 0
              for (const sample of samples) squaredTotal += sample * sample
              const rms = Math.sqrt(squaredTotal / samples.length)
              const level = Math.min(1, rms * 9)
              if (rms >= .015) {
                speechFrames += 1
                speechStartedAt ??= timestamp
                lastSpeechAt = timestamp
              } else if (
                !autoStopRequested
                && speechStartedAt !== null
                && lastSpeechAt !== null
                && speechFrames >= MIN_SPEECH_FRAMES
                && timestamp - speechStartedAt >= MIN_SPEECH_MILLISECONDS
                && timestamp - lastSpeechAt >= TRAILING_SILENCE_MILLISECONDS
                && recorder?.state === 'recording'
              ) {
                autoStopRequested = true
                recorder.stop()
              }
              if (timestamp - lastMeterUpdate >= 60) {
                setInputLevel(level)
                lastMeterUpdate = timestamp
              }
              meterFrame = window.requestAnimationFrame(updateMeter)
            }
            meterFrame = window.requestAnimationFrame(updateMeter)
          }
        } catch {
          meterStarted = false
        }

        const speechWindow = window as typeof window & {
          SpeechRecognition?: new () => SpeechRecognitionLike
          webkitSpeechRecognition?: new () => SpeechRecognitionLike
        }
        const SpeechRecognitionConstructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
        if (SpeechRecognitionConstructor) {
          try {
            recognition = new SpeechRecognitionConstructor()
            recognition.lang = 'en-US'
            recognition.continuous = true
            recognition.interimResults = true
            recognition.onresult = (event) => {
              let latestTranscript = ''
              const results = event.results
              if (!results) return
              for (let index = 0; index < results.length; index += 1) latestTranscript += results[index]?.[0]?.transcript || ''
              if (latestTranscript.trim()) transcript = latestTranscript
            }
            recognition.onerror = finishRecognition
            recognition.onend = finishRecognition
            recognition.start()
            recognitionStarted = true
          } catch {
            finishRecognition()
          }
        } else {
          finishRecognition()
        }

        const chunks: BlobPart[] = []
        recorder = new MediaRecorder(stream)
        stopRecordingRef.current = () => {
          if (recorder?.state === 'recording') recorder.stop()
        }
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data.size) chunks.push(event.data)
        })
        recorder.addEventListener('stop', async () => {
          window.clearTimeout(stopTimer)
          window.clearInterval(countdownTimer)
          window.cancelAnimationFrame(meterFrame)
          if (!disposed) setState('checking')
          stream?.getTracks().forEach((track) => track.stop())
          if (recognitionStarted) {
            try { recognition?.stop() } catch { finishRecognition() }
          }
          const recognizedText = await Promise.race([
            recognitionFinished,
            new Promise<string>((resolve) => window.setTimeout(() => resolve(transcript.trim()), 700)),
          ])
          if (disposed) return
          const recording = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
          const hasAudibleSpeech = recording.size ? await recordingHasAudibleSpeech(recording) : false
          if (disposed) return
          if (!recording.size || hasAudibleSpeech === false || (hasAudibleSpeech === null && meterStarted && speechFrames < 4)) {
            setInputLevel(0)
            setErrorMessage('No voice was detected. Check the selected microphone, speak clearly, and record again.')
            setState('silent')
            return
          }
          onCapture(round, {
            blob: recording,
            transcript: recognizedText,
            microphoneLabel: audioTrack?.label || 'Microphone',
          })
          onReady()
        })

        const startedAt = performance.now()
        recorder.start(250)
        setState('recording')
        countdownTimer = window.setInterval(() => {
          const elapsed = (performance.now() - startedAt) / 1000
          setRemainingSeconds(Math.max(0, RECORDING_SECONDS - elapsed))
        }, 100)
        stopTimer = window.setTimeout(() => {
          if (recorder?.state === 'recording') recorder.stop()
        }, RECORDING_SECONDS * 1000)
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop())
        if (!disposed) {
          setErrorMessage(microphoneErrorMessage(error))
          setState('unavailable')
        }
      }
    }

    void record()
    return () => {
      disposed = true
      window.clearTimeout(stopTimer)
      window.clearInterval(countdownTimer)
      window.cancelAnimationFrame(meterFrame)
      if (recorder?.state === 'recording') recorder.stop()
      if (recognitionStarted) {
        try { recognition?.abort() } catch { /* Already stopped. */ }
      }
      stream?.getTracks().forEach((track) => track.stop())
      void ownedAudioContext?.close().catch(() => undefined)
      stopRecordingRef.current = () => undefined
    }
  }, [meterAudioContext, onCapture, onReady, retryKey, round])

  const captureStyle = { '--capture-progress': `${((RECORDING_SECONDS - remainingSeconds) / RECORDING_SECONDS) * 100}%` } as CSSProperties
  return <div className={`lg-voice-combat lg-rainbow-reading-stage is-${state}`} style={captureStyle}>
    <div className="lg-rainbow-sparkles" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
    <div className="lg-hatched-creature" style={creatureSpriteStyle(creatureIndex)} aria-hidden="true">
      <span className="lg-creature-banner-word">{round.targetText}</span>
      <span className="lg-read-me-bubble">Read me!</span>
    </div>
    <span className="lg-sr-only" aria-live="polite">The rainbow creature says: Read me! The word is {round.targetText}.</span>
    <div className="lg-record-orb">
      <Mic className={`lg-production-icon${state === 'recording' ? ' is-recording' : ''}`} size={34} aria-hidden="true" />
      <i aria-hidden="true" />
    </div>
    <div className="lg-live-wave" role="meter" aria-label="Live microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(inputLevel * 100)}>{Array.from({ length: 19 }, (_, index) => <i key={index} style={{ height: `${8 + inputLevel * (18 + (index % 5) * 5)}px`, opacity: .3 + inputLevel * .7 } as CSSProperties} />)}</div>
    <p className="lg-kicker">{state === 'recording' ? 'Rainbow recording open' : 'Jewel creature listening'}</p>
    <h2>Read the banner aloud</h2>
    {state === 'requesting' && <div className="lg-recording-status is-requesting" role="status">
      <span aria-hidden="true" /> Preparing the rainbow microphone…
    </div>}
    {state === 'recording' && <div className="lg-recording-status is-recording" role="timer" aria-live="polite">
      <span aria-hidden="true" /> Rainbow listening · {remainingSeconds.toFixed(1)} sec max
    </div>}
    {state === 'recording' && <p className="lg-microphone-label">Using {microphoneLabel} · closes when your voice settles</p>}
    {state === 'recording' && <button className="lg-skip-timer" type="button" onClick={() => stopRecordingRef.current()}><SkipForward size={18} /> Skip timer</button>}
    {state === 'checking' && <div className="lg-recording-status is-requesting" role="status"><span aria-hidden="true" /> Comparing your reading with the rainbow model…</div>}
    {(state === 'unavailable' || state === 'silent') && <div className="lg-microphone-error" role="alert">
      <MicOff size={24} aria-hidden="true" />
      <strong>{state === 'silent' ? 'We could not hear your voice.' : 'Microphone setup needs attention.'}</strong>
      <p>{errorMessage}</p>
      <button className="lg-primary" type="button" onClick={() => setRetryKey((current) => current + 1)}>Try microphone again</button>
      <button className="lg-audio" type="button" onClick={() => { onFallback(round); onReady() }}>Continue without a microphone</button>
    </div>}
  </div>
}

function RainbowJewelChallenge({ round, index, total, onReady, onCapture, onFallback, meterAudioContext }: {
  readonly round: ProductionGameRound
  readonly index: number
  readonly total: number
  readonly onReady: () => void
  readonly onCapture: (round: ProductionGameRound, recording: RecordedReading) => void
  readonly onFallback: (round: ProductionGameRound) => void
  readonly meterAudioContext: AudioContext | null
}) {
  const [hatched, setHatched] = useState(false)

  if (hatched) return <TimedReadAloudCapture
    round={round}
    creatureIndex={index}
    onReady={onReady}
    onCapture={onCapture}
    onFallback={onFallback}
    meterAudioContext={meterAudioContext}
  />

  return <div className="lg-jewel-choice" role="group" aria-label={`Choose jewel ${index + 1} of ${total}`}>
    <div className="lg-jewel-choice-sky" aria-hidden="true"><Rainbow /><Sparkles /><Egg /></div>
    <p className="lg-kicker">A jewel egg is glowing</p>
    <h2>Tap the sparkling jewel to hatch your reader</h2>
    <div className="lg-jewel-trail">
      {Array.from({ length: total }, (_, jewelIndex) => <button
        key={jewelIndex}
        className={jewelIndex < index ? 'is-complete' : jewelIndex === index ? 'is-current' : 'is-locked'}
        type="button"
        disabled={jewelIndex !== index}
        aria-label={jewelIndex < index ? `Jewel ${jewelIndex + 1} completed` : jewelIndex === index ? `Crack jewel ${jewelIndex + 1}` : `Jewel ${jewelIndex + 1} locked`}
        onClick={() => setHatched(true)}
      ><Gem /><span>{jewelIndex + 1}</span></button>)}
    </div>
    <p>Inside is a kawaii creature with your next English reading word.</p>
  </div>
}

function useRecordingWaveform(recording: Blob, barCount = 24) {
  const [waveform, setWaveform] = useState<readonly number[]>(() => Array.from({ length: barCount }, () => .12))

  useEffect(() => {
    let disposed = false
    let audioContext: AudioContext | null = null

    async function analyze() {
      try {
        const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioContextConstructor) return
        audioContext = new AudioContextConstructor()
        const buffer = await audioContext.decodeAudioData(await recording.arrayBuffer())
        const samples = buffer.getChannelData(0)
        const bucketSize = Math.max(1, Math.floor(samples.length / barCount))
        const levels = Array.from({ length: barCount }, (_, bucketIndex) => {
          const start = bucketIndex * bucketSize
          const end = Math.min(samples.length, start + bucketSize)
          let squaredTotal = 0
          for (let index = start; index < end; index += 1) squaredTotal += samples[index] * samples[index]
          return Math.sqrt(squaredTotal / Math.max(1, end - start))
        })
        const loudest = Math.max(...levels, .0001)
        if (!disposed) setWaveform(levels.map((level) => Math.max(.08, level / loudest)))
      } catch {
        // Native audio controls remain available if waveform decoding is unsupported.
      } finally {
        await audioContext?.close().catch(() => undefined)
      }
    }

    void analyze()
    return () => {
      disposed = true
      void audioContext?.close().catch(() => undefined)
    }
  }, [barCount, recording])

  return waveform
}

type ComparisonPhase = 'child' | 'model' | 'ready' | 'blocked'

function ReadAloudReview({ round, recording, playAudio, models, onAssess }: {
  readonly round: ProductionGameRound
  readonly recording: RecordedReading
  readonly playAudio?: PlayLearningAudio
  readonly models: readonly ReadAloudModel[]
  readonly onAssess: (correct: boolean, response?: string) => void
}) {
  const [recordingUrl, setRecordingUrl] = useState('')
  const [phase, setPhase] = useState<ComparisonPhase>('child')
  const [playbackError, setPlaybackError] = useState('')
  const [acousticScore, setAcousticScore] = useState<AcousticWordScore | null | undefined>(undefined)
  const childAudioRef = useRef<HTMLAudioElement>(null)
  const comparisonIdRef = useRef(0)
  const finishChildPlaybackRef = useRef<(() => void) | null>(null)
  const waveform = useRecordingWaveform(recording.blob)
  const recognizedEvidence = transcriptEvidence(round.targetText, recording.transcript)
  const scoring = acousticScore === undefined
  const acousticMatchedTarget = acousticScore?.matchedText === round.targetText
  const outcome = scoring ? 'analyzing' : readAloudOutcome(recognizedEvidence, acousticScore, round.targetText)
  const passed = outcome === 'strong'

  useEffect(() => {
    let disposed = false
    void scoreRecordedWord(recording.blob, round.targetText, models).then((result) => {
      if (!disposed) setAcousticScore(result)
    })
    return () => { disposed = true }
  }, [models, recording.blob, round.targetText])

  useEffect(() => {
    const url = URL.createObjectURL(recording.blob)
    setRecordingUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [recording.blob])

  const playComparison = useCallback(async () => {
    const audio = childAudioRef.current
    if (!audio || !recordingUrl) return

    const comparisonId = ++comparisonIdRef.current
    finishChildPlaybackRef.current?.()
    audio.pause()
    audio.currentTime = 0
    setPlaybackError('')
    setPhase('child')

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false
        const finish = (error?: Error) => {
          if (settled) return
          settled = true
          audio.removeEventListener('ended', handleEnded)
          audio.removeEventListener('error', handleError)
          if (finishChildPlaybackRef.current === cancel) finishChildPlaybackRef.current = null
          if (error) reject(error)
          else resolve()
        }
        const handleEnded = () => finish()
        const handleError = () => finish(new Error('The recording could not be played.'))
        const cancel = () => finish()
        finishChildPlaybackRef.current = cancel
        audio.addEventListener('ended', handleEnded)
        audio.addEventListener('error', handleError)
        void audio.play().catch((error: unknown) => finish(error instanceof Error ? error : new Error('Playback was blocked.')))
      })

      if (comparisonId !== comparisonIdRef.current) return
      setPhase('model')
      if (!playAudio) throw new Error('The model recording is unavailable.')
      await playAudio(round.audioText || round.targetText, 'en-US')
      if (comparisonId === comparisonIdRef.current) setPhase('ready')
    } catch (error) {
      if (comparisonId === comparisonIdRef.current) {
        setPlaybackError(error instanceof Error ? error.message : 'Audio playback was blocked.')
        setPhase('blocked')
      }
    }
  }, [playAudio, recordingUrl, round.audioText, round.targetText])

  async function playModelOnly() {
    if (!playAudio) return
    const comparisonId = ++comparisonIdRef.current
    finishChildPlaybackRef.current?.()
    childAudioRef.current?.pause()
    setPlaybackError('')
    setPhase('model')
    try {
      await playAudio(round.audioText || round.targetText, 'en-US')
      if (comparisonId === comparisonIdRef.current) setPhase('ready')
    } catch (error) {
      if (comparisonId === comparisonIdRef.current) {
        setPlaybackError(error instanceof Error ? error.message : 'The model recording could not be played.')
        setPhase('blocked')
      }
    }
  }

  useEffect(() => {
    void playComparison()
    return () => {
      comparisonIdRef.current += 1
      finishChildPlaybackRef.current?.()
      childAudioRef.current?.pause()
    }
  }, [playComparison])

  const comparisonPlaying = phase === 'child' || phase === 'model'
  return <div className="lg-read-aloud-review">
    <p className="lg-kicker">Rainbow replay</p>
    <h2>Your reading first, then the rainbow model</h2>
    <div className="lg-reading-comparison">
      <section className={phase === 'child' ? 'is-playing' : ''}>
        <span className="lg-comparison-number">1</span>
        <strong>Your reading</strong>
        <div className="lg-recording-wave" aria-label="Waveform from your recording">{waveform.map((level, index) => <i key={index} style={{ height: `${8 + level * 31}px` }} />)}</div>
        <audio ref={childAudioRef} src={recordingUrl || undefined} controls preload="auto">Your browser cannot play this recording.</audio>
        <small>{recording.microphoneLabel}</small>
      </section>
      <span className="lg-comparison-arrow" aria-hidden="true">→</span>
      <section className={phase === 'model' ? 'is-playing' : ''}>
        <span className="lg-comparison-number">2</span>
        <strong>Rainbow model</strong>
        <div className="lg-review-word" lang="en">{round.targetText}</div>
        {playAudio && <button className="lg-audio" type="button" disabled={comparisonPlaying} onClick={() => void playModelOnly()}><Volume2 size={18} /> Hear model only</button>}
      </section>
    </div>
    <div className={`lg-comparison-status is-${phase}`} role="status" aria-live="polite">
      <Headphones size={18} aria-hidden="true" />
      {phase === 'child' ? 'Playing your reading…' : phase === 'model' ? 'Now the rainbow model answers…' : phase === 'blocked' ? `${playbackError || 'Automatic playback was blocked.'} Select replay to try again.` : 'The comparison is complete. Your reading result is ready.'}
    </div>
    <button className="lg-replay-comparison" type="button" disabled={comparisonPlaying} onClick={() => void playComparison()}><RefreshCw size={17} /> {phase === 'blocked' ? 'Play both recordings' : 'Replay both recordings'}</button>
    {!comparisonPlaying && phase !== 'blocked' && <div className={`lg-speech-score is-${outcome}`} role="status">
      {scoring ? <>
        <strong>The rainbow is listening…</strong>
        <span>Comparing the recognized word and the shape of your voice.</span>
      </> : outcome === 'strong' ? <>
        <strong>Rainbow word completed</strong>
        <span>{recognizedEvidence === 'exact' && acousticScore
          ? <>Both checks matched <b lang="en">{round.targetText}</b>.</>
          : recognizedEvidence === 'exact'
            ? <>The browser recognized <b lang="en">{round.targetText}</b>. Voice-pattern comparison was unavailable, so the transcript was used.</>
          : <>The voice comparison strongly matched <b lang="en">{round.targetText}</b>.</>}</span>
      </> : outcome === 'close' ? <>
        <strong>Your reading is close—try again</strong>
        <span>{recognizedEvidence === 'exact' && !acousticMatchedTarget
          ? <>The word was recognized, but the voice pattern was closer to <b lang="en">{acousticScore?.matchedText || 'another word'}</b>.</>
          : acousticMatchedTarget
            ? <>The voice pattern was closest to <b lang="en">{round.targetText}</b>, but the evidence was not strong enough to pass.</>
            : <>The word was recognized, but a second audio check was unavailable.</>}</span>
      </> : outcome === 'retry' ? <>
        <strong>A different word was heard</strong>
        <span>{recording.transcript ? <>Browser heard: <b lang="en">{recording.transcript}</b>. </> : null}Voice comparison was closest to <b lang="en">{acousticScore?.matchedText}</b>; target: <b lang="en">{round.targetText}</b>.</span>
      </> : <>
        <strong>The rainbow could not score this recording</strong>
        <span>The recording did not provide enough reliable evidence. Listen to the model, then record your own self-check.</span>
      </>}
      {!scoring && outcome === 'unavailable'
        ? <SelfAssessmentButtons
            incorrectLabel="Read word again"
            correctLabel="I read it right anyway"
            onAnswer={(correct) => onAssess(correct, `self-review:heard-${normalizeSpokenText(recording.transcript) || 'none'}:acoustic-none`)}
          />
        : !scoring && (passed
          ? <button className="lg-primary" type="button" onClick={() => onAssess(true, `${outcome}:heard-${normalizeSpokenText(recording.transcript) || 'none'}:acoustic-${acousticScore?.matchedText || 'none'}`)}>Slide down the rainbow</button>
          : <div className="lg-reader-override">
              <p>If you read the word correctly, you can keep your result even when the computer misses it.</p>
              <div className="lg-reader-override-actions">
                <button className="lg-incorrect" type="button" onClick={() => onAssess(false, `${outcome}:heard-${normalizeSpokenText(recording.transcript) || 'none'}:acoustic-${acousticScore?.matchedText || 'none'}`)}>Read word again</button>
                <button className="lg-correct" type="button" onClick={() => onAssess(true, `reader-override:${outcome}:heard-${normalizeSpokenText(recording.transcript) || 'none'}:acoustic-${acousticScore?.matchedText || 'none'}`)}><CheckCircle2 size={17} /> I read it right anyway</button>
              </div>
            </div>)}
    </div>}
  </div>
}

function ReadAloudSelfReview({ round, playAudio, onAssess }: {
  readonly round: ProductionGameRound
  readonly playAudio?: PlayLearningAudio
  readonly onAssess: (correct: boolean, response?: string) => void
}) {
  return <div className="lg-read-aloud-review lg-read-aloud-fallback">
    <p className="lg-kicker">No-microphone practice</p>
    <h2>Listen, read, and check your own attempt</h2>
    <div className="lg-review-word" lang="en">{round.targetText}</div>
    {playAudio && <button className="lg-audio" type="button" onClick={() => void playAudio(round.audioText || round.targetText, 'en-US')}><Volume2 size={18} /> Hear the rainbow model</button>}
    <p>This fallback records completion as a self-check, not an automatic pronunciation score.</p>
    <SelfAssessmentButtons
      incorrectLabel="I want another try"
      correctLabel="I read it right anyway"
      onAnswer={(correct) => onAssess(correct, `no-microphone-self-review:${correct ? 'matched' : 'retry'}`)}
    />
  </div>
}

export function RainbowReading({
  rounds,
  playAudio,
  renderCapture,
  renderResponse,
  onRecording,
  instructionAudioUrl = READ_ALOUD_INSTRUCTION_AUDIO,
  models = READ_ALOUD_MODELS,
  ...props
}: LearningGameBaseProps & {
  readonly rounds: readonly ProductionGameRound[]
  readonly playAudio?: PlayLearningAudio
  readonly renderCapture?: RenderReadingCapture
  readonly renderResponse?: RenderReadingResponse
  readonly onRecording?: (round: ProductionGameRound, recording: Blob) => void
  readonly instructionAudioUrl?: string
  readonly models?: readonly ReadAloudModel[]
}) {
  const [briefingComplete, setBriefingComplete] = useState(false)
  const [recording, setRecording] = useState<(RecordedReading & { readonly roundId: string }) | null>(null)
  const [fallbackRoundId, setFallbackRoundId] = useState('')
  const meterAudioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => () => {
    void meterAudioContextRef.current?.close().catch(() => undefined)
  }, [])

  function beginRecordingSession() {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioContextConstructor && !meterAudioContextRef.current) {
      meterAudioContextRef.current = new AudioContextConstructor()
      void meterAudioContextRef.current.resume()
    }
    setBriefingComplete(true)
  }

  const saveRecording = useCallback((round: ProductionGameRound, capturedReading: RecordedReading) => {
    setFallbackRoundId('')
    setRecording({ roundId: round.id, ...capturedReading })
    onRecording?.(round, capturedReading.blob)
  }, [onRecording])

  const defaultResponse: RenderReadingResponse | undefined = renderCapture ? undefined : (round, controls) => recording?.roundId === round.id
    ? <ReadAloudReview round={round} recording={recording} playAudio={playAudio} models={models} onAssess={controls.onAssess} />
    : fallbackRoundId === round.id
      ? <ReadAloudSelfReview round={round} playAudio={playAudio} onAssess={controls.onAssess} />
      : <div className="lg-read-aloud-review" role="status">Preparing your recording…</div>

  return <ProductionRunner
    {...props}
    rounds={rounds}
    playAudio={playAudio}
    gameId="rainbow-reading"
    defaultTitle="Rainbow Reading"
    defaultEyebrow="English reading adventure"
    completionMessage="All six rainbow creatures are free! Your reading sent every hatchling down the rainbow."
    directResponse={renderResponse || defaultResponse}
    prompt={(round, controls) => briefingComplete ? <>
      <div className="lg-scroll-progress" aria-label={`${controls.index} of ${controls.total} rainbow jewels completed`}>
        <span><b style={{ width: `${(controls.index / controls.total) * 100}%` }} /></span>
        <small>{controls.index}/{controls.total} jewel eggs hatched</small>
      </div>
      {renderCapture
        ? renderCapture(round, { onReady: controls.reveal })
        : <RainbowJewelChallenge key={round.id} round={round} index={controls.index} total={controls.total} onReady={controls.reveal} onCapture={saveRecording} onFallback={(fallbackRound) => setFallbackRoundId(fallbackRound.id)} meterAudioContext={meterAudioContextRef.current} />}
    </> : <ReadAloudBriefing
      onComplete={beginRecordingSession}
      instructionAudioUrl={instructionAudioUrl}
      privacyNotice={`This game analyzes a short recording in this browser. Browser speech recognition may use your browser provider's service. ${onRecording ? 'The host app is configured to receive the recording.' : 'This module does not save or upload the recording itself.'} Ask an adult before continuing.`}
    />}
  />
}
