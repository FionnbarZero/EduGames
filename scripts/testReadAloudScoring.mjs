import assert from 'node:assert/strict'
import { normalizeSpokenText, readAloudOutcome, transcriptEvidence } from '../src/gameModules/whispering-scrolls/runtime/readAloudScoring.ts'

const strongTarget = {
  matchedText: '你好',
  bestDistance: .8,
  targetDistance: .8,
  runnerUpDistance: 1.1,
  separation: .27,
}
const wrongTarget = { ...strongTarget, matchedText: '谢谢' }

assert.equal(normalizeSpokenText(' 你，好! '), '你好')
assert.equal(transcriptEvidence('你好', '你 好'), 'exact')
assert.equal(transcriptEvidence('你好', '你'), 'close')
assert.equal(transcriptEvidence('你好', ''), 'unavailable')
assert.equal(readAloudOutcome('exact', null, '你好'), 'strong', 'an exact transcript must pass when acoustic analysis is unavailable')
assert.equal(readAloudOutcome('unavailable', strongTarget, '你好'), 'strong', 'a strong recorded-fixture match should pass without a transcript')
assert.equal(readAloudOutcome('exact', wrongTarget, '你好'), 'close', 'conflicting evidence should request another reading')
assert.equal(readAloudOutcome('different', wrongTarget, '你好'), 'retry')
assert.equal(readAloudOutcome('unavailable', null, '你好'), 'unavailable', 'missing evidence must enter the self-review fallback')

console.log('Read-aloud scoring decisions passed.')
