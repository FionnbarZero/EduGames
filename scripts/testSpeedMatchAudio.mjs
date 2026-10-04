import assert from 'node:assert/strict'
import { inspectPcmWave } from './wavTestUtils.mjs'

const paths = [
  'public/audio/speed-match/hello.wav',
  'public/audio/speed-match/thank-you.wav',
  'public/audio/speed-match/goodbye.wav',
  'public/audio/speller-bee/friend.wav',
  'public/audio/speller-bee/water.wav',
  'public/audio/speller-bee/cat.wav',
  'public/audio/speed-match/tea.wav',
  'public/audio/speed-match/book.wav',
]

for (const path of paths) {
  const audio = inspectPcmWave(path)
  assert.ok(audio.duration >= .3 && audio.duration <= 2, `${path}: expected duration`)
  assert.ok(audio.rms > .01, `${path}: is not silent`)
  assert.ok(audio.peak > .08, `${path}: has an audible peak`)
}

console.log(`Validated ${paths.length} English Shuriken Match recordings.`)
