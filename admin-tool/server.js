import { createServer } from 'node:http'
import { readdir, readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const root = path.dirname(fileURLToPath(import.meta.url))
async function loadEnv() {
  try {
    const source = await readFile(path.join(root, '.env.local'), 'utf8')
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  } catch {}
}
await loadEnv()
const dataDir = path.resolve(root, process.env.DATA_DIR || '../backend/data')
const pendingDir = path.resolve(root, process.env.PENDING_DIR || './pending-review')
const reviewedDir = path.join(pendingDir, 'reviewed')
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4170)
const stages = ['research', 'emerging', 'growing', 'mature', 'maintenance', 'declining']
const stageLabels = { research: '研究階段', emerging: '新興階段', growing: '成長階段', mature: '成熟階段', maintenance: '維護階段', declining: '淘汰／停滯' }
const categoryPrefixes = { 1: 'LANG', 2: 'AI', 3: 'NET', 4: 'DB', 5: 'OS', 6: 'SEC', 7: 'TOOL', 8: 'HW' }
await mkdir(pendingDir, { recursive: true })
await mkdir(reviewedDir, { recursive: true })

async function loadItems() {
  const files = (await readdir(dataDir)).filter(file => file.endsWith('.json')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return Promise.all(files.map(async file => JSON.parse(await readFile(path.join(dataDir, file), 'utf8'))))
}
async function loadPending() {
  const files = (await readdir(pendingDir)).filter(file => file.endsWith('.json')).sort()
  const drafts = await Promise.all(files.map(async file => JSON.parse(await readFile(path.join(pendingDir, file), 'utf8'))))
  return drafts.sort((a, b) => String(b.generated_at ?? '').localeCompare(String(a.generated_at ?? '')))
}
async function loadReviewed() {
  const files = (await readdir(reviewedDir)).filter(file => file.endsWith('.json')).sort().reverse()
  const records = await Promise.all(files.map(async file => JSON.parse(await readFile(path.join(reviewedDir, file), 'utf8'))))
  return records.sort((a, b) => String(b.reviewed_at ?? '').localeCompare(String(a.reviewed_at ?? '')))
}
async function storePending(technology, topic = '') {
  const draftId = randomUUID()
  const draft = { draft_id: draftId, status: 'pending', generated_at: new Date().toISOString(), topic, technology }
  await writeFile(path.join(pendingDir, `${draftId}.json`), `${JSON.stringify(draft, null, 2)}\n`, { flag: 'wx' })
  return draft
}
function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data)
}
async function body(req) {
  let raw = ''
  for await (const part of req) { raw += part; if (raw.length > 1_000_000) throw new Error('Request body is too large') }
  return JSON.parse(raw || '{}')
}
function validate(item) {
  if (!item || !item.name?.zh || !item.name?.en || !item.domain_category?.id || !item.description || !item.purpose || !item.paradigm || !Array.isArray(item.key_points) || !item.function_categories?.primary || !Array.isArray(item.function_categories.secondary) || !Array.isArray(item.relations) || !stages.includes(item.stage)) return '欄位不完整或格式錯誤，請確認 JSON 內容。'
  return ''
}
function normalizeName(name) { return String(name ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, '') }
async function generate(topic = '', pendingItems = []) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('請在 admin-tool/.env.local 設定 GEMINI_API_KEY。')
  const items = await loadItems()
  const categories = [...new Map(items.map(item => item.domain_category ?? item.category).filter(Boolean).map(item => [String(item.id), item])).values()]
  const functions = [...new Map(items.flatMap(item => [item.function_categories?.primary, ...(item.function_categories?.secondary ?? [])]).filter(Boolean).map(item => [item.id, item])).values()]
  const technologyIndex = items.map(item => ({
    id: item.id,
    name_zh: item.name?.zh ?? item.name,
    name_en: item.name?.en ?? item.name?.zh ?? item.name,
    category: (item.domain_category ?? item.category)?.name ?? '',
    description: item.description ?? '',
    purpose: item.purpose ?? '',
    paradigm: item.paradigm ?? '',
  }))
  const pendingNames = pendingItems.map(item => item.technology?.name?.zh ?? item.technology?.name?.en).filter(Boolean)
  const topicInstruction = topic
    ? `指定主題：${topic}`
    : '請從人工智慧、程式語言、網路、資料庫、資安、作業系統、雲端與硬體領域中自行挑選一項值得收錄且百科尚未涵蓋的具體科技，並為它建立項目。'
  const prompt = `你是電腦科學百科的審慎編輯。請先用 Google Search 查證主題，再依查到的證據建立一筆繁體中文 JSON 草稿。${topicInstruction}

編輯規則：
- 「harness」在 AI agent 領域可能是泛稱或工程慣例，不一定是標準化技術或單一產品。先辨明實際用法；若沒有一致定義，要在 description 明確寫出「用法尚未標準化」，不要把它包裝成已定義的整合產品。
- 只寫搜尋結果能支持的事實。不要臆造起源、年份、功能、產品、標準或業界共識；缺少證據時以空字串或空陣列表示。
- 不得與以下已收錄項目或待審查草稿重複或只換名稱：已收錄：${items.map(item => item.name?.zh ?? item.name?.en).join('、')}；待審查：${pendingNames.join('、') || '目前沒有'}。
- created_at 只在來源能確認技術起源年份時填 YYYY-01-01，否則填空字串。不要用模型猜年份。
- 只可使用下列既有領域分類與作用分類，欄位值必須完整照抄：
領域分類：${JSON.stringify(categories)}
作用分類：${JSON.stringify(functions)}
- 請逐項檢視下列百科既有項目的 ID、名稱、分類、摘要、用途和典範，判斷是否與新條目有直接技術關係。這份目錄是用來推論百科內部關聯，請確實比較名稱與描述，不要只看搜尋結果。
- 最多回傳 5 個最相關項目；若有明確關係，請至少列出最強的 1 個。只因為同屬「人工智慧」等大分類不算直接關聯；不要為了湊數建立關聯。每個 target_id 必須逐字取自此目錄，target_name 用對應繁體中文名稱。relation_type 只可為 related_technology、implementation、implementation_of、related_language 之一。既有項目目錄：${JSON.stringify(technologyIndex)}
- 概念型條目不要假稱為特定軟體框架。description 說明核心意義及邊界；purpose 說明用途；paradigm 只填來源支持的設計方式，否則留空。key_points 填 2 至 4 點，避免重複或宣傳式語句。
- stage 只可為 research、emerging、growing、mature、maintenance、declining。若主題是泛稱概念，選 emerging 並在 description 說明這是編輯分類，不代表正式標準。
- 回覆只能是 JSON 物件，不要 Markdown 或前言。結構：{"name":{"zh":"","en":""},"domain_category":{"id":1,"name":"","description":""},"stage":"emerging","development_stage":{"value":"emerging","label":"新興階段"},"description":"","purpose":"","paradigm":"","key_points":[],"function_categories":{"primary":{"id":"","name":"","label":"","description":""},"secondary":[]},"created_at":"","relations":[]}`
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-2.5-flash')}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.2 } }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error?.message || `Gemini API 回應 ${response.status}`)
  const generatedText = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('').trim()
  if (!generatedText) throw new Error('Gemini 沒有回傳可用的草稿。')
  const text = generatedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let draft
  try { draft = JSON.parse(text) } catch { throw new Error('Gemini 回覆格式不完整，請再產生一次。') }
  const sources = (payload.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []).flatMap(chunk => chunk.web?.uri ? [{ title: chunk.web.title || chunk.web.uri, url: chunk.web.uri }] : [])
  draft.sources = [...new Map(sources.map(source => [source.url, source])).values()]
  if (!draft.sources.length) throw new Error('Gemini 沒有提供可檢查的搜尋來源，這次草稿未提供。請再試一次。')
  const category = categories.find(item => String(item.id) === String(draft.domain_category?.id))
  if (!category) throw new Error('Gemini 草稿使用了不存在的領域分類，請重新產生。')
  draft.domain_category = category
  const canonical = entry => functions.find(item => item.id === entry?.id)
  const primary = canonical(draft.function_categories?.primary)
  if (!primary) throw new Error('Gemini 草稿使用了不存在的作用分類，請重新產生。')
  draft.function_categories = { primary, secondary: (draft.function_categories.secondary ?? []).map(canonical).filter(item => item && item.id !== primary.id) }
  if (!stages.includes(draft.stage)) throw new Error('Gemini 回傳了無效的發展階段，請再產生一次。')
  if (!Array.isArray(draft.key_points) || !Array.isArray(draft.relations)) throw new Error('Gemini 草稿欄位不完整，請再產生一次。')
  const byId = new Map(items.map(item => [String(item.id), item]))
  const relationTypes = new Set(['related_technology', 'implementation', 'implementation_of', 'related_language'])
  const checkedRelations = (draft.relations ?? []).flatMap(relation => {
    const target = byId.get(String(relation.target_id))
    return target && relationTypes.has(relation.relation_type)
      ? [{ ...relation, target_id: target.id, target_name: target.name?.zh ?? target.name?.en ?? String(target.name) }]
      : []
  })
  draft.relations = [...new Map(checkedRelations.map(relation => [`${relation.target_id}:${relation.relation_type}`, relation])).values()].slice(0, 5)
  draft.development_stage = { value: draft.stage, label: stageLabels[draft.stage] }
  const knownNames = new Set([
    ...items.flatMap(item => [item.name?.zh, item.name?.en]),
    ...pendingItems.flatMap(item => [item.technology?.name?.zh, item.technology?.name?.en]),
  ].map(normalizeName).filter(Boolean))
  if ([draft.name?.zh, draft.name?.en].map(normalizeName).some(name => name && knownNames.has(name))) throw new Error(`Gemini 選到了已收錄或已在待審查的項目「${draft.name?.zh}」，這次沒有建立草稿。`)
  return draft
}
async function recalibrateRelations() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('請在 admin-tool/.env.local 設定 GEMINI_API_KEY。')
  const items = await loadItems()
  const index = items.map(item => ({
    id: String(item.id),
    name_zh: item.name?.zh ?? item.name,
    name_en: item.name?.en ?? item.name?.zh ?? item.name,
    category: (item.domain_category ?? item.category)?.name ?? '',
    description: item.description ?? '',
    purpose: item.purpose ?? '',
    paradigm: item.paradigm ?? '',
    current_relations: (item.relations ?? []).map(relation => ({ id: String(relation.target_id), type: relation.relation_type })),
  }))
  const allowedTypes = ['related_technology', 'implementation', 'implementation_of', 'related_language']
  const prompt = `你是科技百科的關聯資料編輯器。請重新檢查整份科技目錄的 relations，輸出每個項目的新關聯清單。

請依下列定義建立有方向的關聯：
- related_technology：來源和目標之間有明確的技術依賴或組成關係。僅概念相似、常一起使用、互補、同分類或同領域都不算直接關聯。
- implementation：目標項目是來源項目的具體實作（例：語言 -> 該語言的實作）。
- implementation_of：來源項目是目標項目的具體實作（例：實作 -> 被實作的語言或概念）。
- related_language：兩者是直接相關的程式語言。

這是保守的關聯維護，不是把圖補密：
- 現有有效關聯由程式保留。你只回傳「尚未存在」的新增候選，不要重複目前已有關聯，也不要建議刪除既有關聯。
- 新增關聯必須能從條目的摘要、用途或典範指出具體技術連結；不要用「可能相關」或籠統解釋。只有共同使用、相似用途或同一分類時，一律不建立關聯。
- 每個項目最多提出 2 條新關聯；新關聯必須附 0 到 100 的 confidence 和一句可核對的具體 reason；confidence 低於 95 時不要輸出。
- target_id 必須完全取自目錄，不能自行創造。逐項回傳整份清單；沒有明確的新關聯時 relations 為空陣列。不要修改、合併或新增科技項目。

允許的 relation_type：${allowedTypes.join(', ')}
科技目錄：${JSON.stringify(index)}

只回傳 JSON：{"items":[{"id":"項目 ID","relations":[{"target_id":"目標 ID","relation_type":"related_technology","confidence":96,"reason":"一句具體且能從目錄資料核對的技術關係說明"}]}]}`
  const string = { type: 'STRING' }
  const schema = {
    type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      id: string,
      relations: { type: 'ARRAY', items: { type: 'OBJECT', properties: { target_id: string, relation_type: { type: 'STRING', enum: allowedTypes }, confidence: { type: 'INTEGER' }, reason: string }, required: ['target_id', 'relation_type', 'confidence', 'reason'] } },
    }, required: ['id', 'relations'] } } }, required: ['items'],
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL || 'gemini-2.5-flash')}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature: 0.1 } }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error?.message || `Gemini API 回應 ${response.status}`)
  const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('').trim()
  if (!text) throw new Error('Gemini 沒有回傳關聯校準結果。')
  let result
  try { result = JSON.parse(text) } catch { throw new Error('Gemini 關聯結果格式不完整，沒有套用任何變更。') }
  const byId = new Map(items.map(item => [String(item.id), item]))
  const relationRows = new Map((result.items ?? []).map(row => [String(row.id), row]))
  if (relationRows.size !== items.length || items.some(item => !relationRows.has(String(item.id)))) throw new Error('Gemini 沒有逐一回傳所有項目，沒有套用任何變更。')
  return items.map(item => {
    const proposed = relationRows.get(String(item.id)).relations
    if (!Array.isArray(proposed)) throw new Error(`Gemini 未回傳 ${item.id} 的 relations 陣列，沒有套用任何變更。`)
    const currentRelations = (item.relations ?? []).flatMap(relation => {
      const target = byId.get(String(relation.target_id))
      if (!target || target.id === item.id || !allowedTypes.includes(relation.relation_type)) return []
      return [{ ...relation, target_id: target.id, target_name: target.name?.zh ?? target.name?.en ?? String(target.name) }]
    })
    const existingKeys = new Set(currentRelations.map(relation => `${relation.target_id}:${relation.relation_type}`))
    const additions = [...new Map(proposed.flatMap(relation => {
      const target = byId.get(String(relation.target_id))
      const confidence = Number(relation.confidence)
      const reason = String(relation.reason ?? '').trim()
      if (!target || target.id === item.id || !allowedTypes.includes(relation.relation_type) || confidence < 95 || !reason || existingKeys.has(`${target.id}:${relation.relation_type}`)) return []
      return [[`${target.id}:${relation.relation_type}`, { target_id: target.id, target_name: target.name?.zh ?? target.name?.en ?? String(target.name), relation_type: relation.relation_type, confidence, reason }]]
    })).values()].sort((a, b) => b.confidence - a.confidence).slice(0, Math.max(0, Math.min(2, 5 - currentRelations.length)))
    const relations = [...currentRelations, ...additions]
    const current = (item.relations ?? []).map(relation => {
      const target = byId.get(String(relation.target_id))
      const name = relation.target_name ?? target?.name?.zh ?? target?.name?.en ?? String(target?.name ?? relation.target_id)
      return `${target?.id ?? `missing-${relation.target_id}`}:${relation.relation_type}:${name}`
    }).sort()
    const next = relations.map(relation => `${relation.target_id}:${relation.relation_type}:${relation.target_name}`).sort()
    const displayCurrentRelations = (item.relations ?? []).map(relation => {
      const target = byId.get(String(relation.target_id))
      return { ...relation, target_name: relation.target_name ?? target?.name?.zh ?? target?.name?.en ?? String(relation.target_id) }
    })
    return { id: item.id, name: item.name?.zh ?? item.name?.en ?? String(item.name), currentRelations: displayCurrentRelations, proposedRelations: relations, changed: JSON.stringify(current) !== JSON.stringify(next) }
  })
}
async function applyRelationUpdates(updates) {
  if (!Array.isArray(updates) || !updates.length) throw new Error('請勾選至少一筆要套用的關聯變更。')
  const items = await loadItems()
  const byId = new Map(items.map(item => [String(item.id), item]))
  const relationTypes = new Set(['related_technology', 'implementation', 'implementation_of', 'related_language'])
  const seen = new Set()
  const prepared = updates.map(update => {
    const id = String(update.id)
    const item = byId.get(id)
    if (!item || seen.has(id) || !Array.isArray(update.relations) || update.relations.length > 5) throw new Error(`無效的關聯更新項目：${id}`)
    seen.add(id)
    const relations = [...new Map(update.relations.flatMap(relation => {
      const target = byId.get(String(relation.target_id))
      if (!target || target.id === item.id || !relationTypes.has(relation.relation_type)) throw new Error(`項目 ${id} 含有無效關聯。`)
      return [[`${target.id}:${relation.relation_type}`, { target_id: target.id, target_name: target.name?.zh ?? target.name?.en ?? String(target.name), relation_type: relation.relation_type }]]
    })).values()]
    return { item, relations }
  })
  for (const { item, relations } of prepared) {
    const filename = path.join(dataDir, `${item.id}.json`)
    const temp = `${filename}.relations.tmp`
    await writeFile(temp, `${JSON.stringify({ ...item, relations }, null, 2)}\n`)
    await rename(temp, filename)
  }
  return { updated: prepared.length }
}

