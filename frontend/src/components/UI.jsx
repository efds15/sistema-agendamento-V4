import { useState, useEffect, useRef, useMemo } from 'react'

// ── BUTTON ──────────────────────────────────────────────────────
const btnBase = {
  display:'inline-flex', alignItems:'center', gap:'7px',
  fontFamily:'inherit', fontWeight:600, borderRadius:'var(--radius)',
  border:'none', cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap',
  fontSize:'13.5px',
}
const btnVariants = {
  primary:  { background:'var(--brand)',     color:'#fff',          boxShadow:'0 1px 2px rgba(70,95,255,.3)' },
  outline:  { background:'var(--surface)',   color:'var(--text-2)', border:'1px solid var(--border-2)' },
  ghost:    { background:'transparent',      color:'var(--text-3)', border:'none' },
  danger:   { background:'var(--danger-bg)', color:'var(--danger)'  },
  success:  { background:'var(--success-bg)',color:'var(--success)' },
  dark:     { background:'var(--text-1)',    color:'#fff' },
}
const btnSizes = {
  xs: { padding:'4px 10px', fontSize:'12px', borderRadius:'var(--radius-sm)' },
  sm: { padding:'6px 13px', fontSize:'12.5px' },
  md: { padding:'8px 18px', fontSize:'13.5px' },
  lg: { padding:'11px 22px', fontSize:'15px' },
  icon: { padding:'8px', borderRadius:'var(--radius)', aspectRatio:'1' },
  'icon-sm': { padding:'6px', borderRadius:'var(--radius-sm)', aspectRatio:'1' },
}
export function Button({ children, variant='primary', size='md', style={}, ...props }) {
  const [hov, setHov] = useState(false)
  const v = btnVariants[variant]||btnVariants.primary
  const s = btnSizes[size]||btnSizes.md
  const hoverStyle = hov ? (variant==='primary' ? { background:'var(--brand-dark)', transform:'translateY(-1px)', boxShadow:'0 4px 12px rgba(70,95,255,.35)' } : { filter:'brightness(.97)' }) : {}
  return (
    <button style={{...btnBase,...v,...s,...hoverStyle,...style}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      {...props}>{children}</button>
  )
}

// ── BADGE ────────────────────────────────────────────────────────
const badgeColors = {
  blue:   { bg:'#EEF2FF', color:'#3730A3', dot:'#6366F1' },
  green:  { bg:'var(--success-bg)', color:'#166534', dot:'var(--success)' },
  orange: { bg:'#FFF7ED', color:'#9A3412', dot:'#F97316' },
  red:    { bg:'var(--danger-bg)', color:'#991B1B', dot:'var(--danger)' },
  yellow: { bg:'var(--warning-bg)', color:'#92400E', dot:'var(--warning)' },
  gray:   { bg:'var(--surface-3)', color:'var(--text-3)', dot:'#9CA3AF' },
  purple: { bg:'#F5F3FF', color:'#5B21B6', dot:'#7C3AED' },
  teal:   { bg:'#F0FDFA', color:'#134E4A', dot:'#14B8A6' },
}
export function Badge({ children, color='gray', dot=false, size='sm' }) {
  const c = badgeColors[color]||badgeColors.gray
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding: size==='xs'?'2px 7px':'3px 9px', borderRadius:'99px', fontSize: size==='xs'?'11px':'11.5px', fontWeight:600, background:c.bg, color:c.color, whiteSpace:'nowrap' }}>
      {dot && <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:c.dot, flexShrink:0 }} />}
      {children}
    </span>
  )
}

// ── CARD ─────────────────────────────────────────────────────────
export function Card({ children, style={}, pad=true, hover=false }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow)', ...(pad?{padding:'20px 24px'}:{}), ...(hover&&hov?{boxShadow:'var(--shadow-md)',transform:'translateY(-1px)'}:{}), transition:'all .18s', ...style }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {children}
    </div>
  )
}

