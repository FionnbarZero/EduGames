import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const prompts = ['water', 'school', 'apple', 'book', 'friend', 'teacher', 'home', 'today', 'chinese', 'tea']
const words = ['milk', 'tea', 'park', 'store', 'school', 'apple', 'orange', 'banana', 'menu', 'book', 'map', 'doctor', 'teacher', 'friend', 'student', 'home', 'yesterday', 'tomorrow', 'today', 'chinese', 'english', 'french']

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

function validateRecording(path, minimumDuration, maximumDuration) {
  const filename = path.split('/').at(-1)
  const buffer = readFileSync(resolve(path))
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${filename}: RIFF header`)
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE', `${filename}: WAVE header`)
  const format = findChunk(buffer, 'fmt ')
  assert.equal(buffer.readUInt16LE(format.offset), 1, `${filename}: PCM`)
  assert.equal(buffer.readUInt16LE(format.offset + 2), 1, `${filename}: mono`)
  assert.equal(buffer.readUInt32LE(format.offset + 4), 22_050, `${filename}: 22.05 kHz`)
  assert.equal(buffer.readUInt16LE(format.offset + 14), 16, `${filename}: 16-bit PCM`)

  const data = findChunk(buffer, 'data')
  const duration = data.size / (22_050 * 2)
  assert.ok(duration >= minimumDuration && duration <= maximumDuration, `${filename}: complete recording duration`)

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

for (const prompt of prompts) validateRecording(`public/audio/context-gap/clues/${prompt}.wav`, 1.3, 8)
for (const word of words) validateRecording(`public/audio/context-gap/words/${word}.wav`, .6, 2.5)

console.log(`Validated ${prompts.length} Mandarin context prompts and ${words.length} Mandarin word recordings.`)
