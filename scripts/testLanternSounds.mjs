import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const expectedDurations = {
  'flip.wav': .16,
  'match.wav': .82,
  'miss.wav': .68,
  'victory.wav': 1.28,
}

for (const [filename, expectedDuration] of Object.entries(expectedDurations)) {
  const buffer = readFileSync(resolve('src/gameModules/memory-lanterns/assets', filename))
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${filename}: RIFF header`)
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE', `${filename}: WAVE header`)
  assert.equal(buffer.readUInt16LE(22), 2, `${filename}: stereo`)
  assert.equal(buffer.readUInt32LE(24), 44_100, `${filename}: 44.1 kHz`)
  assert.equal(buffer.readUInt16LE(34), 16, `${filename}: 16-bit PCM`)

  const dataBytes = buffer.readUInt32LE(40)
  const duration = dataBytes / (44_100 * 2 * 2)
  assert.ok(Math.abs(duration - expectedDuration) < .001, `${filename}: expected duration`)

  let peak = 0
  let squaredTotal = 0
  let maxStep = 0
  let previous = 0
  const samples = dataBytes / 2
  for (let offset = 44; offset < 44 + dataBytes; offset += 2) {
    const sample = buffer.readInt16LE(offset) / 32768
    peak = Math.max(peak, Math.abs(sample))
    squaredTotal += sample * sample
    maxStep = Math.max(maxStep, Math.abs(sample - previous))
    previous = sample
  }
  const rms = Math.sqrt(squaredTotal / samples)
  const firstSample = Math.abs(buffer.readInt16LE(44) / 32768)
  const lastSample = Math.abs(buffer.readInt16LE(42 + dataBytes) / 32768)
  assert.ok(peak >= .5 && peak <= .57, `${filename}: normalized without clipping`)
  assert.ok(rms > .02, `${filename}: contains an audible signal`)
  assert.ok(maxStep < .2, `${filename}: no discontinuity large enough to click`)
  assert.ok(firstSample < .001 && lastSample < .001, `${filename}: silence-safe boundaries`)
}

console.log(`Validated ${Object.keys(expectedDurations).length} click-free lantern recordings.`)
