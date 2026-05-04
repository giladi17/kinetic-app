import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { API_URL } from '../api'

const AuthContext = createContext(null)
const API = API_URL

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const verified = useRef(false)

  useEffect(() => {
    if (verified.current) return
    verified.current = true

    const token = localStorage.getItem('kinetic_token')
    if (!token) { setLoading(false); return }

    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (r.ok) return r.json()
        if (r.status === 401 || r.status === 404) {
          localStorage.removeItem('kinetic_token')
          window.location.replace('/login')
          return null
        }
        // network/server error — keep token, user will retry later
        return null
      })
      .then(data => { if (data) setUser(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await r.json()
      if (data.token) {
        localStorage.setItem('kinetic_token', data.token)
        setUser(data.user)
        console.log('Login success, token saved.')
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: 'Server connection failed' }
    }
  }

  const register = async (email, password, name) => {
    const r = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    const data = await r.json()
    if (data.token) {
      localStorage.setItem('kinetic_token', data.token)
      setUser(data.user)
      return { success: true }
    }
    return { success: false, error: data.error }
  }

  const loginWithGoogle = async (googleToken) => {
    const r = await fetch(`${API}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleToken }),
    })
    const data = await r.json()
    if (data.token) {
      localStorage.setItem('kinetic_token', data.token)
      setUser(data.user)
      return { success: true }
    }
    return { success: false, error: data.error }
  }

  const logout = () => {
    console.log('Logging out, clearing token.')
    localStorage.removeItem('kinetic_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
