import { useEffect, useState, type FormEvent } from 'react'
import { Headphones, PencilLine } from 'lucide-react'
import type { LearningGameBaseProps, PlayLearningAudio, ProductionGameRound } from './runtime/contracts'
import { ProductionRunner } from './runtime/ProductionGameShared'
import { spellingIsCorrect } from './runtime/spelling'

function SpellingPrompt({ round, playAudio, streak, onAssess }: {
  readonly round: ProductionGameRound
  readonly playAudio: PlayLearningAudio
  readonly streak: number
  readonly onAssess: (correct: boolean, response: string) => void
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
    if (response) onAssess(spellingIsCorrect(response, round.targetText), response)
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
    <button className="lg-primary lg-launch-answer" type="submit" disabled={!answer.trim()}><PencilLine size={18} /> Check spelling</button>
  </form>
}

function SpellingCorrection({ round, response }: {
  readonly round: ProductionGameRound
  readonly response: string
}) {
  return <div className="lg-speller-review" role="alert">
    <p className="lg-kicker">Spelling correction</p>
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
    <p>Study the correct spelling. This word will repeat automatically.</p>
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
  return <ProductionRunner
    {...props}
    rounds={rounds}
    playAudio={playAudio}
    gameId="speller-bee"
    defaultTitle="SpellerBee"
    defaultEyebrow="Tier 1 · English Spelling"
    completionMessage={`${rounds.length} English spelling words completed.`}
    incorrectFeedback={(round, response) => <SpellingCorrection round={round} response={response} />}
    incorrectFeedbackDuration={2600}
    prompt={(round, controls) => <SpellingPrompt
      round={round}
      playAudio={controls.playAudio!}
      streak={controls.streak}
      onAssess={controls.assess}
    />}
  />
}
