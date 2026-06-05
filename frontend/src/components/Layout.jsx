import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ToastContainer, Avatar, DropdownMenu, Badge, Modal } from './UI'
import NotificationBell from './NotificationBell'
import GlobalSearch from './GlobalSearch'
import api from '../services/api'

const navItems = [
  { to:'/',             icon:'⊞',  label:'Dashboard',   exact:true        },
  { to:'/calendario',   icon:'📅', label:'Calendário'                     },
  { to:'/agendamentos', icon:'🕐', label:'Agendamentos'                     },
  { to:'/historico',    icon:'📋', label:'Histórico',      adminOnly:true          },
  { to:'/aulas',         icon:'🕐', label:'Gerenciar Aulas', superAdminOnly:true },
  { to:'/ambientes',    icon:'🚪', label:'Ambientes'                      },
  { to:'/equipamentos', icon:'📽', label:'Equipamentos'                   },
  { to:'/professores',  icon:'👥', label:'Professores',  adminOnly:true   },
  { to:'/usuarios',     icon:'👤', label:'Usuários',     superAdminOnly:true },
  { to:'/configuracoes',icon:'⚙️', label:'Configurações',section:'sistema'},
]

// ── Hook: conta agendamentos pendentes ───────────────────────────
function usePendingCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const load = () => api.get('/bookings?status=pendente').then(r => setCount(r.data?.length || 0)).catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])
  return count
}

// ── Tooltip portal ────────────────────────────────────────────────
function Tooltip({ label, badge, anchorRef, visible }) {
  const [pos, setPos] = useState({ top:0, left:0 })
  useEffect(() => {
    if (visible && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.top + r.height / 2, left: r.right + 12 })
    }
  }, [visible, anchorRef])
  if (!visible) return null
  return createPortal(
    <div style={{ position:'fixed', top:pos.top, left:pos.left, transform:'translateY(-50%)', background:'rgba(15,23,42,.96)', color:'#fff', padding:'7px 14px', borderRadius:'8px', fontSize:'13px', fontWeight:600, whiteSpace:'nowrap', zIndex:9999, pointerEvents:'none', boxShadow:'0 4px 16px rgba(0,0,0,.35)', display:'flex', alignItems:'center', gap:'8px' }}>
      <span style={{ position:'absolute', left:'-5px', top:'50%', transform:'translateY(-50%)', width:0, height:0, borderTop:'5px solid transparent', borderBottom:'5px solid transparent', borderRight:'5px solid rgba(15,23,42,.96)' }} />
      {label}
      {badge && <span style={{ background:'var(--brand)', color:'#fff', borderRadius:'99px', padding:'1px 7px', fontSize:'11px', fontWeight:700 }}>{badge}</span>}
    </div>,
    document.body
  )
}

// ── Nav item ──────────────────────────────────────────────────────
function NavItem({ item, mini, isAdmin, isSuperAdmin, onNavigate, dynamicBadge }) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef(null)
  if (item.adminOnly && !isAdmin) return null
  if (item.superAdminOnly && !isSuperAdmin) return null
  const badge = item.to === '/agendamentos' ? (dynamicBadge > 0 ? String(dynamicBadge) : null) : item.badge
  return (
    <div ref={ref} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ marginBottom:'3px' }}>
      <NavLink to={item.to} end={item.exact} onClick={onNavigate}
        style={({ isActive }) => ({
          display:'flex', alignItems:'center', gap:'10px',
          padding: mini ? '11px' : '10px 12px',
          justifyContent: mini ? 'center' : 'flex-start',
          borderRadius:'var(--radius)', textDecoration:'none',
          fontWeight:600, fontSize:'13.5px', transition:'background .12s, color .12s',
          color:      isActive ? '#fff' : 'rgba(255,255,255,.58)',
          background: isActive ? 'var(--brand)' : hovered ? 'rgba(255,255,255,.08)' : 'transparent',
        })}>
        <span style={{ fontSize:'18px', flexShrink:0, width:'22px', textAlign:'center', lineHeight:1 }}>{item.icon}</span>
        {!mini && <><span style={{ flex:1 }}>{item.label}</span>{badge && <span style={{ background:'var(--danger)', color:'#fff', borderRadius:'99px', padding:'1px 7px', fontSize:'11px', fontWeight:700 }}>{badge}</span>}</>}
      </NavLink>
      {mini && <Tooltip label={item.label} badge={badge} anchorRef={ref} visible={hovered} />}
    </div>
  )
}

