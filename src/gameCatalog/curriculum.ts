import type {
  ContextGameRound,
  GamePair,
  ProductionGameRound,
  SelectionGameRound,
  SequenceGameRound,
  StrokeOrderGameRound,
} from './contracts'

export type CurriculumLevel = 'beginner' | 'developing' | 'independent'

export type CurriculumPack = {
  readonly id: string
  readonly version: number
  readonly title: string
  readonly language: string
  readonly learnerLevel: CurriculumLevel
  readonly targetLevel: CurriculumLevel
  readonly pairs: readonly GamePair[]
  readonly selectionRounds: readonly SelectionGameRound[]
  readonly contextRounds: readonly ContextGameRound[]
  readonly sequenceRounds: readonly SequenceGameRound[]
  readonly productionRounds: readonly ProductionGameRound[]
  readonly spellingRounds: readonly ProductionGameRound[]
  readonly strokeOrderRounds: readonly StrokeOrderGameRound[]
}

function nonEmpty(value: string) {
  return Boolean(value.trim())
}

function hasUniqueIds(items: readonly { readonly id: string }[]) {
  return items.every((item) => nonEmpty(item.id)) && new Set(items.map((item) => item.id)).size === items.length
}

function validSelection(round: SelectionGameRound) {
  return nonEmpty(round.targetText)
    && round.choices.length >= 2
    && hasUniqueIds(round.choices)
    && round.choices.some((choice) => choice.id === round.correctChoiceId)
}

export function validateCurriculumPack(pack: CurriculumPack): readonly string[] {
  const errors: string[] = []
  if (!nonEmpty(pack.id)) errors.push('Pack id is required.')
  if (!Number.isInteger(pack.version) || pack.version < 1) errors.push('Pack version must be a positive integer.')
  if (!nonEmpty(pack.title)) errors.push('Pack title is required.')
  if (!nonEmpty(pack.language)) errors.push('Pack language is required.')

  const collections = [
    ['pairs', pack.pairs],
    ['selectionRounds', pack.selectionRounds],
    ['contextRounds', pack.contextRounds],
    ['sequenceRounds', pack.sequenceRounds],
    ['productionRounds', pack.productionRounds],
    ['spellingRounds', pack.spellingRounds],
    ['strokeOrderRounds', pack.strokeOrderRounds],
  ] as const
  for (const [name, items] of collections) {
    if (!items.length) errors.push(`${name} must not be empty.`)
    if (!hasUniqueIds(items)) errors.push(`${name} must have unique, non-empty ids.`)
  }

  if (pack.pairs.some((pair) => !nonEmpty(pair.targetId) || !nonEmpty(pair.left.label) || !nonEmpty(pair.right.label))) errors.push('Every pair needs a target and two labels.')
  if (pack.selectionRounds.some((round) => !validSelection(round))) errors.push('Every selection round needs unique choices and a valid correct choice.')
  if (pack.contextRounds.some((round) => !validSelection(round) || !nonEmpty(round.sentenceBefore + round.sentenceAfter))) errors.push('Every context round needs a sentence and a valid correct choice.')
  if (pack.sequenceRounds.some((round) => !round.tokens.length || !hasUniqueIds(round.tokens) || round.correctTokenIds.length !== round.tokens.length || round.correctTokenIds.some((id) => !round.tokens.some((token) => token.id === id)))) errors.push('Every sequence round needs a complete ordering of unique tokens.')
  if ([...pack.productionRounds, ...pack.spellingRounds].some((round) => !nonEmpty(round.targetText) || !nonEmpty(round.targetId))) errors.push('Every production round needs target text and a target id.')
  if (pack.strokeOrderRounds.some((round) => !nonEmpty(round.meaning) || !round.strokes.length || round.strokes.some((stroke) => stroke.length < 2))) errors.push('Every stroke-order round needs a meaning and drawable stroke guides.')
  return errors
}

export function defineCurriculumPack<const Pack extends CurriculumPack>(pack: Pack): Pack {
  const errors = validateCurriculumPack(pack)
  if (errors.length) throw new Error(`Invalid curriculum pack “${pack.id || 'unknown'}”: ${errors.join(' ')}`)
  return pack
}