const scheduleFile = path.join(pendingDir, 'scheduler.state')
const defaultSchedule = { enabled: false, intervalHours: 4, startHour: 9, endHour: 22, dailyLimit: 3, generatedToday: 0, day: '', lastRunAt: null, nextRunAt: null, lastError: '' }
let schedule = { ...defaultSchedule }
let generationBusy = false
async function saveSchedule() {
  await writeFile(scheduleFile, JSON.stringify({ ...schedule, enabled: false, nextRunAt: null }, null, 2))
}
async function loadSchedule() {
  try {
    const stored = JSON.parse(await readFile(scheduleFile, 'utf8'))
    schedule = { ...defaultSchedule, ...stored, enabled: false, nextRunAt: null }
  } catch {}
  const today = taipeiTime().day
  if (schedule.day !== today) { schedule.day = today; schedule.generatedToday = 0 }
}
function taipeiTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const part = type => parts.find(entry => entry.type === type)?.value ?? '00'
  return { day: `${part('year')}-${part('month')}-${part('day')}`, hour: Number(part('hour')), minute: Number(part('minute')) }
}
async function scheduleStatus() {
  return { ...schedule, busy: generationBusy, pendingCount: (await loadPending()).length }
}
async function generateBatch(count) {
  if (generationBusy) throw new Error('目前已有 Gemini 生成工作進行中，請稍後再試。')
  generationBusy = true
  const created = []
  const errors = []
  try {
    for (let index = 0; index < count; index += 1) {
      try {
        const technology = await generate('', await loadPending())
        created.push(await storePending(technology, technology.name?.zh ?? technology.name?.en ?? '自動選題'))
      } catch (error) {
        errors.push(error.message || '生成失敗')
        break
      }
    }
  } finally { generationBusy = false }
  return { created, errors }
}
async function createPendingDraft(topic = '') {
  if (generationBusy) throw new Error('目前已有 Gemini 生成工作進行中，請稍後再試。')
  generationBusy = true
  try {
    const technology = await generate(topic, await loadPending())
    return await storePending(technology, topic || technology.name?.zh || '自動選題')
  } finally { generationBusy = false }
}
async function approveDraft(draftId) {
  if (!/^[a-f0-9-]{36}$/i.test(draftId)) throw new Error('無效的草稿 ID。')
  const pendingPath = path.join(pendingDir, `${draftId}.json`)
  const draft = JSON.parse(await readFile(pendingPath, 'utf8'))
  const technology = structuredClone(draft.technology)
  const issue = validate(technology)
  if (issue) throw new Error(`${draftId}：${issue}`)
  const prefix = categoryPrefixes[technology.domain_category.id] || 'TECH'
  const items = await loadItems()
  const sequence = Math.max(0, ...items.map(item => Number(String(item.id).match(new RegExp(`^${prefix}-(\\d+)$`))?.[1] || 0))) + 1
  technology.id = `${prefix}-${String(sequence).padStart(3, '0')}`
  const itemPath = path.join(dataDir, `${technology.id}.json`)
  const reviewedPath = path.join(reviewedDir, `${draftId}.json`)
  await writeFile(itemPath, `${JSON.stringify(technology, null, 2)}\n`, { flag: 'wx' })
  try {
    await writeFile(reviewedPath, `${JSON.stringify({ ...draft, status: 'approved', reviewed_at: new Date().toISOString(), technology }, null, 2)}\n`, { flag: 'wx' })
    await unlink(pendingPath)
  } catch (error) {
    await unlink(itemPath).catch(() => {})
    await unlink(reviewedPath).catch(() => {})
    throw error
  }
  return { draft_id: draftId, id: technology.id, status: 'approved' }
}
async function rejectDraft(draftId) {
  if (!/^[a-f0-9-]{36}$/i.test(draftId)) throw new Error('無效的草稿 ID。')
  const pendingPath = path.join(pendingDir, `${draftId}.json`)
  const draft = JSON.parse(await readFile(pendingPath, 'utf8'))
  const reviewedPath = path.join(reviewedDir, `${draftId}.json`)
  await writeFile(reviewedPath, `${JSON.stringify({ ...draft, status: 'rejected', reviewed_at: new Date().toISOString() }, null, 2)}\n`, { flag: 'wx' })
  await unlink(pendingPath)
  return { draft_id: draftId, status: 'rejected' }
}
async function reviewBatch(ids, decision) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 200) throw new Error('請選擇 1 到 200 筆草稿。')
  const results = []
  for (const draftId of [...new Set(ids.map(String))]) {
    try { results.push(decision === 'approve' ? await approveDraft(draftId) : await rejectDraft(draftId)) }
    catch (error) { results.push({ draft_id: draftId, error: error.message || '處理失敗' }) }
  }
  return { results, succeeded: results.filter(result => !result.error).length, failed: results.filter(result => result.error).length }
}
async function schedulerTick() {
  if (!schedule.enabled || generationBusy) return
  const now = new Date()
  const local = taipeiTime(now)
  if (schedule.day !== local.day) { schedule.day = local.day; schedule.generatedToday = 0; schedule.nextRunAt = Date.now(); await saveSchedule() }
  if (schedule.generatedToday >= schedule.dailyLimit) { schedule.nextRunAt = null; return }
  if (!schedule.nextRunAt) schedule.nextRunAt = Date.now() + schedule.intervalHours * 60 * 60 * 1000
  if (Date.now() < schedule.nextRunAt || local.hour < schedule.startHour || local.hour >= schedule.endHour) return
  generationBusy = true
  try {
    const technology = await generate('', await loadPending())
    await storePending(technology, technology.name?.zh ?? technology.name?.en ?? '自動選題')
    schedule.generatedToday += 1
    schedule.day = local.day
    schedule.lastRunAt = new Date().toISOString()
    schedule.lastError = ''
    schedule.nextRunAt = schedule.generatedToday >= schedule.dailyLimit ? null : Date.now() + schedule.intervalHours * 60 * 60 * 1000
  } catch (error) {
    schedule.lastError = error.message || '排程生成失敗'
    schedule.nextRunAt = Date.now() + 60 * 60 * 1000
  } finally {
    generationBusy = false
    await saveSchedule()
  }
}
await loadSchedule()
setInterval(() => { void schedulerTick().catch(error => console.error('Scheduler error:', error)) }, 30_000)

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`)
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && (!process.env.ADMIN_TOKEN || req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN)) return send(res, 401, { error: process.env.ADMIN_TOKEN ? '管理 token 不正確' : '請先設定 ADMIN_TOKEN。' })
      if (req.method === 'GET' && url.pathname === '/api/technologies') return send(res, 200, await loadItems())
      if (req.method === 'GET' && url.pathname === '/api/pending') return send(res, 200, await loadPending())
      if (req.method === 'GET' && url.pathname === '/api/reviewed') return send(res, 200, await loadReviewed())
      if (req.method === 'GET' && url.pathname === '/api/scheduler') return send(res, 200, await scheduleStatus())
      if (req.method === 'POST' && url.pathname === '/api/generate') {
        const input = await body(req)
        const topic = String(input.topic || '').trim().slice(0, 300)
        return send(res, 201, await createPendingDraft(topic))
      }
      if (req.method === 'POST' && url.pathname === '/api/pending/generate-batch') {
        const input = await body(req)
        const count = Number(input.count)
        if (!Number.isInteger(count) || count < 1 || count > 5) return send(res, 400, { error: '每批請選擇 1 到 5 筆。' })
        return send(res, 200, await generateBatch(count))
      }
      if (req.method === 'POST' && url.pathname === '/api/scheduler/start') {
        const input = await body(req)
        const intervalHours = Number(input.intervalHours ?? 4)
        const startHour = Number(input.startHour ?? 9)
        const endHour = Number(input.endHour ?? 22)
        const dailyLimit = Number(input.dailyLimit ?? 3)
        if (!Number.isInteger(intervalHours) || intervalHours < 1 || intervalHours > 24 || !Number.isInteger(startHour) || startHour < 0 || startHour > 23 || !Number.isInteger(endHour) || endHour < 1 || endHour > 24 || startHour >= endHour || !Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 20) return send(res, 400, { error: '排程設定無效；請確認間隔、時段和每日上限。' })
        Object.assign(schedule, { intervalHours, startHour, endHour, dailyLimit, enabled: true, nextRunAt: Date.now() + intervalHours * 60 * 60 * 1000, lastError: '' })
        await saveSchedule()
        return send(res, 200, await scheduleStatus())
      }
      if (req.method === 'POST' && url.pathname === '/api/scheduler/stop') {
        schedule.enabled = false; schedule.nextRunAt = null
        await saveSchedule()
        return send(res, 200, await scheduleStatus())
      }
      if (req.method === 'POST' && url.pathname === '/api/review') {
        const input = await body(req)
        if (!['approve', 'reject'].includes(input.decision)) return send(res, 400, { error: '審查動作無效。' })
        return send(res, 200, await reviewBatch(input.ids, input.decision))
      }
      if (req.method === 'POST' && url.pathname === '/api/relations/recalibrate') {
        if (generationBusy) return send(res, 409, { error: '目前已有 Gemini 工作進行中，請稍後再校準。' })
        generationBusy = true
        try { return send(res, 200, { items: await recalibrateRelations() }) }
        finally { generationBusy = false }
      }
      if (req.method === 'POST' && url.pathname === '/api/relations/apply') {
        const input = await body(req)
        return send(res, 200, await applyRelationUpdates(input.updates))
      }
      if (req.method === 'POST' && url.pathname === '/api/technologies') {
        const item = await body(req)
        const issue = validate(item)
        if (issue) return send(res, 400, { error: issue })
        if (item.id) return send(res, 400, { error: '新增資料的 ID 由系統指派。' })
        const prefix = categoryPrefixes[item.domain_category.id] || 'TECH'
        const items = await loadItems()
        const seq = Math.max(0, ...items.map(entry => Number(String(entry.id).match(new RegExp(`^${prefix}-(\\d+)$`))?.[1] || 0))) + 1
        item.id = `${prefix}-${String(seq).padStart(3, '0')}`
        const filename = path.join(dataDir, `${item.id}.json`)
        await writeFile(filename, `${JSON.stringify(item, null, 2)}\n`, { flag: 'wx' })
        return send(res, 201, item)
      }
      const pendingMatch = url.pathname.match(/^\/api\/pending\/([a-f0-9-]{36})$/i)
      if (pendingMatch && req.method === 'PUT') {
        const filename = path.join(pendingDir, `${pendingMatch[1]}.json`)
        const draft = JSON.parse(await readFile(filename, 'utf8'))
        const technology = await body(req)
        const issue = validate(technology)
        if (issue) return send(res, 400, { error: issue })
        if (technology.id) return send(res, 400, { error: '待審查草稿不可自行指定 ID。' })
        const updated = { ...draft, technology }
        const temp = `${filename}.tmp`
        await writeFile(temp, `${JSON.stringify(updated, null, 2)}\n`)
        await rename(temp, filename)
        return send(res, 200, updated)
      }
      const match = url.pathname.match(/^\/api\/technologies\/([A-Z]+-\d{3,})$/)
      if (match && ['PUT', 'DELETE'].includes(req.method)) {
        const id = match[1]
        const filename = path.join(dataDir, `${id}.json`)
        if (!(await readdir(dataDir)).includes(`${id}.json`)) return send(res, 404, { error: '找不到項目。' })
        if (req.method === 'DELETE') { await unlink(filename); return send(res, 200, { id, deleted: true }) }
        const item = await body(req)
        const issue = validate(item)
        if (issue) return send(res, 400, { error: issue })
        item.id = id
        const temp = `${filename}.tmp`
        await writeFile(temp, `${JSON.stringify(item, null, 2)}\n`)
        await rename(temp, filename)
        return send(res, 200, item)
      }
      return send(res, 404, { error: '找不到 API 路由。' })
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8')
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
    const filename = path.resolve(root, 'public', `.${requested}`)
    if (!filename.startsWith(path.resolve(root, 'public') + path.sep)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8')
    const content = await readFile(filename)
    const type = filename.endsWith('.html') ? 'text/html; charset=utf-8' : filename.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8'
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(req.method === 'HEAD' ? undefined : content)
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : 500
    send(res, status, { error: error.message || '伺服器發生錯誤。' })
  }
})

server.listen(port, host, () => console.log(`CS Encyclopedia Admin at http://${host}:${port}\nData directory: ${dataDir}`))
