import assert from 'node:assert/strict'
import { inspectPcmWave } from './wavTestUtils.mjs'

const prompts = ['water', 'school', 'apple', 'book', 'friend', 'teacher', 'home', 'today', 'chinese', 'tea']
const words = ['milk', 'tea', 'park', 'store', 'school', 'apple', 'orange', 'banana', 'menu', 'book', 'map', 'doctor', 'teacher', 'friend', 'student', 'home', 'yesterday', 'tomorrow', 'today', 'chinese', 'english', 'french']

function validateRecording(path, minimumDuration, maximumDuration) {
  const audio = inspectPcmWave(path)
  assert.ok(audio.duration >= minimumDuration && audio.duration <= maximumDuration, `${path}: complete recording duration`)
  assert.ok(audio.rms > .008, `${path}: is not silent`)
  assert.ok(audio.peak > .06, `${path}: has an audible peak`)
}

for (const prompt of prompts) validateRecording(`public/audio/context-gap/clues/${prompt}.wav`, 1.3, 8)
for (const word of words) validateRecording(`public/audio/context-gap/words/${word}.wav`, .6, 2.5)

console.log(`Validated ${prompts.length} Mandarin context prompts and ${words.length} Mandarin word recordings.`)
