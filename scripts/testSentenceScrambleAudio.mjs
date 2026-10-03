import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const recordings = ['i-like-tea', 'she-is-my-friend']

function findChunk(buffer, targetName) {
  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunkName = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    if (chunkName === targetName) return { offset: offset + 8, size: chunkSize }
    offset += 8 + chunkSize + (chunkSize % 2)
  }
  throw new Error(`WAV ${targetName} chunk not found`)
}

for (const recording of recordings) {
  const filename = `${recording}.wav`
  const buffer = readFileSync(resolve('public/audio/sentence-scramble', filename))
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${filename}: RIFF header`)
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE', `${filename}: WAVE header`)

  const format = findChunk(buffer, 'fmt ')
  assert.equal(buffer.readUInt16LE(format.offset), 1, `${filename}: PCM`)
  assert.equal(buffer.readUInt16LE(format.offset + 2), 1, `${filename}: mono`)
  assert.equal(buffer.readUInt32LE(format.offset + 4), 22_050, `${filename}: 22.05 kHz`)
  assert.equal(buffer.readUInt16LE(format.offset + 14), 16, `${filename}: 16-bit PCM`)

  const data = findChunk(buffer, 'data')
  const duration = data.size / (22_050 * 2)
  assert.ok(duration >= 1 && duration <= 4, `${filename}: complete sentence duration`)

  let squaredTotal = 0
  let peak = 0
  const sampleCount = data.size / 2
  for (let offset = data.offset; offset < data.offset + data.size; offset += 2) {
    const sample = buffer.readInt16LE(offset) / 32768
    squaredTotal += sample * sample
    peak = Math.max(peak, Math.abs(sample))
  }
  assert.ok(Math.sqrt(squaredTotal / sampleCount) > .008, `${filename}: is not silent`)
  assert.ok(peak > .06, `${filename}: has an audible peak`)
}

console.log(`Validated ${recordings.length} Mandarin Sentence Scramble recordings.`)
