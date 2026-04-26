// In production (Vercel): empty string → relative URL → Vercel proxy → Railway (no CORS)
// In dev (localhost): use VITE_API_URL or fallback to localhost:3001
const API_ORIGIN = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  : (import.meta.env.VITE_API_URL || '')

const BASE = `${API_ORIGIN}/api`

export { API_ORIGIN as API_URL }

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('kinetic_token')
  const fullUrl = url.startsWith('http') ? url : `${API_ORIGIN}${url}`
  return fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

export async function premiumFetch(url, options = {}, feature = '') {
  const res = await authFetch(url, options)
  if (res.status === 401 || res.status === 403) {
    try {
      const data = await res.json()
      if (data.error === 'premium_required') {
        window.dispatchEvent(new CustomEvent('kinetic:paywall', { detail: { feature } }))
      }
    } catch {}
    return null
  }
  return res
}

export async function fetchDashboard() {
  const res = await authFetch(`${BASE}/dashboard`)
  if (!res.ok) return null
  return res.json()
}

export async function fetchWorkouts(category = '') {
  const url = category ? `${BASE}/workouts?category=${category}` : `${BASE}/workouts`
  const res = await fetch(url)
  return res.json()
}

export async function fetchProgress() {
  const res = await authFetch(`${BASE}/progress`)
  if (!res.ok) return null
  return res.json()
}

export async function addWeightLog({ weight, date, body_fat, notes }) {
  const res = await authFetch(`${BASE}/weight`, {
    method: 'POST',
    body: JSON.stringify({ weight, date, body_fat, notes }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function saveWorkoutSession(data) {
  const res = await authFetch(`${BASE}/sessions`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function fetchNutrition(date = '') {
  const url = date ? `${BASE}/nutrition?date=${date}` : `${BASE}/nutrition`
  const res = await authFetch(url)
  return res.json()
}

export async function fetchSupplements() {
  const res = await authFetch(`${BASE}/supplements`)
  return res.json()
}

export async function fetchGapFiller() {
  const res = await authFetch(`${BASE}/nutrition/gap-filler`)
  return res.json()
}
