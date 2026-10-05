import { lazy, Suspense, useEffect, useState } from 'react'
import { ArrowRight, BookOpen, Gamepad2, Headphones, Keyboard, RotateCcw, Sparkles } from 'lucide-react'
import { GameArtwork } from './gameCatalog/GameArtwork'
import { LEARNING_GAME_CATALOG } from './gameCatalog/catalog'
import { ProblemReporter } from './ProblemReporter'
import type {
  ContextGameRound,
  GamePair,
  LearningGameAttempt,
  LearningGameId,
  LearningGameSummary,
  ProductionGameRound,
  SelectionGameRound,
  SequenceGameRound,
  StrokeOrderGameRound,
} from './gameCatalog/contracts'
import {
  createLearningSession,
  PROGRESS_STORAGE_KEY,
  readLearningProgress,
  updateLearningSession,
  type LearningProgress,
} from './gameCatalog/progress'
import { defineCurriculumPack } from './gameCatalog/curriculum'

const SpeedMatch = lazy(() => import('./gameModules/speed-match').then((module) => ({ default: module.SpeedMatch })))
const TargetBlast = lazy(() => import('./gameModules/target-blast').then((module) => ({ default: module.TargetBlast })))
const LilyPadPath = lazy(() => import('./gameModules/lily-pad-path').then((module) => ({ default: module.LilyPadPath })))
const MemoryFlip = lazy(() => import('./gameModules/memory-lanterns').then((module) => ({ default: module.MemoryFlip })))
const ContextGapDash = lazy(() => import('./gameModules/context-gap-dash').then((module) => ({ default: module.ContextGapDash })))
const SentenceScramble = lazy(() => import('./gameModules/sushi-scramble').then((module) => ({ default: module.SentenceScramble })))
const ReadAloudBossRush = lazy(() => import('./gameModules/whispering-scrolls').then((module) => ({ default: module.ReadAloudBossRush })))
const RainbowReading = lazy(() => import('./gameModules/rainbow-reading').then((module) => ({ default: module.RainbowReading })))
const DictationStreak = lazy(() => import('./gameModules/dictation-streak').then((module) => ({ default: module.DictationStreak })))
const SpellerBee = lazy(() => import('./gameModules/speller-bee').then((module) => ({ default: module.SpellerBee })))
const StrokeOrderSlay = lazy(() => import('./gameModules/stroke-order-slay').then((module) => ({ default: module.StrokeOrderSlay })))

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
    id: 'context-1', targetId: 'water', targetText: '水',
    cueText: '跑步后，美美打开水瓶喝____。', audioText: '跑步后，美美打开水瓶喝____。',
    sentenceBefore: '跑步后，美美打开水瓶喝', sentenceAfter: '。',
    choices: [{ id: 'milk', label: '牛奶' }, { id: 'water', label: '水' }, { id: 'tea', label: '茶' }], correctChoiceId: 'water',
  },
  {
    id: 'context-2', targetId: 'school', targetText: '学校',
    cueText: '丽丽背着书包去____上课。', audioText: '丽丽背着书包去____上课。',
    sentenceBefore: '丽丽背着书包去', sentenceAfter: '上课。',
    choices: [{ id: 'park', label: '公园' }, { id: 'store', label: '商店' }, { id: 'school', label: '学校' }], correctChoiceId: 'school',
  },
  {
    id: 'context-3', targetId: 'apple', targetText: '苹果',
    cueText: '爸爸给小明一个红色的____。', audioText: '爸爸给小明一个红色的____。',
    sentenceBefore: '爸爸给小明一个红色的', sentenceAfter: '。',
    choices: [{ id: 'apple', label: '苹果' }, { id: 'orange', label: '橙子' }, { id: 'banana', label: '香蕉' }], correctChoiceId: 'apple',
  },
  {
    id: 'context-4', targetId: 'book', targetText: '书',
    cueText: '睡觉前，我打开____读故事。', audioText: '睡觉前，我打开____读故事。',
    sentenceBefore: '睡觉前，我打开', sentenceAfter: '读故事。',
    choices: [{ id: 'menu', label: '菜单' }, { id: 'book', label: '书' }, { id: 'map', label: '地图' }], correctChoiceId: 'book',
  },
  {
    id: 'context-5', targetId: 'friend', targetText: '朋友',
    cueText: '乐乐每天跟我玩。他是我的好____。', audioText: '乐乐每天跟我玩。他是我的好____。',
    sentenceBefore: '乐乐每天跟我玩。他是我的好', sentenceAfter: '。',
    choices: [{ id: 'doctor', label: '医生' }, { id: 'teacher', label: '老师' }, { id: 'friend', label: '朋友' }], correctChoiceId: 'friend',
  },
  {
    id: 'context-6', targetId: 'teacher', targetText: '老师',
    cueText: '王女士教我们中文。她是____。', audioText: '王女士教我们中文。她是____。',
    sentenceBefore: '王女士教我们中文。她是', sentenceAfter: '。',
    choices: [{ id: 'teacher', label: '老师' }, { id: 'student', label: '学生' }, { id: 'friend', label: '朋友' }], correctChoiceId: 'teacher',
  },
  {
    id: 'context-7', targetId: 'home', targetText: '家',
    cueText: '放学了，我们回____吃晚饭。', audioText: '放学了，我们回____吃晚饭。',
    sentenceBefore: '放学了，我们回', sentenceAfter: '吃晚饭。',
    choices: [{ id: 'park', label: '公园' }, { id: 'home', label: '家' }, { id: 'store', label: '商店' }], correctChoiceId: 'home',
  },
  {
    id: 'context-8', targetId: 'today', targetText: '今天',
    cueText: '现在太阳出来了，____天气很好。', audioText: '现在太阳出来了，____天气很好。',
    sentenceBefore: '现在太阳出来了，', sentenceAfter: '天气很好。',
    choices: [{ id: 'yesterday', label: '昨天' }, { id: 'tomorrow', label: '明天' }, { id: 'today', label: '今天' }], correctChoiceId: 'today',
  },
  {
    id: 'context-9', targetId: 'chinese', targetText: '中文',
    cueText: '美美在北京长大，她跟奶奶说____。', audioText: '美美在北京长大，她跟奶奶说____。',
    sentenceBefore: '美美在北京长大，她跟奶奶说', sentenceAfter: '。',
    choices: [{ id: 'chinese', label: '中文' }, { id: 'english', label: '英文' }, { id: 'french', label: '法文' }], correctChoiceId: 'chinese',
  },
  {
    id: 'context-10', targetId: 'tea', targetText: '茶',
    cueText: '爷爷把____倒进茶杯。', audioText: '爷爷把____倒进茶杯。',
    sentenceBefore: '爷爷把', sentenceAfter: '倒进茶杯。',
    choices: [{ id: 'water', label: '水' }, { id: 'tea', label: '茶' }, { id: 'milk', label: '牛奶' }], correctChoiceId: 'tea',
  },
]

