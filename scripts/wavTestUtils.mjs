import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function findChunk(buffer, targetName, path) {
  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunkName = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    if (chunkName === targetName) return { offset: offset + 8, size: chunkSize }
    offset += 8 + chunkSize + (chunkSize % 2)
  }
  throw new Error(`${path}: WAV ${targetName} chunk not found`)
}

export function inspectPcmWave(path, {
  channels = 1,
  sampleRate = 22_050,
  bitsPerSample = 16,
} = {}) {
  const buffer = readFileSync(resolve(path))
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${path}: RIFF header`)
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE', `${path}: WAVE header`)

  const format = findChunk(buffer, 'fmt ', path)
  assert.equal(buffer.readUInt16LE(format.offset), 1, `${path}: PCM`)
  assert.equal(buffer.readUInt16LE(format.offset + 2), channels, `${path}: ${channels === 1 ? 'mono' : `${channels} channels`}`)
  assert.equal(buffer.readUInt32LE(format.offset + 4), sampleRate, `${path}: ${sampleRate} Hz`)
  assert.equal(buffer.readUInt16LE(format.offset + 14), bitsPerSample, `${path}: ${bitsPerSample}-bit PCM`)
  assert.equal(bitsPerSample, 16, `${path}: test utility currently supports 16-bit PCM`)

  const data = findChunk(buffer, 'data', path)
  const sampleCount = data.size / 2
  let squaredTotal = 0
  let peak = 0
  let maxStep = 0
  let previous = 0
  for (let offset = data.offset; offset < data.offset + data.size; offset += 2) {
    const sample = buffer.readInt16LE(offset) / 32768
    squaredTotal += sample * sample
    peak = Math.max(peak, Math.abs(sample))
    maxStep = Math.max(maxStep, Math.abs(sample - previous))
    previous = sample
  }

  return {
    duration: data.size / (sampleRate * channels * (bitsPerSample / 8)),
    firstSample: Math.abs(buffer.readInt16LE(data.offset) / 32768),
    lastSample: Math.abs(buffer.readInt16LE(data.offset + data.size - 2) / 32768),
    maxStep,
    peak,
    rms: Math.sqrt(squaredTotal / sampleCount),
    sampleBytes: data.size,
  }
}
