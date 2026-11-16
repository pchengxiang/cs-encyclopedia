import { createServer } from 'node:http'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')
const port = Number(process.env.API_PORT ?? 3001)
async function loadTechnologies() {
  const files = (await readdir(dataDir)).filter(file => file.endsWith('.json')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return Promise.all(files.map(async file => JSON.parse(await readFile(path.join(dataDir, file), 'utf8'))))
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(body))
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end() }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const records = await loadTechnologies()
    if (url.pathname === '/api/health') return json(res, 200, { status: 'ok', total: records.length })
    if (url.pathname === '/api/categories') {
      const categories = new Map()
      for (const item of records) {
        const category = item.domain_category ?? item.category
        if (!category) continue
        const current = categories.get(String(category.id)) ?? { ...category, count: 0 }
        current.count += 1
        categories.set(String(category.id), current)
      }
      return json(res, 200, [...categories.values()].sort((a, b) => Number(a.id) - Number(b.id)))
    }
    if (url.pathname === '/api/technologies') {
      const keyword = (url.searchParams.get('keyword') ?? '').trim().toLocaleLowerCase()
      const categoryId = url.searchParams.get('category_id')
      const functionId = url.searchParams.get('function_category_id')
      const stage = url.searchParams.get('stage')
      const all = records.filter(item => {
        const category = item.domain_category ?? item.category
        const funcs = item.function_categories ? [item.function_categories.primary, ...(item.function_categories.secondary ?? [])] : []
        const haystack = [item.name?.zh, item.name?.en, item.description, category?.name, ...funcs.map(f => f.name)].join(' ').toLocaleLowerCase()
        return (!keyword || haystack.includes(keyword))
          && (!categoryId || String(category?.id) === categoryId)
          && (!functionId || funcs.some(f => String(f.id) === functionId))
          && (!stage || (item.development_stage?.value ?? item.stage) === stage)
      })
      const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
      const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '8', 10) || 8))
      return json(res, 200, { items: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit })
    }
    const match = url.pathname.match(/^\/api\/technologies\/([^/]+)$/)
    if (match) {
      const item = records.find(record => String(record.id) === decodeURIComponent(match[1]))
      return item ? json(res, 200, item) : json(res, 404, { error: 'Technology not found' })
    }
    return json(res, 404, { error: 'Route not found' })
  } catch (error) {
    console.error(error)
    return json(res, 500, { error: 'Unable to load data' })
  }
})

server.listen(port, () => console.log(`Encyclopedia API listening on http://localhost:${port}`))
