import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const projectRoot = resolve('.')
const textExtensions = new Set(['.css', '.html', '.json', '.md', '.mjs', '.ts', '.tsx', '.yml'])

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

assert.ok(!existsSync(resolve('src/learningGames')), 'obsolete src/learningGames directory should not return')

const searchableFiles = [
  ...walk(resolve('src')),
  ...walk(resolve('scripts')),
  resolve('index.html'),
  resolve('README.md'),
  resolve('package.json'),
].filter((path) => textExtensions.has(extname(path)))
const searchableText = searchableFiles.map((path) => readFileSync(path, 'utf8')).join('\n')

for (const path of walk(resolve('public'))) {
  const publicPath = relative(resolve('public'), path).split('\\').join('/')
  assert.ok(searchableText.includes(publicPath), `unreferenced public asset: ${publicPath}`)
}

for (const path of walk(resolve('src')).filter((file) => ['.ts', '.tsx'].includes(extname(file)))) {
  const source = readFileSync(path, 'utf8')
  const imports = [
    ...source.matchAll(/(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((match) => match[1])
  for (const specifier of imports) {
    assert.ok(!/\.tsx?$/.test(specifier), `${relative(projectRoot, path)}: omit TypeScript extension from ${specifier}`)
  }
}

console.log(`Validated source imports and ${walk(resolve('public')).length} referenced public assets.`)
