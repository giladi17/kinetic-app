import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authFetch } from '../api'

export const UserContext = createContext(null)

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function UserProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [userLoading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      // Fetch user data and Prisma profile concurrently.
      // Prisma UserProfile is the authoritative source for onboardingDone —
      // SQLite resets on Railway redeploys but PostgreSQL persists.
      const [meResult, profileResult] = await Promise.allSettled([
        authFetch(`${BASE}/api/users/me`).then(r => r.json()),
        authFetch(`${BASE}/api/profile`).then(r => r.json()),
      ])

      const me      = meResult.status === 'fulfilled' ? meResult.value : null
      const profile = profileResult.status === 'fulfilled' ? profileResult.value : null

      if (!me || me.error) return null

      const resolved = {
        ...me,
        // If Prisma has a UserProfile record, the user has completed onboarding.
        onboardingDone: profile ? 1 : (me.onboardingDone || 0),
      }

      setUser(resolved)
      return resolved
    } catch {
      return null
    } finally {
      setLoading(false)
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