const sequenceRounds: readonly SequenceGameRound[] = [
  {
    id: 'sequence-1', targetId: 'i-like-tea', targetText: '我喜欢喝茶', cueText: 'I like drinking tea', audioText: '我喜欢喝茶。',
    tokens: [{ id: 'tea', label: '茶' }, { id: 'i', label: '我' }, { id: 'drink', label: '喝' }, { id: 'like', label: '喜欢' }],
    correctTokenIds: ['i', 'like', 'drink', 'tea'],
  },
  {
    id: 'sequence-2', targetId: 'she-is-my-friend', targetText: '她是我的朋友', cueText: 'She is my friend', audioText: '她是我的朋友。',
    tokens: [{ id: 'friend', label: '朋友' }, { id: 'she', label: '她' }, { id: 'my', label: '我的' }, { id: 'is', label: '是' }],
    correctTokenIds: ['she', 'is', 'my', 'friend'],
  },
]

const productionRounds: readonly ProductionGameRound[] = [
  {
    id: 'production-1', targetId: 'hello', targetText: '你好', pinyinText: 'nǐ hǎo', audioText: '你好',
    pinyinSteps: [
      { pinyin: 'nǐ', candidates: ['你', '拟', '尼'] },
      { pinyin: 'hǎo', candidates: ['好', '号', '浩'] },
    ],
  },
  {
    id: 'production-2', targetId: 'thanks', targetText: '谢谢', pinyinText: 'xiè xie', audioText: '谢谢',
    pinyinSteps: [
      { pinyin: 'xiè', candidates: ['谢', '写', '些'] },
      { pinyin: 'xie', candidates: ['谢', '写', '歇'] },
    ],
  },
  {
    id: 'production-3', targetId: 'goodbye', targetText: '再见', pinyinText: 'zài jiàn', audioText: '再见',
    pinyinSteps: [
      { pinyin: 'zài', candidates: ['再', '在', '载'] },
      { pinyin: 'jiàn', candidates: ['见', '建', '件'] },
    ],
  },
]

