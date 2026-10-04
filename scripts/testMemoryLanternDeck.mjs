import assert from 'node:assert/strict'
import { memoryDeck } from '../src/gameModules/memory-lanterns/runtime/model.ts'

const pairs = Array.from({ length: 5 }, (_, index) => ({
  id: `pair-${index + 1}`,
  targetId: `target-${index + 1}`,
  left: { id: `character-${index + 1}:copy-one`, label: String(index + 1) },
  right: { id: `character-${index + 1}:copy-two`, label: String(index + 1) },
}))

const firstSession = memoryDeck(pairs, () => 0)
const secondSession = memoryDeck(pairs, () => 0.999999)
const firstIds = firstSession.map((card) => card.id)
const secondIds = secondSession.map((card) => card.id)
const expectedIds = pairs.flatMap((pair) => [`${pair.id}:left`, `${pair.id}:right`])

assert.deepEqual([...firstIds].sort(), [...expectedIds].sort(), 'shuffle must preserve every lantern')
assert.deepEqual([...secondIds].sort(), [...expectedIds].sort(), 'every session must preserve every lantern')
assert.notDeepEqual(firstIds, secondIds, 'different random inputs should create different session layouts')

for (const pair of pairs) {
  assert.equal(
    firstSession.filter((card) => card.pairId === pair.id).length,
    2,
    `pair ${pair.id} should still contain two matching lanterns`,
  )
}

console.log('Memory Lanterns deck shuffle passed.')
