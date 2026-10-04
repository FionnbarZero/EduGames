import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const outputRoot = resolve('public/audio/context-gap')
const clueDirectory = resolve(outputRoot, 'clues')
const wordDirectory = resolve(outputRoot, 'words')

const prompts = [
  ['water', '跑步后，美美打开水瓶，喝……'],
  ['school', '丽丽背着书包去……上课。'],
  ['apple', '爸爸给小明一个红色的……'],
  ['book', '睡觉前，我打开……读故事。'],
  ['friend', '乐乐每天跟我玩。他是我的好……'],
  ['teacher', '王女士教我们中文。她是……'],
  ['home', '放学了，我们回……吃晚饭。'],
  ['today', '现在太阳出来了，……天气很好。'],
  ['chinese', '美美在北京长大，她跟奶奶说……'],
  ['tea', '爷爷把……倒进茶杯。'],
]

const words = [
  ['milk', '牛奶'], ['tea', '茶'], ['park', '公园'], ['store', '商店'], ['school', '学校'],
  ['apple', '苹果'], ['orange', '橙子'], ['banana', '香蕉'], ['menu', '菜单'], ['book', '书'],
  ['map', '地图'], ['doctor', '医生'], ['teacher', '老师'], ['friend', '朋友'], ['student', '学生'],
  ['home', '家'], ['yesterday', '昨天'], ['tomorrow', '明天'], ['today', '今天'],
  ['chinese', '中文'], ['english', '英文'], ['french', '法文'],
]

function createRecording(directory, filename, text, voice, rate) {
  const output = resolve(directory, `${filename}.wav`)
  const result = spawnSync('say', [
    '-v', voice,
    '-r', String(rate),
    '-o', output,
    '--data-format=LEI16@22050',
    text,
  ], { stdio: 'inherit' })

  if (result.status !== 0) throw new Error(`Could not create ${output}`)
}

mkdirSync(clueDirectory, { recursive: true })
mkdirSync(wordDirectory, { recursive: true })

for (const [filename, text] of prompts) {
  createRecording(clueDirectory, filename, text, 'Eddy (Chinese (China mainland))', 135)
}

for (const [filename, text] of words) {
  createRecording(wordDirectory, filename, text, 'Eddy (Chinese (China mainland))', 140)
}

console.log(`Generated ${prompts.length} Mandarin context prompts and ${words.length} Mandarin word recordings.`)
