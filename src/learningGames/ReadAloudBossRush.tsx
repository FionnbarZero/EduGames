import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Headphones, Mic, MicOff, RefreshCw, Volume2 } from 'lucide-react'
import type {
  LearningGameBaseProps,
  PlayLearningAudio,
  ProductionGameRound,
  RenderReadingCapture,
  RenderReadingResponse,
} from './contracts.ts'
import { ProductionRunner } from './ProductionGameShared.tsx'
import { scoreRecordedWord, type AcousticWordScore, type ReadAloudModel } from './readAloudScoring.ts'

const RECORDING_SECONDS = 6
const READ_ALOUD_INSTRUCTION_AUDIO = `${import.meta.env.BASE_URL}audio/read-aloud/instructions.wav?v=1`
const READ_ALOUD_MODELS: readonly ReadAloudModel[] = [
  { text: '你好', url: `${import.meta.env.BASE_URL}audio/read-aloud/hello.wav?v=1` },
  { text: '谢谢', url: `${import.meta.env.BASE_URL}audio/read-aloud/thanks.wav?v=1` },
  { text: '再见', url: `${import.meta.env.BASE_URL}audio/read-aloud/goodbye.wav?v=1` },
]

function ReadAloudBriefing({ onComplete }: { readonly onComplete: () => void }) {
  const [instructionState, setInstructionState] = useState<'playing' | 'ready' | 'blocked'>('playing')
  const instructionAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(READ_ALOUD_INSTRUCTION_AUDIO)
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
  }, [])

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
    <Volume2 className="lg-production-icon" size={42} aria-hidden="true" />
    <p className="lg-kicker">Listen first</p>
    <h2>Read each word you see aloud</h2>
    <p>Recording starts automatically for every word and ends after six seconds. Then you will hear your voice followed by the model word.</p>
    <span className="lg-briefing-status" role="status" aria-live="polite"><span aria-hidden="true" /> {instructionState === 'playing' ? 'Playing recorded instructions…' : instructionState === 'blocked' ? 'Tap “Hear instructions” if you need them.' : 'Ready to record'}</span>
    <button className="lg-audio" type="button" onClick={playInstructions}><Volume2 size={18} /> Hear instructions</button>
    <button className="lg-primary lg-start-recording" type="button" onClick={startRecording}><Mic size={18} /> Start recording</button>
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

function TimedReadAloudCapture({ round, onReady, onCapture, meterAudioContext }: {
  readonly round: ProductionGameRound
  readonly onReady: () => void
  readonly onCapture: (round: ProductionGameRound, recording: RecordedReading) => void
  readonly meterAudioContext: AudioContext | null
}) {
  const [state, setState] = useState<ReadAloudCaptureState>('requesting')
  const [remainingSeconds, setRemainingSeconds] = useState(RECORDING_SECONDS)
  const [inputLevel, setInputLevel] = useState(0)
  const [microphoneLabel, setMicrophoneLabel] = useState('Microphone')
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

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
              if (rms >= .015) speechFrames += 1
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
            recognition.lang = 'zh-CN'
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
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data.size) chunks.push(event.data)
        })
        recorder.addEventListener('stop', async () => {
          window.clearTimeout(stopTimer)
          window.clearInterval(countdownTimer)
          window.cancelAnimationFrame(meterFrame)
          setState('checking')
          stream?.getTracks().forEach((track) => track.stop())
          if (recognitionStarted) {
            try { recognition?.stop() } catch { finishRecognition() }
          }
          const recognizedText = await Promise.race([
            recognitionFinished,
            new Promise<string>((resolve) => window.setTimeout(() => resolve(transcript.trim()), 1200)),
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
    }
  }, [meterAudioContext, onCapture, onReady, retryKey, round])

  const captureStyle = { '--capture-progress': `${((RECORDING_SECONDS - remainingSeconds) / RECORDING_SECONDS) * 100}%` } as CSSProperties
  return <div className={`lg-voice-combat is-${state}`} style={captureStyle}>
    <div className="lg-record-orb">
      <Mic className={`lg-production-icon${state === 'recording' ? ' is-recording' : ''}`} size={34} aria-hidden="true" />
      <i aria-hidden="true" />
    </div>
    <div className="lg-live-wave" role="meter" aria-label="Live microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(inputLevel * 100)}>{Array.from({ length: 19 }, (_, index) => <i key={index} style={{ height: `${8 + inputLevel * (18 + (index % 5) * 5)}px`, opacity: .3 + inputLevel * .7 } as CSSProperties} />)}</div>
    <p className="lg-kicker">Voice attack charging</p>
    <h2>Read this word aloud</h2>
    <div className="lg-prompt-word lg-combat-word" lang="zh-Hans">{round.targetText}</div>
    {state === 'requesting' && <div className="lg-recording-status is-requesting" role="status">
      <span aria-hidden="true" /> Preparing the microphone…
    </div>}
    {state === 'recording' && <div className="lg-recording-status is-recording" role="timer" aria-live="polite">
      <span aria-hidden="true" /> Recording · {remainingSeconds.toFixed(1)} seconds
    </div>}
    {state === 'recording' && <p className="lg-microphone-label">Using {microphoneLabel}</p>}
    {state === 'checking' && <div className="lg-recording-status is-requesting" role="status"><span aria-hidden="true" /> Checking your recording…</div>}
    {(state === 'unavailable' || state === 'silent') && <div className="lg-microphone-error" role="alert">
      <MicOff size={24} aria-hidden="true" />
      <strong>{state === 'silent' ? 'We could not hear your voice.' : 'Microphone setup needs attention.'}</strong>
      <p>{errorMessage}</p>
      <button className="lg-primary" type="button" onClick={() => setRetryKey((current) => current + 1)}>Try microphone again</button>
    </div>}
  </div>
}

