import { useEffect, useState } from 'react'
import { dashboard as dashApi } from '../services/api'
import api from '../services/api'
import { Spinner, StatusBadge, Avatar } from '../components/UI'
import { PageHeader } from '../components/Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function StatCard({ icon, value, label, color, onClick }) {
  const [hov, setHov] = useState(false)
  const palette = {
    blue:   { grad:'linear-gradient(135deg,#6366F1,#465FFF)', shadow:'rgba(70,95,255,.3)'  },
    green:  { grad:'linear-gradient(135deg,#22C55E,#16A34A)', shadow:'rgba(22,163,74,.3)'  },
    orange: { grad:'linear-gradient(135deg,#F97316,#EA580C)', shadow:'rgba(234,88,12,.3)'  },
    purple: { grad:'linear-gradient(135deg,#A855F7,#7C3AED)', shadow:'rgba(124,58,237,.3)' },
  }
  const p = palette[color]||palette.blue
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', padding:'20px', boxShadow:hov?'var(--shadow-md)':'var(--shadow)', cursor:onClick?'pointer':'default', transition:'all .18s', transform:hov&&onClick?'translateY(-2px)':'none', minWidth:0 }}>
      <div style={{ marginBottom:'14px' }}>
        <div style={{ width:'46px', height:'46px', borderRadius:'var(--radius-lg)', background:p.grad, boxShadow:`0 4px 14px ${p.shadow}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>{icon}</div>
      </div>
      <div style={{ fontSize:'32px', fontWeight:800, color:'var(--text-1)', letterSpacing:'-1px', lineHeight:1 }}>{value??'—'}</div>
      <div style={{ fontSize:'13px', color:'var(--text-3)', marginTop:'6px', fontWeight:500 }}>{label}</div>
    </div>
  )
}

function fmtTime(v) { return v ? String(v).substring(0,5) : '—' }
function fmtDate(v) {
  if (!v) return '—'
  try {
    const s = v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0]
    const [y,m,d] = s.split('-')
    return new Date(+y,+m-1,+d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})
  } catch { return String(v) }
}
function timeAgo(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff/60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m/60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h/24)}d`
}

const ACT_CFG = {
  booking_confirmed: { icon:'✅', color:'var(--success)',  bg:'var(--success-bg)', label:'Confirmado'   },
  booking_pending:   { icon:'⏳', color:'var(--warning)',  bg:'var(--warning-bg)', label:'Pendente'     },
  booking_cancelled: { icon:'❌', color:'var(--danger)',   bg:'var(--danger-bg)',  label:'Cancelado'    },
  resource_created:  { icon:'🚪', color:'#6366F1',         bg:'#EEF2FF',           label:'Novo ambiente'},
  equipment_created: { icon:'📽', color:'#F97316',         bg:'#FFF7ED',           label:'Novo equip.'  },
  teacher_created:   { icon:'👤', color:'#A855F7',         bg:'#F5F3FF',           label:'Professor'    },
  default:           { icon:'📋', color:'var(--text-3)',   bg:'var(--surface-3)',  label:'Atividade'    },
}

function ActivityStepper({ items, onItemClick }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', padding:'4px 0' }}>
      {items.map((act, i) => {
        const cfg = ACT_CFG[act.type] || ACT_CFG.default
        const isLast = i === items.length - 1
        return (
          <div key={act.id || i} onClick={() => onItemClick(act)}
            style={{ display:'flex', gap:'0', cursor:'pointer' }}
            onMouseEnter={e => e.currentTarget.style.opacity='.75'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'48px', flexShrink:0 }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:cfg.bg, border:`2px solid ${cfg.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0, zIndex:1, boxShadow:`0 0 0 3px var(--surface)` }}>
                {cfg.icon}
              </div>
              {!isLast && <div style={{ width:'2px', flex:1, minHeight:'14px', background:'var(--border)', margin:'2px 0' }} />}
            </div>
            <div style={{ flex:1, paddingBottom: isLast?'0':'14px', paddingTop:'5px', paddingLeft:'4px', minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'6px' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{act.title}</div>
                  <div style={{ fontSize:'12px', color:'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:'1px' }}>{act.subtitle}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px', flexShrink:0 }}>
                  <span style={{ fontSize:'10.5px', fontWeight:700, color:cfg.color, background:cfg.bg, padding:'2px 7px', borderRadius:'99px', whiteSpace:'nowrap' }}>{cfg.label}</span>
                  <span style={{ fontSize:'10.5px', color:'var(--text-4)' }}>{timeAgo(act.date)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activities, setAct]    = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    dashApi.get().then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))

    Promise.allSettled([
      api.get('/bookings'),
      isAdmin ? api.get('/resources')   : Promise.resolve({ data:[] }),
      isAdmin ? api.get('/equipments')  : Promise.resolve({ data:[] }),
      isAdmin ? api.get('/teachers')    : Promise.resolve({ data:[] }),
    ]).then(([bookR, resR, eqR, teachR]) => {
      const acts = []

      if (bookR.status==='fulfilled') {
        // Professor vê só os seus próprios agendamentos
        const bookings = isAdmin
          ? bookR.value.data
          : bookR.value.data.filter(b => b.teacher_id === user?.teacher_id || b.teacherId === user?.teacher_id)

        bookings.slice(0,8).forEach(b => {
          const type = b.status==='confirmado'?'booking_confirmed':b.status==='cancelado'?'booking_cancelled':'booking_pending'
          acts.push({
            id:`b-${b.id}`, type,
            title:    b.resource?.name || 'Agendamento',
            subtitle: `${b.teacher?.name||'—'} · ${fmtDate(b.date)} ${fmtTime(b.start_time||b.startTime)}–${fmtTime(b.end_time||b.endTime)}`,
            date:     b.created_at || b.date,
            nav:      '/agendamentos',
          })
        })
      }

      // Admins também veem cadastros
      if (isAdmin) {
        if (resR.status==='fulfilled') resR.value.data.slice(0,3).forEach(r => acts.push({ id:`r-${r.id}`, type:'resource_created', title:r.name, subtitle:`${r.type} · ${r.location||''}`, date:r.created_at, nav:'/ambientes' }))
        if (eqR.status==='fulfilled')  eqR.value.data.slice(0,3).forEach(e => acts.push({ id:`e-${e.id}`, type:'equipment_created', title:e.name, subtitle:`${e.type} · ${e.brand||''}`, date:e.created_at, nav:'/equipamentos' }))
        if (teachR.status==='fulfilled') teachR.value.data.slice(0,3).forEach(t => acts.push({ id:`t-${t.id}`, type:'teacher_created', title:t.name, subtitle:t.subjects||t.email, date:t.created_at, nav:'/professores' }))
      }

      acts.sort((a,b) => (b.date?new Date(b.date).getTime():0) - (a.date?new Date(a.date).getTime():0))
      setAct(acts.slice(0,10))
    })
  }, [isAdmin, user])

  if (loading) return <Spinner />

  const today = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:800, color:'var(--text-1)', margin:0, letterSpacing:'-.3px' }}>Dashboard</h1>
          <p style={{ fontSize:'13.5px', color:'var(--text-3)', marginTop:'4px' }}>{today.charAt(0).toUpperCase()+today.slice(1)}</p>
        </div>
        <button onClick={()=>navigate('/calendario')}
          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 18px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, fontSize:'13.5px', cursor:'pointer', boxShadow:'0 2px 8px rgba(70,95,255,.3)', whiteSpace:'nowrap', flexShrink:0 }}>
          + Novo Agendamento
        </button>
      </div>

      {/* ── Stats: 4 colunas fixas ────────────────────────── */}
      <div className="stats-4col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'14px' }}>
        <StatCard icon="📅" value={data?.todayBookings??0}   label="Hoje"         color="blue"   onClick={()=>navigate('/agendamentos')} />
        <StatCard icon="🚪" value={data?.totalResources??0}  label="Ambientes"    color="green"  onClick={()=>navigate('/ambientes')} />
        <StatCard icon="📽" value={data?.totalEquipments??0} label="Equipamentos" color="orange" onClick={()=>navigate('/equipamentos')} />
        <StatCard icon="👥" value={data?.totalTeachers??0}   label="Professores"  color="purple" onClick={()=>navigate('/professores')} />
      </div>

      {/* Alerta pendentes */}
      {isAdmin && data?.pendingBookings > 0 && (
        <div onClick={()=>navigate('/agendamentos')}
          style={{ background:'linear-gradient(135deg,var(--warning-bg),#FEF3C7)', border:'1px solid #FDE68A', borderRadius:'var(--radius-lg)', padding:'14px 20px', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer' }}>
          <span style={{ fontSize:'22px' }}>⚠️</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, color:'var(--warning)', fontSize:'14px' }}>{data.pendingBookings} agendamento(s) aguardando aprovação</div>
            <div style={{ fontSize:'12.5px', color:'#92400E', marginTop:'2px' }}>Clique para revisar</div>
          </div>
          <span style={{ color:'var(--warning)', fontSize:'18px' }}>→</span>
        </div>
      )}

      {/* ── Linha principal ────────────────────────────────── */}
      <div className="dashboard-main" style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 300px', gap:'16px', alignItems:'start' }}>

        {/* Coluna esquerda */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px', minWidth:0 }}>

          {/* Card: Agendamentos de hoje */}
          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow)', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'14px', color:'var(--text-1)' }}>Agendamentos de hoje</div>
                <div style={{ fontSize:'12px', color:'var(--text-4)', marginTop:'1px' }}>{data?.todayList?.length??0} reservas</div>
              </div>
              <button onClick={()=>navigate('/agendamentos')} style={{ fontSize:'12px', color:'var(--brand)', background:'var(--brand-50)', border:'none', borderRadius:'var(--radius)', padding:'5px 10px', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>Ver todos →</button>
            </div>
            {!data?.todayList?.length ? (
              <div style={{ padding:'28px', textAlign:'center', color:'var(--text-4)', fontSize:'13px' }}>Nenhum agendamento para hoje</div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'360px' }}>
                  <thead><tr style={{ background:'var(--surface-2)' }}>
                    {['Horário','Recurso','Professor','Status'].map(h=>(
                      <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.4px', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.todayList.map(b=>(
                      <tr key={b.id} style={{ borderTop:'1px solid var(--border)', cursor:'pointer', transition:'background .1s' }}
                        onClick={()=>navigate('/agendamentos')}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                          <strong style={{ fontSize:'13px' }}>{fmtTime(b.start_time||b.startTime)}</strong>
                          <span style={{ fontSize:'11px', color:'var(--text-4)' }}> – {fmtTime(b.end_time||b.endTime)}</span>
                        </td>
                        <td style={{ padding:'11px 14px', fontWeight:500, fontSize:'13px' }}>{b.resource?.name}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                            <Avatar name={b.teacher?.name||'?'} size={24} />
                            <span style={{ fontSize:'12.5px' }}>{b.teacher?.name}</span>
                          </div>
                        </td>
                        <td style={{ padding:'11px 14px' }}><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card: Atividades Recentes */}
          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow)', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'14px', color:'var(--text-1)' }}>🕐 Atividades Recentes</div>
                <div style={{ fontSize:'12px', color:'var(--text-4)', marginTop:'1px' }}>Cadastros, alterações e agendamentos</div>
              </div>
              {isAdmin && (
                <button onClick={()=>navigate('/historico')} style={{ fontSize:'12px', color:'var(--brand)', background:'var(--brand-50)', border:'none', borderRadius:'var(--radius)', padding:'5px 10px', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>Ver mais →</button>
              )}
            </div>
            {activities.length === 0 ? (
              <div style={{ padding:'24px', textAlign:'center', color:'var(--text-4)', fontSize:'13px' }}>
                <div style={{ fontSize:'22px', marginBottom:'6px' }}>📋</div>
                Nenhuma atividade recente
              </div>
            ) : (
              <div style={{ padding:'14px 18px' }}>
                <ActivityStepper items={activities} onItemClick={act => navigate(act.nav)} />
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita: resumo + ações */}
        <div style={{ display:'flex', flexDirection:'column', gap:'14px', minWidth:0 }}>
          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow)', padding:'16px 18px' }}>
            <div style={{ fontWeight:700, fontSize:'13.5px', marginBottom:'12px', color:'var(--text-1)' }}>📊 Resumo do mês</div>
            {[['Total de agendamentos',data?.monthBookings??0,'var(--brand)'],['Agendamentos hoje',data?.todayBookings??0,'var(--success)'],['Professores ativos',data?.totalTeachers??0,'#A855F7'],['Ambientes cadastrados',data?.totalResources??0,'var(--warning)']].map(([lbl,val,col])=>(
              <div key={lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:'12.5px', color:'var(--text-3)' }}>{lbl}</span>
                <strong style={{ fontSize:'16px', color:col, letterSpacing:'-.3px' }}>{val}</strong>
              </div>
            ))}
          </div>

          <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow)', padding:'16px 18px' }}>
            <div style={{ fontWeight:700, fontSize:'13.5px', marginBottom:'10px', color:'var(--text-1)' }}>⚡ Ações rápidas</div>
            {[
              { icon:'📅', l:'Novo agendamento',   action:()=>navigate('/calendario'),                          adminOnly: false },
              { icon:'👥', l:'Cadastrar professor', action:()=>navigate('/professores',{state:{openModal:true}}), adminOnly: true  },
              { icon:'🚪', l:'Novo ambiente',        action:()=>navigate('/ambientes',  {state:{openModal:true}}), adminOnly: true  },
              { icon:'📽', l:'Novo equipamento',     action:()=>navigate('/equipamentos',{state:{openModal:true}}),adminOnly: true  },
            ].filter(item => !item.adminOnly || isAdmin).map(item=>(
              <button key={item.l} onClick={item.action}
                style={{ width:'100%', textAlign:'left', padding:'9px 11px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', fontSize:'13px', color:'var(--text-2)', fontWeight:500, marginBottom:'6px', display:'flex', alignItems:'center', gap:'8px', transition:'all .12s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--brand-50)';e.currentTarget.style.borderColor='var(--brand)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='var(--surface-2)';e.currentTarget.style.borderColor='var(--border)'}}>
                <span style={{ fontSize:'15px' }}>{item.icon}</span>{item.l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