// ── MODAL ────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, width=580, icon }) {
  const safeClose = () => { if (typeof onClose === 'function') onClose() }

  useEffect(()=>{
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') safeClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open])

  if (!open) return null
  return (
    <div onClick={e => e.target === e.currentTarget && safeClose()}
      style={{ position:'fixed', inset:0, background:'rgba(17,24,39,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px', backdropFilter:'blur(3px)' }}>
      <div style={{ background:'var(--surface)', borderRadius:'var(--radius-xl)', width:'100%', maxWidth:width, boxShadow:'var(--shadow-lg)', overflow:'hidden', animation:'modalIn .2s cubic-bezier(.34,1.26,.64,1)' }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:none}}`}</style>
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'12px' }}>
          {icon && <div style={{ width:'38px', height:'38px', borderRadius:'var(--radius)', background:'var(--brand-50)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>}
          <span style={{ fontSize:'16px', fontWeight:700, color:'var(--text-1)', flex:1 }}>{title}</span>
          <button onClick={safeClose} style={{ background:'var(--surface-3)', border:'none', borderRadius:'var(--radius-sm)', padding:'6px 9px', cursor:'pointer', color:'var(--text-3)', fontSize:'16px', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px', maxHeight:'70vh', overflowY:'auto' }}>{children}</div>
        {footer && <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:'10px', background:'var(--surface-2)' }}>{footer}</div>}
      </div>
    </div>
  )
}

// ── FORM COMPONENTS ──────────────────────────────────────────────
export function Field({ label, required, children, hint, col }) {
  return (
    <div style={{ ...(col?{gridColumn:col}:{}) }}>
      {label && <label style={{ display:'block', fontSize:'12.5px', fontWeight:600, color:'var(--text-2)', marginBottom:'6px' }}>{label}{required&&<span style={{color:'var(--danger)'}}> *</span>}</label>}
      {children}
      {hint && <p style={{ fontSize:'11.5px', color:'var(--text-4)', marginTop:'4px' }}>{hint}</p>}
    </div>
  )
}

const inputStyle = { width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', fontSize:'13.5px', color:'var(--text-1)', outline:'none', background:'var(--surface)', transition:'border-color .15s, box-shadow .15s' }
export function Input({ ...props }) {
  const [foc,setFoc]=useState(false)
  return <input style={{...inputStyle, ...(foc?{borderColor:'var(--brand)', boxShadow:'0 0 0 3px rgba(70,95,255,.12)'}:{})}} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} {...props} />
}
export function Select({ children, ...props }) {
  const [foc,setFoc]=useState(false)
  return <select style={{...inputStyle, ...(foc?{borderColor:'var(--brand)'}:{}), cursor:'pointer'}} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} {...props}>{children}</select>
}
export function Textarea({ ...props }) {
  const [foc,setFoc]=useState(false)
  return <textarea style={{...inputStyle, ...(foc?{borderColor:'var(--brand)', boxShadow:'0 0 0 3px rgba(70,95,255,.12)'}:{}), resize:'vertical', minHeight:'72px'}} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} {...props} />
}

// ── TOAST ────────────────────────────────────────────────────────
let _setToasts = null
export function toast(msg, type='success') { _setToasts?.(p=>[...p,{id:Date.now(),msg,type}]) }
export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  _setToasts = setToasts
  const remove = id => setToasts(p=>p.filter(t=>t.id!==id))
  useEffect(()=>{ if(toasts.length) { const t=setTimeout(()=>remove(toasts[0].id),3500); return ()=>clearTimeout(t) } },[toasts])
  const icons = { success:'✓', error:'✕', warning:'⚠', info:'i' }
  const colors = { success:'#17B26A', error:'#F04438', warning:'#F79009', info:'#0BA5EC' }
  return (
    <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:9999, display:'flex', flexDirection:'column', gap:'8px', alignItems:'flex-end' }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.95)}to{opacity:1;transform:none}}`}</style>
      {toasts.map(t=>(
        <div key={t.id} onClick={()=>remove(t.id)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'13px 16px', background:'#1e293b', color:'#f1f5f9', borderRadius:'var(--radius-lg)', fontSize:'13.5px', fontWeight:500, boxShadow:'0 8px 32px rgba(0,0,0,.45)', minWidth:'260px', cursor:'pointer', animation:'toastIn .25s cubic-bezier(.34,1.26,.64,1)', borderLeft:`3px solid ${colors[t.type]}` }}>
          <span style={{ width:'22px', height:'22px', borderRadius:'50%', background:colors[t.type], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, flexShrink:0 }}>{icons[t.type]}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── STATUS BADGE ─────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const m = { confirmado:{color:'green',l:'Confirmado'}, pendente:{color:'yellow',l:'Pendente'}, cancelado:{color:'red',l:'Cancelado'}, disponivel:{color:'green',l:'Disponível'}, manutencao:{color:'orange',l:'Manutenção'}, emprestado:{color:'yellow',l:'Emprestado'}, ativo:{color:'teal',l:'Ativo'}, inativo:{color:'gray',l:'Inativo'} }
  const s = m[status]||{color:'gray',l:status}
  return <Badge color={s.color} dot>{s.l}</Badge>
}

// ── SPINNER ──────────────────────────────────────────────────────
export function Spinner({ size=32, center=true }) {
  const el = <><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{ width:`${size}px`, height:`${size}px`, border:'2.5px solid var(--border)', borderTopColor:'var(--brand)', borderRadius:'50%', animation:'spin .65s linear infinite', flexShrink:0 }} /></>
  if(!center) return el
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px' }}>{el}</div>
}

// ── EMPTY STATE ──────────────────────────────────────────────────
export function Empty({ icon='📭', title, subtitle, action }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 24px', gap:'10px', textAlign:'center' }}>
      <div style={{ fontSize:'42px', marginBottom:'4px' }}>{icon}</div>
      <div style={{ fontSize:'15px', fontWeight:700, color:'var(--text-1)' }}>{title}</div>
      {subtitle && <div style={{ fontSize:'13px', color:'var(--text-4)', maxWidth:'320px' }}>{subtitle}</div>}
      {action && <div style={{ marginTop:'8px' }}>{action}</div>}
    </div>
  )
}