const spellingRounds: readonly ProductionGameRound[] = [
  { id: 'spelling-red-air', targetId: 'air', targetText: 'air', audioText: 'air' },
  { id: 'spelling-red-means', targetId: 'means', targetText: 'means', audioText: 'means' },
  { id: 'spelling-red-years', targetId: 'years', targetText: 'years', audioText: 'years' },
  { id: 'spelling-red-here', targetId: 'here', targetText: 'here', audioText: 'here' },
]

const rainbowReadingRounds: readonly ProductionGameRound[] = [
  { id: 'rainbow-air', targetId: 'air', targetText: 'air', audioText: 'air' },
  { id: 'rainbow-means', targetId: 'means', targetText: 'means', audioText: 'means' },
  { id: 'rainbow-years', targetId: 'years', targetText: 'years', audioText: 'years' },
  { id: 'rainbow-here', targetId: 'here', targetText: 'here', audioText: 'here' },
  { id: 'rainbow-eager', targetId: 'eager', targetText: 'eager', audioText: 'eager' },
  { id: 'rainbow-change', targetId: 'change', targetText: 'change', audioText: 'change' },
]

const strokeOrderRounds: readonly StrokeOrderGameRound[] = [
  {
    id: 'stroke-one', targetId: 'one', targetText: '一', meaning: 'one', audioText: '一',
    strokes: [
      [[18, 52], [32, 51], [48, 49], [66, 47], [82, 49]],
    ],
  },
  {
    id: 'stroke-two', targetId: 'two', targetText: '二', meaning: 'two', audioText: '二',
    strokes: [
      [[27, 35], [43, 34], [58, 32], [73, 33]],
      [[17, 68], [35, 67], [55, 64], [72, 63], [84, 66]],
    ],
  },
  {
    id: 'stroke-three', targetId: 'three', targetText: '三', meaning: 'three', audioText: '三',
    strokes: [
      [[30, 25], [45, 24], [58, 22], [70, 24]],
      [[28, 49], [43, 49], [58, 47], [70, 49]],
      [[17, 73], [34, 73], [53, 70], [70, 69], [83, 73]],
    ],
  },
  {
    id: 'stroke-person', targetId: 'person', targetText: '人', meaning: 'person', audioText: '人',
    strokes: [
      [[53, 20], [52, 34], [47, 49], [38, 65], [27, 78], [18, 84]],
      [[50, 43], [57, 54], [65, 65], [74, 75], [83, 81]],
    ],
  },
]

const starterCurriculum = defineCurriculumPack({
  id: 'mandarin-english-starter',
  version: 1,
  title: 'Mandarin + English Starter',
  language: 'zh-CN',
  learnerLevel: 'beginner',
  targetLevel: 'developing',
  pairs,
  selectionRounds,
  contextRounds,
  sequenceRounds,
  productionRounds,
  spellingRounds,
  strokeOrderRounds,
})

