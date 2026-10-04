import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const recordings = ['big', 'bu-hao', 'cat', 'good', 'moon', 'mountain', 'mouth', 'one', 'person', 'sun', 'three', 'two', 'water']

function findDataChunk(buffer) {
  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunkName = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    if (chunkName === 'data') return { offset: offset + 8, size: chunkSize }
    offset += 8 + chunkSize + (chunkSize % 2)
  }
  throw new Error('WAV data chunk not found')
}

for (const recording of recordings) {
  const filename = `${recording}.wav`
  const buffer = readFileSync(resolve('public/audio/mandarin', filename))
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${filename}: RIFF header`)
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE', `${filename}: WAVE header`)
  assert.equal(buffer.readUInt16LE(22), 1, `${filename}: mono`)
  assert.equal(buffer.readUInt32LE(24), 22_050, `${filename}: 22.05 kHz`)
  assert.equal(buffer.readUInt16LE(34), 16, `${filename}: 16-bit PCM`)

  const data = findDataChunk(buffer)
  const dataBytes = data.size
  const duration = dataBytes / (22_050 * 2)
  assert.ok(duration >= .25 && duration <= 1.3, `${filename}: contains a complete spoken word`)
  assert.ok(dataBytes > 10_000, `${filename}: contains audio samples`)

  let squaredTotal = 0
  let peak = 0
  const sampleCount = dataBytes / 2
  for (let offset = data.offset; offset < data.offset + dataBytes; offset += 2) {
    const sample = buffer.readInt16LE(offset) / 32768
    squaredTotal += sample * sample
    peak = Math.max(peak, Math.abs(sample))
  }
  assert.ok(Math.sqrt(squaredTotal / sampleCount) > .01, `${filename}: is not silent`)
  assert.ok(peak > .08, `${filename}: has an audible peak`)
}

console.log(`Validated ${recordings.length} spoken Mandarin recordings.`)
