export type LearningGameId =
  | 'speed-match'
  | 'target-blast'
  | 'lily-pad-path'
  | 'memory-flip'
  | 'context-gap-dash'
  | 'sentence-scramble'
  | 'read-aloud-boss-rush'
  | 'dictation-streak'
  | 'speller-bee'
  | 'copy-hide-write-combo'

export type LearningGameChannel = 'tier-1-writing' | 'tier-2-reading'
export type LearningGameSkill = 'writing' | 'reading' | 'receptive'
export type LearningGameInputKind = 'pairs' | 'selection' | 'context' | 'sequence' | 'production'

export type LearningGameDefinition = {
  readonly id: LearningGameId
  readonly title: string
  readonly description: string
  readonly activityLabel: string
  readonly channels: readonly LearningGameChannel[]
  readonly skills: readonly LearningGameSkill[]
  readonly inputKind: LearningGameInputKind
  readonly estimatedSeconds: readonly [minimum: number, maximum: number]
}

export type GameChoice = {
  readonly id: string
  readonly label: string
  readonly accessibleLabel?: string
}

export type GamePair = {
  readonly id: string
  readonly targetId: string
  readonly left: GameChoice
  readonly right: GameChoice
}

export type GamePrompt = {
  readonly id: string
  readonly targetId: string
  readonly targetText: string
  readonly cueText?: string
  readonly audioText?: string
}

export type SelectionGameRound = GamePrompt & {
  readonly choices: readonly GameChoice[]
  readonly correctChoiceId: string
}

export type ContextGameRound = SelectionGameRound & {
  readonly sentenceBefore: string
  readonly sentenceAfter: string
}

export type SequenceToken = GameChoice

export type SequenceGameRound = GamePrompt & {
  readonly tokens: readonly SequenceToken[]
  readonly correctTokenIds: readonly string[]
}

export type PinyinInputStep = {
  readonly pinyin: string
  readonly candidates: readonly string[]
}

export type ProductionGameRound = GamePrompt & {
  readonly instruction?: string
  readonly pinyinText?: string
  readonly pinyinSteps?: readonly PinyinInputStep[]
}

export type StrokePoint = readonly [x: number, y: number]

export type StrokeOrderGameRound = GamePrompt & {
  readonly meaning: string
  readonly strokes: readonly (readonly StrokePoint[])[]
}

export type LearningGameAttempt = {
  readonly gameId: LearningGameId
  readonly promptId: string
  readonly targetId: string
  readonly correct: boolean
  readonly response: string | readonly string[]
  readonly assessmentMode: 'automatic' | 'self-assessment'
}

export type LearningGameSummary = {
  readonly gameId: LearningGameId
  readonly attempted: number
  readonly correct: number
  readonly attempts: readonly LearningGameAttempt[]
}
