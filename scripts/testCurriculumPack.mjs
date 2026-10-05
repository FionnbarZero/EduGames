import assert from 'node:assert/strict'
import { validateCurriculumPack } from '../src/gameCatalog/curriculum.ts'

const emptyPack = {
  id: 'empty', version: 1, title: 'Empty', language: 'zh-CN', learnerLevel: 'beginner', targetLevel: 'developing',
  pairs: [], selectionRounds: [], contextRounds: [], sequenceRounds: [], productionRounds: [], spellingRounds: [], strokeOrderRounds: [],
}
assert.equal(validateCurriculumPack(emptyPack).length, 7)

const duplicatePairPack = {
  ...emptyPack,
  pairs: [
    { id: 'same', targetId: 'one', left: { id: 'left-one', label: '一' }, right: { id: 'right-one', label: 'one' } },
    { id: 'same', targetId: 'two', left: { id: 'left-two', label: '二' }, right: { id: 'right-two', label: 'two' } },
  ],
}
assert.ok(validateCurriculumPack(duplicatePairPack).some((error) => error.includes('unique')))

console.log('Curriculum pack validation passed.')
