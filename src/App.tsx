import { useState } from 'react'
import { ArrowRight, BookOpen, Gamepad2, Headphones, Keyboard, RotateCcw, Sparkles } from 'lucide-react'
import {
  ContextGapDash,
  CopyHideWriteCombo,
  CorrectionRescue,
  DictationStreak,
  GameArtwork,
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
  { id: 'pair-5', targetId: 'water', left: { id: 'left-shui', label: '水' }, right: { id: 'right-water', label: 'water' } },
  { id: 'pair-6', targetId: 'cat', left: { id: 'left-mao', label: '猫' }, right: { id: 'right-cat', label: 'cat' } },
  { id: 'pair-7', targetId: 'tea', left: { id: 'left-cha', label: '茶' }, right: { id: 'right-tea', label: 'tea' } },
  { id: 'pair-8', targetId: 'book', left: { id: 'left-shu', label: '书' }, right: { id: 'right-book', label: 'book' } },
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
  {
    id: 'select-4', targetId: 'sun', targetText: '日', cueText: 'Find the character for sun', audioText: '日',
    choices: [{ id: 'moon', label: '月' }, { id: 'sun', label: '日' }, { id: 'mountain', label: '山' }], correctChoiceId: 'sun',
  },
  {
    id: 'select-5', targetId: 'mouth', targetText: '口', cueText: 'Which character means mouth?', audioText: '口',
    choices: [{ id: 'eye', label: '目' }, { id: 'hand', label: '手' }, { id: 'mouth', label: '口' }], correctChoiceId: 'mouth',
  },
  {
    id: 'select-6', targetId: 'mountain', targetText: '山', cueText: 'Find the word for mountain', audioText: '山',
    choices: [{ id: 'mountain', label: '山' }, { id: 'river', label: '河' }, { id: 'field', label: '田' }], correctChoiceId: 'mountain',
  },
  {
    id: 'select-7', targetId: 'moon', targetText: '月', cueText: 'Which character means moon?', audioText: '月',
    choices: [{ id: 'rain', label: '雨' }, { id: 'moon', label: '月' }, { id: 'cloud', label: '云' }], correctChoiceId: 'moon',
  },
  {
    id: 'select-8', targetId: 'one', targetText: '一', cueText: 'Find the number one', audioText: '一',
    choices: [{ id: 'three', label: '三' }, { id: 'two', label: '二' }, { id: 'one', label: '一' }], correctChoiceId: 'one',
  },
  {
    id: 'select-9', targetId: 'person', targetText: '人', cueText: 'Which character means person?', audioText: '人',
    choices: [{ id: 'person', label: '人' }, { id: 'woman', label: '女' }, { id: 'child', label: '子' }], correctChoiceId: 'person',
  },
  {
    id: 'select-10', targetId: 'good', targetText: '好', cueText: 'Find the character for good', audioText: '好',
    choices: [{ id: 'come', label: '来' }, { id: 'go', label: '去' }, { id: 'good', label: '好' }], correctChoiceId: 'good',
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
  {
    id: 'context-3', targetId: 'tea', targetText: '茶', cueText: 'Complete the sentence',
    sentenceBefore: '爸爸喝', sentenceAfter: '。',
    choices: [{ id: 'tea', label: '茶' }, { id: 'book', label: '书' }, { id: 'school', label: '学校' }], correctChoiceId: 'tea',
  },
  {
    id: 'context-4', targetId: 'book', targetText: '书', cueText: 'Complete the sentence',
    sentenceBefore: '我看', sentenceAfter: '。',
    choices: [{ id: 'water', label: '水' }, { id: 'cat', label: '猫' }, { id: 'book', label: '书' }], correctChoiceId: 'book',
  },
  {
    id: 'context-5', targetId: 'friend', targetText: '朋友', cueText: 'Complete the sentence',
    sentenceBefore: '他是我的', sentenceAfter: '。',
    choices: [{ id: 'teacher', label: '老师' }, { id: 'friend', label: '朋友' }, { id: 'student', label: '学生' }], correctChoiceId: 'friend',
  },
  {
    id: 'context-6', targetId: 'apple', targetText: '苹果', cueText: 'Complete the sentence',
    sentenceBefore: '妈妈买', sentenceAfter: '。',
    choices: [{ id: 'apple', label: '苹果' }, { id: 'rain', label: '雨' }, { id: 'car', label: '车' }], correctChoiceId: 'apple',
  },
  {
    id: 'context-7', targetId: 'home', targetText: '家', cueText: 'Complete the sentence',
    sentenceBefore: '我们回', sentenceAfter: '。',
    choices: [{ id: 'store', label: '商店' }, { id: 'park', label: '公园' }, { id: 'home', label: '家' }], correctChoiceId: 'home',
  },
  {
    id: 'context-8', targetId: 'teacher', targetText: '老师', cueText: 'Complete the sentence',
    sentenceBefore: '她是中文', sentenceAfter: '。',
    choices: [{ id: 'friend', label: '朋友' }, { id: 'teacher', label: '老师' }, { id: 'doctor', label: '医生' }], correctChoiceId: 'teacher',
  },
  {
    id: 'context-9', targetId: 'today', targetText: '今天', cueText: 'Complete the sentence',
    sentenceBefore: '', sentenceAfter: '天气很好。',
    choices: [{ id: 'today', label: '今天' }, { id: 'yesterday', label: '昨天' }, { id: 'tomorrow', label: '明天' }], correctChoiceId: 'today',
  },
  {
    id: 'context-10', targetId: 'chinese', targetText: '中文', cueText: 'Complete the sentence',
    sentenceBefore: '我会说', sentenceAfter: '。',
    choices: [{ id: 'english', label: '英文' }, { id: 'chinese', label: '中文' }, { id: 'name', label: '名字' }], correctChoiceId: 'chinese',
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

function playAudio(text: string, language = 'zh-CN') {
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language
  utterance.rate = 0.75
  window.speechSynthesis.speak(utterance)
}

function channelLabel(channels: readonly ('tier-1-writing' | 'tier-2-reading')[]) {
  const labels = []
  if (channels.includes('tier-2-reading')) labels.push('Reading')
  if (channels.includes('tier-1-writing')) labels.push('Writing')
  return labels.join(' + ')
}

function GamePreview({ gameId, onExit, onComplete }: {
  readonly gameId: LearningGameId
  readonly onExit: () => void
  readonly onComplete: (summary: LearningGameSummary) => void
}) {
  const shared = { onExit, onComplete }

  switch (gameId) {
    case 'speed-match': return <SpeedMatch {...shared} pairs={pairs} playAudio={playAudio} />
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
        <p className="eyebrow"><Sparkles size={14} /> Mandarin practice arcade</p>
        <h1>Pick a game.<br /><em>Start playing.</em></h1>
        <p className="hero-description">Practice Mandarin through matching, reading, listening, speaking, and writing. Every game gives you instant feedback as you play.</p>
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
        <div><p className="eyebrow">10 ways to practice</p><h2 id="catalog-title">Choose your challenge</h2></div>
        <p>Pick any game. Each one shows you what to do.</p>
      </div>
      <div className="game-grid">
        {LEARNING_GAME_CATALOG.map((game, index) => <article className={`game-card tone-${(index % 5) + 1}`} key={game.id}>
          <div className="card-top">
            <GameArtwork gameId={game.id} compact />
            <span className="game-time">{game.estimatedSeconds[0]}–{game.estimatedSeconds[1]} sec</span>
          </div>
          <div className="card-copy">
            <p>{channelLabel(game.channels)} · {game.activityLabel}</p>
            <h3>{game.title}</h3>
            <p>{game.description}</p>
          </div>
          <button type="button" onClick={() => openGame(game.id)}>Play game <ArrowRight size={17} /></button>
        </article>)}
      </div>
    </section>
  </main>
}
