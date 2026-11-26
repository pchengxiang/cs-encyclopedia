const $ = selector => document.querySelector(selector)
const tokenInput = $('#token')
const tokenKey = 'cs-encyclopedia-admin-token'
let items = []
let pendingItems = []
let reviewedItems = []
let activeView = 'approved'
let selected = null
let selectedKind = ''
let selectedDraftId = ''
let selectedPendingIds = new Set()
let relationPreview = []
let toastTimer
let scheduler = null
let schedulerInitialized = false
tokenInput.value = sessionStorage.getItem(tokenKey) || ''

function showBusy(text) { $('#busy-text').textContent = text; $('#busy').classList.remove('hidden') }
function hideBusy() { $('#busy').classList.add('hidden') }
function notify(message, error = false) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.toggle('error', error); toast.classList.remove('hidden')
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.add('hidden'), 5000)
}
function escaped(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]) }
function namesOf(item) { return `${item.name?.zh || item.name || ''} ${item.name?.en || ''}`.trim() }
function formatTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value))
}
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', 'X-Admin-Token': tokenInput.value.trim(), ...options.headers } })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `請求失敗 (${response.status})`)
  return data
}
function setEditor(item, kind = '', envelope = null) {
  selected = item
  selectedKind = kind
  selectedDraftId = envelope?.draft_id || ''
  $('#editor-kicker').textContent = kind === 'pending' ? `待審查 · ${selectedDraftId.slice(0, 8)}` : kind === 'reviewed' ? `已處理 · ${envelope.status}` : item?.id || 'EDITOR'
  $('#editor-title').textContent = item ? (item.name?.zh || item.name || '未命名項目') : '選取一筆資料'
  $('#placeholder').classList.toggle('hidden', Boolean(item))
  $('#json').classList.toggle('hidden', !item)
  $('#hint').classList.toggle('hidden', !item)
  $('#actions').classList.toggle('hidden', !item || kind === 'reviewed')
  $('#summary').classList.toggle('hidden', !item)
  $('#sources').classList.toggle('hidden', !item?.sources?.length)
  $('#delete').classList.toggle('hidden', !item || kind !== 'approved')
  $('#approve-current').classList.toggle('hidden', kind !== 'pending')
  $('#reject-current').classList.toggle('hidden', kind !== 'pending')
  $('#save').classList.toggle('hidden', !item || kind === 'reviewed')
  $('#json').readOnly = kind === 'reviewed'
  if (!item) { $('#json').value = ''; return }
  $('#json').value = JSON.stringify(item, null, 2)
  const category = item.domain_category ?? item.category
  const badges = [category?.name, item.development_stage?.label || item.stage, kind === 'pending' ? `生成於 ${formatTime(envelope.generated_at)}` : kind === 'reviewed' ? `${envelope.status === 'approved' ? '已核准' : '已退回'} · ${formatTime(envelope.reviewed_at)}` : item.id]
  $('#summary').innerHTML = badges.filter(Boolean).map(value => `<span>${escaped(value)}</span>`).join('')
  $('#sources').innerHTML = item.sources?.length ? `<strong>Gemini 搜尋來源</strong>${item.sources.map(source => `<a href="${escaped(source.url)}" target="_blank" rel="noopener noreferrer">${escaped(source.title)} ↗</a>`).join('')}` : ''
  $('#editor-message').textContent = kind === 'pending' ? '草稿只存在待審查資料夾；核准後才會進入百科。' : '可編輯完整 JSON。'
  renderLibrary()
}
function updatePendingSelection() {
  const count = selectedPendingIds.size
  $('#selected-pending-count').textContent = count ? `已選 ${count} 筆` : '未選取項目'
  $('#batch-approve').disabled = count === 0
  $('#batch-reject').disabled = count === 0
}
function renderLibrary() {
  $('#approved-count').textContent = items.length
  $('#pending-count').textContent = pendingItems.length
  $('#reviewed-count').textContent = reviewedItems.length
  document.querySelectorAll('.library-tabs button').forEach(button => button.classList.toggle('active', button.dataset.view === activeView))
  const titles = { approved: '已收錄資料', pending: '待審查草稿', reviewed: '審查處理紀錄' }
  $('#library-title').textContent = titles[activeView]
  $('#pending-batch').classList.toggle('hidden', activeView !== 'pending')
  const keyword = $('#search').value.trim().toLocaleLowerCase()
  const filtered = activeView === 'approved'
    ? items.filter(item => `${item.id} ${namesOf(item)} ${item.description}`.toLocaleLowerCase().includes(keyword))
    : activeView === 'pending'
      ? pendingItems.filter(draft => `${draft.draft_id} ${namesOf(draft.technology)} ${draft.topic}`.toLocaleLowerCase().includes(keyword))
      : reviewedItems.filter(record => `${record.draft_id} ${record.technology?.id} ${namesOf(record.technology)} ${record.status}`.toLocaleLowerCase().includes(keyword))
  if (activeView === 'pending') {
    const existing = new Set(pendingItems.map(draft => draft.draft_id))
    selectedPendingIds = new Set([...selectedPendingIds].filter(id => existing.has(id)))
    $('#items').innerHTML = filtered.length ? filtered.map(draft => `<div class="item pending-item ${selectedDraftId === draft.draft_id ? 'active' : ''}"><input type="checkbox" data-pending-check="${escaped(draft.draft_id)}" aria-label="選取 ${escaped(namesOf(draft.technology))}" ${selectedPendingIds.has(draft.draft_id) ? 'checked' : ''}><button class="item-open" data-open-pending="${escaped(draft.draft_id)}"><span class="item-id">${escaped(draft.draft_id.slice(0, 8))} · ${escaped(formatTime(draft.generated_at))}</span><strong>${escaped(namesOf(draft.technology))}</strong><small>${escaped((draft.technology.domain_category ?? draft.technology.category)?.name || '待分類')}</small></button></div>`).join('') : '<p class="empty">目前沒有待審查草稿</p>'
    updatePendingSelection()
  } else if (activeView === 'approved') {
    $('#items').innerHTML = filtered.length ? filtered.map(item => `<button class="item ${selectedKind === 'approved' && selected?.id === item.id ? 'active' : ''}" data-open-approved="${escaped(item.id)}"><span class="item-id">${escaped(item.id)}</span><strong>${escaped(namesOf(item))}</strong><small>${escaped((item.domain_category ?? item.category)?.name || '未分類')}</small></button>`).join('') : '<p class="empty">沒有符合的項目</p>'
  } else {
    $('#items').innerHTML = filtered.length ? filtered.map(record => `<button class="item ${selectedKind === 'reviewed' && selectedDraftId === record.draft_id ? 'active' : ''}" data-open-reviewed="${escaped(record.draft_id)}"><span class="item-id">${record.status === 'approved' ? '已核准' : '已退回'} · ${escaped(formatTime(record.reviewed_at))}</span><strong>${escaped(namesOf(record.technology))}</strong><small>${escaped(record.technology?.id || record.draft_id.slice(0, 8))}</small></button>`).join('') : '<p class="empty">目前沒有處理紀錄</p>'
  }
}
async function reload() {
  showBusy('更新項目清單')
  try {
    const [newItems, newPending, newReviewed] = await Promise.all([api('/api/technologies'), api('/api/pending'), api('/api/reviewed')])
    items = newItems; pendingItems = newPending; reviewedItems = newReviewed
    renderLibrary()
    if (selectedKind === 'approved' && selected) setEditor(items.find(item => item.id === selected.id) || null, 'approved')
    if (selectedKind === 'pending' && selectedDraftId) {
      const draft = pendingItems.find(item => item.draft_id === selectedDraftId)
      if (draft) setEditor(draft.technology, 'pending', draft); else setEditor(null)
    }
    if (selectedKind === 'reviewed' && selectedDraftId) {
      const record = reviewedItems.find(item => item.draft_id === selectedDraftId)
      if (record) setEditor(record.technology, 'reviewed', record); else setEditor(null)
    }
  } catch (error) { notify(error.message, true) }
  finally { hideBusy() }
}
async function saveCurrent() {
  if (!selected) return null
  const edited = JSON.parse($('#json').value)
  if (selectedKind === 'pending') {
    const saved = await api(`/api/pending/${encodeURIComponent(selectedDraftId)}`, { method: 'PUT', body: JSON.stringify(edited) })
    await reload(); setEditor(saved.technology, 'pending', saved); return saved
  }
  const saved = await api(`/api/technologies/${encodeURIComponent(selected.id)}`, { method: 'PUT', body: JSON.stringify(edited) })
  await reload(); setEditor(saved, 'approved'); return saved
}
async function review(ids, decision) {
  if (!ids.length) return
  const verb = decision === 'approve' ? '核准並收錄' : '退回'
  if (!window.confirm(`確定${verb} ${ids.length} 筆待審查草稿？`)) return
  showBusy(decision === 'approve' ? '核准項目中' : '退回項目中')
  try {
    if (selectedKind === 'pending' && ids.includes(selectedDraftId)) await saveCurrent()
    const result = await api('/api/review', { method: 'POST', body: JSON.stringify({ ids, decision }) })
    selectedPendingIds = new Set([...selectedPendingIds].filter(id => !ids.includes(id)))
    await reload()
    if (result.failed) notify(`完成 ${result.succeeded} 筆，${result.failed} 筆未完成：${result.results.filter(row => row.error).map(row => row.error).join('；')}`, true)
    else notify(`${decision === 'approve' ? '已核准並收錄' : '已退回'} ${result.succeeded} 筆草稿。`)
    if (ids.length === 1 && decision === 'approve') {
      const approved = result.results[0]?.id
      if (approved) setEditor(items.find(item => item.id === approved) || null, 'approved')
    } else if (selectedKind === 'pending' && ids.includes(selectedDraftId)) setEditor(null)
  } catch (error) { notify(error.message, true) }
  finally { hideBusy() }
}
async function refreshScheduler() {
  try {
    const previousPending = Number($('#pending-count').textContent) || 0
    scheduler = await api('/api/scheduler')
    $('#scheduler-status').textContent = scheduler.enabled
      ? `執行中 · 下次檢查 ${scheduler.nextRunAt ? formatTime(scheduler.nextRunAt) : '等待明日額度重置'} · 今日 ${scheduler.generatedToday}/${scheduler.dailyLimit} 筆 · 待審查 ${scheduler.pendingCount} 筆`
      : `排程關閉 · 今日已生成 ${scheduler.generatedToday}/${scheduler.dailyLimit} 筆 · 待審查 ${scheduler.pendingCount} 筆`
    if (scheduler.lastError) $('#scheduler-status').textContent += ` · 最近錯誤：${scheduler.lastError}`
    $('#scheduler-toggle').textContent = scheduler.enabled ? '暫停排程' : '啟用排程'
    $('#scheduler-toggle').classList.toggle('stop', scheduler.enabled)
    $('#scheduler-toggle').disabled = scheduler.busy
    document.querySelectorAll('.schedule-settings input').forEach(input => { input.disabled = scheduler.enabled })
    if (!schedulerInitialized || scheduler.enabled) {
      if (scheduler.intervalHours) $('#interval-hours').value = scheduler.intervalHours
      if (scheduler.startHour !== undefined) $('#start-hour').value = scheduler.startHour
      if (scheduler.endHour !== undefined) $('#end-hour').value = scheduler.endHour
      if (scheduler.dailyLimit) $('#daily-limit').value = scheduler.dailyLimit
    }
    if (scheduler.pendingCount !== pendingItems.length) {
      pendingItems = await api('/api/pending')
      renderLibrary()
      if (schedulerInitialized && pendingItems.length > previousPending) notify(`新增待審查草稿，目前共 ${pendingItems.length} 筆。`)
    }
    schedulerInitialized = true
  } catch {}
}

