import { useState } from 'react'
import { ArrowRight, BookOpen, Gamepad2, Headphones, Keyboard, RotateCcw, Sparkles } from 'lucide-react'
import {
  ContextGapDash,
  CopyHideWriteCombo,
  CorrectionRescue,
  DictationStreak,
  LEARNING_GAME_CATALOG,
  LilyPadPath,
  MemoryFlip,
  ReadAloudBossRush,
  SentenceScramble,
  SpeedMatch,
  TargetBlast,
  type ContextGameRound,
  type GamePair,
  type LearningGameId,
  type LearningGameSummary,
  type ProductionGameRound,
  type SelectionGameRound,
  type SequenceGameRound,
} from './learningGames/index.ts'

const pairs: readonly GamePair[] = [
  { id: 'pair-1', targetId: 'hello', left: { id: 'left-nihao', label: '你好' }, right: { id: 'right-hello', label: 'hello' } },
  { id: 'pair-2', targetId: 'thanks', left: { id: 'left-xiexie', label: '谢谢' }, right: { id: 'right-thanks', label: 'thank you' } },
  { id: 'pair-3', targetId: 'goodbye', left: { id: 'left-zaijian', label: '再见' }, right: { id: 'right-goodbye', label: 'goodbye' } },
  { id: 'pair-4', targetId: 'friend', left: { id: 'left-pengyou', label: '朋友' }, right: { id: 'right-friend', label: 'friend' } },
]

const selectionRounds: readonly SelectionGameRound[] = [
  {
    id: 'select-1', targetId: 'cat', targetText: '猫', cueText: 'Which word means cat?', audioText: '猫',
    choices: [{ id: 'cat', label: '猫' }, { id: 'dog', label: '狗' }, { id: 'bird', label: '鸟' }], correctChoiceId: 'cat',
  },
  {
    id: 'select-2', targetId: 'water', targetText: '水', cueText: 'Find the word for water', audioText: '水',
    choices: [{ id: 'fire', label: '火' }, { id: 'water', label: '水' }, { id: 'tree', label: '木' }], correctChoiceId: 'water',
  },
  {
    id: 'select-3', targetId: 'big', targetText: '大', cueText: 'Which character means big?', audioText: '大',
    choices: [{ id: 'small', label: '小' }, { id: 'person', label: '人' }, { id: 'big', label: '大' }], correctChoiceId: 'big',
  },
]

const contextRounds: readonly ContextGameRound[] = [
  {
    id: 'context-1', targetId: 'like', targetText: '喜欢', cueText: 'Complete the sentence',
    sentenceBefore: '我', sentenceAfter: '学习中文。',
    choices: [{ id: 'like', label: '喜欢' }, { id: 'eat', label: '吃' }, { id: 'see', label: '看' }], correctChoiceId: 'like',
  },
  {
    id: 'context-2', targetId: 'school', targetText: '学校', cueText: 'Complete the sentence',
    sentenceBefore: '她去', sentenceAfter: '。',
    choices: [{ id: 'book', label: '书' }, { id: 'school', label: '学校' }, { id: 'tea', label: '茶' }], correctChoiceId: 'school',
  },
]

const sequenceRounds: readonly SequenceGameRound[] = [
  {
    id: 'sequence-1', targetId: 'i-like-tea', targetText: '我喜欢喝茶', cueText: 'Build: I like drinking tea',
    tokens: [{ id: 'tea', label: '茶' }, { id: 'i', label: '我' }, { id: 'drink', label: '喝' }, { id: 'like', label: '喜欢' }],
    correctTokenIds: ['i', 'like', 'drink', 'tea'],
  },
  {
    id: 'sequence-2', targetId: 'she-is-my-friend', targetText: '她是我的朋友', cueText: 'Build: She is my friend',
    tokens: [{ id: 'friend', label: '朋友' }, { id: 'she', label: '她' }, { id: 'my', label: '我的' }, { id: 'is', label: '是' }],
    correctTokenIds: ['she', 'is', 'my', 'friend'],
  },
]

const productionRounds: readonly ProductionGameRound[] = [
  { id: 'production-1', targetId: 'hello', targetText: '你好', audioText: '你好' },
  { id: 'production-2', targetId: 'thanks', targetText: '谢谢', audioText: '谢谢' },
  { id: 'production-3', targetId: 'goodbye', targetText: '再见', audioText: '再见' },
]

const gameIcons: Record<LearningGameId, string> = {
  'speed-match': '⚡',
  'target-blast': '☄️',
  'lily-pad-path': '🐸',
  'memory-flip': '✦',
  'context-gap-dash': '◫',
  'sentence-scramble': '🧩',
  'read-aloud-boss-rush': '🎙️',
  'dictation-streak': '🔥',
  'copy-hide-write-combo': '✍️',
  'correction-rescue': '★',
}