let speechRequestId = 0
let speechStartTimer: number | undefined
let settleActiveSpeech: (() => void) | undefined
let activeRecordedAudio: HTMLAudioElement | undefined
let settleActiveRecording: (() => void) | undefined

const recordedLearningAudio: Readonly<Record<string, string>> = {
  'hello': `${import.meta.env.BASE_URL}audio/speed-match/hello.wav?v=1`,
  'thank you': `${import.meta.env.BASE_URL}audio/speed-match/thank-you.wav?v=1`,
  'goodbye': `${import.meta.env.BASE_URL}audio/speed-match/goodbye.wav?v=1`,
  'friend': `${import.meta.env.BASE_URL}audio/speller-bee/friend.wav?v=1`,
  'water': `${import.meta.env.BASE_URL}audio/speller-bee/water.wav?v=1`,
  'cat': `${import.meta.env.BASE_URL}audio/speller-bee/cat.wav?v=1`,
  'tea': `${import.meta.env.BASE_URL}audio/speed-match/tea.wav?v=1`,
  'book': `${import.meta.env.BASE_URL}audio/speed-match/book.wav?v=1`,
  'school': `${import.meta.env.BASE_URL}audio/speller-bee/school.wav?v=1`,
  'apple': `${import.meta.env.BASE_URL}audio/speller-bee/apple.wav?v=1`,
  'teacher': `${import.meta.env.BASE_URL}audio/speller-bee/teacher.wav?v=1`,
  'family': `${import.meta.env.BASE_URL}audio/speller-bee/family.wav?v=1`,
  'morning': `${import.meta.env.BASE_URL}audio/speller-bee/morning.wav?v=1`,
  'yellow': `${import.meta.env.BASE_URL}audio/speller-bee/yellow.wav?v=1`,
  'beautiful': `${import.meta.env.BASE_URL}audio/speller-bee/beautiful.wav?v=1`,
  'air': `${import.meta.env.BASE_URL}audio/speller-bee/air.wav?v=1`,
  'means': `${import.meta.env.BASE_URL}audio/speller-bee/means.wav?v=1`,
  'years': `${import.meta.env.BASE_URL}audio/speller-bee/years.wav?v=1`,
  'here': `${import.meta.env.BASE_URL}audio/speller-bee/here.wav?v=1`,
  'eager': new URL('./gameModules/rainbow-reading/assets/eager.wav', import.meta.url).href,
  'change': new URL('./gameModules/rainbow-reading/assets/change.wav', import.meta.url).href,
  '你好': `${import.meta.env.BASE_URL}audio/read-aloud/hello.wav?v=1`,
  '谢谢': `${import.meta.env.BASE_URL}audio/read-aloud/thanks.wav?v=1`,
  '再见': `${import.meta.env.BASE_URL}audio/read-aloud/goodbye.wav?v=1`,
  '猫': `${import.meta.env.BASE_URL}audio/mandarin/cat.wav?v=2`,
  '水': `${import.meta.env.BASE_URL}audio/mandarin/water.wav?v=2`,
  '大': `${import.meta.env.BASE_URL}audio/mandarin/big.wav?v=2`,
  '日': `${import.meta.env.BASE_URL}audio/mandarin/sun.wav?v=2`,
  '口': `${import.meta.env.BASE_URL}audio/mandarin/mouth.wav?v=2`,
  '山': `${import.meta.env.BASE_URL}audio/mandarin/mountain.wav?v=2`,
  '月': `${import.meta.env.BASE_URL}audio/mandarin/moon.wav?v=2`,
  '一': `${import.meta.env.BASE_URL}audio/mandarin/one.wav?v=2`,
  '二': `${import.meta.env.BASE_URL}audio/mandarin/two.wav?v=2`,
  '三': `${import.meta.env.BASE_URL}audio/mandarin/three.wav?v=2`,
  '人': `${import.meta.env.BASE_URL}audio/mandarin/person.wav?v=2`,
  '好': `${import.meta.env.BASE_URL}audio/mandarin/good.wav?v=2`,
  '不好！': `${import.meta.env.BASE_URL}audio/mandarin/bu-hao.wav?v=2`,
  '牛奶': `${import.meta.env.BASE_URL}audio/context-gap/words/milk.wav?v=1`,
  '茶': `${import.meta.env.BASE_URL}audio/context-gap/words/tea.wav?v=1`,
  '公园': `${import.meta.env.BASE_URL}audio/context-gap/words/park.wav?v=1`,
  '商店': `${import.meta.env.BASE_URL}audio/context-gap/words/store.wav?v=1`,
  '学校': `${import.meta.env.BASE_URL}audio/context-gap/words/school.wav?v=1`,
  '苹果': `${import.meta.env.BASE_URL}audio/context-gap/words/apple.wav?v=1`,
  '橙子': `${import.meta.env.BASE_URL}audio/context-gap/words/orange.wav?v=1`,
  '香蕉': `${import.meta.env.BASE_URL}audio/context-gap/words/banana.wav?v=1`,
  '菜单': `${import.meta.env.BASE_URL}audio/context-gap/words/menu.wav?v=1`,
  '书': `${import.meta.env.BASE_URL}audio/context-gap/words/book.wav?v=1`,
  '地图': `${import.meta.env.BASE_URL}audio/context-gap/words/map.wav?v=1`,
  '医生': `${import.meta.env.BASE_URL}audio/context-gap/words/doctor.wav?v=1`,
  '老师': `${import.meta.env.BASE_URL}audio/context-gap/words/teacher.wav?v=1`,
  '朋友': `${import.meta.env.BASE_URL}audio/context-gap/words/friend.wav?v=1`,
  '学生': `${import.meta.env.BASE_URL}audio/context-gap/words/student.wav?v=1`,
  '家': `${import.meta.env.BASE_URL}audio/context-gap/words/home.wav?v=1`,
  '昨天': `${import.meta.env.BASE_URL}audio/context-gap/words/yesterday.wav?v=1`,
  '明天': `${import.meta.env.BASE_URL}audio/context-gap/words/tomorrow.wav?v=1`,
  '今天': `${import.meta.env.BASE_URL}audio/context-gap/words/today.wav?v=1`,
  '中文': `${import.meta.env.BASE_URL}audio/context-gap/words/chinese.wav?v=1`,
  '英文': `${import.meta.env.BASE_URL}audio/context-gap/words/english.wav?v=1`,
  '法文': `${import.meta.env.BASE_URL}audio/context-gap/words/french.wav?v=1`,
  '跑步后，美美打开水瓶喝____。': `${import.meta.env.BASE_URL}audio/context-gap/clues/water.wav?v=2`,
  '丽丽背着书包去____上课。': `${import.meta.env.BASE_URL}audio/context-gap/clues/school.wav?v=2`,
  '爸爸给小明一个红色的____。': `${import.meta.env.BASE_URL}audio/context-gap/clues/apple.wav?v=2`,
  '睡觉前，我打开____读故事。': `${import.meta.env.BASE_URL}audio/context-gap/clues/book.wav?v=2`,
  '乐乐每天跟我玩。他是我的好____。': `${import.meta.env.BASE_URL}audio/context-gap/clues/friend.wav?v=2`,
  '王女士教我们中文。她是____。': `${import.meta.env.BASE_URL}audio/context-gap/clues/teacher.wav?v=2`,
  '放学了，我们回____吃晚饭。': `${import.meta.env.BASE_URL}audio/context-gap/clues/home.wav?v=2`,
  '现在太阳出来了，____天气很好。': `${import.meta.env.BASE_URL}audio/context-gap/clues/today.wav?v=2`,
  '美美在北京长大，她跟奶奶说____。': `${import.meta.env.BASE_URL}audio/context-gap/clues/chinese.wav?v=2`,
  '爷爷把____倒进茶杯。': `${import.meta.env.BASE_URL}audio/context-gap/clues/tea.wav?v=2`,
  '我喜欢喝茶。': `${import.meta.env.BASE_URL}audio/sentence-scramble/i-like-tea.wav?v=1`,
  '她是我的朋友。': `${import.meta.env.BASE_URL}audio/sentence-scramble/she-is-my-friend.wav?v=1`,
}

