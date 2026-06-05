import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Calendario from './pages/Calendario'
import Agendamentos from './pages/Agendamentos'
import { Ambientes, Equipamentos, Professores, Usuarios, Configuracoes } from './pages/Recursos'
import Historico from './pages/Historico'
import GerenciarAulas from './pages/GerenciarAulas'
import { Spinner } from './components/UI'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--surface-2)' }}><Spinner /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}
function RequireAdmin({ children }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
function RequireSuperAdmin({ children }) {
  const { isSuperAdmin } = useAuth()
  if (!isSuperAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="calendario"    element={<Calendario />} />
              <Route path="agendamentos"  element={<Agendamentos />} />
              <Route path="ambientes"     element={<Ambientes />} />
              <Route path="equipamentos"  element={<Equipamentos />} />
              <Route path="professores"   element={<RequireAdmin><Professores /></RequireAdmin>} />
              <Route path="usuarios"      element={<RequireSuperAdmin><Usuarios /></RequireSuperAdmin>} />
              <Route path="historico"     element={<RequireAdmin><Historico /></RequireAdmin>} />
              <Route path="aulas"          element={<RequireSuperAdmin><GerenciarAulas /></RequireSuperAdmin>} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