function playAudio(text: string) {
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.75
  window.speechSynthesis.speak(utterance)
}

function GamePreview({ gameId, onExit, onComplete }: {
  readonly gameId: LearningGameId
  readonly onExit: () => void
  readonly onComplete: (summary: LearningGameSummary) => void
}) {
  const shared = { onExit, onComplete }

  switch (gameId) {
    case 'speed-match': return <SpeedMatch {...shared} pairs={pairs} />
    case 'target-blast': return <TargetBlast {...shared} rounds={selectionRounds} playAudio={playAudio} />
    case 'lily-pad-path': return <LilyPadPath {...shared} rounds={selectionRounds} playAudio={playAudio} />
    case 'memory-flip': return <MemoryFlip {...shared} pairs={pairs} />
    case 'context-gap-dash': return <ContextGapDash {...shared} rounds={contextRounds} playAudio={playAudio} />
    case 'sentence-scramble': return <SentenceScramble {...shared} rounds={sequenceRounds} />
    case 'read-aloud-boss-rush': return <ReadAloudBossRush {...shared} rounds={productionRounds} playAudio={playAudio} />
    case 'dictation-streak': return <DictationStreak {...shared} rounds={productionRounds} playAudio={playAudio} />
    case 'copy-hide-write-combo': return <CopyHideWriteCombo {...shared} rounds={productionRounds} playAudio={playAudio} />
    case 'correction-rescue': return <CorrectionRescue {...shared} rounds={productionRounds} playAudio={playAudio} />
  }
}

export function App() {
  const [activeGame, setActiveGame] = useState<LearningGameId | null>(null)
  const [lastSummary, setLastSummary] = useState<LearningGameSummary | null>(null)
  const [sessionKey, setSessionKey] = useState(0)

  function openGame(gameId: LearningGameId) {
    setActiveGame(gameId)
    setSessionKey((current) => current + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function finishGame(summary: LearningGameSummary) {
    setLastSummary(summary)
    setActiveGame(null)
  }

  if (activeGame) {
    return <GamePreview key={`${activeGame}-${sessionKey}`} gameId={activeGame} onExit={() => setActiveGame(null)} onComplete={finishGame} />
  }

  return <main className="playground">
    <nav className="playground-nav">
      <a className="brand" href="#top"><span><Gamepad2 size={19} /></span> EduGames</a>
      <div className="nav-note"><span className="status-dot" /> Local playground</div>
    </nav>

    <header id="top" className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><Sparkles size={14} /> Interactive component lab</p>
        <h1>Pick a game.<br /><em>Start playing.</em></h1>
        <p className="hero-description">Ten bite-sized learning games are loaded with sample Mandarin vocabulary. Test the flows, feedback, audio, and completion states.</p>
        <div className="hero-meta">
          <span><Gamepad2 size={16} /> 10 games</span>
          <span><BookOpen size={16} /> Reading</span>
          <span><Keyboard size={16} /> Writing</span>
          <span><Headphones size={16} /> Audio</span>
        </div>
      </div>
      <div className="hero-orbit" aria-hidden="true">
        <span className="orbit-core">玩</span>
        <span className="orbit-item orbit-one">词</span>
        <span className="orbit-item orbit-two">读</span>
        <span className="orbit-item orbit-three">写</span>
      </div>
    </header>

    {lastSummary && <section className="last-result" aria-live="polite">
      <div><span>Last run</span><strong>{LEARNING_GAME_CATALOG.find((game) => game.id === lastSummary.gameId)?.title}</strong></div>
      <p>{lastSummary.correct} correct from {lastSummary.attempted} attempts</p>
      <button type="button" onClick={() => openGame(lastSummary.gameId)}><RotateCcw size={15} /> Play again</button>
    </section>}

    <section className="catalog" aria-labelledby="catalog-title">
      <div className="section-heading">
        <div><p className="eyebrow">Game catalog</p><h2 id="catalog-title">Choose your challenge</h2></div>
        <p>Sample content is for interaction testing only.</p>
      </div>
      <div className="game-grid">
        {LEARNING_GAME_CATALOG.map((game, index) => <article className={`game-card tone-${(index % 5) + 1}`} key={game.id}>
          <div className="card-top">
            <span className="game-icon" aria-hidden="true">{gameIcons[game.id]}</span>
            <span className="game-time">{game.estimatedSeconds[0]}–{game.estimatedSeconds[1]} sec</span>
          </div>
          <div className="card-copy">
            <p>{game.channels.some((channel) => channel === 'tier-1-writing') ? 'Writing' : 'Reading'} · {game.inputKind}</p>
            <h3>{game.title}</h3>
            <p>{game.description}</p>
          </div>
          <button type="button" onClick={() => openGame(game.id)}>Play test <ArrowRight size={17} /></button>
        </article>)}
      </div>
    </section>
  </main>
}
