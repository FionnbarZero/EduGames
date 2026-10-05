import assert from 'node:assert/strict'
import { normalizeSpelling, spellingIsCorrect } from '../src/gameModules/speller-bee/runtime/spelling.ts'

assert.equal(normalizeSpelling('  CAT  '), 'cat')
assert.equal(spellingIsCorrect('Cat', 'cat'), true)
assert.equal(spellingIsCorrect(' dog ', 'cat'), false)
assert.equal(spellingIsCorrect('beautiful', 'beautiful'), true)

console.log('SpellerBee automatic scoring passed.')
