import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authFetch } from '../api'

export const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userLoading, setUserLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const data = await authFetch(`${BASE}/api/users/me`).then(r => r.json())
      setUser(data)
      return data
    } catch {
      return null
    } finally {
      setUserLoading(false)
    }
  }, [])

  useEffect(() => { refreshUser() }, [refreshUser])

  return (
    <UserContext.Provider value={{ user, userLoading, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
