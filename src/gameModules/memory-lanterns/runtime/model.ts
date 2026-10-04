import type {
  GamePair,
  LearningGameAttempt,
  LearningGameId,
  LearningGameSummary,
} from './contracts'

function distinctIds(values: readonly { readonly id: string }[]) {
  return new Set(values.map((value) => value.id)).size === values.length
}

export function validGamePairs(pairs: readonly GamePair[]) {
  return pairs.length > 0
    && distinctIds(pairs)
    && pairs.every((pair) => pair.targetId && pair.left.id && pair.right.id
      && pair.left.id !== pair.right.id && pair.left.label && pair.right.label)
}

export function summarizeLearningGame(
  gameId: LearningGameId,
  attempts: readonly LearningGameAttempt[],
): LearningGameSummary {
  return {
    gameId,
    attempted: attempts.length,
    correct: attempts.filter((attempt) => attempt.correct).length,
    attempts: [...attempts],
  }
}

export function memoryDeck(pairs: readonly GamePair[]) {
  const cards = pairs.flatMap((pair) => [
    { id: `${pair.id}:left`, pairId: pair.id, targetId: pair.targetId, face: pair.left },
    { id: `${pair.id}:right`, pairId: pair.id, targetId: pair.targetId, face: pair.right },
  ])
  if (cards.length < 4) return cards
  const left = cards.filter((_, index) => index % 2 === 0)
  const right = cards.filter((_, index) => index % 2 === 1).reverse()
  return left.flatMap((card, index) => right[index] ? [card, right[index]] : [card])
}
