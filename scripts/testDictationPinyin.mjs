import assert from 'node:assert/strict'
import { findCharacterCorrections, isCorrectCharacterAt, isExactPinyin, isPinyinPrefix, normalizePinyin } from '../src/gameModules/dictation-streak/runtime/pinyin.ts'
import { validDictationRound } from '../src/gameModules/dictation-streak/runtime/model.ts'

for (const answer of ['nǐ', 'ni3', 'NI']) {
  assert.equal(isExactPinyin(answer, 'nǐ'), true, `${answer} should reveal the character candidates`)
}

for (const answer of ['', 'n', 'nih', 'nin', '你好']) {
  assert.equal(isExactPinyin(answer, 'nǐ'), false, `${answer || 'blank input'} should not reveal candidates`)
}

for (const workaround of ['n-i', 'n!i', 'ni 3']) {
  assert.equal(isExactPinyin(workaround, 'nǐ'), false, `${workaround} should not bypass spelling validation`)
}

assert.equal(isPinyinPrefix('n', 'nǐ'), true, 'an unfinished but correct spelling should remain neutral')
assert.equal(isPinyinPrefix('na', 'nǐ'), false, 'a spelling that diverges should trigger coaching')
assert.equal(isExactPinyin('hao', 'hǎo'), true, 'the complete second syllable should reveal its candidates')
assert.equal(isExactPinyin('ha', 'hǎo'), false, 'an incomplete syllable must not reveal candidates')
assert.equal(isExactPinyin('nihao', 'nǐ'), false, 'the full word must not skip the first character choice')

assert.equal(normalizePinyin('lǜ'), normalizePinyin('lv4'), 'v should work as a keyboard-friendly ü')
assert.equal(normalizePinyin('lü4'), normalizePinyin('lu:4'), 'u: should work as a keyboard-friendly ü')
assert.notEqual(normalizePinyin('lǜ'), normalizePinyin('lu4'), 'ü and u should remain distinct')

assert.deepEqual(findCharacterCorrections('在见', '再见'), [
  { index: 0, chosen: '在', correct: '再' },
], 'the correction card should identify the wrong character')
assert.deepEqual(findCharacterCorrections('你号', '你好'), [
  { index: 1, chosen: '号', correct: '好' },
], 'the correction card should identify a later wrong character')
assert.equal(isCorrectCharacterAt('再', '再见', 0), true, 'the correct first character should continue the word')
assert.equal(isCorrectCharacterAt('在', '再见', 0), false, 'a wrong first character should trigger its correction card immediately')

const baseRound = { id: 'hello', targetId: 'hello', targetText: '你好' }
assert.equal(validDictationRound(baseRound), true, 'direct Chinese keyboard rounds may omit Pinyin guidance')
assert.equal(validDictationRound({ ...baseRound, pinyinSteps: [
  { pinyin: 'ni', candidates: ['你', '尼'] },
  { pinyin: 'hao', candidates: ['好', '号'] },
] }), true, 'one Pinyin step per target character is valid')
assert.equal(validDictationRound({ ...baseRound, pinyinSteps: [
  { pinyin: 'ni', candidates: ['你'] },
] }), false, 'incomplete Pinyin guidance must be rejected')
assert.equal(validDictationRound({ ...baseRound, pinyinSteps: [] }), false, 'an empty guided Pinyin sequence must be rejected')

console.log('Dictation Streak Pinyin candidate matching passed.')
