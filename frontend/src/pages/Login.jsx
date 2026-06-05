import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Força tema claro na tela de login — restaura ao sair
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    return () => {
      const saved = localStorage.getItem('theme') || 'light'
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await login(email, password); navigate('/') }
    catch (err) { setError(err.response?.data?.error || 'Credenciais inválidas') }
    finally { setLoading(false) }
  }

  const fill = (e,p) => { setEmail(e); setPassword(p) }

  return (
    <div style={{ minHeight:'100vh', background:'var(--text-1)', display:'flex', position:'relative', overflow:'hidden' }}>
      {/* Background grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(70,95,255,.15) 1px, transparent 1px)', backgroundSize:'32px 32px', opacity:.6 }} />
      <div style={{ position:'absolute', top:'15%', left:'10%', width:'400px', height:'400px', background:'radial-gradient(circle, rgba(70,95,255,.2) 0%, transparent 70%)', borderRadius:'50%' }} />

      {/* Left hero — esconde em mobile */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'48px 64px', position:'relative', zIndex:1, '@media(maxWidth:768px)':{display:'none'} }} className="hide-mobile">
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'56px' }}>
          <div style={{ width:'44px', height:'44px', background:'var(--brand)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>🎓</div>
          <span style={{ fontSize:'20px', fontWeight:800, color:'#fff', letterSpacing:'-.5px' }}>Agendamento</span>
        </div>
        <h1 style={{ fontSize:'42px', fontWeight:800, color:'#fff', lineHeight:1.15, letterSpacing:'-1px', marginBottom:'20px' }}>
          Gerencie todos os<br/>
          <span style={{ background:'linear-gradient(90deg,#6366F1,#A855F7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>agendamentos</span><br/>
          com facilidade
        </h1>
        <p style={{ fontSize:'16px', color:'rgba(255,255,255,.5)', lineHeight:1.7, maxWidth:'400px' }}>
          Ambientes e equipamentos organizados em um único sistema.
        </p>
        <div style={{ marginTop:'40px', display:'flex', gap:'24px' }}>
          {[['📅','Calendário interativo'],['🔒','Controle de acesso'],['⚡','Detecção de conflitos']].map(([ic,lbl])=>(
            <div key={lbl} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ width:'32px', height:'32px', background:'rgba(255,255,255,.08)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px' }}>{ic}</span>
              <span style={{ fontSize:'12.5px', color:'rgba(255,255,255,.55)', fontWeight:500 }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div style={{ width:'460px', maxWidth:'100%', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 24px', position:'relative', zIndex:1 }}>
        <div style={{ width:'100%', maxWidth:'360px' }}>
          <div style={{ marginBottom:'32px' }}>
            <h2 style={{ fontSize:'24px', fontWeight:800, color:'var(--text-1)', letterSpacing:'-.5px' }}>Entrar</h2>
            <p style={{ fontSize:'14px', color:'var(--text-4)', marginTop:'6px' }}>Acesse sua conta institucional</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'12.5px', fontWeight:700, color:'var(--text-2)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.5px' }}>E-mail</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="seu@email.com"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', fontSize:'14px', outline:'none', transition:'all .15s' }}
                onFocus={e=>{ e.target.style.borderColor='var(--brand)'; e.target.style.boxShadow='0 0 0 3px rgba(70,95,255,.12)' }}
                onBlur={e=>{ e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none' }} />
            </div>
            <div style={{ marginBottom:'24px' }}>
              <label style={{ display:'block', fontSize:'12.5px', fontWeight:700, color:'var(--text-2)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.5px' }}>Senha</label>
              <div style={{ position:'relative' }}>
                <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"
                  style={{ width:'100%', padding:'11px 44px 11px 14px', border:'1.5px solid var(--border)', borderRadius:'var(--radius)', fontSize:'14px', outline:'none', transition:'all .15s' }}
                  onFocus={e=>{ e.target.style.borderColor='var(--brand)'; e.target.style.boxShadow='0 0 0 3px rgba(70,95,255,.12)' }}
                  onBlur={e=>{ e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none' }} />
                <button type="button" onClick={()=>setShowPw(p=>!p)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'var(--text-4)' }}>{showPw?'🙈':'👁'}</button>
              </div>
            </div>

            {error && <div style={{ background:'var(--danger-bg)', color:'var(--danger)', padding:'11px 14px', borderRadius:'var(--radius)', fontSize:'13.5px', marginBottom:'16px', border:'1px solid #FCA5A5', display:'flex', gap:'8px', alignItems:'center' }}><span>⚠️</span>{error}</div>}

            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'12px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:'var(--radius-lg)', fontSize:'14.5px', fontWeight:700, cursor:'pointer', transition:'all .15s', boxShadow:'0 4px 14px rgba(70,95,255,.35)', opacity:loading?.7:1, letterSpacing:'-.1px' }}>
              {loading ? '⏳ Entrando...' : 'Entrar no sistema →'}
            </button>
          </form>

          <div style={{ marginTop:'28px', padding:'16px', background:'var(--surface-2)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:'11.5px', fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:'10px' }}>Contas de teste</div>
            {[['admin@agendamento.com','admin123','👑 Administrador','blue'],['joao@agendamento.com','prof123','👤 Professor','purple']].map(([e,p,lbl,col])=>(
              <button key={e} type="button" onClick={()=>fill(e,p)}
                style={{ width:'100%', textAlign:'left', padding:'9px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', marginBottom:'6px', display:'flex', justifyContent:'space-between', alignItems:'center', transition:'all .12s' }}
                onMouseEnter={e2=>{ e2.currentTarget.style.borderColor='var(--brand)'; e2.currentTarget.style.background='var(--brand-50)' }}
                onMouseLeave={e2=>{ e2.currentTarget.style.borderColor='var(--border)'; e2.currentTarget.style.background='var(--surface)' }}>
                <div><div style={{ fontSize:'12.5px', fontWeight:600, color:'var(--text-1)' }}>{lbl}</div><div style={{ fontSize:'11px', color:'var(--text-4)' }}>{e}</div></div>
                <span style={{ fontSize:'11px', color:'var(--brand)', fontWeight:600 }}>Usar →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
