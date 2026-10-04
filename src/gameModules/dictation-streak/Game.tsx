import { useEffect, useState, type FormEvent } from 'react'
import { Headphones, PencilLine } from 'lucide-react'
import type { LearningGameBaseProps, PlayLearningAudio, ProductionGameRound } from './runtime/contracts'
import { ProductionRunner } from './runtime/ProductionGameShared'

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
