import { mockCategories, mockTechnologies } from '../data/mock'
import { getFunctionCategory } from '../data/functionCategories'
import type { Category, FunctionCategoryAssignment, PaginatedTechnologies, Relation, Stage, Technology, TechnologyQuery } from '../types'

const mode = import.meta.env.VITE_API_MODE ?? 'mock'
const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const pause = () => new Promise(resolve => setTimeout(resolve, 220))

type ApiTechnology = Omit<Technology, 'id' | 'name' | 'category' | 'stage' | 'relations'> & {
  id: number | string
  name: string | { zh?: string; en?: string }
  category?: Category
  domain_category?: Category
  stage?: Stage
  development_stage?: { value: Stage; label: string }
  function_categories?: FunctionCategoryAssignment
  relations?: Array<Relation | { id: number | string; name: string; relation_type: string }>
}

function normalizeTechnology(record: ApiTechnology): Technology {
  const category = record.domain_category ?? record.category ?? { id: -1, name: '尚未標記領域' }
  const normalizedCategory = { ...category, id: Number(category.id) }
  const stage = record.development_stage?.value ?? record.stage
  return {
    ...record,
    id: record.id,
    name: typeof record.name === 'string' ? record.name : record.name.zh ?? record.name.en ?? '未命名技術',
    category: normalizedCategory,
    stage,
    development_stage: record.development_stage ?? (stage ? { value: stage, label: stage } : undefined),
    function_categories: record.function_categories ? {
      primary: getFunctionCategory(record.function_categories.primary.id) ?? record.function_categories.primary,
      secondary: record.function_categories.secondary.map(item => getFunctionCategory(item.id) ?? item),
    } : undefined,
    relations: (record.relations ?? []).map(relation => 'target_id' in relation
      ? relation
      : { target_id: relation.id, target_name: relation.name, relation_type: relation.relation_type }),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) throw new Error(`API 請求失敗（${response.status}）`)
  return response.json() as Promise<T>
}

export const api = {
  async listTechnologies(query: TechnologyQuery = {}): Promise<PaginatedTechnologies> {
    if (mode !== 'mock') {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value))
      })
      const result = await request<Omit<PaginatedTechnologies, 'items'> & { items: ApiTechnology[] }>(`/api/technologies?${params}`)
      return { ...result, items: result.items.map(normalizeTechnology) }
    }

    await pause()
    const keyword = query.keyword?.toLocaleLowerCase().trim()
    const filtered = mockTechnologies.filter(technology => {
      const functionCategories = technology.function_categories ? [technology.function_categories.primary, ...technology.function_categories.secondary] : []
      const functionNames = functionCategories.map(category => category.name).join(' ')
      return (!keyword || `${technology.name} ${technology.description} ${technology.category.name} ${functionNames}`.toLocaleLowerCase().includes(keyword))
        && (!query.category_id || technology.category.id === Number(query.category_id))
        && (!query.function_category_id || functionCategories.some(category => category.id === query.function_category_id))
        && (!query.stage || technology.stage === query.stage)
    })
    const page = query.page ?? 1
    const limit = query.limit ?? 8
    return { items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit }
  },

  async getTechnology(id: number | string): Promise<Technology> {
    if (mode !== 'mock') return request<ApiTechnology>(`/api/technologies/${id}`).then(normalizeTechnology)
    await pause()
    const item = mockTechnologies.find(technology => technology.id === Number(id))
    if (!item) throw new Error('找不到這項技術')
    return item
  },

  async getCategories(): Promise<Category[]> {
    if (mode !== 'mock') return request('/api/categories')
    await pause()
    return mockCategories.map(category => ({ ...category, count: mockTechnologies.filter(technology => technology.category.id === category.id).length }))
  },

  async getRecentTechnologies(limit = 4): Promise<Technology[]> {
    if (mode !== 'mock') return this.listTechnologies({ page: 1, limit }).then(result => result.items)
    await pause()
    return [...mockTechnologies].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || String(b.id).localeCompare(String(a.id), undefined, { numeric: true })).slice(0, limit)
  },
}
