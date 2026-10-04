import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const outputDirectory = resolve('public/audio/speed-match')
const recordings = [
  ['hello', 'hello'],
  ['thank-you', 'thank you'],
  ['goodbye', 'goodbye'],
  ['tea', 'tea'],
  ['book', 'book'],
]

mkdirSync(outputDirectory, { recursive: true })

for (const [filename, text] of recordings) {
  const output = resolve(outputDirectory, `${filename}.wav`)
  const result = spawnSync('say', [
    '-v', 'Samantha',
    '-r', '150',
    '-o', output,
    '--data-format=LEI16@22050',
    text,
  ], { stdio: 'inherit' })

  if (result.status !== 0) throw new Error(`Could not create ${output}`)
}

console.log(`Generated ${recordings.length} dedicated English Shuriken Match recordings.`)
