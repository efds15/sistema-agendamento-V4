import { useState, useEffect, useCallback } from 'react'
import { slots as slotsApi } from '../services/api'
import { toast, Modal, Field, Input, Card, Table, Tr, Td, Badge, Spinner, Empty, FormGrid, useSortPage } from '../components/UI'
import { PageHeader } from '../components/Layout'

export default function GerenciarAulas() {
  const [list, setList]     = useState([])
  const [loading, setLoad]  = useState(true)
  const [modal, setModal]   = useState(false)
  const [editModal, setEdit]= useState(null)
  const [saving, setSaving] = useState(false)
  const emptyForm = { label:'', start_time:'', end_time:'', sort_order:'' }
  const [form, setForm]     = useState(emptyForm)

  const load = useCallback(() => {
    setLoad(true)
    slotsApi.list().then(r => { setList(r.data); setLoad(false) }).catch(() => setLoad(false))
  }, [])
  useEffect(() => { load() }, [load])

  const f  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const fe = k => e => setEdit(p => ({ ...p, [k]: e.target.value }))

  async function handleCreate() {
    if (!form.label || !form.start_time || !form.end_time) { toast('Preencha todos os campos obrigatórios','error'); return }
    setSaving(true)
    try {
      await slotsApi.create({ label: form.label, start_time: form.start_time, end_time: form.end_time, sort_order: parseInt(form.sort_order) || list.length + 1 })
      toast('Aula cadastrada!'); setModal(false); setForm(emptyForm); load()
    } catch(e) { toast(e.response?.data?.error || 'Erro ao criar aula','error') } finally { setSaving(false) }
  }

  async function handleEdit() {
    setSaving(true)
    try {
      await slotsApi.update(editModal.id, { label: editModal.label, start_time: editModal.start_time, end_time: editModal.end_time, sort_order: parseInt(editModal.sort_order)||editModal.sort_order, active: editModal.active })
      toast('Aula atualizada!'); setEdit(null); load()
    } catch(e) { toast(e.response?.data?.error || 'Erro','error') } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Remover esta aula?')) return
    try { await slotsApi.delete(id); toast('Aula removida','warning'); load() }
    catch { toast('Erro ao remover','error') }
  }

  async function toggleActive(slot) {
    try {
      await slotsApi.update(slot.id, { active: !slot.active })
      toast(slot.active ? 'Aula desativada' : 'Aula ativada', slot.active?'warning':'success')
      load()
    } catch { toast('Erro','error') }
  }

  const { paged, sortCol, sortDir, onSort, page, totalPages, total, pageSize, setPage } =
    useSortPage(list, { defaultKey: 'sort_order', defaultDir: 'asc' })

  const btnP = { padding:'10px 20px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, fontSize:'13.5px', cursor:'pointer', boxShadow:'0 2px 8px rgba(70,95,255,.3)' }

  return (
    <div>
      <PageHeader title="Gerenciar Aulas" subtitle="Cadastre e organize os horários disponíveis para agendamento"
        action={<button onClick={() => { setForm(emptyForm); setModal(true) }} style={btnP}>+ Nova Aula</button>} />

      {/* Aviso */}
      <div style={{ display:'flex', gap:'10px', alignItems:'flex-start', padding:'12px 16px', background:'var(--info-bg)', border:'1px solid var(--info)', borderRadius:'var(--radius-lg)', marginBottom:'20px', fontSize:'13px', color:'var(--info)' }}>
        <span style={{ fontSize:'18px', flexShrink:0 }}>💡</span>
        <div>
          As aulas cadastradas aqui ficam disponíveis para seleção na tela de <strong>Calendário</strong>.
          Desative temporariamente sem precisar excluir.
        </div>
      </div>

      <Card pad={false} style={{ overflow:'hidden' }}>
        <Table
          headers={[
            { label:'Ordem', key:'sort_order' },
            { label:'Nome da Aula', key:'label' },
            { label:'Início', key:'start_time' },
            { label:'Término', key:'end_time' },
            'Duração',
            { label:'Status', key:'active' },
            'Ações',
          ]}
          loading={loading}
          sortCol={sortCol} sortDir={sortDir} onSort={onSort}
          page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage}>
          {paged.map(slot => {
            const [sh, sm] = slot.start_time.split(':').map(Number)
            const [eh, em] = slot.end_time.split(':').map(Number)
            const mins = (eh*60+em) - (sh*60+sm)
            return (
              <Tr key={slot.id} onClick={() => setEdit({ ...slot })}>
                <Td>
                  <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'var(--brand-50)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'var(--brand)' }}>
                    {slot.sort_order}
                  </div>
                </Td>
                <Td><span style={{ fontWeight:700, fontSize:'14px' }}>{slot.label}</span></Td>
                <Td>
                  <span style={{ fontWeight:600, fontSize:'14px', fontFamily:'monospace', background:'var(--surface-2)', padding:'3px 8px', borderRadius:'var(--radius-sm)' }}>
                    {slot.start_time}
                  </span>
                </Td>
                <Td>
                  <span style={{ fontWeight:600, fontSize:'14px', fontFamily:'monospace', background:'var(--surface-2)', padding:'3px 8px', borderRadius:'var(--radius-sm)' }}>
                    {slot.end_time}
                  </span>
                </Td>
                <Td style={{ color:'var(--text-3)', fontSize:'13px' }}>{mins} min</Td>
                <Td>
                  <Badge color={slot.active?'teal':'gray'} dot>{slot.active?'Ativa':'Inativa'}</Badge>
                </Td>
                <Td>
                  <div style={{ display:'flex', gap:'6px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEdit({ ...slot })}
                      style={{ padding:'6px 8px', background:'var(--brand-50)', color:'var(--brand)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'13px' }}>✏️</button>
                    <button onClick={() => toggleActive(slot)}
                      style={{ padding:'6px 10px', background:slot.active?'var(--warning-bg)':'var(--success-bg)', color:slot.active?'var(--warning)':'var(--success)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                      {slot.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => handleDelete(slot.id)}
                      style={{ padding:'6px 8px', background:'var(--danger-bg)', color:'var(--danger)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'13px' }}>🗑</button>
                  </div>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {/* Modal criar */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nova Aula" icon="🕐" width={440}
        footer={
          <>
            <button onClick={() => setModal(false)} style={{ padding:'9px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600 }}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving} style={{ padding:'9px 18px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600, opacity:saving?.7:1 }}>{saving?'Salvando...':'Criar aula'}</button>
          </>
        }>
        <FormGrid cols={2}>
          <Field label="Nome da aula" required col="1/3">
            <Input value={form.label} onChange={f('label')} placeholder="Ex: 1ª Aula, Contra-turno..." />
          </Field>
          <Field label="Horário de início" required>
            <Input type="time" value={form.start_time} onChange={f('start_time')} />
          </Field>
          <Field label="Horário de término" required>
            <Input type="time" value={form.end_time} onChange={f('end_time')} />
          </Field>
          <Field label="Ordem de exibição" col="1/3">
            <Input type="number" min="1" value={form.sort_order} onChange={f('sort_order')} placeholder={`${list.length + 1}`} />
          </Field>
        </FormGrid>
      </Modal>

      {/* Modal editar */}
      <Modal open={!!editModal} onClose={() => setEdit(null)} title="Editar Aula" icon="✏️" width={440}
        footer={
          <>
            <button onClick={() => setEdit(null)} style={{ padding:'9px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600 }}>Cancelar</button>
            <button onClick={handleEdit} disabled={saving} style={{ padding:'9px 18px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600, opacity:saving?.7:1 }}>{saving?'Salvando...':'Salvar'}</button>
          </>
        }>
        {editModal && <FormGrid cols={2}>
          <Field label="Nome da aula" required col="1/3">
            <Input value={editModal.label} onChange={fe('label')} />
          </Field>
          <Field label="Horário de início" required>
            <Input type="time" value={editModal.start_time} onChange={fe('start_time')} />
          </Field>
          <Field label="Horário de término" required>
            <Input type="time" value={editModal.end_time} onChange={fe('end_time')} />
          </Field>
          <Field label="Ordem" col="1/3">
            <Input type="number" min="1" value={editModal.sort_order} onChange={fe('sort_order')} />
          </Field>
          <Field label="Status" col="1/3">
            <select value={editModal.active?'1':'0'} onChange={e => setEdit(p => ({ ...p, active: e.target.value==='1' }))}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', fontSize:'13.5px', background:'var(--surface)', color:'var(--text-1)', outline:'none' }}>
              <option value="1">Ativa</option>
              <option value="0">Inativa</option>
            </select>
          </Field>
        </FormGrid>}
      </Modal>
    </div>
  )
}