function stopLearningAudio() {
  speechRequestId += 1
  if (speechStartTimer !== undefined) {
    window.clearTimeout(speechStartTimer)
    speechStartTimer = undefined
  }
  settleActiveSpeech?.()
  settleActiveSpeech = undefined
  window.speechSynthesis?.cancel()

  const recording = activeRecordedAudio
  activeRecordedAudio = undefined
  settleActiveRecording?.()
  settleActiveRecording = undefined
  recording?.pause()
}

function playAudio(text: string, language = 'zh-CN', playbackRate = 1): Promise<void> {
  stopLearningAudio()

  const recordingUrl = recordedLearningAudio[text]
  if (recordingUrl) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(recordingUrl)
      let settled = false
      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        audio.onended = null
        audio.onerror = null
        if (activeRecordedAudio === audio) activeRecordedAudio = undefined
        if (settleActiveRecording === cancelThisRecording) settleActiveRecording = undefined
        if (error) reject(error)
        else resolve()
      }
      const cancelThisRecording = () => finish()
      activeRecordedAudio = audio
      settleActiveRecording = cancelThisRecording
      audio.preload = 'auto'
      audio.volume = 1
      audio.playbackRate = playbackRate
      audio.onended = () => finish()
      audio.onerror = () => finish(new Error('Recorded audio could not be loaded.'))
      void audio.play().catch((error: unknown) => finish(error instanceof Error ? error : new Error('Recorded audio could not be played.')))
    })
  }

  const synth = window.speechSynthesis
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    return Promise.reject(new Error('Speech playback is not supported in this browser.'))
  }

  const requestId = ++speechRequestId

  return new Promise((resolve, reject) => {
    let watchdog: number | undefined
    let settled = false

    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      if (watchdog !== undefined) window.clearTimeout(watchdog)
      if (settleActiveSpeech === cancelThisSpeech) settleActiveSpeech = undefined
      if (error) reject(error)
      else resolve()
    }
    const cancelThisSpeech = () => finish()
    settleActiveSpeech = cancelThisSpeech

    // Chrome can leave an utterance silently stuck when cancel() and speak()
    // happen in the same task. Let the engine reset before starting the word.
    speechStartTimer = window.setTimeout(() => {
      speechStartTimer = undefined
      if (requestId !== speechRequestId) {
        finish()
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      const normalizedLanguage = language.toLowerCase()
      const languageRoot = normalizedLanguage.split('-')[0]
      const matchingVoices = synth.getVoices().filter((voice) => {
        const voiceLanguage = voice.lang.toLowerCase()
        return voiceLanguage === normalizedLanguage || voiceLanguage.startsWith(`${languageRoot}-`)
      })
      utterance.voice = matchingVoices.find((voice) => /ting|eddy|flo|sandy|shelley/i.test(voice.name)) || matchingVoices[0] || null
      utterance.lang = language
      utterance.rate = 0.75 * playbackRate
      utterance.volume = 1
      utterance.onend = () => finish()
      utterance.onerror = (event) => {
        if (event.error === 'canceled' || event.error === 'interrupted') finish()
        else finish(new Error(`Speech playback failed: ${event.error}`))
      }

      synth.resume()
      synth.speak(utterance)
      watchdog = window.setTimeout(() => {
        synth.cancel()
        finish(new Error('Speech playback did not start.'))
      }, Math.max(4000, text.length * 900))
    }, 100)
  })
}

