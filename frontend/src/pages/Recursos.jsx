import { useState, useEffect, useCallback, useMemo } from 'react'
import { ImageUploadField, UserAvatar, EquipmentAvatar } from '../components/ImageUpload'
import { useLocation } from 'react-router-dom'
import { resources as resourcesApi, equipments as equipmentsApi, teachers as teachersApi } from '../services/api'
import { toast, Card, Badge, StatusBadge, Spinner, Empty, Modal, Field, Input, Select, SearchInput, FormGrid, Table, Tr, Td, Avatar, useSortPage } from '../components/UI'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const typeMap   = { sala:'Sala', laboratorio:'Laboratório', quadra:'Quadra', especial:'Especial' }
const typeIcon  = { sala:'🚪', laboratorio:'🔬', quadra:'⚽', especial:'⭐' }
const typeColor = { sala:'blue', laboratorio:'orange', quadra:'green', especial:'purple' }
const eqTypeMap = { projetor:'Projetor', computador:'Computador', kit_didatico:'Kit Didático', camera:'Câmera', audio:'Áudio', outro:'Outro' }

const btnP = { display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, fontSize:'13.5px', cursor:'pointer', boxShadow:'0 2px 8px rgba(70,95,255,.3)' }
const btnE = { padding:'6px 8px', background:'var(--brand-50)', color:'var(--brand)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'14px' }
const btnD = { padding:'6px 8px', background:'var(--danger-bg)', color:'var(--danger)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'14px' }

// Footer do modal: só exibe para admins — para professors mostra aviso
function ModalFooter({ onCancel, onSave, saving, label='Salvar', isAdmin }) {
  if (!isAdmin) return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'var(--text-4)', fontSize:'13px' }}>
      <span>🔒</span> Apenas administradores podem editar
      <button onClick={onCancel} style={{ marginLeft:'auto', padding:'9px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600, fontSize:'13.5px' }}>Fechar</button>
    </div>
  )
  return <>
    <button onClick={onCancel} style={{ padding:'9px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600, fontSize:'13.5px' }}>Cancelar</button>
    <button onClick={onSave} disabled={saving} style={{ padding:'9px 18px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600, fontSize:'13.5px', opacity:saving?.7:1 }}>{saving?'Salvando...':label}</button>
  </>
}

// Banner de somente leitura mostrado dentro de modais para professores
function ReadOnlyBanner() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background:'var(--warning-bg)', border:'1px solid #FDE68A', borderRadius:'var(--radius)', marginBottom:'16px', fontSize:'13px', color:'#92400E' }}>
      <span style={{ fontSize:'18px' }}>🔒</span>
      <span>Você está no modo de visualização. Apenas administradores podem editar.</span>
    </div>
  )
}

function FilterTabs({ active, onChange, tabs }) {
  return (
    <div style={{ display:'flex', gap:'4px', background:'var(--surface)', padding:'4px', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', flexShrink:0 }}>
      {tabs.map(t => (
        <button key={t.k} onClick={() => onChange(t.k)}
          style={{ padding:'6px 14px', borderRadius:'var(--radius)', fontSize:'12.5px', fontWeight:600, cursor:'pointer', border:'none', background:active===t.k?'var(--brand)':'transparent', color:active===t.k?'#fff':'var(--text-3)', transition:'all .12s', whiteSpace:'nowrap' }}>
          {t.l}
        </button>
      ))}
    </div>
  )
}

// ── AMBIENTES ─────────────────────────────────────────────────────
export function Ambientes() {
  const { isAdmin } = useAuth()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [typeFilter, setType] = useState('todos')
  const [modal, setModal]     = useState(false)
  const [viewModal, setView]  = useState(null)  // visualização para professor
  const [editModal, setEdit]  = useState(null)  // edição para admin
  const [form, setForm]       = useState({ name:'', type:'sala', capacity:'', location:'', floor:'', features:'' })
  const [saving, setSaving]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    resourcesApi.list().then(r => { setList(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const location = useLocation()
  useEffect(() => { if (isAdmin && location.state?.openModal) setModal(true) }, [location.state, isAdmin])

  const f  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const fe = k => e => setEdit(p => ({ ...p, [k]: e.target.value }))

  const filtered = list
    .filter(r => typeFilter === 'todos' || r.type === typeFilter)
    .filter(r => { if (!search) return true; const q = search.toLowerCase(); return r.name.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q) })

  async function handleCreate() {
    if (!form.name) { toast('Nome é obrigatório', 'error'); return }
    setSaving(true)
    try {
      await resourcesApi.create({ ...form, capacity: parseInt(form.capacity)||0, features: form.features.split(',').map(s=>s.trim()).filter(Boolean) })
      toast('Ambiente criado!'); setModal(false); setForm({ name:'', type:'sala', capacity:'', location:'', floor:'', features:'' }); load()
    } catch { toast('Erro ao criar', 'error') } finally { setSaving(false) }
  }

  async function handleEdit() {
    setSaving(true)
    try {
      const features = typeof editModal.features === 'string'
        ? editModal.features.split(',').map(s=>s.trim()).filter(Boolean)
        : editModal.features
      await resourcesApi.update(editModal.id, { ...editModal, features })
      toast('Ambiente atualizado!'); setEdit(null); load()
    } catch { toast('Erro', 'error') } finally { setSaving(false) }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Desativar este ambiente?')) return
    try { await resourcesApi.delete(id); toast('Desativado', 'warning'); load() } catch { toast('Erro', 'error') }
  }

  function openCard(r) {
    if (isAdmin) setEdit({ ...r, features: Array.isArray(r.features) ? r.features.join(', ') : (r.features||'') })
    else setView(r)
  }

  return (
    <div>
      <PageHeader title="Ambientes" subtitle="Salas, laboratórios, quadras e espaços"
        action={isAdmin && <button onClick={() => setModal(true)} style={btnP}>+ Novo Ambiente</button>} />

      <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:'240px' }}>
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou localização..." />
        </div>
        <FilterTabs active={typeFilter} onChange={setType}
          tabs={[{k:'todos',l:'Todos'},{k:'sala',l:'Sala'},{k:'laboratorio',l:'Lab.'},{k:'quadra',l:'Quadra'},{k:'especial',l:'Especial'}]} />
      </div>

      {loading ? <Spinner /> : filtered.length === 0
        ? <Empty icon="🚪" title="Nenhum ambiente encontrado" action={isAdmin && <button onClick={() => setModal(true)} style={btnP}>+ Criar</button>} />
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'16px' }}>
            {filtered.map(r => (
              <div key={r.id} onClick={() => openCard(r)}
                style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', padding:'20px', boxShadow:'var(--shadow)', cursor:'pointer', transition:'all .18s', opacity: r.active?1:.6 }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow='var(--shadow-md)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='var(--brand-100)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow='var(--shadow)'; e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor='var(--border)' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'var(--radius-lg)', background:'var(--brand-50)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', marginBottom:'12px' }}>{typeIcon[r.type]||'🚪'}</div>
                <div style={{ fontWeight:700, fontSize:'15px', marginBottom:'3px' }}>{r.name}</div>
                <div style={{ fontSize:'12.5px', color:'var(--text-3)', marginBottom:'10px' }}>{r.location}{r.floor?` · ${r.floor}`:''}</div>
                <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'8px' }}>
                  <Badge color={typeColor[r.type]||'gray'}>{typeMap[r.type]}</Badge>
                  <Badge color="gray">👥 {r.capacity}</Badge>
                  <Badge color={r.active?'teal':'gray'} dot>{r.active?'Ativo':'Inativo'}</Badge>
                </div>
                {Array.isArray(r.features) && r.features.length > 0 && <div style={{ fontSize:'11.5px', color:'var(--text-4)' }}>{r.features.slice(0,3).join(' · ')}</div>}
                {isAdmin && (
                  <div style={{ marginTop:'14px', paddingTop:'14px', borderTop:'1px solid var(--border)', display:'flex', gap:'8px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openCard(r)} style={{ ...btnP, flex:1, justifyContent:'center', padding:'7px', boxShadow:'none', fontSize:'12.5px' }}>Editar</button>
                    <button onClick={e => handleDelete(r.id, e)} style={btnD}>🗑</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      {/* Modal visualização — professor */}
      <Modal open={!!viewModal} onClose={() => setView(null)} title={viewModal?.name||''} icon="🚪" width={420}>
        {viewModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[
              ['Tipo',       typeMap[viewModal.type]||viewModal.type],
              ['Localização',viewModal.location||'—'],
              ['Andar',      viewModal.floor||'—'],
              ['Capacidade', `${viewModal.capacity} pessoas`],
              ['Status',     viewModal.active ? 'Ativo' : 'Inativo'],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:'var(--surface-2)', borderRadius:'var(--radius)' }}>
                <span style={{ fontSize:'13px', color:'var(--text-3)' }}>{l}</span>
                <span style={{ fontWeight:600, fontSize:'13px' }}>{v}</span>
              </div>
            ))}
            {Array.isArray(viewModal.features) && viewModal.features.length > 0 && (
              <div style={{ padding:'10px 14px', background:'var(--surface-2)', borderRadius:'var(--radius)' }}>
                <div style={{ fontSize:'12px', color:'var(--text-4)', marginBottom:'6px' }}>Recursos disponíveis</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {viewModal.features.map(f => <Badge key={f} color="blue">{f}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal edição — admin */}
      <Modal open={isAdmin && !!modal} onClose={() => setModal(false)} title="Cadastrar Ambiente" icon="🚪"
        footer={<ModalFooter isAdmin={isAdmin} onCancel={() => setModal(false)} onSave={handleCreate} saving={saving} label="Criar" />}>
        <FormGrid>
          <Field label="Nome" required col="1/3"><Input value={form.name} onChange={f('name')} placeholder="Ex: Sala 15" /></Field>
          <Field label="Tipo"><Select value={form.type} onChange={f('type')}>{Object.entries(typeMap).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Capacidade"><Input type="number" value={form.capacity} onChange={f('capacity')} placeholder="35" /></Field>
          <Field label="Localização"><Input value={form.location} onChange={f('location')} placeholder="Bloco A" /></Field>
          <Field label="Andar"><Input value={form.floor} onChange={f('floor')} placeholder="1º andar" /></Field>
          <Field label="Recursos (vírgula)" col="1/3"><Input value={form.features} onChange={f('features')} placeholder="Projetor, AC, Quadro branco" /></Field>
        </FormGrid>
      </Modal>

      <Modal open={isAdmin && !!editModal} onClose={() => setEdit(null)} title="Editar Ambiente" icon="✏️"
        footer={<ModalFooter isAdmin={isAdmin} onCancel={() => setEdit(null)} onSave={handleEdit} saving={saving} />}>
        {editModal && <FormGrid>
          <Field label="Nome" required col="1/3"><Input value={editModal.name} onChange={fe('name')} /></Field>
          <Field label="Tipo"><Select value={editModal.type} onChange={fe('type')}>{Object.entries(typeMap).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Capacidade"><Input type="number" value={editModal.capacity} onChange={fe('capacity')} /></Field>
          <Field label="Localização"><Input value={editModal.location||''} onChange={fe('location')} /></Field>
          <Field label="Andar"><Input value={editModal.floor||''} onChange={fe('floor')} /></Field>
          <Field label="Status"><Select value={editModal.active?'1':'0'} onChange={e=>setEdit(p=>({...p,active:e.target.value==='1'}))}><option value="1">Ativo</option><option value="0">Inativo</option></Select></Field>
          <Field label="Recursos" col="1/3"><Input value={editModal.features||''} onChange={fe('features')} /></Field>
        </FormGrid>}
      </Modal>
    </div>
  )
}

// ── EQUIPAMENTOS ──────────────────────────────────────────────────
export function Equipamentos() {
  const { isAdmin } = useAuth()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [viewModal, setView]  = useState(null)
  const [editModal, setEdit]  = useState(null)
  const [form, setForm]       = useState({ name:'', type:'projetor', brand:'', model:'', patrimony:'' })
  const [saving, setSaving]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    equipmentsApi.list().then(r => { setList(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const location = useLocation()
  useEffect(() => { if (isAdmin && location.state?.openModal) setModal(true) }, [location.state, isAdmin])

  const f  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const fe = k => e => setEdit(p => ({ ...p, [k]: e.target.value }))
  const filtered = useMemo(() => list.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.name.toLowerCase().includes(q) || e.brand?.toLowerCase().includes(q) || e.patrimony?.toLowerCase().includes(q)
  }), [list, search])
  const { paged: eqPaged, sortCol: eqSCol, sortDir: eqSDir, onSort: eqOnSort, page: eqPage, totalPages: eqPages, total: eqTotal, pageSize: eqPS, setPage: eqSetPage } =
    useSortPage(filtered, { defaultKey: 'name' })

  async function handleCreate() {
    if (!form.name) { toast('Nome é obrigatório', 'error'); return }
    setSaving(true)
    try { await equipmentsApi.create(form); toast('Equipamento criado!'); setModal(false); setForm({ name:'', type:'projetor', brand:'', model:'', patrimony:'' }); load() }
    catch { toast('Erro', 'error') } finally { setSaving(false) }
  }
  async function handleEdit() {
    setSaving(true)
    try { await equipmentsApi.update(editModal.id, editModal); toast('Atualizado!'); setEdit(null); load() }
    catch { toast('Erro', 'error') } finally { setSaving(false) }
  }

  function openRow(e) {
    if (isAdmin) setEdit({ ...e })
    else setView(e)
  }

  return (
    <div>
      <PageHeader title="Equipamentos" subtitle="Projetores, computadores e kits didáticos"
        action={isAdmin && <button onClick={() => setModal(true)} style={btnP}>+ Novo Equipamento</button>} />
      <div style={{ marginBottom:'20px' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, marca ou patrimônio..." />
      </div>
      <Card pad={false} style={{ overflow:'hidden' }}>
        <Table
          headers={['', {label:'Equipamento',key:'name'}, {label:'Tipo',key:'type'}, {label:'Marca / Modelo',key:'brand'}, {label:'Patrimônio',key:'patrimony'}, {label:'Status',key:'status'}, isAdmin?'Ações':'']}
          loading={loading}
          sortCol={eqSCol} sortDir={eqSDir} onSort={eqOnSort}
          page={eqPage} totalPages={eqPages} total={eqTotal} pageSize={eqPS} onPageChange={eqSetPage}>
          {eqPaged.map(e => (
            <Tr key={e.id} onClick={() => openRow(e)}>
              <Td style={{ width:'48px' }}>
                <EquipmentAvatar name={e.name} imageUrl={e.image_url} type={e.type} size={38} />
              </Td>
              <Td><span style={{ fontWeight:600 }}>{e.name}</span></Td>
              <Td><Badge color="blue">{eqTypeMap[e.type]||e.type}</Badge></Td>
              <Td style={{ color:'var(--text-3)' }}>{[e.brand,e.model].filter(Boolean).join(' ')||'—'}</Td>
              <Td><code style={{ fontSize:'12px', background:'var(--surface-2)', padding:'3px 7px', borderRadius:'var(--radius-sm)' }}>{e.patrimony||'—'}</code></Td>
              <Td><StatusBadge status={e.status} /></Td>
              <Td onClick={ev => ev.stopPropagation()}>
                {isAdmin && <button onClick={() => setEdit({ ...e })} style={btnE}>✏️</button>}
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Visualização professor */}
      <Modal open={!!viewModal} onClose={() => setView(null)} title={viewModal?.name||''} icon="📽" width={420}>
        {viewModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:'8px' }}>
              <EquipmentAvatar name={viewModal.name} imageUrl={viewModal.image_url} type={viewModal.type} size={80} />
            </div>
            {[
              ['Tipo',       eqTypeMap[viewModal.type]||viewModal.type],
              ['Marca',      viewModal.brand||'—'],
              ['Modelo',     viewModal.model||'—'],
              ['Patrimônio', viewModal.patrimony||'—'],
              ['Status',     viewModal.status],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:'var(--surface-2)', borderRadius:'var(--radius)' }}>
                <span style={{ fontSize:'13px', color:'var(--text-3)' }}>{l}</span>
                <span style={{ fontWeight:600, fontSize:'13px' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Cadastro admin */}
      <Modal open={isAdmin && modal} onClose={() => setModal(false)} title="Novo Equipamento" icon="📽"
        footer={<ModalFooter isAdmin={isAdmin} onCancel={() => setModal(false)} onSave={handleCreate} saving={saving} label="Criar" />}>
        <FormGrid>
          <Field label="Nome" required col="1/3"><Input value={form.name} onChange={f('name')} placeholder="Ex: Projetor Epson 4" /></Field>
          <Field label="Tipo"><Select value={form.type} onChange={f('type')}>{Object.entries(eqTypeMap).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Marca"><Input value={form.brand} onChange={f('brand')} placeholder="Epson" /></Field>
          <Field label="Modelo"><Input value={form.model} onChange={f('model')} placeholder="PowerLite X49" /></Field>
          <Field label="Nº Patrimônio"><Input value={form.patrimony} onChange={f('patrimony')} placeholder="PAT-000" /></Field>
        </FormGrid>
      </Modal>

      {/* Edição admin */}
      <Modal open={isAdmin && !!editModal} onClose={() => setEdit(null)} title="Editar Equipamento" icon="✏️"
        footer={<ModalFooter isAdmin={isAdmin} onCancel={() => setEdit(null)} onSave={handleEdit} saving={saving} />}>
        {editModal && <FormGrid>
          <Field label="Foto" col="1/3"><ImageUploadField entityType="equipment" entityId={editModal.id} currentImage={editModal.image_url} onUploaded={url => setEdit(p => ({ ...p, image_url: url }))} /></Field>
          <Field label="Nome" required col="1/3"><Input value={editModal.name} onChange={fe('name')} /></Field>
          <Field label="Tipo"><Select value={editModal.type} onChange={fe('type')}>{Object.entries(eqTypeMap).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Marca"><Input value={editModal.brand||''} onChange={fe('brand')} /></Field>
          <Field label="Modelo"><Input value={editModal.model||''} onChange={fe('model')} /></Field>
          <Field label="Patrimônio"><Input value={editModal.patrimony||''} onChange={fe('patrimony')} /></Field>
          <Field label="Status" col="1/3"><Select value={editModal.status} onChange={fe('status')}><option value="disponivel">Disponível</option><option value="manutencao">Manutenção</option><option value="emprestado">Emprestado</option></Select></Field>
        </FormGrid>}
      </Modal>
    </div>
  )
}

// ── PROFESSORES ───────────────────────────────────────────────────
export function Professores() {
  const { isAdmin } = useAuth()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [viewModal, setView]  = useState(null)
  const [editModal, setEdit]  = useState(null)
  const [form, setForm]       = useState({ name:'', email:'', cpf:'', subjects:'', role:'teacher', phone:'', password:'' })
  const [saving, setSaving]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    teachersApi.list().then(r => { setList(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const location = useLocation()
  useEffect(() => { if (isAdmin && location.state?.openModal) setModal(true) }, [location.state, isAdmin])

  const f  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const fe = k => e => setEdit(p => ({ ...p, [k]: e.target.value }))
  const filtered = useMemo(() => list.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.subjects?.toLowerCase().includes(q)
  }), [list, search])
  const { paged: prPaged, sortCol: prSCol, sortDir: prSDir, onSort: prOnSort, page: prPage, totalPages: prPages, total: prTotal, pageSize: prPS, setPage: prSetPage } =
    useSortPage(filtered, { defaultKey: 'name' })
  const roleMap = { teacher:{label:'Professor',color:'blue'}, coordinator:{label:'Coordenador',color:'orange'}, admin:{label:'Admin',color:'red'} }

  async function handleCreate() {
    if (!form.name||!form.email||!form.password) { toast('Preencha os campos obrigatórios','error'); return }
    setSaving(true)
    try { await teachersApi.create(form); toast('Professor cadastrado!'); setModal(false); setForm({name:'',email:'',cpf:'',subjects:'',role:'teacher',phone:'',password:''}); load() }
    catch(e) { toast(e.response?.data?.error||'Erro','error') } finally { setSaving(false) }
  }
  async function handleEdit() {
    setSaving(true)
    try { await teachersApi.update(editModal.id, editModal); toast('Atualizado!'); setEdit(null); load() }
    catch { toast('Erro','error') } finally { setSaving(false) }
  }
  async function handleToggle(id, e) {
    e.stopPropagation()
    try { await teachersApi.toggle(id); load() } catch { toast('Erro','error') }
  }

  function openRow(t) {
    if (isAdmin) setEdit({ ...t })
    else setView(t)
  }

  return (
    <div>
      <PageHeader title="Professores" subtitle="Cadastro e gerenciamento de professores"
        action={isAdmin && <button onClick={() => setModal(true)} style={btnP}>+ Novo Professor</button>} />
      <div style={{ marginBottom:'20px' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, email ou matéria..." />
      </div>
      <Card pad={false} style={{ overflow:'hidden' }}>
        <Table
          headers={[{label:'Professor',key:'name'}, {label:'Matérias',key:'subjects'}, {label:'Acesso',key:'role'}, {label:'Status',key:'active'}, isAdmin?'Ações':'']}
          loading={loading}
          sortCol={prSCol} sortDir={prSDir} onSort={prOnSort}
          page={prPage} totalPages={prPages} total={prTotal} pageSize={prPS} onPageChange={prSetPage}>
          {prPaged.map(t => {
            const role = roleMap[t.role]||roleMap.teacher
            return (
              <Tr key={t.id} onClick={() => openRow(t)}>
                <Td>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <UserAvatar name={t.name} imageUrl={t.image_url} size={36} color={t.role==='coordinator'?'amber':t.role==='admin'?'teal':'brand'} />
                    <div><div style={{ fontWeight:600 }}>{t.name}</div><div style={{ fontSize:'12px', color:'var(--text-4)' }}>{t.email}</div></div>
                  </div>
                </Td>
                <Td style={{ color:'var(--text-3)' }}>{t.subjects||'—'}</Td>
                <Td><Badge color={role.color} dot>{role.label}</Badge></Td>
                <Td><StatusBadge status={t.active?'ativo':'inativo'} /></Td>
                <Td onClick={ev => ev.stopPropagation()}>
                  {isAdmin && (
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={() => setEdit({ ...t })} style={btnE}>✏️</button>
                      <button onClick={e => handleToggle(t.id, e)} style={{ padding:'6px 10px', background:t.active?'var(--danger-bg)':'var(--success-bg)', color:t.active?'var(--danger)':'var(--success)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                        {t.active?'Desativar':'Ativar'}
                      </button>
                    </div>
                  )}
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {/* Visualização professor */}
      <Modal open={!!viewModal} onClose={() => setView(null)} title={viewModal?.name||''} icon="👤" width={420}>
        {viewModal && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:'4px' }}>
              <UserAvatar name={viewModal.name} imageUrl={viewModal.image_url} size={72} />
            </div>
            {[
              ['E-mail',   viewModal.email],
              ['Matérias', viewModal.subjects||'—'],
              ['Telefone', viewModal.phone||'—'],
              ['Acesso',   roleMap[viewModal.role]?.label||'Professor'],
              ['Status',   viewModal.active ? 'Ativo' : 'Inativo'],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', background:'var(--surface-2)', borderRadius:'var(--radius)' }}>
                <span style={{ fontSize:'13px', color:'var(--text-3)' }}>{l}</span>
                <span style={{ fontWeight:600, fontSize:'13px' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Cadastro admin */}
      <Modal open={isAdmin && modal} onClose={() => setModal(false)} title="Cadastrar Professor" icon="👤"
        footer={<ModalFooter isAdmin={isAdmin} onCancel={() => setModal(false)} onSave={handleCreate} saving={saving} label="Cadastrar" />}>
        <FormGrid>
          <Field label="Nome completo" required><Input value={form.name} onChange={f('name')} placeholder="Nome do professor" /></Field>
          <Field label="CPF"><Input value={form.cpf} onChange={f('cpf')} placeholder="000.000.000-00" /></Field>
          <Field label="E-mail" required col="1/3"><Input type="email" value={form.email} onChange={f('email')} placeholder="prof@email.com" /></Field>
          <Field label="Matérias"><Input value={form.subjects} onChange={f('subjects')} placeholder="Matemática, Física" /></Field>
          <Field label="Telefone"><Input value={form.phone} onChange={f('phone')} placeholder="(11) 99999-0000" /></Field>
          <Field label="Nível de acesso" col="1/3"><Select value={form.role} onChange={f('role')}><option value="teacher">Professor</option><option value="coordinator">Coordenador</option><option value="admin">Administrador</option></Select></Field>
          <Field label="Senha inicial" required><Input type="password" value={form.password} onChange={f('password')} placeholder="Mínimo 6 caracteres" /></Field>
        </FormGrid>
      </Modal>

      {/* Edição admin */}
      <Modal open={isAdmin && !!editModal} onClose={() => setEdit(null)} title="Editar Professor" icon="✏️"
        footer={<ModalFooter isAdmin={isAdmin} onCancel={() => setEdit(null)} onSave={handleEdit} saving={saving} />}>
        {editModal && <FormGrid>
          <Field label="Foto" col="1/3">
            <ImageUploadField entityType="teacher" entityId={editModal.id} currentImage={editModal.image_url}
              onUploaded={url => setEdit(p => ({ ...p, image_url: url }))} />
          </Field>
          <Field label="Nome" required><Input value={editModal.name} onChange={fe('name')} /></Field>
          <Field label="CPF"><Input value={editModal.cpf||''} onChange={fe('cpf')} /></Field>
          <Field label="E-mail" col="1/3"><Input type="email" value={editModal.email||''} onChange={fe('email')} /></Field>
          <Field label="Matérias"><Input value={editModal.subjects||''} onChange={fe('subjects')} /></Field>
          <Field label="Telefone"><Input value={editModal.phone||''} onChange={fe('phone')} /></Field>
          <Field label="Acesso"><Select value={editModal.role} onChange={fe('role')}><option value="teacher">Professor</option><option value="coordinator">Coordenador</option><option value="admin">Admin</option></Select></Field>
          <Field label="Ativo" col="1/3"><Select value={editModal.active?'1':'0'} onChange={e=>setEdit(p=>({...p,active:e.target.value==='1'}))}><option value="1">Sim</option><option value="0">Não</option></Select></Field>
        </FormGrid>}
      </Modal>
    </div>
  )
}

// ── USUÁRIOS (superAdmin only) ───────────────────────────────────
export function Usuarios() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [editModal, setEdit]  = useState(null)
  const [saving, setSaving]   = useState(false)
  const emptyForm = { name:'', email:'', password:'', role:'teacher', cpf:'', subjects:'', phone:'' }
  const [form, setForm]       = useState(emptyForm)
  const [success, setSuccess] = useState(null) // { name, role }

  const load = useCallback(() => {
    setLoading(true)
    api.get('/users').then(r => { setList(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const f  = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const fe = k => e => setEdit(p => ({ ...p, [k]: e.target.value }))
  const filtered = useMemo(() => list.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  }), [list, search])
  const { paged: usPaged, sortCol: usSCol, sortDir: usSDir, onSort: usOnSort, page: usPage, totalPages: usPages, total: usTotal, pageSize: usPS, setPage: usSetPage } =
    useSortPage(filtered, { defaultKey: 'name' })
  const roleMap = { teacher:{label:'Professor',color:'blue'}, coordinator:{label:'Coordenador',color:'orange'}, admin:{label:'Admin',color:'red'} }

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) { toast('Nome, e-mail e senha são obrigatórios','error'); return }
    if (form.password.length < 6) { toast('Senha deve ter ao menos 6 caracteres','error'); return }
    setSaving(true)
    try {
      await api.post('/users', form)
      toast('Usuário cadastrado!')
      setModal(false)
      setSuccess({ name: form.name, role: form.role })
      setForm(emptyForm)
      load()
    } catch(e) { toast(e.response?.data?.error || 'Erro ao cadastrar','error') }
    finally { setSaving(false) }
  }

  async function handleEdit() {
    setSaving(true)
    try {
      await api.put(`/users/${editModal.id}`, { name: editModal.name, email: editModal.email, role: editModal.role, active: editModal.active })
      toast('Usuário atualizado!'); setEdit(null); load()
    } catch { toast('Erro ao atualizar','error') } finally { setSaving(false) }
  }
  async function handleToggle(id, active, e) {
    e.stopPropagation()
    try { await api.put(`/users/${id}`, { active: !active }); toast(active?'Desativado':'Ativado', active?'warning':'success'); load() }
    catch { toast('Erro','error') }
  }
  async function handleResetPw(id, e) {
    e.stopPropagation()
    if (!confirm('Redefinir a senha para "123456"?')) return
    try { await api.put(`/users/${id}/reset-password`); toast('Senha redefinida para: 123456') }
    catch { toast('Erro','error') }
  }

  const isTeacherRole = ['teacher','coordinator'].includes(form.role)

  return (
    <div>
      <PageHeader title="Usuários" subtitle="Contas de acesso ao sistema"
        action={<button onClick={() => { setForm(emptyForm); setModal(true) }} style={btnP}>+ Novo Usuário</button>} />

      <div style={{ marginBottom:'20px' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou email..." />
      </div>
      <Card pad={false} style={{ overflow:'hidden' }}>
        <Table
          headers={[{label:'Usuário',key:'name'}, {label:'Acesso',key:'role'}, {label:'Status',key:'active'}, 'Ações']}
          loading={loading}
          sortCol={usSCol} sortDir={usSDir} onSort={usOnSort}
          page={usPage} totalPages={usPages} total={usTotal} pageSize={usPS} onPageChange={usSetPage}>
          {usPaged.map(u => {
            const role = roleMap[u.role]||roleMap.teacher
            return (
              <Tr key={u.id} onClick={() => setEdit({ ...u })}>
                <Td>
                  <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                    <UserAvatar name={u.name||'?'} imageUrl={u.image_url} size={36} color={u.role==='coordinator'?'amber':u.role==='admin'?'teal':'brand'} />
                    <div>
                      <div style={{ fontWeight:600, color:'var(--text-1)' }}>{u.name}</div>
                      <div style={{ fontSize:'12px', color:'var(--text-4)' }}>{u.email}</div>
                    </div>
                  </div>
                </Td>
                <Td><Badge color={role.color} dot>{role.label}</Badge></Td>
                <Td><StatusBadge status={u.active?'ativo':'inativo'} /></Td>
                <Td>
                  <div style={{ display:'flex', gap:'6px' }} onClick={ev => ev.stopPropagation()}>
                    <button onClick={() => setEdit({ ...u })} style={btnE} title="Editar">✏️</button>
                    <button onClick={e => handleToggle(u.id, u.active, e)}
                      style={{ padding:'6px 10px', background:u.active?'var(--danger-bg)':'var(--success-bg)', color:u.active?'var(--danger)':'var(--success)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                      {u.active?'Desativar':'Ativar'}
                    </button>
                    <button onClick={e => handleResetPw(u.id, e)}
                      style={{ padding:'6px 9px', background:'var(--warning-bg)', color:'var(--warning)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'12px', fontWeight:600 }} title="Redefinir senha">
                      🔑
                    </button>
                  </div>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>

      {/* Modal de sucesso — informa que professor foi para aba Professores */}
      <Modal open={!!success} onClose={() => setSuccess(null)} title="Usuário cadastrado!" icon="✅" width={400}>
        {success && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'var(--success-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', margin:'0 auto 14px' }}>✓</div>
            <div style={{ fontSize:'16px', fontWeight:700, color:'var(--text-1)', marginBottom:'8px' }}>{success.name} cadastrado(a)!</div>
            {['teacher','coordinator'].includes(success.role) && (
              <div style={{ fontSize:'13.5px', color:'var(--text-3)', padding:'10px 14px', background:'var(--brand-50)', borderRadius:'var(--radius)', border:'1px solid var(--brand-100)', marginBottom:'16px' }}>
                ℹ️ Como é <strong>{roleMap[success.role]?.label}</strong>, o cadastro também foi adicionado automaticamente na lista de <strong>Professores</strong>.
              </div>
            )}
            <button onClick={() => setSuccess(null)}
              style={{ padding:'10px 24px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, cursor:'pointer', fontSize:'13.5px', boxShadow:'0 2px 8px rgba(70,95,255,.3)' }}>
              Fechar
            </button>
          </div>
        )}
      </Modal>

      {/* Modal cadastro */}
      <Modal open={modal} onClose={() => setModal(false)} title="Cadastrar Usuário" icon="👤" width={520}
        footer={<ModalFooter isAdmin={true} onCancel={() => setModal(false)} onSave={handleCreate} saving={saving} label="Cadastrar" />}>
        <FormGrid>
          {/* Aviso dinâmico */}
          <div style={{ gridColumn:'1/3', padding:'10px 14px', background: isTeacherRole?'var(--brand-50)':'var(--surface-2)', borderRadius:'var(--radius)', border:`1px solid ${isTeacherRole?'var(--brand-100)':'var(--border)'}`, fontSize:'12.5px', color: isTeacherRole?'var(--brand)':'var(--text-4)' }}>
            {isTeacherRole
              ? `👥 Como a função é "${roleMap[form.role]?.label}", o usuário também será cadastrado em Professores.`
              : '⚙️ Administradores têm acesso completo ao sistema.'}
          </div>
          <Field label="Nome completo" required><Input value={form.name} onChange={f('name')} placeholder="Nome do usuário" /></Field>
          <Field label="Função" required>
            <Select value={form.role} onChange={f('role')}>
              <option value="teacher">Professor</option>
              <option value="coordinator">Coordenador</option>
              <option value="admin">Administrador</option>
            </Select>
          </Field>
          <Field label="E-mail" required col="1/3"><Input type="email" value={form.email} onChange={f('email')} placeholder="usuario@email.com" /></Field>
          {isTeacherRole && <>
            <Field label="CPF"><Input value={form.cpf} onChange={f('cpf')} placeholder="000.000.000-00" /></Field>
            <Field label="Telefone"><Input value={form.phone} onChange={f('phone')} placeholder="(11) 99999-0000" /></Field>
            <Field label="Matérias" col="1/3"><Input value={form.subjects} onChange={f('subjects')} placeholder="Matemática, Física..." /></Field>
          </>}
          <Field label="Senha inicial" required col="1/3">
            <Input type="password" value={form.password} onChange={f('password')} placeholder="Mínimo 6 caracteres" />
          </Field>
        </FormGrid>
      </Modal>

      {/* Modal edição */}
      <Modal open={!!editModal} onClose={() => setEdit(null)} title="Editar Usuário" icon="✏️"
        footer={<ModalFooter isAdmin={true} onCancel={() => setEdit(null)} onSave={handleEdit} saving={saving} />}>
        {editModal && <FormGrid>
          <Field label="Foto" col="1/3">
            <ImageUploadField entityType="user" entityId={editModal.id} currentImage={editModal.image_url}
              onUploaded={url => setEdit(p => ({ ...p, image_url: url }))} />
          </Field>
          <Field label="Nome" required col="1/3"><Input value={editModal.name||''} onChange={fe('name')} /></Field>
          <Field label="E-mail" col="1/3"><Input type="email" value={editModal.email||''} onChange={fe('email')} /></Field>
          <Field label="Função"><Select value={editModal.role||'teacher'} onChange={fe('role')}>
            <option value="teacher">Professor</option>
            <option value="coordinator">Coordenador</option>
            <option value="admin">Administrador</option>
          </Select></Field>
          <Field label="Status"><Select value={editModal.active?'1':'0'} onChange={e=>setEdit(p=>({...p,active:e.target.value==='1'}))}>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </Select></Field>
        </FormGrid>}
      </Modal>
    </div>
  )
}

// ── CONFIGURAÇÕES ─────────────────────────────────────────────────
export function Configuracoes() {
  const { user } = useAuth()
  const [form, setForm]     = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [saving, setSaving] = useState(false)
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const roleLabel = user?.role === 'admin' ? 'Administrador' : user?.role === 'coordinator' ? 'Coordenador' : 'Professor'
  const roleColor = user?.role === 'admin' ? 'red' : user?.role === 'coordinator' ? 'orange' : 'blue'

  async function handlePassword(e) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) { toast('Senhas não coincidem','error'); return }
    if (form.newPassword.length < 6) { toast('Mínimo 6 caracteres','error'); return }
    setSaving(true)
    try {
      const { auth: authApi } = await import('../services/api')
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast('Senha alterada com sucesso!')
      setForm({ currentPassword:'', newPassword:'', confirmPassword:'' })
    } catch(e) { toast(e.response?.data?.error||'Erro ao alterar senha','error') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Preferências do sistema e da conta" />
      <div style={{ maxWidth:'500px', display:'flex', flexDirection:'column', gap:'20px' }}>
        <Card style={{ padding:'22px 24px' }}>
          <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'16px' }}>👤 Minha conta</div>
          <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'14px', background:'var(--surface-2)', borderRadius:'var(--radius-lg)' }}>
            <Avatar name={user?.name||'U'} size={52} />
            <div>
              <div style={{ fontWeight:700, fontSize:'15px' }}>{user?.name}</div>
              <div style={{ fontSize:'13px', color:'var(--text-4)', marginTop:'2px' }}>{user?.email}</div>
              <div style={{ marginTop:'6px' }}><Badge color={roleColor} dot>{roleLabel}</Badge></div>
            </div>
          </div>
        </Card>
        <Card style={{ padding:'22px 24px' }}>
          <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'16px' }}>🔑 Alterar senha</div>
          <form onSubmit={handlePassword} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <Field label="Senha atual" required><Input type="password" value={form.currentPassword} onChange={f('currentPassword')} /></Field>
            <Field label="Nova senha" required><Input type="password" value={form.newPassword} onChange={f('newPassword')} /></Field>
            <Field label="Confirmar nova senha" required><Input type="password" value={form.confirmPassword} onChange={f('confirmPassword')} /></Field>
            <button type="submit" disabled={saving} style={{ ...btnP, justifyContent:'center' }}>{saving?'Salvando...':'Alterar senha'}</button>
          </form>
        </Card>
      </div>
    </div>
  )
}
