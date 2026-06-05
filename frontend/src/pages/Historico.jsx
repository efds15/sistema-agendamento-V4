import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { PageHeader } from '../components/Layout'
import { Card, SearchInput, Badge, Spinner } from '../components/UI'

const ACT_CFG = {
  booking_confirmed: { icon:'✅', color:'var(--success)',  bg:'var(--success-bg)', label:'Agendamento confirmado', category:'agendamento' },
  booking_pending:   { icon:'⏳', color:'var(--warning)',  bg:'var(--warning-bg)', label:'Agendamento pendente',   category:'agendamento' },
  booking_cancelled: { icon:'❌', color:'var(--danger)',   bg:'var(--danger-bg)',  label:'Agendamento cancelado',  category:'agendamento' },
  resource_created:  { icon:'🚪', color:'#6366F1',         bg:'#EEF2FF',           label:'Ambiente cadastrado',    category:'ambiente'    },
  equipment_created: { icon:'📽', color:'#F97316',         bg:'#FFF7ED',           label:'Equipamento cadastrado', category:'equipamento' },
  teacher_created:   { icon:'👤', color:'#A855F7',         bg:'#F5F3FF',           label:'Professor cadastrado',   category:'professor'   },
  default:           { icon:'📋', color:'var(--text-3)',   bg:'var(--surface-3)',  label:'Atividade',              category:'geral'       },
}

function timeAgo(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff/60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m/60)
  if (h < 24) return `há ${h}h`
  const days = Math.floor(h/24)
  if (days < 7) return `há ${days}d`
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
}

function fmtTime(v) { return v ? String(v).substring(0,5) : '—' }
function fmtDate(v) {
  if (!v) return '—'
  try {
    const s = v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0]
    const [y,m,d] = s.split('-')
    return new Date(+y,+m-1,+d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})
  } catch { return String(v) }
}

const FILTERS = [
  { key:'todos',       label:'Todos'         },
  { key:'agendamento', label:'Agendamentos'  },
  { key:'ambiente',    label:'Ambientes'     },
  { key:'equipamento', label:'Equipamentos'  },
  { key:'professor',   label:'Professores'   },
]

