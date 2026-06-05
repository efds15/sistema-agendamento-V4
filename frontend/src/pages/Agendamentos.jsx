import { useState, useEffect, useMemo } from 'react'
import { bookings as bookingsApi, teachers as teachersApi, resources as resourcesApi } from '../services/api'
import { toast, Card, Badge, StatusBadge, Spinner, Empty, Modal, Field, Input, Select, Table, Tr, Td, SearchInput, FormGrid, Avatar, useSortPage } from '../components/UI'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'

// Formata data vinda do MySQL (pode ser Date obj, string "2025-05-27", ou "2025-05-27T00:00:00.000Z")
function fmtDate(val, opts) {
  if (!val) return '—'
  try {
    let s = val
    if (val instanceof Date) s = val.toISOString().split('T')[0]
    else if (typeof val === 'string') s = val.split('T')[0]
    const [y, m, d] = s.split('-')
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    return dt.toLocaleDateString('pt-BR', opts)
  } catch { return String(val) }
}

// Garante formato HH:MM de time vindo do MySQL
function fmtTime(val) {
  if (!val) return '—'
  if (typeof val === 'string') return val.substring(0, 5)
  return String(val)
}

const FILTERS = [
  { key:'todos',      label:'Todos'      },
  { key:'confirmado', label:'Confirmados'},
  { key:'pendente',   label:'Pendentes'  },
  { key:'cancelado',  label:'Cancelados' },
]

