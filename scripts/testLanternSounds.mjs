import assert from 'node:assert/strict'
import { inspectPcmWave } from './wavTestUtils.mjs'

const expectedDurations = {
  'flip.wav': .16,
  'match.wav': .82,
  'miss.wav': .68,
  'victory.wav': 1.28,
}

for (const [filename, expectedDuration] of Object.entries(expectedDurations)) {
  const path = `src/gameModules/memory-lanterns/assets/${filename}`
  const audio = inspectPcmWave(path, { channels: 2, sampleRate: 44_100 })
  assert.ok(Math.abs(audio.duration - expectedDuration) < .001, `${path}: expected duration`)
  assert.ok(audio.peak >= .5 && audio.peak <= .57, `${path}: normalized without clipping`)
  assert.ok(audio.rms > .02, `${path}: contains an audible signal`)
  assert.ok(audio.maxStep < .2, `${path}: no discontinuity large enough to click`)
  assert.ok(audio.firstSample < .001 && audio.lastSample < .001, `${path}: silence-safe boundaries`)
}

console.log(`Validated ${Object.keys(expectedDurations).length} click-free lantern recordings.`)