export default function Historico() {
  const [activities, setAct]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('todos')
  const [search, setSearch]   = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bookR, resR, eqR, teachR] = await Promise.allSettled([
        api.get('/bookings'),
        api.get('/resources'),
        api.get('/equipments'),
        api.get('/teachers'),
      ])

      const acts = []

      if (bookR.status==='fulfilled') {
        bookR.value.data.forEach(b => {
          const type = b.status==='confirmado'?'booking_confirmed':b.status==='cancelado'?'booking_cancelled':'booking_pending'
          acts.push({
            id: `b-${b.id}`, type,
            title:    b.resource?.name || 'Agendamento',
            subtitle: `${b.teacher?.name||'—'} · ${fmtDate(b.date)} das ${fmtTime(b.start_time||b.startTime)} às ${fmtTime(b.end_time||b.endTime)}`,
            detail:   b.purpose || null,
            date:     b.created_at || b.date,
            nav:      '/agendamentos',
          })
        })
      }
      if (resR.status==='fulfilled') {
        resR.value.data.forEach(r => {
          acts.push({
            id: `r-${r.id}`, type: 'resource_created',
            title:    r.name,
            subtitle: `${r.type} · ${r.location||''} · Capacidade: ${r.capacity}`,
            detail:   Array.isArray(r.features) ? r.features.join(', ') : null,
            date:     r.created_at,
            nav:      '/ambientes',
          })
        })
      }
      if (eqR.status==='fulfilled') {
        eqR.value.data.forEach(e => {
          acts.push({
            id: `e-${e.id}`, type: 'equipment_created',
            title:    e.name,
            subtitle: `${e.type} · ${e.brand||''} ${e.model||''}`,
            detail:   e.patrimony ? `Patrimônio: ${e.patrimony}` : null,
            date:     e.created_at,
            nav:      '/equipamentos',
          })
        })
      }
      if (teachR.status==='fulfilled') {
        teachR.value.data.forEach(t => {
          acts.push({
            id: `t-${t.id}`, type: 'teacher_created',
            title:    t.name,
            subtitle: t.subjects || t.email,
            detail:   t.phone || null,
            date:     t.created_at,
            nav:      '/professores',
          })
        })
      }

      acts.sort((a,b) => {
        const da = a.date ? new Date(a.date).getTime() : 0
        const db = b.date ? new Date(b.date).getTime() : 0
        return db - da
      })

      setAct(acts)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = activities
    .filter(a => filter === 'todos' || ACT_CFG[a.type]?.category === filter)
    .filter(a => { if (!search) return true; const q = search.toLowerCase(); return a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q) })

  const counts = {}
  FILTERS.forEach(f => {
    counts[f.key] = f.key === 'todos' ? activities.length : activities.filter(a => ACT_CFG[a.type]?.category === f.key).length
  })

  return (
    <div>
      <PageHeader title="Histórico de Atividades" subtitle="Registro completo de cadastros, alterações e agendamentos" />

      {/* Filtros */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'16px', background:'var(--surface)', padding:'5px', borderRadius:'var(--radius-lg)', width:'fit-content', border:'1px solid var(--border)', flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding:'7px 14px', borderRadius:'var(--radius)', fontSize:'12.5px', fontWeight:600, cursor:'pointer', border:'none', transition:'all .15s', background: filter===f.key?'var(--brand)':'transparent', color: filter===f.key?'#fff':'var(--text-3)', display:'flex', alignItems:'center', gap:'5px' }}>
            {f.label}
            <span style={{ padding:'1px 6px', borderRadius:'99px', fontSize:'11px', background: filter===f.key?'rgba(255,255,255,.25)':'var(--surface-3)', color: filter===f.key?'#fff':'var(--text-4)' }}>
              {counts[f.key]||0}
            </span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div style={{ marginBottom:'20px' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar atividade..." />
      </div>

      <Card pad={false} style={{ overflow:'hidden' }}>
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center', color:'var(--text-4)' }}>
            <div style={{ fontSize:'32px', marginBottom:'10px' }}>📋</div>
            <div style={{ fontWeight:600, fontSize:'15px', color:'var(--text-1)' }}>Nenhuma atividade encontrada</div>
          </div>
        ) : (
          <div>
            {/* Contador */}
            <div style={{ padding:'12px 20px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)', fontSize:'12.5px', color:'var(--text-4)' }}>
              {filtered.length} registro(s) encontrado(s)
            </div>

            {/* Stepper */}
            <div style={{ padding:'16px 20px' }}>
              {filtered.map((act, i) => {
                const cfg = ACT_CFG[act.type] || ACT_CFG.default
                const isLast = i === filtered.length - 1
                return (
                  <div key={act.id} style={{ display:'flex', gap:'0', cursor:'pointer', position:'relative' }}
                    onClick={() => navigate(act.nav)}>
                    {/* Linha + dot */}
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'56px', flexShrink:0 }}>
                      <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:cfg.bg, border:`2px solid ${cfg.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0, zIndex:1, boxShadow:`0 0 0 4px var(--surface)` }}>
                        {cfg.icon}
                      </div>
                      {!isLast && <div style={{ width:'2px', flex:1, minHeight:'16px', background:'var(--border)', margin:'3px 0' }} />}
                    </div>

                    {/* Conteúdo */}
                    <div style={{ flex:1, paddingBottom: isLast?'0':'18px', paddingTop:'7px', paddingLeft:'4px', minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px' }}
                        onMouseEnter={e => e.currentTarget.parentElement.style.opacity='.75'}
                        onMouseLeave={e => e.currentTarget.parentElement.style.opacity='1'}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:'14px', color:'var(--text-1)', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {act.title}
                          </div>
                          <div style={{ fontSize:'12.5px', color:'var(--text-3)', marginBottom: act.detail ? '3px' : '0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {act.subtitle}
                          </div>
                          {act.detail && (
                            <div style={{ fontSize:'12px', color:'var(--text-4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              📝 {act.detail}
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px', flexShrink:0 }}>
                          <span style={{ fontSize:'11px', fontWeight:700, color:cfg.color, background:cfg.bg, padding:'2px 8px', borderRadius:'99px', whiteSpace:'nowrap' }}>
                            {cfg.label}
                          </span>
                          <span style={{ fontSize:'11px', color:'var(--text-4)', whiteSpace:'nowrap' }}>
                            {timeAgo(act.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
