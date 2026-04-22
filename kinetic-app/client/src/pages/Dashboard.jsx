import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDashboard, authFetch } from '../api'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { useLang } from '../context/LanguageContext'
import ReadinessCard from '../components/ReadinessCard'
import { registerPushNotifications, isPushSupported } from '../utils/pushNotifications'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const fallback = {
  steps: 0, stepGoal: 10000, streak: 0, calories: 0, avgCalories: 0,
  restingHR: 62, sleep: '—', hydration: 0, activeMinutes: 0,
  weeklyActivity: [], calorieHistory: [],
  nextWorkout: { id: 1, name: 'HIIT Training', duration: 20, intensity: 'HIGH' },
}

export default function Dashboard() {
  const navigate  = useNavigate()
  const { user }  = useUser()
  const { user: authUser } = useAuth()
  const { t }     = useLang()
  const { dashboard: appDashboard, todayNutrition: appMacros } = useAppData() || {}

  const [data,          setData]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [water,         setWater]         = useState(0)
  const [macros,        setMacros]        = useState(null)
  const [challenge,     setChallenge]     = useState(null)
  const [challengeDone, setChallengeDone] = useState(false)

  useEffect(() => {
    const validDash = appDashboard && !appDashboard.error ? appDashboard : null
    if (validDash) { setData(validDash); setLoading(false) }
    else fetchDashboard()
      .then(d => setData(d && !d.error ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [appDashboard])

  useEffect(() => {
    if (appMacros) { setMacros(appMacros); return }
    authFetch(`${API}/api/nutrition/macros/today`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setMacros(d) })
      .catch(() => {})
  }, [appMacros])

  useEffect(() => {
    if (user?.waterToday !== undefined) setWater(user.waterToday)
  }, [user])

  useEffect(() => {
    authFetch('/api/daily-challenge')
      .then(r => r.json())
      .then(d => { setChallenge(d.challenge); setChallengeDone(!!d.done) })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!isPushSupported()) return
    if (Notification.permission === 'granted') return
    const timer = setTimeout(async () => { await registerPushNotifications() }, 3000)
    return () => clearTimeout(timer)
  }, [])

  async function addWater(amount) {
    try {
      const res  = await authFetch(`${API}/api/stats/water`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      setWater(data.water_today)
    } catch {}
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <main className="min-h-screen bg-[#F8F9FF] dark:bg-[#0E0E0E] pt-20 px-6 md:px-10 pb-28">
      <div className="max-w-7xl mx-auto animate-pulse space-y-6 mt-6">
        <div className="h-12 bg-white dark:bg-[#151C25] rounded-2xl w-64" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-56 bg-white dark:bg-[#151C25] rounded-3xl" />
          <div className="h-56 bg-[#151C25] rounded-3xl" />
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white dark:bg-[#151C25] rounded-3xl" />)}
        </div>
      </div>
    </main>
  )

  // ── Data ─────────────────────────────────────────────────────────────────
  const d           = data || fallback
  const stepPct     = Math.min(100, Math.round(((d.steps ?? 0) / (d.stepGoal || 10000)) * 100))
  const displayName = user?.name || authUser?.name || d.userName || 'Athlete'

  const proteinGoal    = macros?.protein?.target  || user?.daily_protein_target  || 160
  const proteinCurrent = Math.round(macros?.protein?.consumed  || 0)
  const proteinPercent = Math.min((proteinCurrent / proteinGoal)  * 100, 100)

  const calorieGoal    = macros?.calories?.target || user?.daily_calorie_target || 2500
  const calorieCurrent = Math.round(macros?.calories?.consumed || d.todayCalories || 0)
  const caloriePercent = Math.min((calorieCurrent / calorieGoal) * 100, 100)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F8F9FF] dark:bg-[#0E0E0E] text-[#151C25] dark:text-white font-space pt-20 pb-28 px-6 md:px-10" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <header className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">
              Welcome back,{' '}
              <span className="text-electric-lime drop-shadow-sm">{displayName}</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">מוכן לשיא הבא שלך?</p>
          </div>
          <div className="bg-electric-lime/20 text-[#4a6600] dark:text-[#CCFF00] px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm">
            🔥 {d.streak ?? 0} {t('dashboard.streak')}
          </div>
        </header>

        {/* ── Readiness ── */}
        <ReadinessCard />

        {/* ── Daily Challenge ── */}
        {challenge && (
          <div className="bg-white dark:bg-[#151C25] rounded-3xl p-5 border border-gray-100 dark:border-transparent shadow-sm flex items-center gap-4">
            <div className="text-3xl shrink-0">{challenge.text.split(' ').pop()}</div>
            <div className="flex-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block mb-1">{t('dashboard.dailyChallenge')}</span>
              <p className="font-black text-sm italic">{challenge.text.split(' ').slice(0, -1).join(' ')}</p>
              <span className="text-xs text-electric-lime font-bold">+{challenge.xp} XP</span>
            </div>
            <button
              onClick={() => {
                setChallengeDone(true)
                authFetch(`${API}/api/daily-challenge/complete`, { method: 'POST' }).catch(console.error)
              }}
              className={`px-4 py-2 rounded-full font-black text-xs uppercase transition-all ${
                challengeDone
                  ? 'bg-electric-lime text-black'
                  : 'bg-gray-100 dark:bg-[#0E0E0E] text-gray-600 dark:text-gray-400 hover:bg-electric-lime hover:text-black'
              }`}
            >
              {challengeDone ? t('dashboard.challengeDone') : t('dashboard.challengeComplete')}
            </button>
          </div>
        )}

        {/* ── Top Grid: Nutrition + TOM ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Nutrition Card */}
          <div className="md:col-span-2 bg-white dark:bg-[#151C25] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-transparent">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-black italic uppercase">Nutrition</h2>
              <span className="bg-gray-100 dark:bg-[#0E0E0E] text-gray-600 dark:text-gray-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Today</span>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">חלבון</p>
                <div className="flex items-baseline mb-3 gap-1">
                  <span className="text-4xl font-black">{proteinCurrent}</span>
                  <span className="text-gray-400 font-bold">/ {proteinGoal}g</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-[#0E0E0E] rounded-full h-3">
                  <div className="bg-electric-lime h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${proteinPercent}%` }} />
                </div>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">קלוריות</p>
                <div className="flex items-baseline mb-3 gap-1">
                  <span className="text-4xl font-black">{calorieCurrent}</span>
                  <span className="text-gray-400 font-bold">kcal</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-[#0E0E0E] rounded-full h-3">
                  <div className="bg-[#151C25] dark:bg-white h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${caloriePercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* TOM AI Card */}
          <div className="bg-[#151C25] text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-electric-lime opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div>
              <h2 className="text-2xl font-black italic uppercase text-electric-lime mb-2">TOM.</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                המאמן שלך זמין. הוסף ארוחה, עדכן משקלים או בקש ניתוח התאוששות.
              </p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('kinetic:ai-open'))}
              className="w-full bg-electric-lime text-[#151C25] font-black uppercase tracking-wider py-4 rounded-2xl hover:bg-white transition-colors duration-300 mt-6"
            >
              Open Chat
            </button>
          </div>
        </div>

        {/* ── Next Workout + Weekly Activity ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Next Workout */}
          <div className="md:col-span-5 bg-[#151C25] text-white rounded-3xl relative overflow-hidden group min-h-[240px]">
            <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-700"
              style={{ background: 'linear-gradient(135deg, #151C25 0%, #1a2744 60%, #0f3460 100%)' }} />
            <div className="relative z-10 h-full p-8 flex flex-col justify-between">
              <span className="self-start bg-electric-lime text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {t('dashboard.upcoming')}
              </span>
              <div className="mt-auto">
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                  {d.nextWorkout?.name || 'HIIT Training'}
                </h2>
                <div className="flex items-center gap-4 mt-3 text-gray-400 text-sm font-medium">
                  <span>⏱ {d.nextWorkout?.duration || 20} {t('common.minutes')}</span>
                  <span>⚡ {t(`workouts.${(d.nextWorkout?.intensity || 'advanced').toLowerCase()}`)}</span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/workout/${d.nextWorkout?.id || 1}`)}
                className="mt-6 bg-electric-lime text-black px-8 py-4 rounded-2xl font-black tracking-widest uppercase active:scale-95 transition-all hover:scale-105"
              >
                {t('dashboard.startWorkout')}
              </button>
            </div>
          </div>

          {/* Weekly Activity */}
          <div className="md:col-span-7 bg-white dark:bg-[#151C25] rounded-3xl p-8 border border-gray-100 dark:border-transparent shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black italic uppercase">{t('dashboard.weeklyActivity')}</h3>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('dashboard.lastDays')}</span>
            </div>
            <div className="flex items-end justify-between h-48 pt-4">
              {(d.weeklyActivity || []).length === 0
                ? ['א','ב','ג','ד','ה','ו','ש'].map((l, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-full bg-gray-100 dark:bg-[#0E0E0E] rounded-full h-24 animate-pulse" />
                      <span className="text-[10px] text-gray-400 font-bold">{l}</span>
                    </div>
                  ))
                : (d.weeklyActivity || []).map((day, i) => {
                    const isMax = day.pct === Math.max(...(d.weeklyActivity || []).map(x => x.pct))
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 w-8 group relative">
                        {isMax && day.pct > 0 && (
                          <span className="text-[9px] text-[#7cbf00] font-bold absolute -top-4">{day.pct}%</span>
                        )}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-[#151C25] text-white rounded-lg px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                          <span className="text-[10px]">{day.label}: {day.pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#0E0E0E] rounded-full h-24 relative overflow-hidden mt-4">
                          <div className="absolute bottom-0 w-full rounded-full transition-all duration-300"
                            style={{ height: `${day.pct}%`, backgroundColor: day.pct > 0 ? '#CCFF00' : 'transparent' }} />
                        </div>
                        <span className={`text-[10px] font-bold ${day.today ? 'text-electric-lime' : 'text-gray-400'}`}>{day.label}</span>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        </div>

        {/* ── Metrics Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: '❤️', label: t('dashboard.restingHR'),     value: `${d.restingHR || 62}`,   unit: 'bpm' },
            { icon: '🌙', label: t('dashboard.sleep'),          value: d.sleep || '7h 20m',       unit: '' },
            { icon: '💧', label: t('dashboard.hydration'),      value: `${water.toFixed(1)}`,     unit: 'L' },
            { icon: '⏱', label: t('dashboard.activeMinutes'),  value: `${d.activeMinutes || 54}`, unit: t('common.minutes') },
          ].map((m, i) => (
            <div key={i} className="bg-white dark:bg-[#151C25] rounded-3xl p-6 border border-gray-100 dark:border-transparent shadow-sm">
              <div className="text-2xl mb-3">{m.icon}</div>
              <p className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{m.label}</p>
              <p className="text-2xl font-black text-[#151C25] dark:text-white">
                {m.value}{' '}
                {m.unit && <span className="text-sm font-medium text-gray-400">{m.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* ── Water Tracker ── */}
        <div className="bg-white dark:bg-[#151C25] rounded-3xl p-8 border border-gray-100 dark:border-transparent shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💧</span>
              <h3 className="font-black text-lg italic uppercase">{t('dashboard.waterIntake')}</h3>
            </div>
            <span className="font-black text-lg text-[#00b4d8]">
              {water.toFixed(2)} <span className="text-sm font-normal text-gray-400 mr-1">/ 2.5L</span>
            </span>
          </div>
          <div className="relative w-full h-8 bg-gray-100 dark:bg-[#0E0E0E] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round(water / 2.5 * 100))}%`, background: 'linear-gradient(90deg, #0096c7, #00b4d8, #48cae4)' }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold"
              style={{ color: water > 1.25 ? '#0e0e0e' : '#0096c7' }}>
              {Math.min(100, Math.round(water / 2.5 * 100))}%
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[{ ml: 250, label: '250ml' }, { ml: 330, label: '330ml' }, { ml: 500, label: '500ml' }, { ml: 750, label: '750ml' }].map(b => (
              <button key={b.ml} onClick={() => addWater(b.ml / 1000)}
                className="py-2.5 rounded-xl font-black text-xs text-[#00b4d8] bg-[#e0f7ff] dark:bg-[#0E0E0E] hover:bg-[#00b4d8] hover:text-white transition-colors active:scale-90 duration-200">
                +{b.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Macros ── */}
        {macros && (
          <div className="bg-white dark:bg-[#151C25] rounded-3xl p-8 border border-gray-100 dark:border-transparent shadow-sm space-y-4">
            <h3 className="font-black text-lg italic uppercase">{t('dashboard.macrosToday')}</h3>
            <div className="space-y-4">
              {[
                { key: 'calories', label: t('dashboard.calories'), unit: 'kcal', color: '#CCFF00' },
                { key: 'protein',  label: t('dashboard.protein'),  unit: 'g',    color: '#ff734a' },
                { key: 'carbs',    label: t('dashboard.carbs'),    unit: 'g',    color: '#00b4d8' },
                { key: 'fat',      label: t('dashboard.fat'),      unit: 'g',    color: '#c77dff' },
              ].map(({ key, label, unit, color }) => {
                const m = macros[key]
                if (!m) return null
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">{label}</span>
                      <span className="text-xs font-black" style={{ color }}>
                        {m.consumed ?? 0}<span className="text-gray-400 font-normal">/{m.target ?? 0}{unit}</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-[#0E0E0E] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.pct ?? 0}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
