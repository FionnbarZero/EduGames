import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const outputDirectories = [
  resolve('public/audio/read-aloud'),
  resolve('src/gameModules/whispering-scrolls/assets'),
]
const recordings = [
  ['instructions', 'Unroll the scroll. Read the word aloud before the six-second whisper window closes. Then listen to your echo and the scroll keeper.', 'Samantha', 165],
  ['hello', '你好', 'Eddy (Chinese (China mainland))', 140],
  ['thanks', '谢谢', 'Eddy (Chinese (China mainland))', 140],
  ['goodbye', '再见', 'Eddy (Chinese (China mainland))', 140],
]

for (const outputDirectory of outputDirectories) mkdirSync(outputDirectory, { recursive: true })

for (const [filename, text, voice, rate] of recordings) {
  for (const outputDirectory of outputDirectories) {
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
}

console.log(`Generated ${recordings.length} Read-Aloud recordings in ${outputDirectories.length} locations.`)
