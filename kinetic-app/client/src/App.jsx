import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import { AppDataProvider } from './context/AppDataContext'
import { LanguageProvider } from './context/LanguageContext'
import { authFetch } from './api'
import AuthGuard from './components/AuthGuard'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import WorkoutLibrary from './pages/WorkoutLibrary'
import ActiveWorkout from './pages/ActiveWorkout'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Nutrition from './pages/Nutrition'
import Supplements from './pages/Supplements'
import Analytics from './pages/Analytics'
import Onboarding from './pages/Onboarding'
import ExerciseHistory from './pages/ExerciseHistory'
import WarRoom from './pages/WarRoom'
import Plans from './pages/Plans'
import Settings from './pages/Settings'
import Pricing from './pages/Pricing'
import OnboardingTour from './components/OnboardingTour'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import ErrorBoundary from './components/ErrorBoundary'
import { requestPermission } from './utils/notifications'
import { initNotifications } from './utils/notificationManager'

const DISMISSED_KEY = 'kinetic_notif_dismissed'

function AppRoutes() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, userLoading, refreshUser } = useUser()
  const [notifToast, setNotifToast] = useState(false)
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    if (!userLoading && user && user.onboardingDone === 0) {
      navigate('/onboarding', { replace: true })
    } else if (!userLoading && user && user.onboardingDone !== 0 && !user.tourDone) {
      setShowTour(true)
    }
  }, [user, userLoading, navigate])

  useEffect(() => {
    if (location.search.includes('payment=success')) {
      refreshUser()
      navigate(location.pathname, { replace: true })
    }
  }, [location.search])

  useEffect(() => {
    if (userLoading || !user) return
    if (localStorage.getItem(DISMISSED_KEY)) return

    const perm = Notification.permission

    if (perm === 'default') {
      setNotifToast(true)
    } else if (perm === 'granted') {
      Promise.all([
        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reminders`).then(r => r.json()),
        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reminders/status`).then(r => r.json()),
      ]).then(([reminders, status]) => {
        initNotifications(reminders, status)
      })
    }
  }, [user, userLoading])

  async function handleAllowNotifications() {
    setNotifToast(false)
    const granted = await requestPermission()
    if (granted) {
      const [reminders, status] = await Promise.all([
        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reminders`).then(r => r.json()),
        authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reminders/status`).then(r => r.json()),
      ])
      initNotifications(reminders, status)
    }
  }

  const showBanner = notifToast &&
    location.pathname !== '/onboarding' &&
    !location.pathname.startsWith('/workout')

  function dismissBanner() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setNotifToast(false)
  }

  return (
    <>
      {showTour && <OnboardingTour onDone={() => setShowTour(false)} />}
      {showBanner && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-surface-container-high rounded-xl p-4 flex items-center gap-3 shadow-lg">
          <span className="material-symbols-outlined text-primary">notifications</span>
          <span className="font-label text-sm flex-1">רוצה תזכורות יומיות? 🔔</span>
          <button
            onClick={handleAllowNotifications}
            className="bg-primary text-on-primary px-4 py-1.5 rounded-lg font-headline font-bold text-xs uppercase"
          >
            כן
          </button>
          <button onClick={dismissBanner} className="opacity-50">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}
      <Routes>
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="workouts" element={<WorkoutLibrary />} />
          <Route path="workout/:id" element={<ActiveWorkout />} />
          <Route path="progress" element={<Progress />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="supplements" element={<Supplements />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<Profile />} />
          <Route path="exercises" element={<ExerciseHistory />} />
          <Route path="war-room" element={<WarRoom />} />
          <Route path="plans" element={<Plans />} />
          <Route path="settings" element={<Settings />} />
          <Route path="pricing" element={<Pricing />} />
        </Route>
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <AuthGuard>
            <LanguageProvider>
              <UserProvider>
                <AppDataProvider>
                  <AppRoutes />
                </AppDataProvider>
              </UserProvider>
            </LanguageProvider>
          </AuthGuard>
        } />
      </Routes>
    </ErrorBoundary>
  )
}