function channelLabel(channels: readonly ('tier-1-writing' | 'tier-2-reading')[]) {
  const labels = []
  if (channels.includes('tier-2-reading')) labels.push('Reading')
  if (channels.includes('tier-1-writing')) labels.push('Writing')
  return labels.join(' + ')
}

function GamePreview({ gameId, onExit, onAttempt, onComplete }: {
  readonly gameId: LearningGameId
  readonly onExit: () => void
  readonly onAttempt: (attempt: LearningGameAttempt) => void
  readonly onComplete: (summary: LearningGameSummary) => void
}) {
  const shared = { onExit, onAttempt, onComplete }

  switch (gameId) {
    case 'speed-match': return <SpeedMatch {...shared} pairs={starterCurriculum.pairs} playAudio={playAudio} />
    case 'target-blast': return <TargetBlast {...shared} rounds={starterCurriculum.selectionRounds} playAudio={playAudio} />
    case 'lily-pad-path': return <LilyPadPath {...shared} rounds={starterCurriculum.selectionRounds} playAudio={playAudio} />
    case 'memory-flip': return <MemoryFlip {...shared} pairs={starterCurriculum.pairs} playAudio={playAudio} />
    case 'context-gap-dash': return <ContextGapDash {...shared} rounds={starterCurriculum.contextRounds} playAudio={playAudio} />
    case 'sentence-scramble': return <SentenceScramble {...shared} rounds={starterCurriculum.sequenceRounds} playAudio={playAudio} />
    case 'read-aloud-boss-rush': return <ReadAloudBossRush {...shared} rounds={starterCurriculum.productionRounds} playAudio={playAudio} />
    case 'rainbow-reading': return <RainbowReading {...shared} rounds={rainbowReadingRounds} playAudio={playAudio} />
    case 'dictation-streak': return <DictationStreak {...shared} rounds={starterCurriculum.productionRounds} playAudio={playAudio} />
    case 'speller-bee': return <SpellerBee {...shared} rounds={starterCurriculum.spellingRounds} playAudio={playAudio} />
    case 'copy-hide-write-combo': return <StrokeOrderSlay {...shared} rounds={starterCurriculum.strokeOrderRounds} playAudio={playAudio} />
  }
}

