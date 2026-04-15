import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { authFetch } from '../api'

const AppDataContext = createContext(null)
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CACHE_KEY = 'kinetic_appdata_cache'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function loadCache() {
    try {
          const raw = localStorage.getItem(CACHE_KEY)
          if (!raw) return null
          const { data, ts } = JSON.parse(raw)
          if (Date.now() - ts < CACHE_TTL_MS) return data
          return null
    } catch { return null }
}

function saveCache(data) {
    try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
    } catch {}
}

// Helper: returns parsed JSON only if response is OK and has no error field
async function safeJson(res) {
    if (!res || !res.ok) return null
    try {
          const data = await res.json()
          if (data && data.error) return null
          return data
    } catch { return null }
}

export function AppDataProvider({ children }) {
    const { user } = useAuth()
    const [dashboard, setDashboard] = useState(null)
    const [todayNutrition, setTodayNutrition] = useState(null)
    const [lastSession, setLastSession] = useState(null)
    const [readiness, setReadiness] = useState(null)
    const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
        if (!user) return

                                  // Try cache while fetching
                                  const cached = loadCache()
        if (cached && loading) {
                setDashboard(cached.dashboard)
                setTodayNutrition(cached.todayNutrition)
                setLastSession(cached.lastSession)
                setReadiness(cached.readiness)
                setLoading(false)
        }

                                  try {
                                          const [dashRes, nutrRes, progRes] = await Promise.all([
                                                    authFetch(`${API}/api/dashboard`),
                                                    authFetch(`${API}/api/nutrition/macros/today`),
                                                    authFetch(`${API}/api/progress`),
                                                  ])

          const dash = await safeJson(dashRes)
                                          const nutr = await safeJson(nutrRes)
                                          const prog = await safeJson(progRes)

          const ls = prog?.timeline?.[0] || null
                                          const rd = dash?.readinessScore ?? null

          // Only update state with valid (non-error) data
          if (dash) setDashboard(dash)
                                          if (nutr) setTodayNutrition(nutr)
                                          setLastSession(ls)
                                          setReadiness(rd)

          if (dash || nutr) {
                    saveCache({
                                dashboard: dash,
                                todayNutrition: nutr,
                                lastSession: ls,
                                readiness: rd,
                    })
          }
                                  } catch {
                                          // On fetch failure: cached data already shown (if available)
                                  }

                                  setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return (
        <AppDataContext.Provider value={{ dashboard, todayNutrition, lastSession, readiness, loading, refresh }}>
          {children}
        </AppDataContext.Provider>
      )
}

export const useAppData = () => useContext(AppDataContext)
