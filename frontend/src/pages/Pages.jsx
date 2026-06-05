import { useState, useEffect } from 'react'
import { bookings as bookingsApi, teachers as teachersApi, resources as resourcesApi, equipments as equipmentsApi } from '../services/api'
import { toast, Card, Badge, StatusBadge, Spinner, Empty, Modal, Field, Input, Select, Textarea, Button } from '../components/UI'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'

// ===== AGENDAMENTOS =====
export function Agendamentos() {
  const { user, isAdmin } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [editModal, setEditModal] = useState(null)

  const load = () => {
    setLoading(true)
    bookingsApi.list().then(r => { setList(r.data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = list.filter(b => {
    if (filter === 'confirmado') return b.status === 'confirmado'
    if (filter === 'pendente') return b.status === 'pendente'
    if (filter === 'cancelado') return b.status === 'cancelado'
    return true
  }).filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return b.teacher?.name?.toLowerCase().includes(q) || b.resource?.name?.toLowerCase().includes(q) || b.purpose?.toLowerCase().includes(q)
  })

  async function handleCancel(id) {
    if (!confirm('Cancelar este agendamento?')) return
    try {
      await bookingsApi.cancel(id)
      toast('Agendamento cancelado')
      load()
    } catch { toast('Erro ao cancelar', 'error') }
  }

  async function handleConfirm(id) {
    try {
      await bookingsApi.update(id, { status: 'confirmado' })
      toast('Agendamento confirmado!')
      load()
    } catch { toast('Erro', 'error') }
  }

  return (
    <div>
      <PageHeader title="Agendamentos" subtitle="Gerencie todas as reservas de ambientes e equipamentos" />

      <div style={{ position:'relative', marginBottom:'16px' }}>
        <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'16px' }}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por professor, sala, finalidade..."
          style={{ width:'100%', padding:'10px 16px 10px 38px', border:'1px solid #e2e8f0', borderRadius:'9px', fontSize:'13.5px', outline:'none', background:'white' }} />
      </div>

      <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
        {['todos','confirmado','pendente','cancelado'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12.5px', fontWeight:600, cursor:'pointer', border:'1.5px solid', transition:'all .12s',
              borderColor: filter===f?'#1e4d8c':'#e2e8f0', background: filter===f?'#e8f0fb':'white', color: filter===f?'#1e4d8c':'#64748b' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon="📭" title="Nenhum agendamento encontrado" subtitle="Tente ajustar os filtros ou faça um novo agendamento" /> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Data','Horário','Recurso','Professor','Finalidade','Status','Ações'].map(h =>
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} style={{ borderBottom:'1px solid #f8fafc', transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='white'}>
                    <td style={{ padding:'12px 14px' }}>{new Date(b.date+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>{b.startTime} — {b.endTime}</td>
                    <td style={{ padding:'12px 14px', fontWeight:500 }}>{b.resource?.name || '—'}</td>
                    <td style={{ padding:'12px 14px' }}>{b.teacher?.name || '—'}</td>
                    <td style={{ padding:'12px 14px', color:'#64748b', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.purpose || '—'}</td>
                    <td style={{ padding:'12px 14px' }}><StatusBadge status={b.status} /></td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:'6px' }}>
                        {isAdmin && b.status === 'pendente' && (
                          <button onClick={() => handleConfirm(b.id)} title="Confirmar" style={{ background:'#dcfce7', color:'#15803d', border:'none', borderRadius:'7px', padding:'5px 8px', cursor:'pointer', fontSize:'14px' }}>✓</button>
                        )}
                        {b.status !== 'cancelado' && (
                          <button onClick={() => handleCancel(b.id)} title="Cancelar" style={{ background:'#fee2e2', color:'#991b1b', border:'none', borderRadius:'7px', padding:'5px 8px', cursor:'pointer', fontSize:'14px' }}>✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ===== PROFESSORES =====
export function Professores() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name:'', email:'', cpf:'', subjects:'', role:'teacher', phone:'', password:'' })
  const [saving, setSaving] = useState(false)

  const load = () => { teachersApi.list().then(r => { setList(r.data); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(load, [])

  const f = v => e => setForm(p=>({...p,[v]:e.target.value}))

  async function handleSave() {
    if (!form.name || !form.email || !form.password) { toast('Preencha os campos obrigatórios', 'error'); return }
    setSaving(true)
    try {
      await teachersApi.create(form)
      toast('Professor cadastrado com sucesso!')
      setModal(false)
      setForm({ name:'', email:'', cpf:'', subjects:'', role:'teacher', phone:'', password:'' })
      load()
    } catch (e) { toast(e.response?.data?.error || 'Erro ao salvar', 'error') }
    finally { setSaving(false) }
  }

  async function handleToggle(id) {
    try { await teachersApi.toggle(id); load() } catch { toast('Erro', 'error') }
  }

  const filtered = list.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader title="Professores" subtitle="Cadastro e gerenciamento de professores"
        action={<button onClick={() => setModal(true)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 16px', background:'#1e4d8c', color:'white', border:'none', borderRadius:'9px', fontWeight:600, fontSize:'13.5px', cursor:'pointer' }}>+ Novo Professor</button>} />

      <div style={{ position:'relative', marginBottom:'16px' }}>
        <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar professor..."
          style={{ width:'100%', padding:'10px 16px 10px 38px', border:'1px solid #e2e8f0', borderRadius:'9px', fontSize:'13.5px', outline:'none', background:'white' }} />
      </div>

      <Card>
        {loading ? <Spinner /> : filtered.length===0 ? <Empty icon="👥" title="Nenhum professor encontrado" /> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Professor','Matérias','Acesso','Status','Ações'].map(h =>
              <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', borderBottom:'1px solid #f1f5f9' }}>{h}</th>
            )}</tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom:'1px solid #f8fafc' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#e8f0fb', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'13px', color:'#1e4d8c', flexShrink:0 }}>
                        {t.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                      </div>
                      <div><div style={{ fontWeight:600 }}>{t.name}</div><div style={{ fontSize:'12px', color:'#94a3b8' }}>{t.email}</div></div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:'13px', color:'#64748b' }}>{t.subjects || '—'}</td>
                  <td style={{ padding:'12px 14px' }}><Badge color={t.role==='admin'?'red':t.role==='coordinator'?'orange':'blue'}>{t.role==='coordinator'?'Coordenador':t.role==='admin'?'Admin':'Professor'}</Badge></td>
                  <td style={{ padding:'12px 14px' }}><StatusBadge status={t.active?'ativo':'inativo'} /></td>
                  <td style={{ padding:'12px 14px' }}>
                    <button onClick={() => handleToggle(t.id)} style={{ padding:'5px 10px', background: t.active?'#fee2e2':'#dcfce7', color: t.active?'#991b1b':'#15803d', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                      {t.active?'Desativar':'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Cadastrar Professor"
        footer={<><button onClick={() => setModal(false)} style={{ padding:'8px 16px', background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', fontSize:'13.5px' }}>Cancelar</button><button onClick={handleSave} disabled={saving} style={{ padding:'8px 16px', background:'#1e4d8c', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13.5px', fontWeight:600 }}>{saving?'Salvando...':'Cadastrar'}</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          {[['Nome completo','name','text',true],['CPF','cpf','text',false],['E-mail','email','email',true],['Telefone','phone','text',false]].map(([lbl,key,type,req]) => (
            <Field key={key} label={lbl} required={req}>
              <Input type={type} value={form[key]} onChange={f(key)} placeholder={lbl} />
            </Field>
          ))}
          <Field label="Matérias" required={false}>
            <Input value={form.subjects} onChange={f('subjects')} placeholder="Ex: Matemática, Física" />
          </Field>
          <Field label="Nível de acesso">
            <Select value={form.role} onChange={f('role')}>
              <option value="teacher">Professor</option>
              <option value="coordinator">Coordenador</option>
              <option value="admin">Administrador</option>
            </Select>
          </Field>
          <Field label="Senha inicial" required>
            <Input type="password" value={form.password} onChange={f('password')} placeholder="Mínimo 6 caracteres" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

// ===== AMBIENTES =====
export function Ambientes() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [typeFilter, setTypeFilter] = useState('todos')
  const [form, setForm] = useState({ name:'', type:'sala', capacity:'', location:'', floor:'', features:'' })
  const [saving, setSaving] = useState(false)

  const load = () => { resourcesApi.list().then(r => { setList(r.data); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(load, [])

  const f = v => e => setForm(p=>({...p,[v]:e.target.value}))
  const typeMap = { sala:'Sala', laboratorio:'Laboratório', quadra:'Quadra', especial:'Especial' }
  const iconMap = { sala:'🚪', laboratorio:'🔬', quadra:'⚽', especial:'⭐' }
  const colorMap = { sala:'#e8f0fb', laboratorio:'#fff3ef', quadra:'#dcfce7', especial:'#ede9fe' }

  const filtered = list.filter(r => typeFilter==='todos' || r.type===typeFilter)

  async function handleSave() {
    if (!form.name || !form.type) { toast('Nome e tipo são obrigatórios', 'error'); return }
    setSaving(true)
    try {
      await resourcesApi.create({ ...form, capacity: parseInt(form.capacity)||0, features: form.features.split(',').map(s=>s.trim()).filter(Boolean) })
      toast('Ambiente cadastrado!')
      setModal(false)
      load()
    } catch { toast('Erro ao salvar', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Desativar este ambiente?')) return
    try { await resourcesApi.delete(id); toast('Ambiente desativado'); load() } catch { toast('Erro', 'error') }
  }

  return (
    <div>
      <PageHeader title="Ambientes" subtitle="Salas, laboratórios, quadras e espaços"
        action={<button onClick={()=>setModal(true)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 16px', background:'#1e4d8c', color:'white', border:'none', borderRadius:'9px', fontWeight:600, fontSize:'13.5px', cursor:'pointer' }}>+ Novo Ambiente</button>} />

      <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
        {['todos','sala','laboratorio','quadra','especial'].map(t => (
          <button key={t} onClick={()=>setTypeFilter(t)} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12.5px', fontWeight:600, cursor:'pointer', border:'1.5px solid', borderColor: typeFilter===t?'#1e4d8c':'#e2e8f0', background: typeFilter===t?'#e8f0fb':'white', color: typeFilter===t?'#1e4d8c':'#64748b' }}>
            {t==='todos'?'Todos':typeMap[t]}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
          {filtered.map(r => (
            <div key={r.id} style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'18px', boxShadow:'0 1px 3px rgba(0,0,0,.07)', opacity: r.active?1:.6 }}>
              <div style={{ width:'44px', height:'44px', borderRadius:'10px', background: colorMap[r.type]||'#e8f0fb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', marginBottom:'12px' }}>{iconMap[r.type]||'🚪'}</div>
              <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'4px' }}>{r.name}</div>
              <div style={{ fontSize:'12px', color:'#64748b', marginBottom:'10px' }}>{r.location}{r.floor?` · ${r.floor}`:''}</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'12px' }}>
                <Badge color="gray">👥 {r.capacity} pessoas</Badge>
                <Badge color={r.active?'green':'gray'}>{r.active?'Ativo':'Inativo'}</Badge>
                <Badge color="blue">{typeMap[r.type]}</Badge>
              </div>
              {r.features?.length > 0 && <div style={{ fontSize:'11.5px', color:'#94a3b8', marginBottom:'12px' }}>{r.features.join(' · ')}</div>}
              <div style={{ display:'flex', gap:'8px' }}>
                <button style={{ flex:1, padding:'7px', background:'#1e4d8c', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12.5px', fontWeight:600 }}>Agendar</button>
                <button onClick={() => handleDelete(r.id)} style={{ padding:'7px 10px', background:'#fee2e2', color:'#991b1b', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="Cadastrar Ambiente"
        footer={<><button onClick={()=>setModal(false)} style={{ padding:'8px 16px', background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', fontSize:'13.5px' }}>Cancelar</button><button onClick={handleSave} disabled={saving} style={{ padding:'8px 16px', background:'#1e4d8c', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13.5px', fontWeight:600 }}>{saving?'Salvando...':'Salvar'}</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <Field label="Nome" required style={{ gridColumn:'1/-1' }}><Input value={form.name} onChange={f('name')} placeholder="Ex: Sala 15" /></Field>
          <Field label="Tipo">
            <Select value={form.type} onChange={f('type')}>
              <option value="sala">Sala de Aula</option>
              <option value="laboratorio">Laboratório</option>
              <option value="quadra">Quadra</option>
              <option value="especial">Especial</option>
            </Select>
          </Field>
          <Field label="Capacidade"><Input type="number" value={form.capacity} onChange={f('capacity')} placeholder="35" /></Field>
          <Field label="Localização"><Input value={form.location} onChange={f('location')} placeholder="Bloco A" /></Field>
          <Field label="Andar"><Input value={form.floor} onChange={f('floor')} placeholder="1º andar" /></Field>
          <Field label="Recursos (separados por vírgula)" required={false} style={{ gridColumn:'1/-1' }}>
            <Input value={form.features} onChange={f('features')} placeholder="Projetor, Ar condicionado, Quadro branco" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

// ===== EQUIPAMENTOS =====
export function Equipamentos() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', type:'projetor', brand:'', model:'', patrimony:'' })
  const [saving, setSaving] = useState(false)

  const load = () => { equipmentsApi.list().then(r => { setList(r.data); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(load, [])
  const f = v => e => setForm(p=>({...p,[v]:e.target.value}))

  const iconMap = { projetor:'📽', computador:'💻', kit_didatico:'🤖', camera:'📷', audio:'🔊', outro:'📦' }
  const statusColor = { disponivel:'green', manutencao:'yellow', emprestado:'orange' }

  async function handleSave() {
    if (!form.name) { toast('Nome é obrigatório', 'error'); return }
    setSaving(true)
    try {
      await equipmentsApi.create(form)
      toast('Equipamento cadastrado!')
      setModal(false)
      load()
    } catch { toast('Erro', 'error') } finally { setSaving(false) }
  }

  async function handleStatusChange(id, status) {
    try { await equipmentsApi.update(id, { status }); load() } catch { toast('Erro', 'error') }
  }

  return (
    <div>
      <PageHeader title="Equipamentos" subtitle="Projetores, computadores e kits didáticos"
        action={<button onClick={()=>setModal(true)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'9px 16px', background:'#1e4d8c', color:'white', border:'none', borderRadius:'9px', fontWeight:600, fontSize:'13.5px', cursor:'pointer' }}>+ Novo Equipamento</button>} />

      {loading ? <Spinner /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
          {list.map(e => (
            <div key={e.id} style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'18px', boxShadow:'0 1px 3px rgba(0,0,0,.07)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:'#e8f0fb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>{iconMap[e.type]||'📦'}</div>
                <Badge color={statusColor[e.status]||'gray'}>{e.status}</Badge>
              </div>
              <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'3px' }}>{e.name}</div>
              <div style={{ fontSize:'12px', color:'#64748b', marginBottom:'10px' }}>{e.brand} {e.model} · {e.patrimony}</div>
              <div style={{ display:'flex', gap:'6px' }}>
                <select value={e.status} onChange={ev => handleStatusChange(e.id, ev.target.value)}
                  style={{ flex:1, padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'12.5px', cursor:'pointer', background:'white' }}>
                  <option value="disponivel">Disponível</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="emprestado">Emprestado</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="Cadastrar Equipamento"
        footer={<><button onClick={()=>setModal(false)} style={{ padding:'8px 16px', background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', fontSize:'13.5px' }}>Cancelar</button><button onClick={handleSave} disabled={saving} style={{ padding:'8px 16px', background:'#1e4d8c', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13.5px', fontWeight:600 }}>{saving?'Salvando...':'Salvar'}</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <Field label="Nome" required style={{ gridColumn:'1/-1' }}><Input value={form.name} onChange={f('name')} placeholder="Ex: Projetor Epson 3" /></Field>
          <Field label="Tipo">
            <Select value={form.type} onChange={f('type')}>
              <option value="projetor">Projetor</option>
              <option value="computador">Computador</option>
              <option value="kit_didatico">Kit Didático</option>
              <option value="camera">Câmera</option>
              <option value="audio">Áudio</option>
              <option value="outro">Outro</option>
            </Select>
          </Field>
          <Field label="Marca"><Input value={form.brand} onChange={f('brand')} placeholder="Epson" /></Field>
          <Field label="Modelo"><Input value={form.model} onChange={f('model')} placeholder="PowerLite X49" /></Field>
          <Field label="Nº Patrimônio"><Input value={form.patrimony} onChange={f('patrimony')} placeholder="PAT-000" /></Field>
        </div>
      </Modal>
    </div>
  )
}

// ===== CONFIGURAÇÕES =====
export function Configuracoes() {
  const { user } = useAuth()
  const [form, setForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [saving, setSaving] = useState(false)
  const f = v => e => setForm(p=>({...p,[v]:e.target.value}))

  async function handlePassword(e) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) { toast('As senhas não coincidem', 'error'); return }
    setSaving(true)
    try {
      const { auth: authApi } = await import('../services/api')
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast('Senha alterada com sucesso!')
      setForm({ currentPassword:'', newPassword:'', confirmPassword:'' })
    } catch (e) { toast(e.response?.data?.error || 'Erro ao alterar senha', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Preferências do sistema e da conta" />
      <div style={{ maxWidth:'520px' }}>
        <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'24px', marginBottom:'20px' }}>
          <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'16px' }}>👤 Minha conta</div>
          <div style={{ display:'grid', gap:'6px', fontSize:'13.5px' }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#64748b' }}>Nome</span><strong>{user?.name}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#64748b' }}>Email</span><strong>{user?.email}</strong></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#64748b' }}>Função</span><strong>{user?.role}</strong></div>
          </div>
        </div>
        <div style={{ background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', padding:'24px' }}>
          <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'16px' }}>🔑 Alterar senha</div>
          <form onSubmit={handlePassword}>
            <Field label="Senha atual" required><Input type="password" value={form.currentPassword} onChange={f('currentPassword')} /></Field>
            <Field label="Nova senha" required><Input type="password" value={form.newPassword} onChange={f('newPassword')} /></Field>
            <Field label="Confirmar nova senha" required><Input type="password" value={form.confirmPassword} onChange={f('confirmPassword')} /></Field>
            <button type="submit" disabled={saving} style={{ padding:'9px 20px', background:'#1e4d8c', color:'white', border:'none', borderRadius:'8px', fontWeight:600, fontSize:'13.5px', cursor:'pointer' }}>{saving?'Salvando...':'Alterar senha'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