export function App() {
  const [activeGame, setActiveGame] = useState<LearningGameId | null>(null)
  const [lastSummary, setLastSummary] = useState<LearningGameSummary | null>(null)
  const [sessionKey, setSessionKey] = useState(0)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [progress, setProgress] = useState<LearningProgress>(() => readLearningProgress(window.localStorage.getItem(PROGRESS_STORAGE_KEY)))

  useEffect(() => () => stopLearningAudio(), [])
  useEffect(() => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  function openGame(gameId: LearningGameId, resumedFrom?: string) {
    stopLearningAudio()
    const session = createLearningSession(gameId, new Date().toISOString(), resumedFrom)
    setProgress((current) => ({ ...current, sessions: [...current.sessions, session].slice(-100) }))
    setActiveSessionId(session.id)
    setActiveGame(gameId)
    setSessionKey((current) => current + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function finishGame(summary: LearningGameSummary) {
    stopLearningAudio()
    const now = new Date().toISOString()
    if (activeSessionId) {
      setProgress((current) => updateLearningSession(current, activeSessionId, (session) => ({
        ...session,
        status: 'completed',
        updatedAt: now,
        attempts: summary.attempts,
        summary,
      })))
    }
    setLastSummary(summary)
    setActiveSessionId(null)
    setActiveGame(null)
  }

  function exitGame() {
    stopLearningAudio()
    const now = new Date().toISOString()
    if (activeSessionId) {
      setProgress((current) => updateLearningSession(current, activeSessionId, (session) => ({
        ...session,
        status: 'exited',
        updatedAt: now,
      })))
    }
    setActiveSessionId(null)
    setActiveGame(null)
  }

  function saveAttempt(attempt: LearningGameAttempt) {
    if (!activeSessionId) return
    const now = new Date().toISOString()
    setProgress((current) => updateLearningSession(current, activeSessionId, (session) => ({
      ...session,
      updatedAt: now,
      attempts: [...session.attempts, attempt],
    })))
  }

  if (activeGame) {
    const activeGameTitle = LEARNING_GAME_CATALOG.find((game) => game.id === activeGame)?.title || 'Game'
    return <>
      <Suspense fallback={<main className="playground"><p role="status">Loading game module…</p></main>}>
        <GamePreview key={`${activeGame}-${sessionKey}`} gameId={activeGame} onExit={exitGame} onAttempt={saveAttempt} onComplete={finishGame} />
      </Suspense>
      <ProblemReporter game={activeGameTitle} />
    </>
  }

  return <>
    <main className="playground">
    <nav className="playground-nav">
      <a className="brand" href="#top"><span><Gamepad2 size={19} /></span> EduGames</a>
      <div className="nav-note"><span className="status-dot" /> {LEARNING_GAME_CATALOG.length} games ready</div>
    </nav>

    <header id="top" className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><Sparkles size={14} /> Language practice arcade</p>
        <h1>Pick a game.<br /><em>Start playing.</em></h1>
        <p className="hero-description">Practice Mandarin and English through matching, reading, listening, speaking, spelling, and writing. Every game gives you instant feedback as you play.</p>
        <div className="hero-meta">
          <span><Gamepad2 size={16} /> {LEARNING_GAME_CATALOG.length} games</span>
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

    {progress.sessions.length > 0 && <section className="practice-history" aria-labelledby="practice-history-title">
      <div><p className="eyebrow">Saved on this device</p><h2 id="practice-history-title">Recent practice</h2></div>
      <ul>
        {[...progress.sessions].reverse().slice(0, 5).map((session) => <li key={session.id}>
          <span><strong>{LEARNING_GAME_CATALOG.find((game) => game.id === session.gameId)?.title}</strong><small>{session.status === 'completed' ? 'Completed' : session.attempts.length ? 'Exited early · progress saved' : 'Opened'} · {session.attempts.length} {session.attempts.length === 1 ? 'attempt' : 'attempts'}</small></span>
          {session.status === 'exited' && <button type="button" onClick={() => openGame(session.gameId, session.id)}>Continue practice</button>}
        </li>)}
      </ul>
      <p>Continuing starts at the first prompt while keeping the earlier attempts as a separate saved session.</p>
    </section>}

    <section className="catalog" aria-labelledby="catalog-title">
      <div className="section-heading">
        <div><p className="eyebrow">{LEARNING_GAME_CATALOG.length} ways to practice</p><h2 id="catalog-title">Choose your challenge</h2></div>
        <p>Pick any game. Each one shows you what to do.</p>
      </div>
      <div className="game-grid">
        {LEARNING_GAME_CATALOG.map((game, index) => {
          const latestSession = [...progress.sessions].reverse().find((session) => session.gameId === game.id)
          return <article className={`game-card tone-${(index % 5) + 1}`} key={game.id}>
          <div className="card-top">
            <GameArtwork gameId={game.id} compact />
            <span className="game-time">{game.estimatedSeconds[0]}–{game.estimatedSeconds[1]} sec</span>
          </div>
          <div className="card-copy">
            <p>{channelLabel(game.channels)} · {game.activityLabel}</p>
            <h3>{game.title}</h3>
            <p>{game.description}</p>
            {'releaseStatus' in game && game.releaseStatus === 'hold' && <span className="release-hold">Release hold · {game.releaseNote}</span>}
            {latestSession && <span className="game-progress">{latestSession.status === 'completed' ? 'Last run completed' : 'Practice saved'} · {latestSession.attempts.length} attempts</span>}
          </div>
          <button type="button" onClick={() => openGame(game.id)}>{'releaseStatus' in game && game.releaseStatus === 'hold' ? 'Open safety preview' : 'Play game'} <ArrowRight size={17} /></button>
        </article>})}
      </div>
    </section>
    </main>
    <ProblemReporter game="Game library" />
  </>
}
