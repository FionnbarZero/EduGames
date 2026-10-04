import { useEffect, useState, type FormEvent } from 'react'
import { Headphones, PencilLine, Volume2 } from 'lucide-react'
import type { LearningGameBaseProps, PlayLearningAudio, ProductionGameRound } from './runtime/contracts'
import { SelfAssessmentButtons } from './runtime/GameShell'
import { ProductionRunner } from './runtime/ProductionGameShared'

type SubmittedSpelling = {
  readonly roundId: string
  readonly response: string
}

function SpellingPrompt({ round, playAudio, streak, onReveal }: {
  readonly round: ProductionGameRound
  readonly playAudio: PlayLearningAudio
  readonly streak: number
  readonly onReveal: (response: string) => void
}) {
  const [answer, setAnswer] = useState('')
  const [audioError, setAudioError] = useState(false)

  async function speakWord() {
    setAudioError(false)
    try {
      await playAudio(round.audioText || round.targetText, 'en-US')
    } catch {
      setAudioError(true)
    }
  }

  useEffect(() => {
    let active = true
    setAudioError(false)
    Promise.resolve(playAudio(round.audioText || round.targetText, 'en-US')).catch(() => {
      if (active) setAudioError(true)
    })
    return () => { active = false }
  }, [playAudio, round.audioText, round.id, round.targetText])

  function submit(event: FormEvent) {
    event.preventDefault()
    const response = answer.trim()
    if (response) onReveal(response)
  }

  return <form className="lg-dictation-console lg-speller-console" onSubmit={submit}>
    <div className="lg-sonic-display" aria-hidden="true">
      <i /><i /><i /><i /><i /><i /><i /><i /><i />
      <span>{streak ? `${streak}×` : 'ABC'}</span>
    </div>
    <p className="lg-kicker">Spelling challenge</p>
    <h2>Hear it. Type it. Check your spelling.</h2>
    <button className="lg-audio" type="button" onClick={() => void speakWord()}><Headphones size={20} /> Replay word</button>
    {audioError && <p className="lg-speller-audio-error" role="alert">The word could not play. Press Replay word to try again.</p>}
    <label className="lg-answer-terminal">
      <span>Your spelling</span>
      <input value={answer} onChange={(event) => setAnswer(event.target.value)} autoFocus autoCapitalize="none" autoComplete="off" spellCheck={false} lang="en" placeholder="Type the word you heard" />
      <i aria-hidden="true" />
    </label>
    <button className="lg-primary lg-launch-answer" type="submit" disabled={!answer.trim()}><PencilLine size={18} /> Reveal spelling</button>
  </form>
}

function SpellingReview({ round, response, playAudio, onAssess }: {
  readonly round: ProductionGameRound
  readonly response: string
  readonly playAudio: PlayLearningAudio
  readonly onAssess: (correct: boolean, response?: string) => void
}) {
  return <div className="lg-speller-review">
    <p className="lg-kicker">Check your spelling</p>
    <div className="lg-spelling-comparison">
      <section>
        <span>You typed</span>
        <strong lang="en">{response}</strong>
      </section>
      <span aria-hidden="true">→</span>
      <section className="is-target">
        <span>Correct spelling</span>
        <strong lang="en">{round.targetText}</strong>
      </section>
    </div>
    <button className="lg-audio" type="button" onClick={() => { void Promise.resolve(playAudio(round.audioText || round.targetText, 'en-US')).catch(() => undefined) }}><Volume2 size={20} /> Hear the word again</button>
    <p>Does your spelling match the correct word?</p>
    <SelfAssessmentButtons
      incorrectLabel="Try this word again"
      correctLabel="I spelled it right"
      onAnswer={(correct) => onAssess(correct, response)}
    />
  </div>
}

export function SpellerBee({
  rounds,
  playAudio,
  ...props
}: LearningGameBaseProps & {
  readonly rounds: readonly ProductionGameRound[]
  readonly playAudio: PlayLearningAudio
}) {
  const [submitted, setSubmitted] = useState<SubmittedSpelling | null>(null)

  return <ProductionRunner
    {...props}
    rounds={rounds}
    playAudio={playAudio}
    gameId="speller-bee"
    assessmentMode="self-assessment"
    defaultTitle="SpellerBee"
    defaultEyebrow="Tier 1 · English Spelling"
    completionMessage="Ten English spelling words are now mastered."
    prompt={(round, controls) => <SpellingPrompt
      round={round}
      playAudio={controls.playAudio!}
      streak={controls.streak}
      onReveal={(response) => {
        setSubmitted({ roundId: round.id, response })
        controls.reveal()
      }}
    />}
    directResponse={(round, controls) => <SpellingReview
      round={round}
      response={submitted?.roundId === round.id ? submitted.response : ''}
      playAudio={playAudio}
      onAssess={(correct, response) => {
        setSubmitted(null)
        controls.onAssess(correct, response)
      }}
    />}
  />
}
