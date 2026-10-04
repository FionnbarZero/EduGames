import assert from 'node:assert/strict'
import { inspectPcmWave } from './wavTestUtils.mjs'

const recordings = ['i-like-tea', 'she-is-my-friend']

for (const recording of recordings) {
  const filename = `${recording}.wav`
  const path = `public/audio/sentence-scramble/${filename}`
  const audio = inspectPcmWave(path)
  assert.ok(audio.duration >= 1 && audio.duration <= 4, `${path}: complete sentence duration`)
  assert.ok(audio.rms > .008, `${path}: is not silent`)
  assert.ok(audio.peak > .06, `${path}: has an audible peak`)
}

console.log(`Validated ${recordings.length} Mandarin Sushi Scramble recordings.`)
