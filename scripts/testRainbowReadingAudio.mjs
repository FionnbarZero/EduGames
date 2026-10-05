import assert from 'node:assert/strict'
import { inspectPcmWave } from './wavTestUtils.mjs'

const recordings = [
  ['instructions', 8, 18],
  ['air', .35, 2],
  ['means', .35, 2],
  ['years', .35, 2],
  ['here', .35, 2],
  ['eager', .35, 2],
  ['change', .35, 2],
]

for (const [filename, minimumDuration, maximumDuration] of recordings) {
  const path = `src/gameModules/rainbow-reading/assets/${filename}.wav`
  const audio = inspectPcmWave(path, { sampleRate: filename === 'instructions' ? 16_000 : 22_050 })
  assert.ok(audio.duration >= minimumDuration && audio.duration <= maximumDuration, `${path}: expected duration`)
  assert.ok(audio.rms > .01, `${path}: is not silent`)
  assert.ok(audio.peak > .08, `${path}: has an audible peak`)
}

console.log(`Validated ${recordings.length} Rainbow Reading recordings.`)
