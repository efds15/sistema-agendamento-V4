import { useState, useEffect, useCallback } from 'react'
import { bookings as bookingsApi, teachers as teachersApi, slots as slotsApi, resources as resourcesApi, equipments as equipmentsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { toast, Modal, Field, Input, Select, FormGrid, StatusBadge, Avatar, Spinner, Badge } from '../components/UI'
import { PageHeader } from '../components/Layout'

const MONTHS    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_LONG  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

function fmtTime(v) { return v ? String(v).substring(0,5) : '—' }

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

// ── Formulário de agendamento (dentro do modal) ─────────────────
function BookingForm({ date, onSave, onCancel, isAdmin, teachers, allSlots, resources, equipments }) {
  const [slotStart, setSlotStart] = useState(null)
  const [slotEnd,   setSlotEnd]   = useState(null)
  const [teacherId, setTeacherId] = useState('')
  const [resourceId, setResource] = useState('')
  const [equipIds,  setEquips]    = useState([])
  const [purpose,   setPurpose]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [availability, setAvail]  = useState(null)
  const [loadingA,  setLoadA]     = useState(false)

  const activeSlots = allSlots.filter(s => s.active)

  // Range de aulas selecionado
  const selSlot = slotStart !== null ? {
    start: activeSlots[slotStart].start_time,
    end:   activeSlots[slotEnd ?? slotStart].end_time,
    label: slotStart === (slotEnd ?? slotStart)
      ? activeSlots[slotStart].label
      : `${activeSlots[slotStart].label} – ${activeSlots[slotEnd ?? slotStart].label}`,
    count: (slotEnd ?? slotStart) - slotStart + 1,
  } : null

  function pickSlot(i) {
    if (slotStart === null) { setSlotStart(i); setSlotEnd(null) }
    else if (i === slotStart && slotEnd === null) { setSlotStart(null); setSlotEnd(null) }
    else if (i < slotStart) { setSlotStart(i); setSlotEnd(null) }
    else setSlotEnd(i)
    setResource(''); setEquips([])
  }
  function inRange(i) { if (slotStart===null) return false; return i>=(slotStart) && i<=(slotEnd??slotStart) }

  useEffect(() => {
    if (!selSlot || !date) { setAvail(null); return }
    setLoadA(true)
    bookingsApi.availability({ date: fmt(date), startTime: selSlot.start, endTime: selSlot.end })
      .then(r => { setAvail(r.data); setLoadA(false) })
      .catch(() => setLoadA(false))
  }, [slotStart, slotEnd, date])

  async function handleSave() {
    if (!selSlot)     { toast('Selecione pelo menos uma aula','error'); return }
    if (!resourceId)  { toast('Selecione um ambiente','error'); return }
    if (isAdmin && !teacherId) { toast('Selecione o professor','error'); return }
    setSaving(true)
    try {
      await bookingsApi.create({
        teacherId:    isAdmin ? parseInt(teacherId) : undefined,
        resourceId:   parseInt(resourceId),
        equipmentIds: equipIds,
        date:         fmt(date),
        startTime:    selSlot.start,
        endTime:      selSlot.end,
        purpose,
      })
      toast('Agendamento realizado!')
      onSave?.()
    } catch(e) { toast(e.response?.data?.error || 'Erro ao agendar','error') }
    finally { setSaving(false) }
  }

  const availResources  = availability?.resources  || []
  const availEquipments = availability?.equipments || []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

      {/* Data selecionada */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px', background:'var(--brand-50)', borderRadius:'var(--radius-lg)', border:'1px solid var(--brand-100)' }}>
        <span style={{ fontSize:'20px' }}>📅</span>
        <div>
          <div style={{ fontWeight:700, color:'var(--brand)', fontSize:'14px' }}>
            {DAYS_LONG[date.getDay()]}, {date.getDate()} de {MONTHS[date.getMonth()]}
          </div>
          {selSlot && <div style={{ fontSize:'12.5px', color:'var(--brand)', opacity:.8 }}>
            {selSlot.label} · {selSlot.start} – {selSlot.end} ({selSlot.count} aula{selSlot.count>1?'s':''})
          </div>}
        </div>
      </div>

      {/* Step 1 — Aulas */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
          <div style={{ fontWeight:700, fontSize:'13px', color:'var(--text-1)', display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ width:'20px', height:'20px', background:'var(--brand)', color:'#fff', borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800 }}>1</span>
            Selecione as aulas
          </div>
          {slotStart !== null && (
            <button onClick={() => { setSlotStart(null); setSlotEnd(null) }}
              style={{ fontSize:'11px', color:'var(--danger)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
              Limpar
            </button>
          )}
        </div>
        <div style={{ fontSize:'12px', color:'var(--text-4)', marginBottom:'8px' }}>
          {slotStart===null ? 'Clique em uma aula para iniciar' : slotEnd===null ? 'Clique em outra aula para estender o período' : `${selSlot.count} aula(s) selecionada(s)`}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          {activeSlots.map((slot, i) => {
            const active = inRange(i)
            const isStart = i === slotStart
            const isEnd   = slotEnd !== null && i === slotEnd
            return (
              <button key={slot.id} onClick={() => pickSlot(i)}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', borderRadius:'var(--radius)', cursor:'pointer', border:`1.5px solid ${active?'var(--brand)':'var(--border)'}`, background:active?'var(--brand-50)':'var(--surface)', color:'var(--text-1)', textAlign:'left', transition:'all .1s' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:active?'var(--brand)':'var(--surface-3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800, color:active?'#fff':'var(--text-3)', flexShrink:0 }}>
                  {i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'13px', color:active?'var(--brand)':'var(--text-1)' }}>{slot.label}</div>
                  <div style={{ fontSize:'11.5px', color:'var(--text-4)' }}>{slot.start_time} – {slot.end_time}</div>
                </div>
                {(isStart || (slotEnd===null && active)) && <span style={{ fontSize:'10px', fontWeight:700, background:'var(--brand)', color:'#fff', padding:'2px 7px', borderRadius:'99px' }}>INÍCIO</span>}
                {isEnd && <span style={{ fontSize:'10px', fontWeight:700, background:'var(--brand)', color:'#fff', padding:'2px 7px', borderRadius:'99px' }}>FIM</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2 — Professor (admin) */}
      {isAdmin && (
        <div>
          <div style={{ fontWeight:700, fontSize:'13px', color:'var(--text-1)', display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'20px', height:'20px', background:'var(--brand)', color:'#fff', borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800 }}>2</span>
            Professor
          </div>
          <Select value={teacherId} onChange={e => setTeacherId(e.target.value)}>
            <option value="">Selecione o professor...</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
      )}

      {/* Step 3 — Ambiente */}
      {selSlot && (
        <div>
          <div style={{ fontWeight:700, fontSize:'13px', color:'var(--text-1)', display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'20px', height:'20px', background:'var(--brand)', color:'#fff', borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800 }}>{isAdmin?3:2}</span>
            Ambiente
          </div>
          {loadingA ? <Spinner size={20} /> : (
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {availResources.length === 0 && <div style={{ fontSize:'13px', color:'var(--text-4)', padding:'12px', textAlign:'center', background:'var(--surface-2)', borderRadius:'var(--radius)' }}>Nenhum ambiente disponível</div>}
              {availResources.map(r => (
                <div key={r.id} onClick={() => r.available && setResource(String(r.id))}
                  style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'var(--radius)', border:`1.5px solid ${String(resourceId)===String(r.id)?'var(--brand)':r.available?'var(--border)':'var(--border)'}`, background:String(resourceId)===String(r.id)?'var(--brand-50)':r.available?'var(--surface)':'var(--surface-3)', cursor:r.available?'pointer':'not-allowed', opacity:r.available?1:.55, transition:'all .1s' }}>
                  <span style={{ fontSize:'18px' }}>🚪</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:'13px', color:String(resourceId)===String(r.id)?'var(--brand)':'var(--text-1)' }}>{r.name}</div>
                    <div style={{ fontSize:'11.5px', color:'var(--text-4)' }}>{r.location||''}{r.capacity?` · ${r.capacity} pessoas`:''}</div>
                  </div>
                  <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'99px', background:r.available?'var(--success-bg)':'var(--danger-bg)', color:r.available?'var(--success)':'var(--danger)' }}>
                    {r.available?'Livre':'Ocupado'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Equipamentos (opcional) */}
      {selSlot && availEquipments.filter(e => e.available).length > 0 && (
        <div>
          <div style={{ fontWeight:700, fontSize:'13px', color:'var(--text-1)', display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
            <span style={{ width:'20px', height:'20px', background:'var(--surface-3)', color:'var(--text-3)', borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800 }}>{isAdmin?4:3}</span>
            Equipamentos <span style={{ fontSize:'11.5px', color:'var(--text-4)', fontWeight:400 }}>opcional</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
            {availEquipments.filter(e => e.available).map(e => {
              const sel = equipIds.includes(e.id)
              return (
                <button key={e.id} onClick={() => setEquips(p => sel ? p.filter(x=>x!==e.id) : [...p, e.id])}
                  style={{ padding:'6px 12px', borderRadius:'99px', border:`1.5px solid ${sel?'var(--brand)':'var(--border)'}`, background:sel?'var(--brand-50)':'var(--surface)', color:sel?'var(--brand)':'var(--text-2)', fontSize:'12.5px', fontWeight:600, cursor:'pointer', transition:'all .1s', display:'flex', alignItems:'center', gap:'5px' }}>
                  📽 {e.name}
                  {sel && <span>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Finalidade */}
      {selSlot && (
        <Field label="Finalidade (opcional)">
          <Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Ex: Aula de Física, Reunião pedagógica..." />
        </Field>
      )}

      {/* Botões */}
      <div style={{ display:'flex', gap:'10px', paddingTop:'4px' }}>
        <button onClick={onCancel}
          style={{ flex:1, padding:'11px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', fontWeight:600, fontSize:'13.5px', cursor:'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving || !selSlot || !resourceId}
          style={{ flex:2, padding:'11px', background: (!selSlot||!resourceId) ? 'var(--surface-3)' : 'var(--brand)', color: (!selSlot||!resourceId) ? 'var(--text-4)' : '#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, fontSize:'13.5px', cursor:(!selSlot||!resourceId)?'not-allowed':'pointer', boxShadow:(!selSlot||!resourceId)?'none':'0 2px 8px rgba(70,95,255,.3)', transition:'all .15s' }}>
          {saving ? '⏳ Salvando...' : '✓ Confirmar agendamento'}
        </button>
      </div>
    </div>
  )
}

// ── Calendário principal ────────────────────────────────────────
export default function Calendario() {
  const { isAdmin } = useAuth()
  const isMobile = useIsMobile()
  const today = new Date()

  const [cur, setCur]           = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [allBookings, setBooks] = useState([])
  const [teachers, setTeachers] = useState([])
  const [allSlots, setSlots]    = useState([])
  const [resources, setRes]     = useState([])
  const [equipments, setEquips] = useState([])

  const [bookingModal, setBookingModal]   = useState(null)  // { date }
  const [dayModal, setDayModal]           = useState(null)  // { date, bookings[] }
  const [confirmedModal, setConfirmed]    = useState(null)  // { date }

  const load = useCallback(() => {
    bookingsApi.list().then(r => setBooks(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    slotsApi.list().then(r => setSlots(r.data)).catch(() => {})
    if (isAdmin) {
      teachersApi.list().then(r => setTeachers(r.data)).catch(() => {})
    }
  }, [isAdmin])

  // Agrupa bookings por data
  const byDate = {}
  allBookings.forEach(b => {
    const k = typeof b.date === 'string' ? b.date.split('T')[0] : fmt(new Date(b.date))
    if (!byDate[k]) byDate[k] = []
    byDate[k].push(b)
  })

  // Gera células
  const firstDay = new Date(cur.getFullYear(), cur.getMonth(), 1)
  let sd = new Date(firstDay); sd.setDate(sd.getDate() - sd.getDay())
  const cells = Array.from({length:42}, () => { const d = new Date(sd); sd.setDate(sd.getDate()+1); return d })

  function isPastDay(d) {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return d < t
  }

  function handleDayClick(d) {
    if (d.getMonth() !== cur.getMonth() || isPastDay(d)) return
    const key = fmt(d)
    const dayBookings = byDate[key] || []
    if (dayBookings.length > 0) {
      setDayModal({ date: d, bookings: dayBookings })
    } else {
      setBookingModal({ date: d })
    }
  }

  function handleNewBooking(d) {
    setDayModal(null)
    setBookingModal({ date: d })
  }

  function handleSaved() {
    const date = bookingModal?.date
    setBookingModal(null)
    setConfirmed({ date })
    load()
  }

  return (
    <div>
      <PageHeader title="Calendário" subtitle="Visualize e agende reservas de ambientes"
        action={
          <button onClick={() => {
            // Abre modal para o próximo dia útil
            const d = new Date()
            if (d.getDay() === 0) d.setDate(d.getDate()+1)
            if (d.getDay() === 6) d.setDate(d.getDate()+2)
            setBookingModal({ date: d })
          }}
          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, fontSize:'13.5px', cursor:'pointer', boxShadow:'0 2px 8px rgba(70,95,255,.3)' }}>
            + Novo Agendamento
          </button>
        }
      />

      {/* Grade do calendário */}
      <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
        {/* Nav mês */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <button onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth()-1, 1))}
              style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'5px 10px', cursor:'pointer', color:'var(--text-2)', fontSize:'16px' }}>‹</button>
            <span style={{ fontSize:'15px', fontWeight:700, minWidth:'140px', textAlign:'center', color:'var(--text-1)' }}>{MONTHS[cur.getMonth()]} {cur.getFullYear()}</span>
            <button onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth()+1, 1))}
              style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'5px 10px', cursor:'pointer', color:'var(--text-2)', fontSize:'16px' }}>›</button>
          </div>
          <button onClick={() => setCur(new Date(today.getFullYear(), today.getMonth(), 1))}
            style={{ fontSize:'12px', background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'5px 10px', cursor:'pointer', color:'var(--text-3)' }}>Hoje</button>
        </div>

        {/* Header dias */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--border)' }}>
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i) => (
            <div key={i} style={{ padding: isMobile?'6px 2px':'8px 4px', textAlign:'center', fontSize: isMobile?'10px':'11px', fontWeight:700, color:'var(--text-4)' }}>{isMobile?d[0]:d}</div>
          ))}
        </div>

        {/* Células */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {cells.map((d, i) => {
            const isOther   = d.getMonth() !== cur.getMonth()
            const isPast    = isPastDay(d)
            const isToday   = d.toDateString() === today.toDateString()
            const key       = fmt(d)
            const evs       = byDate[key] || []
            const clickable = !isOther && !isPast

            return (
              <div key={i} onClick={() => clickable && handleDayClick(d)}
                style={{ minHeight: isMobile?'48px':'72px', borderRight:i%7===6?'none':'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding: isMobile?'4px 3px':'6px', cursor:clickable?'pointer':'default', background:'var(--surface)', opacity: isOther||isPast ? .35 : 1, transition:'background .1s', position:'relative' }}
                onMouseEnter={e => { if(clickable) e.currentTarget.style.background='var(--brand-50)' }}
                onMouseLeave={e => e.currentTarget.style.background='var(--surface)'}>
                {/* Número do dia */}
                <div style={{ width: isMobile?'20px':'24px', height: isMobile?'20px':'24px', borderRadius:'50%', background:isToday?'var(--brand)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize: isMobile?'11px':'12px', fontWeight:600, color:isToday?'#fff':'var(--text-2)', marginBottom:'2px' }}>
                  {d.getDate()}
                </div>
                {/* Eventos */}
                {!isMobile && evs.slice(0,2).map((b,j) => (
                  <div key={j} style={{ padding:'1px 5px', borderRadius:'3px', fontSize:'9.5px', fontWeight:600, marginBottom:'1px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', background:b.status==='confirmado'?'var(--brand)':b.status==='cancelado'?'var(--surface-3)':'#F79009', color:b.status==='cancelado'?'var(--text-4)':'#fff' }}>
                    {fmtTime(b.start_time||b.startTime)}
                  </div>
                ))}
                {!isMobile && evs.length>2 && <div style={{ fontSize:'9px', color:'var(--text-4)' }}>+{evs.length-2}</div>}
                {/* Mobile: pontos */}
                {isMobile && evs.length>0 && (
                  <div style={{ display:'flex', gap:'2px', justifyContent:'center', marginTop:'2px' }}>
                    {evs.slice(0,3).map((b,j) => <span key={j} style={{ width:'4px', height:'4px', borderRadius:'50%', background:b.status==='confirmado'?'var(--brand)':b.status==='cancelado'?'var(--text-4)':'#F79009' }} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legenda */}
        <div style={{ padding:'8px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:'14px', flexWrap:'wrap' }}>
          {[['var(--brand)','Confirmado'],['#F79009','Pendente'],['var(--surface-3)','Cancelado']].map(([bg,lbl]) => (
            <span key={lbl} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'var(--text-3)' }}>
              <span style={{ width:'10px', height:'10px', borderRadius:'2px', background:bg, display:'inline-block' }} />{lbl}
            </span>
          ))}
        </div>
      </div>

      {/* ── Modal de agendamentos do dia ──────────────────────── */}
      <Modal open={!!dayModal} onClose={() => setDayModal(null)}
        title={dayModal ? `${DAYS_LONG[dayModal.date.getDay()]}, ${dayModal.date.getDate()} de ${MONTHS[dayModal.date.getMonth()]}` : ''}
        icon="📅" width={520}>
        {dayModal && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span style={{ fontSize:'13px', color:'var(--text-3)' }}>{dayModal.bookings.length} agendamento(s)</span>
              <button onClick={() => handleNewBooking(dayModal.date)}
                style={{ padding:'7px 14px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontWeight:700, fontSize:'12.5px', cursor:'pointer' }}>
                + Novo agendamento
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {[...dayModal.bookings].sort((a,b) => String(a.start_time||'').localeCompare(String(b.start_time||''))).map(b => {
                const stColors = { confirmado:'var(--success)', pendente:'var(--warning)', cancelado:'var(--danger)' }
                const stBgs    = { confirmado:'var(--success-bg)', pendente:'var(--warning-bg)', cancelado:'var(--danger-bg)' }
                return (
                  <div key={b.id} style={{ display:'flex', gap:'12px', padding:'13px', background:'var(--surface-2)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)' }}>
                    <div style={{ minWidth:'56px', padding:'8px', background:stBgs[b.status]||'var(--surface-3)', borderRadius:'var(--radius)', flexShrink:0, textAlign:'center' }}>
                      <div style={{ fontSize:'14px', fontWeight:800, color:stColors[b.status]||'var(--text-2)' }}>{fmtTime(b.start_time||b.startTime)}</div>
                      <div style={{ fontSize:'10px', color:'var(--text-4)' }}>até</div>
                      <div style={{ fontSize:'12px', fontWeight:600, color:stColors[b.status]||'var(--text-3)' }}>{fmtTime(b.end_time||b.endTime)}</div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'14px', marginBottom:'3px' }}>{b.resource?.name||'—'}</div>
                      {b.teacher?.name && (
                        <div style={{ fontSize:'12.5px', color:'var(--text-3)', marginBottom:'3px' }}>👤 {b.teacher.name}</div>
                      )}
                      {b.purpose && <div style={{ fontSize:'12px', color:'var(--text-4)' }}>📝 {b.purpose}</div>}
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal de novo agendamento ────────────────────────── */}
      <Modal open={!!bookingModal} onClose={() => setBookingModal(null)}
        title="Novo agendamento" icon="📅" width={560}>
        {bookingModal && (
          <BookingForm
            date={bookingModal.date}
            isAdmin={isAdmin}
            teachers={teachers}
            allSlots={allSlots}
            resources={resources}
            equipments={equipments}
            onSave={handleSaved}
            onCancel={() => setBookingModal(null)}
          />
        )}
      </Modal>

      {/* ── Modal de confirmação ─────────────────────────────── */}
      <Modal open={!!confirmedModal} onClose={() => setConfirmed(null)} title="Agendamento realizado!" icon="✅" width={400}>
        {confirmedModal && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'var(--success-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', margin:'0 auto 16px' }}>✓</div>
            <div style={{ fontSize:'16px', fontWeight:700, color:'var(--success)', marginBottom:'8px' }}>Agendamento confirmado!</div>
            <div style={{ fontSize:'13.5px', color:'var(--text-3)', marginBottom:'20px' }}>
              {DAYS_LONG[confirmedModal.date.getDay()]}, {confirmedModal.date.getDate()} de {MONTHS[confirmedModal.date.getMonth()]}
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
              <button onClick={() => setConfirmed(null)}
                style={{ padding:'10px 20px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', fontWeight:600, cursor:'pointer', fontSize:'13.5px' }}>
                Fechar
              </button>
              <button onClick={() => { setConfirmed(null); setBookingModal({ date: confirmedModal.date }) }}
                style={{ padding:'10px 20px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, cursor:'pointer', fontSize:'13.5px', boxShadow:'0 2px 8px rgba(70,95,255,.3)' }}>
                + Novo agendamento
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