function normalizeSpokenText(text: string) {
  return Array.from(text.normalize('NFKC').toLowerCase()).filter((character) => /[\p{L}\p{N}]/u.test(character)).join('')
}

function editDistance(left: readonly string[], right: readonly string[]) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? previous[rightIndex - 1]
        : Math.min(previous[rightIndex - 1], previous[rightIndex], current[rightIndex - 1]) + 1
    }
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index]
  }
  return previous[right.length]
}

type TranscriptEvidence = 'unavailable' | 'exact' | 'close' | 'different'

function transcriptEvidence(target: string, transcript: string): TranscriptEvidence {
  const normalizedTarget = normalizeSpokenText(target)
  const normalizedTranscript = normalizeSpokenText(transcript)
  if (!normalizedTarget || !normalizedTranscript) return 'unavailable'
  if (normalizedTranscript === normalizedTarget) return 'exact'
  const targetCharacters = Array.from(normalizedTarget)
  const transcriptCharacters = Array.from(normalizedTranscript)
  return editDistance(targetCharacters, transcriptCharacters) === 1 ? 'close' : 'different'
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

function ReadAloudReview({ round, recording, playAudio, onAssess }: {
  readonly round: ProductionGameRound
  readonly recording: RecordedReading
  readonly playAudio?: PlayLearningAudio
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
  const acousticStrong = Boolean(acousticScore
    && acousticMatchedTarget
    && acousticScore.separation >= .08
    && acousticScore.bestDistance <= 1.2)
  const outcome = scoring
    ? 'analyzing'
    : acousticScore === null
      ? recognizedEvidence === 'exact' ? 'close' : 'unavailable'
      : recognizedEvidence === 'exact' && acousticMatchedTarget
        ? 'strong'
        : recognizedEvidence === 'unavailable' && acousticStrong
          ? 'strong'
          : recognizedEvidence === 'exact' || acousticMatchedTarget
            ? 'close'
            : 'retry'
  const passed = outcome === 'strong'

  useEffect(() => {
    let disposed = false
    void scoreRecordedWord(recording.blob, round.targetText, READ_ALOUD_MODELS).then((result) => {
      if (!disposed) setAcousticScore(result)
    })
    return () => { disposed = true }
  }, [recording.blob, round.targetText])

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
      await playAudio(round.audioText || round.targetText)
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
      await playAudio(round.audioText || round.targetText)
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
    <p className="lg-kicker">Listen and compare</p>
    <h2>Your voice first, then the model</h2>
    <div className="lg-reading-comparison">
      <section className={phase === 'child' ? 'is-playing' : ''}>
        <span className="lg-comparison-number">1</span>
        <strong>Your recording</strong>
        <div className="lg-recording-wave" aria-label="Waveform from your recording">{waveform.map((level, index) => <i key={index} style={{ height: `${8 + level * 31}px` }} />)}</div>
        <audio ref={childAudioRef} src={recordingUrl || undefined} controls preload="auto">Your browser cannot play this recording.</audio>
        <small>{recording.microphoneLabel}</small>
      </section>
      <span className="lg-comparison-arrow" aria-hidden="true">→</span>
      <section className={phase === 'model' ? 'is-playing' : ''}>
        <span className="lg-comparison-number">2</span>
        <strong>Model word</strong>
        <div className="lg-review-word" lang="zh-Hans">{round.targetText}</div>
        {playAudio && <button className="lg-audio" type="button" disabled={comparisonPlaying} onClick={() => void playModelOnly()}><Volume2 size={18} /> Hear model only</button>}
      </section>
    </div>
    <div className={`lg-comparison-status is-${phase}`} role="status" aria-live="polite">
      <Headphones size={18} aria-hidden="true" />
      {phase === 'child' ? 'Playing your recording…' : phase === 'model' ? 'Now playing the recorded model word…' : phase === 'blocked' ? `${playbackError || 'Automatic playback was blocked.'} Select replay to try again.` : 'Comparison complete. Your speech match is ready.'}
    </div>
    <button className="lg-replay-comparison" type="button" disabled={comparisonPlaying} onClick={() => void playComparison()}><RefreshCw size={17} /> {phase === 'blocked' ? 'Play comparison' : 'Play comparison again'}</button>
    {!comparisonPlaying && phase !== 'blocked' && <div className={`lg-speech-score is-${outcome}`} role="status">
      {scoring ? <>
        <strong>Analyzing your speech…</strong>
        <span>Checking recognition and voice-pattern evidence separately.</span>
      </> : outcome === 'strong' ? <>
        <strong>Strong match</strong>
        <span>{recognizedEvidence === 'exact'
          ? <>Both checks matched <b lang="zh-Hans">{round.targetText}</b>.</>
          : <>The voice comparison strongly matched <b lang="zh-Hans">{round.targetText}</b>.</>}</span>
      </> : outcome === 'close' ? <>
        <strong>Close—try once more</strong>
        <span>{recognizedEvidence === 'exact' && !acousticMatchedTarget
          ? <>The word was recognized, but the voice pattern was closer to <b lang="zh-Hans">{acousticScore?.matchedText || 'another word'}</b>.</>
          : acousticMatchedTarget
            ? <>The voice pattern was closest to <b lang="zh-Hans">{round.targetText}</b>, but the evidence was not strong enough to pass.</>
            : <>The word was recognized, but a second audio check was unavailable.</>}</span>
      </> : outcome === 'retry' ? <>
        <strong>Different word detected</strong>
        <span>{recording.transcript ? <>Browser heard: <b lang="zh-Hans">{recording.transcript}</b>. </> : null}Voice comparison was closest to <b lang="zh-Hans">{acousticScore?.matchedText}</b>; target: <b lang="zh-Hans">{round.targetText}</b>.</span>
      </> : <>
        <strong>Couldn’t score this attempt</strong>
        <span>The recording did not provide enough reliable evidence. Check the microphone and try again.</span>
      </>}
      {!scoring && <button className={passed ? 'lg-primary' : 'lg-incorrect'} type="button" onClick={() => onAssess(passed, `${outcome}:heard-${normalizeSpokenText(recording.transcript) || 'none'}:acoustic-${acousticScore?.matchedText || 'none'}`)}>{passed ? 'Continue' : 'Record again'}</button>}
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
  const [recording, setRecording] = useState<(RecordedReading & { readonly roundId: string }) | null>(null)
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
    setRecording({ roundId: round.id, ...capturedReading })
    onRecording?.(round, capturedReading.blob)
  }, [onRecording])

  const defaultResponse: RenderReadingResponse | undefined = renderCapture ? undefined : (round, controls) => recording?.roundId === round.id
    ? <ReadAloudReview round={round} recording={recording} playAudio={playAudio} onAssess={controls.onAssess} />
    : <div className="lg-read-aloud-review" role="status">Preparing your recording…</div>

  return <ProductionRunner
    {...props}
    rounds={rounds}
    playAudio={playAudio}
    gameId="read-aloud-boss-rush"
    defaultTitle="Read-Aloud Boss Rush"
    defaultEyebrow="Tier 2 · Reading"
    completionMessage="Every reading target is now mastered."
    directResponse={renderResponse || defaultResponse}
    prompt={(round, controls) => briefingComplete ? <>
      <div className="lg-boss-meter" aria-label={`${controls.total - controls.index} boss power segments remaining`}><span style={{ width: `${((controls.total - controls.index) / controls.total) * 100}%` }} /></div>
      {renderCapture
        ? renderCapture(round, { onReady: controls.reveal })
        : <TimedReadAloudCapture key={round.id} round={round} onReady={controls.reveal} onCapture={saveRecording} meterAudioContext={meterAudioContextRef.current} />}
    </> : <ReadAloudBriefing onComplete={beginRecordingSession} />}
  />
}
