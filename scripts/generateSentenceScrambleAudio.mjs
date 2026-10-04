import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const outputDirectory = resolve('public/audio/sentence-scramble')
const sentences = [
  ['i-like-tea', '我喜欢喝茶。'],
  ['she-is-my-friend', '她是我的朋友。'],
]

mkdirSync(outputDirectory, { recursive: true })

for (const [filename, text] of sentences) {
  const output = resolve(outputDirectory, `${filename}.wav`)
  const result = spawnSync('say', [
    '-v', 'Eddy (Chinese (China mainland))',
    '-r', '135',
    '-o', output,
    '--data-format=LEI16@22050',
    text,
  ], { stdio: 'inherit' })

  if (result.status !== 0) throw new Error(`Could not create ${output}`)
}

console.log(`Generated ${sentences.length} Mandarin Sentence Scramble recordings.`)
