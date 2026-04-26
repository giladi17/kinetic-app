import { createContext, useContext, useState, useEffect } from 'react'

console.log('AuthContext loading...')

const AuthContext = createContext(null)
// וודא שה-URL הזה ב-Vercel מוגדר לכתובת של Railway
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('kinetic_token')
    console.log('AuthContext checking for saved token...', !!token)

    if (token) {
      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (r) => {
          if (r.ok) return r.json()
          // אם השרת מחזיר 401 או שגיאה אחרת, אנחנו לא מוחקים ישר, אלא בודקים למה
          const errorText = await r.text()
          console.error('Auth verification failed status:', r.status, errorText)
          return null
        })
        .then(data => {
          if (data) {
            console.log('User verified successfully:', data.name)
            setUser(data)
          } else {
            // רק אם השרת אמר בפירוש שהטוקן לא תקין
            console.warn('Invalid token, removing...')
            localStorage.removeItem('kinetic_token')
          }
        })
        .catch((err) => {
          console.error('Network error while verifying token:', err)
          // במקרה של שגיאת רשת (כמו CORS), אל תמחק את הטוקן!
          // אולי השרת פשוט למטה זמנית
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
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
