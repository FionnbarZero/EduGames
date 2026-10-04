import assert from 'node:assert/strict'
import { inspectPcmWave } from './wavTestUtils.mjs'

const recordings = [
  { filename: 'instructions.wav', minimumDuration: 3, maximumDuration: 12 },
  { filename: 'hello.wav', minimumDuration: .55, maximumDuration: 1.8 },
  { filename: 'thanks.wav', minimumDuration: .55, maximumDuration: 1.8 },
  { filename: 'goodbye.wav', minimumDuration: .55, maximumDuration: 1.8 },
]
const locations = [
  ...recordings.filter(({ filename }) => filename !== 'instructions.wav').map((recording) => ({ directory: 'public/audio/read-aloud', ...recording })),
  ...recordings.map((recording) => ({ directory: 'src/gameModules/whispering-scrolls/assets', ...recording })),
]

for (const { directory, filename, minimumDuration, maximumDuration } of locations) {
  const path = `${directory}/${filename}`
  const audio = inspectPcmWave(path)
  assert.ok(audio.duration >= minimumDuration && audio.duration <= maximumDuration, `${path}: expected duration`)
  assert.ok(audio.rms > .01, `${path}: is not silent`)
  assert.ok(audio.peak > .08, `${path}: has an audible peak`)
}

console.log(`Validated ${locations.length} Read-Aloud audio files across host and module assets.`)