// ── AVATAR ──────────────────────────────────────────────────────
export function Avatar({ name='?', size=36, color='brand' }) {
  const initials = name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()
  const colors = { brand:'linear-gradient(135deg, #6366F1, #465FFF)', teal:'linear-gradient(135deg, #14B8A6, #0891B2)', amber:'linear-gradient(135deg, #F59E0B, #EF4444)', green:'linear-gradient(135deg, #22C55E, #16A34A)' }
  return (
    <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:'50%', background:colors[color]||colors.brand, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:`${Math.floor(size*0.35)}px`, color:'#fff', flexShrink:0, letterSpacing:'-.5px' }}>
      {initials}
    </div>
  )
}

// ── DROPDOWN MENU ────────────────────────────────────────────────
export function DropdownMenu({ trigger, items, align='right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(()=>{
    const h = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return ()=>document.removeEventListener('mousedown', h)
  },[])
  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <div onClick={()=>setOpen(p=>!p)} style={{ cursor:'pointer' }}>{trigger}</div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', [align==='right'?'right':'left']:'0', background:'var(--surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)', boxShadow:'var(--shadow-lg)', minWidth:'180px', zIndex:200, overflow:'hidden', animation:'modalIn .15s ease' }}>
          {items.map((item,i)=>
            item.divider ? <div key={i} style={{ height:'1px', background:'var(--border)', margin:'4px 0' }} /> :
            <div key={i} onClick={()=>{ item.onClick?.(); setOpen(false) }}
              style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', cursor:'pointer', fontSize:'13.5px', color:item.danger?'var(--danger)':'var(--text-2)', fontWeight:500, transition:'background .1s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {item.icon && <span style={{ fontSize:'16px', width:'20px', textAlign:'center' }}>{item.icon}</span>}
              {item.label}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── SEARCH INPUT ─────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder='Buscar...' }) {
  return (
    <div style={{ position:'relative' }}>
      <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'16px', color:'var(--text-4)', pointerEvents:'none' }}>🔍</span>
      <input value={value} onChange={onChange} placeholder={placeholder}
        style={{ ...inputStyle, paddingLeft:'38px', background:'var(--surface-2)' }}
        onFocus={e=>{ e.target.style.background='var(--surface)'; e.target.style.borderColor='var(--brand)'; e.target.style.boxShadow='0 0 0 3px rgba(70,95,255,.1)' }}
        onBlur={e=>{ e.target.style.background='var(--surface-2)'; e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none' }}
      />
    </div>
  )
}

// ── GRID FORM ────────────────────────────────────────────────────
export function FormGrid({ children, cols=2 }) {
  return <div className="form-2col" style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:'16px' }}>{children}</div>
}

