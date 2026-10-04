import assert from 'node:assert/strict'
import { inspectPcmWave } from './wavTestUtils.mjs'

const recordings = ['big', 'bu-hao', 'cat', 'good', 'moon', 'mountain', 'mouth', 'one', 'person', 'sun', 'three', 'two', 'water']

for (const recording of recordings) {
  const filename = `${recording}.wav`
  const path = `public/audio/mandarin/${filename}`
  const audio = inspectPcmWave(path)
  assert.ok(audio.duration >= .25 && audio.duration <= 1.3, `${path}: contains a complete spoken word`)
  assert.ok(audio.sampleBytes > 10_000, `${path}: contains audio samples`)
  assert.ok(audio.rms > .01, `${path}: is not silent`)
  assert.ok(audio.peak > .08, `${path}: has an audible peak`)
}

console.log(`Validated ${recordings.length} spoken Mandarin recordings.`)
