'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const API       = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'
const TOKEN_KEY = 'konduyt_token'

const AuthContext = createContext({
  isLoaded:   false,
  isSignedIn: false,
  user:       null,
  token:      null,
  login:      () => {},
  logout:     () => {},
})

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null)
  const [token,    setToken]    = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
    if (!stored) { setIsLoaded(true); return }

    fetch(`${API}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(u  => { setToken(stored); setUser(u) })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoaded(true))
  }, [])

  const login = useCallback((token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    setToken(token)
    setUser(user)
  }, [])

  const logout = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_KEY)
    // Tell backend to revoke the token (adds jti to denylist)
    if (stored) {
      try {
        await fetch(`${API}/v1/auth/logout`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${stored}` },
        })
      } catch {}
    }
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoaded, isSignedIn: !!token && !!user, user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
