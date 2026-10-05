import assert from 'node:assert/strict'
import { inspectPcmWave } from './wavTestUtils.mjs'

const words = [
  'cat', 'water', 'friend', 'school', 'apple', 'teacher', 'family', 'morning', 'yellow', 'beautiful',
  'air', 'means', 'years', 'here',
]

for (const word of words) {
  const filename = `${word}.wav`
  const path = `public/audio/speller-bee/${filename}`
  const audio = inspectPcmWave(path)
  assert.ok(audio.duration >= .35 && audio.duration <= 2, `${path}: expected duration`)
  assert.ok(audio.rms > .01, `${path}: is not silent`)
  assert.ok(audio.peak > .08, `${path}: has an audible peak`)
}

console.log(`Validated ${words.length} SpellerBee recordings.`)
