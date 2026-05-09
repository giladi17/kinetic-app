import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { authFetch } from '../api'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

// Headless component — silently marks tourDone on the server so the
// driver.js relay-race tour can start on the next render.
export default function OnboardingTour({ onDone }) {
  const navigate = useNavigate()
  const { refreshUser } = useUser()

  useEffect(() => {
    authFetch(`${API}/users/tour-done`, { method: 'PATCH' })
      .catch(() => {})
      .finally(async () => {
        await refreshUser()
        onDone?.()
        navigate('/dashboard', { replace: true })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
