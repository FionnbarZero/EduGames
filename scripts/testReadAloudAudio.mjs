import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const recordings = [
  { filename: 'instructions.wav', minimumDuration: 3, maximumDuration: 12 },
  { filename: 'hello.wav', minimumDuration: .55, maximumDuration: 1.8 },
  { filename: 'thanks.wav', minimumDuration: .55, maximumDuration: 1.8 },
  { filename: 'goodbye.wav', minimumDuration: .55, maximumDuration: 1.8 },
]

function findChunk(buffer, expectedName) {
  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunkName = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    if (chunkName === expectedName) return { offset: offset + 8, size: chunkSize }
    offset += 8 + chunkSize + (chunkSize % 2)
  }
  throw new Error(`WAV ${expectedName} chunk not found`)
}

for (const { filename, minimumDuration, maximumDuration } of recordings) {
  const buffer = readFileSync(resolve('public/audio/read-aloud', filename))
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${filename}: RIFF header`)
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE', `${filename}: WAVE header`)
  const format = findChunk(buffer, 'fmt ')
  assert.equal(buffer.readUInt16LE(format.offset + 2), 1, `${filename}: mono`)
  assert.equal(buffer.readUInt32LE(format.offset + 4), 22_050, `${filename}: 22.05 kHz`)
  assert.equal(buffer.readUInt16LE(format.offset + 14), 16, `${filename}: 16-bit PCM`)

  const data = findChunk(buffer, 'data')
  const duration = data.size / (22_050 * 2)
  assert.ok(duration >= minimumDuration && duration <= maximumDuration, `${filename}: expected duration`)

  let squaredTotal = 0
  let peak = 0
  const sampleCount = data.size / 2
  for (let offset = data.offset; offset < data.offset + data.size; offset += 2) {
    const sample = buffer.readInt16LE(offset) / 32768
    squaredTotal += sample * sample
    peak = Math.max(peak, Math.abs(sample))
  }
  assert.ok(Math.sqrt(squaredTotal / sampleCount) > .01, `${filename}: is not silent`)
  assert.ok(peak > .08, `${filename}: has an audible peak`)
}

console.log(`Validated ${recordings.length} Read-Aloud recordings.`)
