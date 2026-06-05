import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNotifications } from '../hooks/useNotifications'

const TYPE_CONFIG = {
  confirmado:  { icon:'✅', color:'#17B26A', bg:'#ECFDF3', label:'Confirmado'  },
  pendente:    { icon:'⏳', color:'#F79009', bg:'#FFFAEB', label:'Pendente'    },
  cancelado:   { icon:'❌', color:'#F04438', bg:'#FEF3F2', label:'Cancelado'   },
  conflito:    { icon:'⚠️', color:'#F04438', bg:'#FEF3F2', label:'Conflito'    },
  manutencao:  { icon:'🔧', color:'#F79009', bg:'#FFFAEB', label:'Manutenção'  },
  info:        { icon:'ℹ️', color:'#465FFF', bg:'#EEF2FF', label:'Info'        },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

export default function NotificationBell() {
  const [open, setOpen]       = useState(false)
  const [tab, setTab]         = useState('todas')
  const btnRef                = useRef(null)
  const panelRef              = useRef(null)
  const { notifications, unreadCount, markRead, markAllRead, remove, load } = useNotifications()

  // Fecha ao clicar fora
  useEffect(() => {
    const h = e => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          btnRef.current  && !btnRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Recarrega ao abrir
  useEffect(() => { if (open) load() }, [open])

  const filtered = notifications.filter(n => {
    if (tab === 'nao-lidas') return !n.read_at
    return true
  })

  function handleOpen(n) {
    if (!n.read_at) markRead(n.id)
  }

  return (
    <>
      {/* Botão sino */}
      <button ref={btnRef} onClick={() => setOpen(p => !p)}
        style={{ position:'relative', background: open ? 'var(--surface-3)' : 'transparent', border:'none', borderRadius:'var(--radius)', padding:'7px', cursor:'pointer', fontSize:'19px', lineHeight:1, transition:'background .15s', color:'var(--text-3)', display:'flex', alignItems:'center', justifyContent:'center', width:'36px', height:'36px', flexShrink:0 }}>
        🔔
        {unreadCount > 0 && (
          <span style={{ position:'absolute', top:'-4px', right:'-4px', minWidth:'18px', height:'18px', background:'var(--danger)', color:'#fff', borderRadius:'99px', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', border:'2px solid var(--surface)' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Painel via portal */}
      {open && createPortal(
        <div ref={panelRef} style={{
          position:'fixed',
          top: (btnRef.current?.getBoundingClientRect().bottom || 64) + 8,
          right: window.innerWidth - (btnRef.current?.getBoundingClientRect().right || 400),
          width:'380px', maxWidth:'calc(100vw - 32px)',
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-lg)',
          zIndex:9998, overflow:'hidden',
          animation:'notifIn .2s cubic-bezier(.34,1.26,.64,1)',
        }}>
          <style>{`@keyframes notifIn{from{opacity:0;transform:translateY(-8px) scale(.97)}to{opacity:1;transform:none}}`}</style>

          {/* Header */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <span style={{ fontWeight:700, fontSize:'14.5px', color:'var(--text-1)' }}>Notificações</span>
              {unreadCount > 0 && (
                <span style={{ marginLeft:'8px', background:'var(--danger)', color:'#fff', borderRadius:'99px', padding:'1px 7px', fontSize:'11px', fontWeight:700 }}>{unreadCount} novas</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                style={{ fontSize:'12px', color:'var(--brand)', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:'4px 8px', borderRadius:'var(--radius-sm)', transition:'background .12s' }}
                onMouseEnter={e => e.target.style.background='var(--brand-50)'}
                onMouseLeave={e => e.target.style.background='none'}>
                ✓ Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Abas */}
          <div style={{ display:'flex', gap:'4px', padding:'8px 12px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)' }}>
            {[['todas','Todas'], ['nao-lidas','Não lidas']].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ padding:'5px 14px', borderRadius:'var(--radius)', fontSize:'12.5px', fontWeight:600, cursor:'pointer', border:'none', transition:'all .12s', background: tab===k?'var(--surface)':'transparent', color: tab===k?'var(--text-1)':'var(--text-4)', boxShadow: tab===k?'var(--shadow)':'none' }}>
                {l}
                {k === 'nao-lidas' && unreadCount > 0 && (
                  <span style={{ marginLeft:'5px', background:'var(--danger)', color:'#fff', borderRadius:'99px', padding:'0px 5px', fontSize:'10px', fontWeight:700 }}>{unreadCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div style={{ maxHeight:'400px', overflowY:'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'8px' }}>🔔</div>
                <div style={{ fontSize:'14px', fontWeight:600, color:'var(--text-1)' }}>Tudo em dia!</div>
                <div style={{ fontSize:'12.5px', color:'var(--text-4)', marginTop:'4px' }}>Nenhuma notificação {tab === 'nao-lidas' ? 'não lida' : ''}</div>
              </div>
            ) : filtered.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
              const unread = !n.read_at
              return (
                <div key={n.id} onClick={() => handleOpen(n)}
                  style={{ display:'flex', gap:'12px', padding:'13px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer', background: unread ? 'var(--surface-2)' : 'var(--surface)', transition:'background .12s', position:'relative' }}
                  onMouseEnter={e => e.currentTarget.style.background = unread ? 'var(--brand-50)' : 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = unread ? 'var(--surface-2)' : 'var(--surface)'}>

                  {/* Indicador de não lida */}
                  {unread && <span style={{ position:'absolute', left:'6px', top:'50%', transform:'translateY(-50%)', width:'6px', height:'6px', background:'var(--brand)', borderRadius:'50%' }} />}

                  {/* Ícone */}
                  <div style={{ width:'36px', height:'36px', borderRadius:'var(--radius)', background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>
                    {cfg.icon}
                  </div>

                  {/* Conteúdo */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight: unread ? 700 : 600, color:'var(--text-1)', marginBottom:'2px' }}>{n.title}</div>
                    <div style={{ fontSize:'12px', color:'var(--text-3)', lineHeight:1.4, marginBottom:'4px' }}>{n.message}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-4)', display:'flex', alignItems:'center', gap:'6px' }}>
                      <span style={{ display:'inline-block', width:'6px', height:'6px', borderRadius:'50%', background:cfg.color }} />
                      <span style={{ color:cfg.color, fontWeight:600, fontSize:'10.5px' }}>{cfg.label}</span>
                      <span>·</span>
                      <span>{timeAgo(n.created_at)}</span>
                    </div>
                  </div>

                  {/* Botão remover */}
                  <button onClick={e => { e.stopPropagation(); remove(n.id) }}
                    style={{ opacity:0, background:'none', border:'none', cursor:'pointer', color:'var(--text-4)', fontSize:'16px', padding:'2px 6px', borderRadius:'var(--radius-sm)', flexShrink:0, transition:'opacity .15s', alignSelf:'flex-start' }}
                    onMouseEnter={e => { e.target.style.opacity='1'; e.target.style.background='var(--danger-bg)'; e.target.style.color='var(--danger)' }}
                    onMouseLeave={e => { e.target.style.opacity='0'; e.target.style.background='none'; e.target.style.color='var(--text-4)' }}>
                    ✕
                  </button>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', background:'var(--surface-2)', textAlign:'center' }}>
              <span style={{ fontSize:'12px', color:'var(--text-4)' }}>Mostrando {filtered.length} notificação(ões)</span>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