// ── SORT + PAGE HOOK ─────────────────────────────────────────────
export function useSortPage(data, { defaultKey = null, defaultDir = 'asc', pageSize = 20 } = {}) {
  const [sortCol, setSortCol] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)
  const [page, setPage]       = useState(1)

  const sorted = useMemo(() => {
    if (!sortCol) return data
    return [...data].sort((a, b) => {
      let va = a[sortCol]; let vb = b[sortCol]
      if (va instanceof Date) va = va.toISOString()
      if (vb instanceof Date) vb = vb.toISOString()
      va = String(va ?? ''); vb = String(vb ?? '')
      const cmp = va.localeCompare(vb, 'pt-BR', { numeric: true, sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortCol, sortDir])

  const total      = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paged      = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  function onSort(key) {
    setSortDir(d => sortCol === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortCol(key)
    setPage(1)
  }

  useEffect(() => { setPage(1) }, [data.length])

  return { paged, sortCol, sortDir, onSort, page: safePage, totalPages, total, pageSize, setPage }
}

// ── TABLE ────────────────────────────────────────────────────────
function TablePagination({ page, totalPages, onPageChange }) {
  const btn = (active, disabled, label, target) => (
    <button key={label} onClick={() => !disabled && onPageChange(target)} disabled={disabled}
      style={{ minWidth:'30px', padding:'4px 9px', border:`1px solid ${active?'var(--brand)':'var(--border)'}`, borderRadius:'var(--radius-sm)', background:active?'var(--brand)':'var(--surface)', color:active?'#fff':'var(--text-2)', cursor:disabled?'not-allowed':'pointer', fontSize:'12.5px', fontWeight:active?700:400, opacity:disabled?.4:1 }}>
      {label}
    </button>
  )
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .reduce((acc, p) => {
      if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) acc.push(p)
      else if (acc[acc.length - 1] !== '…') acc.push('…')
      return acc
    }, [])
  return (
    <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
      {btn(false, page === 1, '‹', page - 1)}
      {pages.map((p, i) => p === '…'
        ? <span key={`e${i}`} style={{ padding:'4px 6px', fontSize:'12px', color:'var(--text-4)' }}>…</span>
        : btn(p === page, false, String(p), p)
      )}
      {btn(false, page === totalPages, '›', page + 1)}
    </div>
  )
}

export function Table({ headers, children, loading, empty, sortCol, sortDir, onSort, page, totalPages, total, pageSize, onPageChange }) {
  const showPagination = !loading && totalPages > 1
  return (
    <div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1.5px solid var(--border)' }}>
              {headers.map((h, i) => {
                const label     = typeof h === 'string' ? h : h.label
                const key       = typeof h === 'object' && h.key ? h.key : null
                const isSorted  = key && sortCol === key
                const clickable = !!(key && onSort)
                return (
                  <th key={i} onClick={clickable ? () => onSort(key) : undefined}
                    style={{ padding:'11px 16px', textAlign:'left', fontSize:'11.5px', fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.6px', whiteSpace:'nowrap', background:'var(--surface-2)', cursor:clickable?'pointer':'default', userSelect:'none' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                      {label}
                      {clickable && <span style={{ fontSize:'10px', opacity:isSorted?1:.3 }}>{isSorted?(sortDir==='asc'?'↑':'↓'):'↕'}</span>}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={headers.length}><Spinner /></td></tr> :
             !children || (Array.isArray(children) && children.filter(Boolean).length===0)
               ? <tr><td colSpan={headers.length}>{empty||<Empty icon="📋" title="Nenhum registro encontrado" />}</td></tr>
               : children}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--surface-2)', gap:'12px' }}>
          <span style={{ fontSize:'12px', color:'var(--text-4)', whiteSpace:'nowrap' }}>
            {((page-1)*pageSize)+1}–{Math.min(page*pageSize, total)} de {total}
          </span>
          <TablePagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  )
}
export function Tr({ children, onClick }) {
  const [hov,setHov]=useState(false)
  return (
    <tr style={{ borderBottom:'1px solid var(--border)', cursor:onClick?'pointer':'default', background:hov?(onClick?'var(--brand-50)':'var(--surface-2)'):'var(--surface)', transition:'background .1s' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick}>
      {children}
    </tr>
  )
}
export function Td({ children, style={} }) {
  return <td style={{ padding:'13px 16px', fontSize:'13.5px', color:'var(--text-2)', verticalAlign:'middle', ...style }}>{children}</td>
}