// ── Hambúrguer ────────────────────────────────────────────────────
function HamburgerBtn({ onClick, style={} }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title="Expandir/recolher menu"
      style={{ display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:'4px', width:'36px', height:'36px', background: hov?'var(--surface-3)':'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', transition:'background .15s', flexShrink:0, padding:'8px', ...style }}>
      <span style={{ display:'block', width:'14px', height:'2px', background:'var(--text-3)', borderRadius:'2px' }} />
      <span style={{ display:'block', width:'14px', height:'2px', background:'var(--text-3)', borderRadius:'2px' }} />
      <span style={{ display:'block', width:'14px', height:'2px', background:'var(--text-3)', borderRadius:'2px' }} />
    </button>
  )
}

// ── Botão Sol/Lua — ícone limpo ───────────────────────────────────
function ThemeToggle() {
  const { dark, toggle } = useTheme()
  const [hov, setHov] = useState(false)
  return (
    <button onClick={toggle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'36px', height:'36px', background: hov?'var(--surface-3)':'transparent', border:'none', borderRadius:'var(--radius)', cursor:'pointer', transition:'all .2s', fontSize:'19px', flexShrink:0, color:'var(--text-3)' }}>
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

// ── Sidebar content ───────────────────────────────────────────────
function SidebarContent({ mini, isAdmin, isSuperAdmin, user, onNavigate, pendingCount }) {
  const mainItems = navItems.filter(n => !n.section)
  const sysItems  = navItems.filter(n =>  n.section === 'sistema')
  const [sobreOpen, setSobreOpen] = useState(false)

  return (
    <>
      {/* Logo — clicável */}
      <div onClick={() => { onNavigate?.(); window.location.href = '/' }}
        style={{ height:'64px', flexShrink:0, padding: mini?'0':'0 18px', display:'flex', alignItems:'center', gap:'10px', borderBottom:'1px solid rgba(255,255,255,.08)', justifyContent: mini?'center':'flex-start', cursor:'pointer', transition:'background .15s' }}
        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.05)'}
        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
        <div style={{ width:'36px', height:'36px', background:'var(--brand)', borderRadius:'var(--radius)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>🎓</div>
        {!mini && <div>
          <div style={{ fontSize:'15px', fontWeight:800, color:'#fff', letterSpacing:'-.3px', whiteSpace:'nowrap' }}>Agendamento</div>
          <div style={{ fontSize:'10.5px', color:'rgba(255,255,255,.4)', marginTop:'2px', whiteSpace:'nowrap' }}>Sistema de Agendamento</div>
        </div>}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto', overflowX:'hidden' }}>
        {!mini && <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,.28)', letterSpacing:'1px', padding:'6px 8px 8px', textTransform:'uppercase' }}>Menu</div>}
        {mainItems.map(item => <NavItem key={item.to} item={item} mini={mini} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onNavigate={onNavigate} dynamicBadge={pendingCount} />)}
        <div style={{ height:'1px', background:'rgba(255,255,255,.07)', margin:'10px 4px' }} />
        {!mini && <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,.28)', letterSpacing:'1px', padding:'6px 8px 8px', textTransform:'uppercase' }}>Sistema</div>}
        {sysItems.map(item => <NavItem key={item.to} item={item} mini={mini} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onNavigate={onNavigate} dynamicBadge={0} />)}
      </nav>

      {/* Sobre */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', flexShrink:0 }}>
        <div onClick={() => setSobreOpen(true)}
          style={{ display:'flex', alignItems:'center', gap:'10px', padding: mini?'14px 0':'12px 14px', justifyContent: mini?'center':'flex-start', cursor:'pointer', transition:'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.06)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <span style={{ fontSize:'18px', flexShrink:0, width:'22px', textAlign:'center' }}>ℹ️</span>
          {!mini && (
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'12.5px', fontWeight:600, color:'rgba(255,255,255,.75)', whiteSpace:'nowrap' }}>Sobre o sistema</div>
              <div style={{ fontSize:'10.5px', color:'rgba(255,255,255,.35)', marginTop:'1px' }}>Versão 1.0.0</div>
            </div>
          )}
        </div>
      </div>
      <SobreModal open={sobreOpen} onClose={() => setSobreOpen(false)} />
    </>
  )
}

// ── Modal Sobre ───────────────────────────────────────────────────
function SobreModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Sobre o sistema" icon="ℹ️" width={420}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', marginBottom:'20px' }}>
        <div style={{ width:'64px', height:'64px', background:'var(--brand)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'30px', boxShadow:'0 4px 16px rgba(70,95,255,.35)' }}>🎓</div>
        <div style={{ fontSize:'20px', fontWeight:800, color:'var(--text-1)', marginTop:'6px', letterSpacing:'-.3px' }}>Agendamento</div>
        <div style={{ fontSize:'12.5px', color:'var(--text-4)' }}>Sistema de Agendamento Escolar</div>
        <span style={{ background:'var(--brand-50)', color:'var(--brand)', padding:'3px 12px', borderRadius:'99px', fontSize:'12px', fontWeight:700, marginTop:'2px' }}>Versão 1.0.0</span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
        {[
          ['🎯','Objetivo',       'Gerenciar o agendamento de ambientes e equipamentos escolares de forma centralizada e eficiente.'],
          ['🚪','Ambientes',      'Salas de aula, laboratórios, quadras e espaços especiais.'],
          ['📽','Equipamentos',   'Projetores, computadores, kits didáticos e outros recursos.'],
          ['👥','Usuários',       'Professores, coordenadores e administradores com diferentes níveis de acesso.'],
          ['🔒','Segurança',      'Autenticação JWT com controle de permissões por perfil.'],
        ].map(([ic,lb,desc]) => (
          <div key={lb} style={{ padding:'12px 14px', background:'var(--surface-2)', borderRadius:'var(--radius)', display:'flex', gap:'12px', alignItems:'flex-start' }}>
            <span style={{ fontSize:'18px', flexShrink:0, marginTop:'1px' }}>{ic}</span>
            <div>
              <div style={{ fontSize:'12.5px', fontWeight:700, color:'var(--text-1)', marginBottom:'2px' }}>{lb}</div>
              <div style={{ fontSize:'12px', color:'var(--text-3)', lineHeight:1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'12px 14px', background:'var(--surface-3)', borderRadius:'var(--radius)', textAlign:'center' }}>
        <div style={{ fontSize:'11.5px', color:'var(--text-4)' }}>Desenvolvido como projeto acadêmico</div>
        <div style={{ fontSize:'11px', color:'var(--text-4)', marginTop:'2px' }}>© {new Date().getFullYear()} — Todos os direitos reservados</div>
      </div>
    </Modal>
  )
}

// ── Profile modal ─────────────────────────────────────────────────
function ProfileModal({ open, onClose, user }) {
  const [tab, setTab]       = useState('perfil')
  const [pwForm, setPwForm] = useState({ current:'', next:'', confirm:'' })
  const [saving, setSaving] = useState(false)
  const [showC, setShowC]   = useState(false)
  const [showN, setShowN]   = useState(false)
  const pw = v => e => setPwForm(p => ({ ...p, [v]: e.target.value }))

  function handleClose() {
    setTab('perfil'); setPwForm({ current:'', next:'', confirm:'' }); setSaving(false)
    if (typeof onClose === 'function') onClose()
  }
  async function handleSave(e) {
    e.preventDefault()
    if (pwForm.next.length < 6) { alert('Mínimo 6 caracteres'); return }
    if (pwForm.next !== pwForm.confirm) { alert('As senhas não coincidem'); return }
    setSaving(true)
    try {
      const { auth: api } = await import('../services/api')
      await api.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next })
      alert('✅ Senha alterada!'); handleClose()
    } catch (err) { alert(err.response?.data?.error || 'Erro ao alterar') }
    finally { setSaving(false) }
  }

  const rl = user?.role==='admin'?'Administrador':user?.role==='coordinator'?'Coordenador':'Professor'
  const rc = user?.role==='admin'?'red':user?.role==='coordinator'?'orange':'blue'
  const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', fontSize:'13.5px', outline:'none', background:'var(--surface)', color:'var(--text-1)' }

  return (
    <Modal open={open} onClose={handleClose} title="Minha Conta" icon="👤" width={460}>
      <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px', background:'var(--surface-2)', borderRadius:'var(--radius-lg)', marginBottom:'18px' }}>
        <Avatar name={user?.name||'U'} size={52} />
        <div>
          <div style={{ fontSize:'16px', fontWeight:700, color:'var(--text-1)' }}>{user?.name}</div>
          <div style={{ fontSize:'12.5px', color:'var(--text-4)', marginTop:'2px' }}>{user?.email}</div>
          <div style={{ marginTop:'7px' }}><Badge color={rc} dot>{rl}</Badge></div>
        </div>
      </div>
      <div style={{ display:'flex', gap:'4px', background:'var(--surface-3)', padding:'4px', borderRadius:'var(--radius-lg)', marginBottom:'18px' }}>
        {[['perfil','👤 Perfil'],['senha','🔑 Alterar Senha']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex:1, padding:'8px', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontSize:'13px', fontWeight:600, transition:'all .15s', background:tab===k?'var(--surface)':'transparent', color:tab===k?'var(--text-1)':'var(--text-4)', boxShadow:tab===k?'var(--shadow)':'none' }}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'perfil' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {[['📧','E-mail',user?.email],['🎓','Função',rl],['🆔','ID',`#${user?.id}`]].map(([ic,lb,val]) => (
            <div key={lb} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 14px', background:'var(--surface-2)', borderRadius:'var(--radius)' }}>
              <span style={{ display:'flex', alignItems:'center', gap:'9px', fontSize:'13px', color:'var(--text-3)' }}><span style={{ fontSize:'16px' }}>{ic}</span>{lb}</span>
              <span style={{ fontSize:'13.5px', fontWeight:600, color:'var(--text-1)' }}>{val}</span>
            </div>
          ))}
          <button onClick={() => setTab('senha')} style={{ marginTop:'8px', padding:'10px', background:'var(--brand-50)', color:'var(--brand)', border:'1px solid var(--brand-100)', borderRadius:'var(--radius)', fontWeight:600, fontSize:'13.5px', cursor:'pointer', width:'100%' }}>
            🔑 Alterar minha senha
          </button>
        </div>
      )}
      {tab === 'senha' && (
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {[['Senha atual',showC,setShowC,'current'],['Nova senha',showN,setShowN,'next']].map(([lb,show,setShow,key]) => (
            <div key={key}>
              <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'var(--text-2)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.4px' }}>{lb}</label>
              <div style={{ position:'relative' }}>
                <input type={show?'text':'password'} required value={pwForm[key]} onChange={pw(key)}
                  style={{ ...inp, paddingRight:'42px' }}
                  onFocus={e=>e.target.style.borderColor='var(--brand)'}
                  onBlur={e=>e.target.style.borderColor='var(--border)'} />
                <button type="button" onClick={() => setShow(p=>!p)}
                  style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'var(--text-4)' }}>
                  {show?'🙈':'👁'}
                </button>
              </div>
              {key==='next' && pwForm.next && (
                <div style={{ marginTop:'6px', display:'flex', gap:'4px', alignItems:'center' }}>
                  {[1,2,3,4].map(i => <div key={i} style={{ flex:1, height:'3px', borderRadius:'2px', background: pwForm.next.length>=i*2?(pwForm.next.length>=8?'#17B26A':'#F79009'):'var(--border)', transition:'background .2s' }} />)}
                  <span style={{ fontSize:'11px', color:'var(--text-4)', marginLeft:'4px', whiteSpace:'nowrap' }}>{pwForm.next.length<4?'Fraca':pwForm.next.length<8?'Média':'Forte'}</span>
                </div>
              )}
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'var(--text-2)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.4px' }}>Confirmar nova senha</label>
            <input type="password" required value={pwForm.confirm} onChange={pw('confirm')}
              style={{ ...inp }} onFocus={e=>e.target.style.borderColor='var(--brand)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
            {pwForm.confirm && pwForm.confirm!==pwForm.next && <p style={{ fontSize:'12px', color:'var(--danger)', marginTop:'4px' }}>⚠ As senhas não coincidem</p>}
          </div>
          <button type="submit" disabled={saving} style={{ padding:'11px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontWeight:700, fontSize:'13.5px', cursor:'pointer', boxShadow:'0 2px 8px rgba(70,95,255,.3)', opacity:saving?.7:1 }}>
            {saving?'⏳ Salvando...':'🔑 Alterar senha'}
          </button>
        </form>
      )}
    </Modal>
  )
}

// ── LAYOUT PRINCIPAL ──────────────────────────────────────────────
export function Layout() {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [mini, setMini]               = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const pendingCount = usePendingCount()

  const handleLogout = () => { logout(); navigate('/login') }
  const handleNavigate = () => { if (window.innerWidth <= 768) setMobileOpen(false) }

  const profileMenuItems = [
    { icon:'👤', label:'Minha Conta',   onClick: () => setProfileModal(true)      },
    { icon:'⚙️', label:'Configurações', onClick: () => navigate('/configuracoes') },
    { divider: true },
    { icon:'🚪', label:'Sair da conta', onClick: handleLogout, danger: true       },
  ]

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative' }}>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:49 }} />
      )}

      {/* Sidebar desktop — sticky, sempre visível em telas grandes */}
      <aside style={{
        width: mini ? '72px' : '260px',
        minWidth: mini ? '72px' : '260px',
        background:'#111827',
        display:'flex', flexDirection:'column',
        transition:'width .25s cubic-bezier(.4,0,.2,1), min-width .25s cubic-bezier(.4,0,.2,1)',
        overflow:'hidden', flexShrink:0,
        height:'100vh',
        position:'relative', zIndex:50,
      }} className="sidebar-desktop">
        <SidebarContent mini={mini} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} user={user} onNavigate={handleNavigate} pendingCount={pendingCount} />
      </aside>

      {/* Sidebar mobile drawer — fora do fluxo */}
      <aside style={{
        position:'fixed', top:0, left:0, height:'100vh',
        width:'260px', background:'#111827',
        display:'flex', flexDirection:'column',
        zIndex:200, overflow:'hidden',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform .25s cubic-bezier(.4,0,.2,1)',
        boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,.4)' : 'none',
      }}>
        <SidebarContent mini={false} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} user={user} onNavigate={handleNavigate} pendingCount={pendingCount} />
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>

        {/* TOPBAR */}
        <header style={{ height:'64px', background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 16px', gap:'10px', position:'sticky', top:0, zIndex:40, boxShadow:'var(--shadow-sm)' }}>

          {/* Hambúrguer */}
          <HamburgerBtn onClick={() => { if (window.innerWidth <= 768) setMobileOpen(p=>!p); else setMini(p=>!p) }} />

          {/* Busca global */}
          <div style={{ flex:1, maxWidth:'400px' }}>
            <GlobalSearch />
          </div>

          <div style={{ flex:1 }} />

          {/* Badge admin */}
          {isAdmin && (
            <div className="hide-mobile" style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 11px', background:'var(--brand-50)', borderRadius:'var(--radius)', border:'1px solid var(--brand-100)' }}>
              <span style={{ fontSize:'12px' }}>⚡</span>
              <span style={{ fontSize:'12px', fontWeight:600, color:'var(--brand)' }}>Admin</span>
            </div>
          )}

          {/* Tema — ícone limpo sem borda */}
          <ThemeToggle />

          {/* Sino — ícone limpo sem borda */}
          <NotificationBell />

          {/* Profile */}
          <DropdownMenu
            trigger={
              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 10px 5px 5px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'99px', cursor:'pointer', transition:'all .15s' }}>
                <Avatar name={user?.name||'U'} size={28} />
                <div className="hide-mobile" style={{ lineHeight:1.2 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text-1)' }}>{user?.name?.split(' ')[0]}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-4)' }}>{user?.role==='admin'?'Admin':user?.role==='coordinator'?'Coord.':'Prof.'}</div>
                </div>
                <span style={{ color:'var(--text-4)', fontSize:'11px' }} className="hide-mobile">▾</span>
              </div>
            }
            items={profileMenuItems}
          />
        </header>

        {/* PAGE CONTENT */}
        <main style={{ flex:1, padding:'16px', overflowY:'auto', overflowX:'hidden' }}>
          <Outlet />
        </main>
      </div>

      <ToastContainer />
      <ProfileModal open={profileModal} onClose={() => setProfileModal(false)} user={user} />
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ marginBottom:'24px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:800, color:'var(--text-1)', margin:0, letterSpacing:'-.3px' }}>{title}</h1>
          {subtitle && <p style={{ fontSize:'13.5px', color:'var(--text-3)', marginTop:'4px' }}>{subtitle}</p>}
        </div>
        {action && <div style={{ flexShrink:0 }}>{action}</div>}
      </div>
    </div>
  )
}
