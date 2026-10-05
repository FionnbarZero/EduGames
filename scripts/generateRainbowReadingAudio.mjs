import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const outputDirectory = resolve('src/gameModules/rainbow-reading/assets')
const recordings = [
  ['instructions', 'Welcome to Rainbow Reading! Choose a jewel. A rainbow creature will hatch and show you a word. Read the word aloud before the timer ends. We will compare your recording and score your reading automatically.', 'Samantha', '165'],
  ['air', 'air', 'Samantha', '135'],
  ['means', 'means', 'Samantha', '150'],
  ['years', 'years', 'Samantha', '150'],
  ['here', 'here', 'Samantha', '145'],
  ['eager', 'eager', 'Samantha', '150'],
  ['change', 'change', 'Samantha', '150'],
]

mkdirSync(outputDirectory, { recursive: true })

for (const [filename, text, voice, rate] of recordings) {
  const output = resolve(outputDirectory, `${filename}.wav`)
  const dataFormat = filename === 'instructions' ? 'LEI16@16000' : 'LEI16@22050'
  const result = spawnSync('say', [
    '-v', voice,
    '-r', rate,
    '-o', output,
    `--data-format=${dataFormat}`,
    text,
  ], { stdio: 'inherit' })

  if (result.status !== 0) throw new Error(`Could not create ${output}`)
}

console.log(`Generated ${recordings.length} Rainbow Reading recordings.`)
