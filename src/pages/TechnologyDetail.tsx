import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, Network } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { ErrorState, LoadingState, StagePill, TechCard } from '../components/UI'
import type { Technology } from '../types'

export default function TechnologyDetail() {
  const { id } = useParams()
  const [tech, setTech] = useState<Technology | null>(null)
  const [related, setRelated] = useState<Technology[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let live = true
    setStatus('loading')
    api.getTechnology(id!).then(async item => {
      const neighbors = await Promise.all(item.relations.slice(0, 3).map(r => api.getTechnology(r.target_id).catch(() => null)))
      if (live) {
        setTech(item)
        setRelated(neighbors.filter((n): n is Technology => n !== null))
        setStatus('ready')
      }
    }).catch(() => { if (live) setStatus('error') })
    return () => { live = false }
  }, [id, retry])

  if (status === 'loading') return <div className="detail-page"><LoadingState label="正在載入技術條目"/></div>
  if (status === 'error' || !tech) return <div className="detail-page"><ErrorState message="找不到這項技術，或目前無法連線。" onRetry={() => setRetry(x => x + 1)}/><Link className="back-link" to="/technologies"><ArrowLeft size={15}/> 返回技術索引</Link></div>
  const stage = tech.development_stage?.value ?? tech.stage
  const categoryLabel = tech.category.id > 0 ? <Link to={`/technologies?category=${tech.category.id}`}>{tech.category.name}</Link> : <span>{tech.category.name}</span>

  return <div className="detail-page">
    <div className="breadcrumbs"><Link to="/">首頁</Link><ChevronRight size={14}/><Link to="/technologies">技術索引</Link><ChevronRight size={14}/>{categoryLabel}<ChevronRight size={14}/><span>{tech.name}</span></div>
    <article className="detail-main">
      <Link className="back-link" to="/technologies"><ArrowLeft size={15}/> 所有技術</Link>
      <div className="detail-title"><span className="eyebrow"><i/>{tech.category.name}</span><h1>{tech.name}</h1>{stage && <StagePill stage={stage} label={tech.development_stage?.label}/>}</div>
      <p className="detail-description">{tech.description}</p>
      <div className="detail-meta"><div><span>領域分類</span>{tech.category.id > 0 ? <Link to={`/technologies?category=${tech.category.id}`}>{tech.category.name}<ArrowUpRight size={13}/></Link> : <b>{tech.category.name}</b>}</div>{stage && <div><span>發展階段</span><StagePill stage={stage} label={tech.development_stage?.label}/></div>}{tech.created_at && <div><span>技術起源</span><b><CalendarDays size={14}/>{tech.created_at.slice(0, 4)}</b></div>}</div>
    </article>

    <section className="context-section">
      <div className="context-heading"><span className="aside-icon"><Network size={17}/></span><div><span className="eyebrow">TECHNICAL CONTEXT</span><h2>技術脈絡</h2></div><p>理解這項技術為何存在、採用什麼設計方式，以及它與其他技術的關係。</p></div>
      <div className="function-assignments">{tech.function_categories ? <><div className="function-role"><span>主要作用</span><Link title={tech.function_categories.primary.description} to={`/technologies?function_category=${tech.function_categories.primary.id}`}><b>{tech.function_categories.primary.id}</b>{tech.function_categories.primary.name}<small>{tech.function_categories.primary.label}</small></Link></div>{tech.function_categories.secondary.length > 0 && <div className="function-role"><span>次要作用</span><div className="function-role-list">{tech.function_categories.secondary.map(category => <Link key={category.id} title={category.description} to={`/technologies?function_category=${category.id}`}><b>{category.id}</b>{category.name}<small>{category.label}</small></Link>)}</div></div>}</> : <div className="function-role"><span>作用分類</span><p>此條目尚未提供作用分類資料。</p></div>}</div>
      <div className="context-facts">
        <div className="context-fact"><span>存在目的</span><p>{tech.purpose || tech.description}</p></div>
        <div className="context-fact"><span>設計典範／類型</span><p>{tech.paradigm || '依實際應用與實作方式而定'}</p></div>
        {tech.key_points?.length ? <div className="context-fact context-fact-points"><span>重要特性</span><div className="context-tags">{tech.key_points.map(point => <span key={point}>{point}</span>)}</div></div> : null}
      </div>
      <div className="context-relations"><div className="relation-heading"><b>關聯技術</b><span>從實作、相關語言或生態系繼續理解</span></div><div className="relation-list">{tech.relations.length ? tech.relations.map(r => <Link key={r.target_id} to={`/technologies/${r.target_id}`} className="relation-item"><span className="relation-line"/><span className="relation-text"><b>{r.target_name}</b><small>{{implementation:'實作',implementation_of:'實作對象',related_language:'相關語言',ecosystem:'生態系',related_technology:'相關技術'}[r.relation_type] ?? r.relation_type}</small></span><ArrowRight size={15}/></Link>) : <span className="relation-empty">目前沒有關聯技術。</span>}</div><Link to={`/technologies?category=${tech.category.id}`} className="aside-more">依領域探索「{tech.category.name}」<ArrowUpRight size={14}/></Link></div>
    </section>

    {related.length > 0 && <section className="related-section"><div className="section-heading"><div><span className="eyebrow">繼續探索 / KEEP EXPLORING</span><h2>相關技術</h2></div><Link className="section-link" to="/technologies">完整技術索引 <ArrowUpRight size={15}/></Link></div><div className="tech-grid related-grid">{related.map(item => <TechCard key={item.id} tech={item} compact/>)}</div></section>}
  </div>
}