$('#items').addEventListener('click', event => {
  const checkbox = event.target.closest('[data-pending-check]')
  if (checkbox) {
    if (checkbox.checked) selectedPendingIds.add(checkbox.dataset.pendingCheck)
    else selectedPendingIds.delete(checkbox.dataset.pendingCheck)
    updatePendingSelection(); return
  }
  const approved = event.target.closest('[data-open-approved]')
  if (approved) setEditor(items.find(item => String(item.id) === approved.dataset.openApproved), 'approved')
  const pending = event.target.closest('[data-open-pending]')
  if (pending) { const draft = pendingItems.find(item => item.draft_id === pending.dataset.openPending); if (draft) setEditor(draft.technology, 'pending', draft) }
  const reviewed = event.target.closest('[data-open-reviewed]')
  if (reviewed) { const record = reviewedItems.find(item => item.draft_id === reviewed.dataset.openReviewed); if (record) setEditor(record.technology, 'reviewed', record) }
})
document.querySelector('.library-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-view]')
  if (!button) return
  activeView = button.dataset.view; setEditor(null); renderLibrary()
})
$('#search').addEventListener('input', renderLibrary)
$('#reload').addEventListener('click', reload)
$('#select-all-pending').addEventListener('click', () => {
  const visible = pendingItems.filter(draft => `${draft.draft_id} ${namesOf(draft.technology)} ${draft.topic}`.toLocaleLowerCase().includes($('#search').value.trim().toLocaleLowerCase()))
  const allVisibleSelected = visible.length && visible.every(draft => selectedPendingIds.has(draft.draft_id))
  if (allVisibleSelected) visible.forEach(draft => selectedPendingIds.delete(draft.draft_id))
  else visible.forEach(draft => selectedPendingIds.add(draft.draft_id))
  renderLibrary()
})
$('#batch-approve').addEventListener('click', () => void review([...selectedPendingIds], 'approve'))
$('#batch-reject').addEventListener('click', () => void review([...selectedPendingIds], 'reject'))
$('#token').addEventListener('change', () => { sessionStorage.setItem(tokenKey, tokenInput.value.trim()); notify('管理 token 已更新') })
$('#generate-form').addEventListener('submit', async event => {
  event.preventDefault(); showBusy('Gemini 正在建立待審查草稿')
  try {
    const draft = await api('/api/generate', { method: 'POST', body: JSON.stringify({ topic: $('#topic').value.trim() }) })
    $('#topic').value = ''; activeView = 'pending'; await reload(); setEditor(draft.technology, 'pending', draft); notify('草稿已放入待審查佇列。')
  } catch (error) { notify(error.message, true) }
  finally { hideBusy() }
})
$('#batch-generate-button').addEventListener('click', async () => {
  const count = Number($('#batch-count').value)
  $('#batch-generate-button').disabled = true; showBusy(`Gemini 正在依序產生 ${count} 筆草稿`)
  try {
    const result = await api('/api/pending/generate-batch', { method: 'POST', body: JSON.stringify({ count }) })
    activeView = 'pending'; await reload()
    const message = result.created.length ? `已新增 ${result.created.length} 筆待審查草稿。` : '這批沒有產生可用草稿。'
    notify(result.errors.length ? `${message} ${result.errors.join('；')}` : message, Boolean(result.errors.length))
  } catch (error) { notify(error.message, true) }
  finally { $('#batch-generate-button').disabled = false; hideBusy() }
})
$('#scheduler-toggle').addEventListener('click', async () => {
  $('#scheduler-toggle').disabled = true; showBusy(scheduler?.enabled ? '正在暫停排程' : '正在啟用排程')
  try {
    if (scheduler?.enabled) scheduler = await api('/api/scheduler/stop', { method: 'POST', body: '{}' })
    else scheduler = await api('/api/scheduler/start', { method: 'POST', body: JSON.stringify({ intervalHours: Number($('#interval-hours').value), startHour: Number($('#start-hour').value), endHour: Number($('#end-hour').value), dailyLimit: Number($('#daily-limit').value) }) })
    await refreshScheduler(); notify(scheduler.enabled ? '自動生成排程已啟用。' : '自動生成排程已暫停。')
  } catch (error) { notify(error.message, true) }
  finally { $('#scheduler-toggle').disabled = false; hideBusy() }
})
$('#save').addEventListener('click', async () => {
  showBusy(selectedKind === 'pending' ? '儲存草稿' : '儲存項目')
  try { await saveCurrent(); notify(selectedKind === 'pending' ? '草稿已更新。' : '項目已儲存。') }
  catch (error) { notify(error.message, true) }
  finally { hideBusy() }
})
$('#approve-current').addEventListener('click', () => void review([selectedDraftId], 'approve'))
$('#reject-current').addEventListener('click', () => void review([selectedDraftId], 'reject'))
$('#delete').addEventListener('click', async () => {
  if (!selected || !window.confirm(`確定刪除「${namesOf(selected)}」(${selected.id})？此操作會刪除 JSON 資料檔。`)) return
  showBusy('刪除中')
  try { await api(`/api/technologies/${encodeURIComponent(selected.id)}`, { method: 'DELETE' }); setEditor(null); await reload(); notify('項目已刪除') }
  catch (error) { notify(error.message, true) }
  finally { hideBusy() }
})