export default function Agendamentos() {
  const { isAdmin } = useAuth()
  const [list, setList]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('todos')
  const [search, setSearch]         = useState('')
  const [detailModal, setDetail]    = useState(null)
  const [editModal, setEdit]        = useState(null)
  const [teachers, setTeachers]     = useState([])
  const [resources, setResources]   = useState([])
  const [saving, setSaving]         = useState(false)
  const [dateFilter, setDateFilter] = useState('')

  const load = () => {
    setLoading(true)
    bookingsApi.list().then(r => { setList(r.data); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    teachersApi.list().then(r => setTeachers(r.data)).catch(() => {})
    resourcesApi.list().then(r => setResources(r.data)).catch(() => {})
  }, [])

  const filtered = useMemo(() => list
    .filter(b => filter === 'todos' || b.status === filter)
    .filter(b => {
      if (!dateFilter) return true
      const bDate = b.date instanceof Date
        ? b.date.toISOString().split('T')[0]
        : String(b.date).split('T')[0]
      return bDate === dateFilter
    })
    .filter(b => {
      if (!search) return true
      const q = search.toLowerCase()
      return b.teacher?.name?.toLowerCase().includes(q)
          || b.resource?.name?.toLowerCase().includes(q)
          || b.purpose?.toLowerCase().includes(q)
    }),
  [list, filter, dateFilter, search])

  const { paged, sortCol, sortDir, onSort, page, totalPages, total, pageSize, setPage } =
    useSortPage(filtered, { defaultKey: 'date', defaultDir: 'asc' })

  const counts = {
    todos:      list.length,
    confirmado: list.filter(b => b.status === 'confirmado').length,
    pendente:   list.filter(b => b.status === 'pendente').length,
    cancelado:  list.filter(b => b.status === 'cancelado').length,
  }

  async function handleCancel(id) {
    if (!confirm('Cancelar este agendamento?')) return
    try { await bookingsApi.cancel(id); toast('Agendamento cancelado', 'warning'); load() }
    catch { toast('Erro ao cancelar', 'error') }
  }

  async function handleConfirm(id) {
    try { await bookingsApi.update(id, { status: 'confirmado' }); toast('Confirmado!'); load() }
    catch { toast('Erro', 'error') }
  }

  async function handleSaveEdit() {
    if (!editModal) return
    setSaving(true)
    try {
      await bookingsApi.update(editModal.id, {
        date:       editModal.date,
        startTime:  editModal.startTime || editModal.start_time,
        endTime:    editModal.endTime   || editModal.end_time,
        purpose:    editModal.purpose,
        teacherId:  parseInt(editModal.teacherId  || editModal.teacher_id),
        resourceId: parseInt(editModal.resourceId || editModal.resource_id),
        status:     editModal.status,
      })
      toast('Agendamento atualizado!')
      setEdit(null); load()
    } catch (e) { toast(e.response?.data?.error || 'Erro ao salvar', 'error') }
    finally { setSaving(false) }
  }

  function openEdit(b) {
    // normaliza campos snake_case → camelCase
    const date = b.date instanceof Date
      ? b.date.toISOString().split('T')[0]
      : (typeof b.date === 'string' ? b.date.split('T')[0] : b.date)
    setEdit({
      ...b,
      date,
      startTime:  fmtTime(b.start_time  || b.startTime),
      endTime:    fmtTime(b.end_time    || b.endTime),
      teacherId:  b.teacher_id  || b.teacherId,
      resourceId: b.resource_id || b.resourceId,
    })
  }

  return (
    <div>
      <PageHeader title="Agendamentos" subtitle="Gerencie todas as reservas de ambientes e equipamentos"
        action={
          <button onClick={() => window.location.href = '/calendario'}
            style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, fontSize:'13.5px', cursor:'pointer', boxShadow:'0 2px 8px rgba(70,95,255,.3)' }}>
            + Novo
          </button>
        } />

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'16px', background:'var(--surface)', padding:'5px', borderRadius:'var(--radius-lg)', width:'fit-content', border:'1px solid var(--border)' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding:'7px 16px', borderRadius:'var(--radius)', fontSize:'13px', fontWeight:600, cursor:'pointer', border:'none', transition:'all .15s', background: filter===f.key?'var(--brand)':'transparent', color: filter===f.key?'#fff':'var(--text-3)', display:'flex', alignItems:'center', gap:'6px' }}>
            {f.label}
            <span style={{ padding:'1px 6px', borderRadius:'99px', fontSize:'11px', background: filter===f.key?'rgba(255,255,255,.25)':'var(--surface-3)', color: filter===f.key?'#fff':'var(--text-4)' }}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      <Card pad={false} style={{ overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:'200px' }}>
            <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por professor, ambiente, finalidade..." />
          </div>
          <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1) }}
            style={{ padding:'8px 12px', border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface)', color: dateFilter ? 'var(--text-1)' : 'var(--text-4)', fontSize:'13px', cursor:'pointer', outline:'none' }} />
          {dateFilter && (
            <button onClick={() => setDateFilter('')}
              style={{ padding:'7px 12px', border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface)', color:'var(--text-3)', cursor:'pointer', fontSize:'12px', whiteSpace:'nowrap' }}>
              ✕ limpar
            </button>
          )}
        </div>
        <Table
          headers={[
            { label:'Data',       key:'date'       },
            { label:'Horário',    key:'start_time' },
            'Recurso', 'Professor',
            { label:'Finalidade', key:'purpose'    },
            { label:'Status',     key:'status'     },
            'Ações',
          ]}
          loading={loading}
          sortCol={sortCol} sortDir={sortDir} onSort={onSort}
          page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage}>
          {paged.map(b => {
            const startTime = fmtTime(b.start_time || b.startTime)
            const endTime   = fmtTime(b.end_time   || b.endTime)
            return (
              <Tr key={b.id} onClick={() => setDetail(b)}>
                <Td>
                  <span style={{ fontWeight:600, fontSize:'13px' }}>
                    {fmtDate(b.date, { day:'2-digit', month:'short' })}
                  </span><br/>
                  <span style={{ fontSize:'11px', color:'var(--text-4)' }}>
                    {fmtDate(b.date, { weekday:'short' })}
                  </span>
                </Td>
                <Td><span style={{ fontWeight:600 }}>{startTime}</span> <span style={{ color:'var(--text-4)' }}>–</span> <span>{endTime}</span></Td>
                <Td>
                  <span style={{ fontWeight:600 }}>{b.resource?.name || '—'}</span><br/>
                  <span style={{ fontSize:'11px', color:'var(--text-4)' }}>{b.resource?.type}</span>
                </Td>
                <Td>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <Avatar name={b.teacher?.name || '?'} size={28} />
                    <span style={{ fontWeight:500 }}>{b.teacher?.name || '—'}</span>
                  </div>
                </Td>
                <Td style={{ color:'var(--text-3)', maxWidth:'150px' }}>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>
                    {b.purpose || '—'}
                  </span>
                </Td>
                <Td><StatusBadge status={b.status} /></Td>
                <Td>
                  <div style={{ display:'flex', gap:'6px' }} onClick={e => e.stopPropagation()}>
                    {isAdmin && <button title="Editar" onClick={() => openEdit(b)}
                      style={{ padding:'6px 8px', background:'var(--brand-50)', color:'var(--brand)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'14px' }}>✏️</button>}
                    {isAdmin && b.status === 'pendente' &&
                      <button title="Confirmar" onClick={() => handleConfirm(b.id)}
                        style={{ padding:'6px 8px', background:'var(--success-bg)', color:'var(--success)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'14px' }}>✓</button>}
                    {b.status !== 'cancelado' &&
                      <button title="Cancelar" onClick={() => handleCancel(b.id)}
                        style={{ padding:'6px 8px', background:'var(--danger-bg)', color:'var(--danger)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'14px' }}>✕</button>}
                  </div>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {/* DETAIL MODAL */}
      <Modal open={!!detailModal} onClose={() => setDetail(null)} title="Detalhes do agendamento" icon="📋" width={480}>
        {detailModal && (() => {
          const st = fmtTime(detailModal.start_time || detailModal.startTime)
          const et = fmtTime(detailModal.end_time   || detailModal.endTime)
          return (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                {[
                  ['📅 Data',       fmtDate(detailModal.date, { weekday:'long', day:'numeric', month:'long' })],
                  ['🕐 Horário',    `${st} – ${et}`],
                  ['🚪 Recurso',    detailModal.resource?.name || '—'],
                  ['👤 Professor',  detailModal.teacher?.name  || '—'],
                  ['📝 Finalidade', detailModal.purpose        || 'Não informada'],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ background:'var(--surface-2)', borderRadius:'var(--radius)', padding:'12px 14px' }}>
                    <div style={{ fontSize:'11.5px', color:'var(--text-4)', fontWeight:600, marginBottom:'4px' }}>{lbl}</div>
                    <div style={{ fontSize:'13.5px', fontWeight:600, color:'var(--text-1)' }}>{val}</div>
                  </div>
                ))}
                <div style={{ background:'var(--surface-2)', borderRadius:'var(--radius)', padding:'12px 14px' }}>
                  <div style={{ fontSize:'11.5px', color:'var(--text-4)', fontWeight:600, marginBottom:'6px' }}>Status</div>
                  <StatusBadge status={detailModal.status} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                {isAdmin && detailModal.status === 'pendente' &&
                  <button onClick={() => { handleConfirm(detailModal.id); setDetail(null) }}
                    style={{ padding:'8px 16px', background:'var(--success-bg)', color:'var(--success)', border:'none', borderRadius:'var(--radius)', fontWeight:600, cursor:'pointer' }}>✓ Confirmar</button>}
                {isAdmin && <button onClick={() => { openEdit(detailModal); setDetail(null) }}
                  style={{ padding:'8px 16px', background:'var(--brand-50)', color:'var(--brand)', border:'none', borderRadius:'var(--radius)', fontWeight:600, cursor:'pointer' }}>✏️ Editar</button>}
                {detailModal.status !== 'cancelado' &&
                  <button onClick={() => { handleCancel(detailModal.id); setDetail(null) }}
                    style={{ padding:'8px 16px', background:'var(--danger-bg)', color:'var(--danger)', border:'none', borderRadius:'var(--radius)', fontWeight:600, cursor:'pointer' }}>✕ Cancelar</button>}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* EDIT MODAL */}
      <Modal open={!!editModal} onClose={() => setEdit(null)} title="Editar agendamento" icon="✏️"
        footer={
          <>
            <button onClick={() => setEdit(null)} style={{ padding:'9px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600, fontSize:'13.5px' }}>Cancelar</button>
            <button onClick={handleSaveEdit} disabled={saving} style={{ padding:'9px 18px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600, fontSize:'13.5px' }}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </>
        }>
        {editModal && (
          <FormGrid>
            <Field label="Professor">
              <Select value={editModal.teacherId || editModal.teacher_id || ''} onChange={e => setEdit(p => ({ ...p, teacherId: e.target.value }))}>
                <option value="">Selecione...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Ambiente">
              <Select value={editModal.resourceId || editModal.resource_id || ''} onChange={e => setEdit(p => ({ ...p, resourceId: e.target.value }))}>
                <option value="">Selecione...</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Data">
              <Input type="date" value={editModal.date instanceof Date ? editModal.date.toISOString().split('T')[0] : (editModal.date||'').split('T')[0]}
                onChange={e => setEdit(p => ({ ...p, date: e.target.value }))} />
            </Field>
            <Field label="Início">
              <Input type="time" value={editModal.startTime || ''} onChange={e => setEdit(p => ({ ...p, startTime: e.target.value }))} />
            </Field>
            <Field label="Término">
              <Input type="time" value={editModal.endTime || ''} onChange={e => setEdit(p => ({ ...p, endTime: e.target.value }))} />
            </Field>
            <Field label="Status">
              <Select value={editModal.status} onChange={e => setEdit(p => ({ ...p, status: e.target.value }))}>
                <option value="confirmado">Confirmado</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </Field>
            <Field label="Finalidade" col="1/3">
              <Input value={editModal.purpose || ''} onChange={e => setEdit(p => ({ ...p, purpose: e.target.value }))} placeholder="Ex: Aula de física" />
            </Field>
          </FormGrid>
        )}
      </Modal>
    </div>
  )
}
