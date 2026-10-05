import assert from 'node:assert/strict'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(absolute) : [absolute]
  }))).flat()
}

const files = await filesUnder('dist')
const sizes = await Promise.all(files.map(async (file) => ({ file, bytes: (await stat(file)).size })))
const total = sizes.reduce((sum, entry) => sum + entry.bytes, 0)
const images = sizes.filter(({ file }) => /\.(?:png|webp|avif)$/i.test(file))
const phaser = sizes.find(({ file }) => /phaser[^/]*\.js$/i.test(path.basename(file)))

assert.ok(total <= 10_000_000, `Production output is ${(total / 1_000_000).toFixed(2)} MB; budget is 10 MB.`)
assert.ok(images.every(({ bytes }) => bytes <= 750_000), `An image exceeds the 750 KB budget: ${images.sort((a, b) => b.bytes - a.bytes)[0]?.file}`)
assert.ok(!phaser || phaser.bytes <= 1_500_000, `Phaser chunk exceeds 1.5 MB: ${phaser?.bytes}`)

console.log(`Bundle budget passed: ${(total / 1_000_000).toFixed(2)} MB total; ${images.length} optimized images.`)
