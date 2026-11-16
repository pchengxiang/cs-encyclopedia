import { createServer as createViteServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const vite = await createViteServer({ logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' })
try {
  const { mockTechnologies } = await vite.ssrLoadModule('/src/data/mock.ts')
  const dir = path.resolve('backend/data')
  await mkdir(dir, { recursive: true })
  const prefixes = { 1: 'LANG', 2: 'AI', 3: 'NET', 4: 'DB', 5: 'OS', 6: 'SEC', 7: 'TOOL', 8: 'HW' }
  const ids = new Map(mockTechnologies.map(item => [String(item.id), `${prefixes[item.category.id] ?? 'TECH'}-${String(mockTechnologies.filter(candidate => candidate.category.id === item.category.id && candidate.id <= item.id).length).padStart(3, '0')}`]))
  for (const item of mockTechnologies) {
    const entryId = ids.get(String(item.id))
    const filename = `${entryId}.json`
    const { id: sourceId, name, category, ...rest } = item
    const record = { name: { zh: name, en: name }, domain_category: category, ...rest, id: entryId,
      relations: rest.relations.map(relation => ({ ...relation, target_id: ids.get(String(relation.target_id)) ?? relation.target_id })) }
    await writeFile(path.join(dir, filename), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  }
  console.log(`Wrote ${mockTechnologies.length} technology records to ${dir}`)
} finally {
  await vite.close()
}
