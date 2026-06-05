import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function GlobalSearch() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [selIdx, setSelIdx]   = useState(-1)
  const inputRef = useRef(null)
  const boxRef   = useRef(null)
  const navigate = useNavigate()

  // Fecha ao clicar fora
  useEffect(() => {
    const h = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setFocused(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Atalho Ctrl+K
  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus() }
      if (e.key === 'Escape') { setFocused(false); setQuery('') }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // Busca com debounce
  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const ql = q.toLowerCase()
      const [bookR, resR, eqR, teachR] = await Promise.allSettled([
        api.get('/bookings'),
        api.get('/resources'),
        api.get('/equipments'),
        api.get('/teachers'),
      ])
      const hits = []
      if (resR.status==='fulfilled')
        resR.value.data.filter(r=>r.name.toLowerCase().includes(ql)||r.location?.toLowerCase().includes(ql)).slice(0,3)
          .forEach(r => hits.push({ icon:'🚪', label:r.name, sub:r.location||r.type, to:'/ambientes', type:'Ambiente', color:'#EEF2FF' }))
      if (eqR.status==='fulfilled')
        eqR.value.data.filter(e=>e.name.toLowerCase().includes(ql)||e.brand?.toLowerCase().includes(ql)||e.patrimony?.toLowerCase().includes(ql)).slice(0,3)
          .forEach(e => hits.push({ icon:'📽', label:e.name, sub:`${e.brand||''} · ${e.patrimony||''}`, to:'/equipamentos', type:'Equipamento', color:'#FFF7ED' }))
      if (teachR.status==='fulfilled')
        teachR.value.data.filter(t=>t.name.toLowerCase().includes(ql)||t.email?.toLowerCase().includes(ql)||t.subjects?.toLowerCase().includes(ql)).slice(0,3)
          .forEach(t => hits.push({ icon:'👥', label:t.name, sub:t.subjects||t.email, to:'/professores', type:'Professor', color:'#F5F3FF' }))
      if (bookR.status==='fulfilled')
        bookR.value.data.filter(b=>b.resource?.name?.toLowerCase().includes(ql)||b.teacher?.name?.toLowerCase().includes(ql)||b.purpose?.toLowerCase().includes(ql)).slice(0,3)
          .forEach(b => hits.push({ icon:'📅', label:b.resource?.name||'—', sub:`${b.teacher?.name||'—'} · ${String(b.start_time||'').substring(0,5)}`, to:'/agendamentos', type:'Agendamento', color:'#ECFDF3' }))
      setResults(hits)
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 320)
    return () => clearTimeout(t)
  }, [query, search])

  // Teclado nos resultados
  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(p => Math.min(p+1, results.length-1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(p => Math.max(p-1, 0)) }
    if (e.key === 'Enter' && selIdx >= 0) go(results[selIdx].to)
    if (e.key === 'Escape') { setFocused(false); setQuery('') }
  }

  function go(to) { navigate(to); setFocused(false); setQuery(''); setResults([]) }

  const showDropdown = focused && (query.trim() || results.length > 0)

  return (
    <div ref={boxRef} style={{ position:'relative', flex:1, maxWidth:'480px' }}>
      {/* Input inline */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'0 12px', background:'var(--surface-2)', border:`1.5px solid ${focused ? 'var(--brand)' : 'var(--border)'}`, borderRadius: showDropdown ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)', transition:'border-color .15s', boxShadow: focused ? '0 0 0 3px rgba(70,95,255,.1)' : 'none', height:'38px' }}>
        <span style={{ fontSize:'16px', color:'var(--text-4)', flexShrink:0 }}>{loading ? '⏳' : '🔍'}</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setSelIdx(-1) }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          placeholder="Buscar... (Ctrl+K)"
          style={{ flex:1, border:'none', outline:'none', fontSize:'13.5px', color:'var(--text-1)', background:'transparent', minWidth:0 }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-4)', fontSize:'14px', padding:'2px', flexShrink:0 }}>✕</button>
        )}
        <kbd className="hide-mobile" style={{ fontSize:'10px', background:'var(--surface-3)', border:'1px solid var(--border)', borderRadius:'4px', padding:'1px 5px', color:'var(--text-4)', flexShrink:0, fontFamily:'monospace' }}>⌘K</kbd>
      </div>

      {/* Dropdown de resultados */}
      {showDropdown && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--surface)', border:'1.5px solid var(--brand)', borderTop:'none', borderRadius:'0 0 var(--radius-lg) var(--radius-lg)', boxShadow:'var(--shadow-lg)', zIndex:500, overflow:'hidden', maxHeight:'380px', overflowY:'auto' }}>
          {results.length > 0 ? (
            <>
              <div style={{ padding:'6px 12px', fontSize:'10.5px', fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.5px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
                {results.length} resultado(s) para "{query}"
              </div>
              {results.map((r, i) => (
                <div key={i} onClick={() => go(r.to)}
                  style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', cursor:'pointer', background: i===selIdx ? 'var(--brand-50)' : 'transparent', borderBottom:'1px solid var(--border)', transition:'background .1s' }}
                  onMouseEnter={() => setSelIdx(i)}
                  onMouseLeave={() => setSelIdx(-1)}>
                  <div style={{ width:'34px', height:'34px', borderRadius:'var(--radius)', background:r.color||'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>{r.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'13.5px', color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.label}</div>
                    <div style={{ fontSize:'11.5px', color:'var(--text-4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.sub}</div>
                  </div>
                  <span style={{ fontSize:'11px', color:'var(--brand)', background:'var(--brand-50)', padding:'2px 8px', borderRadius:'99px', fontWeight:600, flexShrink:0 }}>{r.type}</span>
                </div>
              ))}
            </>
          ) : query.trim() && !loading ? (
            <div style={{ padding:'24px', textAlign:'center', color:'var(--text-4)', fontSize:'13.5px' }}>
              <div style={{ fontSize:'24px', marginBottom:'6px' }}>🔍</div>
              Nenhum resultado para <strong>"{query}"</strong>
            </div>
          ) : (
            <div style={{ padding:'12px 14px' }}>
              <div style={{ fontSize:'11px', color:'var(--text-4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:'8px' }}>Navegação rápida</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {[{icon:'🚪',l:'Ambientes',to:'/ambientes'},{icon:'📽',l:'Equipamentos',to:'/equipamentos'},{icon:'👥',l:'Professores',to:'/professores'},{icon:'📅',l:'Agendamentos',to:'/agendamentos'},{icon:'📆',l:'Calendário',to:'/calendario'}].map(item=>(
                  <button key={item.to} onClick={()=>go(item.to)}
                    style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 10px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', fontSize:'12.5px', color:'var(--text-2)', fontWeight:500, transition:'all .12s' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='var(--brand-50)';e.currentTarget.style.borderColor='var(--brand)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='var(--surface-2)';e.currentTarget.style.borderColor='var(--border)'}}>
                    {item.icon} {item.l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
