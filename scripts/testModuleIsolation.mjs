import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

const modulesRoot = resolve('src/gameModules')
const allowedPackages = new Set(['react', 'react-dom', 'lucide-react', 'phaser'])
const requiredFiles = ['Game.tsx', 'README.md', 'index.ts', 'manifest.ts', 'styles.css', 'runtime/contracts.ts', 'runtime/GameShell.tsx']
const sourceExtensions = ['.ts', '.tsx', '.css']

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function resolveLocalImport(importer, specifier) {
  const base = resolve(dirname(importer), specifier)
  const candidates = extname(base)
    ? [base]
    : [base, ...sourceExtensions.map((extension) => `${base}${extension}`), ...sourceExtensions.map((extension) => join(base, `index${extension}`))]
  return candidates.find((candidate) => existsSync(candidate))
}

const moduleFolders = readdirSync(modulesRoot)
  .filter((name) => statSync(join(modulesRoot, name)).isDirectory())
  .sort()

assert.equal(moduleFolders.length, 10, 'expected ten portable game modules')

for (const folder of moduleFolders) {
  const moduleRoot = join(modulesRoot, folder)
  for (const requiredFile of requiredFiles) {
    assert.ok(existsSync(join(moduleRoot, requiredFile)), `${folder}: missing ${requiredFile}`)
  }

  const files = walk(moduleRoot)
  for (const file of files.filter((path) => sourceExtensions.includes(extname(path)))) {
    const source = readFileSync(file, 'utf8')
    assert.ok(!source.includes('import.meta.env.BASE_URL'), `${folder}: ${relative(moduleRoot, file)} depends on the host public base URL`)

    const moduleSpecifiers = [
      ...source.matchAll(/(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g),
      ...source.matchAll(/import\s*['"]([^'"]+)['"]/g),
      ...source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((match) => match[1])

    for (const specifier of moduleSpecifiers) {
      if (!specifier.startsWith('.')) {
        const packageName = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
        assert.ok(allowedPackages.has(packageName), `${folder}: undeclared external dependency ${specifier}`)
        continue
      }
      const importedPath = resolveLocalImport(file, specifier)
      assert.ok(importedPath, `${folder}: unresolved import ${specifier} in ${relative(moduleRoot, file)}`)
      const relativePath = relative(moduleRoot, importedPath)
      assert.ok(relativePath && relativePath !== '..' && !relativePath.startsWith(`..${sep}`), `${folder}: import escapes module folder: ${specifier}`)
    }

    for (const match of source.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)) {
      const assetPath = resolve(dirname(file), match[1])
      assert.ok(assetPath.startsWith(`${moduleRoot}${sep}`), `${folder}: asset escapes module folder: ${match[1]}`)
      assert.ok(existsSync(assetPath), `${folder}: missing asset ${match[1]}`)
    }
  }
}

console.log(`Validated ${moduleFolders.length} isolated, copy-ready game modules.`)
