import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const outputDirectory = resolve('public/audio/speller-bee')
const words = [
  'cat', 'water', 'friend', 'school', 'apple', 'teacher', 'family', 'morning', 'yellow', 'beautiful',
  'air', 'means', 'years', 'here',
]

mkdirSync(outputDirectory, { recursive: true })

for (const word of words) {
  const output = resolve(outputDirectory, `${word}.wav`)
  const rate = word === 'air' ? '135' : '155'
  const result = spawnSync('say', [
    '-v', 'Samantha',
    '-r', rate,
    '-o', output,
    '--data-format=LEI16@22050',
    word,
  ], { stdio: 'inherit' })

  if (result.status !== 0) throw new Error(`Could not create ${output}`)
}

console.log(`Generated ${words.length} SpellerBee recordings.`)
