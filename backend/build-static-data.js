import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'backend', 'data')
const outputDir = path.join(root, 'public', 'data')
const files = (await readdir(sourceDir))
  .filter(file => file.endsWith('.json'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
const records = await Promise.all(files.map(async file => JSON.parse(await readFile(path.join(sourceDir, file), 'utf8'))))

await mkdir(outputDir, { recursive: true })
await writeFile(path.join(outputDir, 'technologies.json'), `${JSON.stringify(records)}\n`, 'utf8')
console.log(`Prepared ${records.length} technology records for static hosting.`)
