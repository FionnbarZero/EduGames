import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const outputDirectory = resolve('public/audio/read-aloud')
const recordings = [
  ['instructions', 'Read the word aloud. You have six seconds. Then listen to your recording and the model word.', 'Samantha', 170],
  ['hello', '你好', 'Eddy (Chinese (China mainland))', 140],
  ['thanks', '谢谢', 'Eddy (Chinese (China mainland))', 140],
  ['goodbye', '再见', 'Eddy (Chinese (China mainland))', 140],
]

mkdirSync(outputDirectory, { recursive: true })

for (const [filename, text, voice, rate] of recordings) {
  const output = resolve(outputDirectory, `${filename}.wav`)
  const result = spawnSync('say', [
    '-v', voice,
    '-r', String(rate),
    '-o', output,
    '--data-format=LEI16@22050',
    text,
  ], { stdio: 'inherit' })

  if (result.status !== 0) throw new Error(`Could not create ${output}`)
}

console.log(`Generated ${recordings.length} Read-Aloud recordings.`)
