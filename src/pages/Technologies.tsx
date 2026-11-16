import { useEffect, useState } from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
  Pagination,
  SearchBox,
  TechCard,
} from '../components/UI'
import type { Category, PaginatedTechnologies, Stage } from '../types'
import { STAGES } from '../types'
import { functionCategories } from '../data/functionCategories'

export default function Technologies() {
  const [params, setParams] = useSearchParams()
  const keyword = params.get('keyword') ?? ''
  const category = params.get('category') ?? ''
  const functionCategory = params.get('function_category') ?? ''
  const stage = params.get('stage') ?? ''
  const page = Number(params.get('page') ?? 1)

  const [draft, setDraft] = useState(keyword)
  const [categories, setCategories] = useState<Category[]>([])
  const [data, setData] = useState<PaginatedTechnologies | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retry, setRetry] = useState(0)

  useEffect(() => setDraft(keyword), [keyword])

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let live = true
    setStatus('loading')

    api
      .listTechnologies({
        keyword,
        category_id: category ? Number(category) : undefined,
        function_category_id: functionCategory || undefined,
        stage: stage ? (stage as Stage) : undefined,
        page,
        limit: 8,
      })
      .then((result) => {
        if (live) {
          setData(result)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (live) setStatus('error')
      })

    return () => {
      live = false
    }
  }, [keyword, category, functionCategory, stage, page, retry])

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setParams(next)
  }

  const clear = () => {
    setDraft('')
    setParams({})
  }

  return (
    <div className="listing-page">
      <div className="listing-top">
        <PageIntro
          eyebrow="技術索引 / INDEX"
          title="探索技術"
          description="依知識領域、技術作用與發展階段篩選，找到下一條知識脈絡。"
        />
        <div className="listing-total">
          <span>目前收錄</span>
          <b>{status === 'ready' ? String(data?.total ?? 0).padStart(2, '0') : '—'}</b>
          <small>項技術</small>
        </div>
      </div>

      <div className="listing-tools">
        <SearchBox
          value={draft}
          onChange={setDraft}
          onSubmit={() => update('keyword', draft)}
          placeholder="搜尋技術名稱或描述…"
        />
        <div className="filter-row">
          <span className="filter-label">
            <SlidersHorizontal size={15} /> 篩選條件
          </span>
          <label className="select-wrap">
            <select value={category} onChange={(event) => update('category', event.target.value)}>
          <option value="">領域分類：全部</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} />
          </label>
          <label className="select-wrap">
            <select value={functionCategory} onChange={(event) => update('function_category', event.target.value)}>
              <option value="">作用分類：全部</option>
              {functionCategories.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}
            </select>
            <ChevronDown size={15} />
          </label>
          <label className="select-wrap">
            <select value={stage} onChange={(event) => update('stage', event.target.value)}>
              <option value="">所有階段</option>
              {Object.entries(STAGES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown size={15} />
          </label>
          {(keyword || category || functionCategory || stage) && (
            <button className="clear-filters" onClick={clear}>
              清除篩選 <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="results-heading">
        <span>技術清單</span>
        <span>{status === 'ready' ? `${data?.total ?? 0} 項結果` : ''}</span>
      </div>

      {status === 'loading' ? (
        <LoadingState label="正在搜尋技術索引" />
      ) : status === 'error' ? (
        <ErrorState
          message="無法取得技術列表，請確認網路或 API 設定。"
          onRetry={() => setRetry((current) => current + 1)}
        />
      ) : data?.items.length ? (
        <>
          <div className="tech-grid listing-grid">
            {data.items.map((technology) => (
              <TechCard key={technology.id} tech={technology} />
            ))}
          </div>
          <Pagination
            page={page}
            total={data.total}
            limit={data.limit}
            onChange={(nextPage) => {
              const next = new URLSearchParams(params)
              next.set('page', String(nextPage))
              setParams(next)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
