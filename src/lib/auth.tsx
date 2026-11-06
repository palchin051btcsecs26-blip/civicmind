import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from './api'
import type { AuthUser, Role } from './types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, role: 'citizen' | 'admin') => Promise<AuthUser>
  signup: (input: { name: string; email: string; password: string; city: string; phone?: string }) => Promise<AuthUser>
  continueAsGuest: () => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function roleHome(role: Role | undefined): string {
  if (role === 'admin') return '/authority'
  if (role === 'citizen') return '/citizen'
  return '/intelligence'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const payload = await api<{ user: AuthUser | null }>('/api/auth/me')
      setUser(payload.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string, role: 'citizen' | 'admin') => {
    const payload = await api<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    })
    setUser(payload.user)
    return payload.user
  }, [])

  const signup = useCallback(async (input: { name: string; email: string; password: string; city: string; phone?: string }) => {
    const payload = await api<{ user: AuthUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setUser(payload.user)
    return payload.user
  }, [])

  const continueAsGuest = useCallback(async () => {
    const payload = await api<{ user: AuthUser }>('/api/auth/guest', { method: 'POST' })
    setUser(payload.user)
    return payload.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, signup, continueAsGuest, logout, refresh }),
    [user, loading, login, signup, continueAsGuest, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function AuthLoading({ label = 'Checking your CivicMind session…' }: { label?: string }) {
  return (
    <div className="auth-loading">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  )
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/welcome" state={{ from: location.pathname }} replace />
  if (!roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />
  return <>{children}</>
}
