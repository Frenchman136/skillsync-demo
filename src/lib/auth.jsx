import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => !!getToken()) // checking a saved token

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    if (!getToken()) return
    api.get('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password })
    setToken(r.token)
    setUser(r.user)
    return r.user
  }, [])

  const logout = useCallback(() => { setToken(null); setUser(null) }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