const relationTypeLabels = { related_technology: '相關技術', implementation: '實作', implementation_of: '實作對象', related_language: '相關語言' }
function relationsMarkup(relations) {
  return relations.length
    ? `<ul>${relations.map(relation => `<li>${escaped(relation.target_name || relation.target_id)} <small>${escaped(relationTypeLabels[relation.relation_type] || relation.relation_type)}</small>${relation.reason ? `<span class="relation-reason">${escaped(relation.reason)}（信心 ${escaped(relation.confidence)}/100）</span>` : ''}</li>`).join('')}</ul>`
    : '<span class="no-relations">無關聯</span>'
}
function updateRelationSelection() {
  const changed = relationPreview.filter(row => row.changed).length
  const checked = document.querySelectorAll('#relation-rows [data-rel-check]:checked').length
  $('#relation-count').textContent = `${relationPreview.length} 個項目已重新檢視；${changed} 個有差異，目前勾選 ${checked} 個。`
  $('#apply-relations').disabled = checked === 0
}
function renderRelationPreview() {
  $('#relation-rows').innerHTML = relationPreview.map(row => `<article class="relation-row ${row.changed ? 'has-changes' : ''}"><label class="relation-row-title"><input type="checkbox" data-rel-check="${escaped(row.id)}" ${row.changed ? '' : 'disabled'}><span><strong>${escaped(row.name)}</strong><small>${escaped(row.id)}${row.changed ? ' · 有變更' : ' · 無差異'}</small></span></label><div class="relation-columns"><div><b>現有關聯</b>${relationsMarkup(row.currentRelations)}</div><div><b>Gemini 建議</b>${relationsMarkup(row.proposedRelations)}</div></div></article>`).join('')
  updateRelationSelection()
}
$('#recalibrate').addEventListener('click', async () => {
  $('#recalibrate').disabled = true; showBusy('Gemini 正在重新檢視所有科技關聯')
  try { const result = await api('/api/relations/recalibrate', { method: 'POST', body: '{}' }); relationPreview = result.items; renderRelationPreview(); $('#relation-preview').classList.remove('hidden') }
  catch (error) { notify(error.message, true) }
  finally { $('#recalibrate').disabled = false; hideBusy() }
})
$('#close-relations').addEventListener('click', () => $('#relation-preview').classList.add('hidden'))
$('#relation-rows').addEventListener('change', updateRelationSelection)
$('#apply-relations').addEventListener('click', async () => {
  const ids = [...document.querySelectorAll('#relation-rows [data-rel-check]:checked')].map(input => input.dataset.relCheck)
  const updates = relationPreview.filter(row => ids.includes(String(row.id)) && row.changed).map(row => ({ id: row.id, relations: row.proposedRelations }))
  if (!updates.length) { notify('請先勾選要套用的項目。', true); return }
  if (!window.confirm(`確定更新 ${updates.length} 個項目的 relations？其他資料欄位不會變更。`)) return
  $('#apply-relations').disabled = true; showBusy('正在套用關聯')
  try { const result = await api('/api/relations/apply', { method: 'POST', body: JSON.stringify({ updates }) }); $('#relation-preview').classList.add('hidden'); await reload(); notify(`已更新 ${result.updated} 個項目的 relations。`) }
  catch (error) { notify(error.message, true) }
  finally { $('#apply-relations').disabled = false; hideBusy() }
})

async function poll() { await refreshScheduler() }
void Promise.all([reload(), refreshScheduler()])
setInterval(() => { void poll() }, 60_000)
