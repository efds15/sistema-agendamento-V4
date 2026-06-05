import { createContext, useContext, useState, useEffect } from 'react'
import { auth as authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authApi.me().then(r => { setUser(r.data); setLoading(false) })
        .catch(() => { localStorage.removeItem('token'); setLoading(false) })
    } else setLoading(false)
  }, [])

  const login = async (email, password) => {
    const r = await authApi.login({ email, password })
    localStorage.setItem('token', r.data.token)
    setUser(r.data.user)
    return r.data.user
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading,
      isAdmin:      user?.role === 'admin' || user?.role === 'coordinator',
      isSuperAdmin: user?.role === 'admin',
      isCoordinator:user?.role === 'coordinator',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
