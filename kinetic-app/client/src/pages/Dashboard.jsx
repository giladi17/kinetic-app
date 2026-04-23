import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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

// ── Mini ring chart ───────────────────────────────────────────────────────────
function Ring({ pct = 0, size = 80, stroke = 8, color = '#CCFF00' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0F0F0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  )
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
      const json = await res.json()
      setWater(json.water_today)
    } catch {}
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <main className="min-h-screen bg-[#F8F9FF] pt-20 px-6 md:px-10 pb-28">
      <div className="max-w-7xl mx-auto animate-pulse space-y-5 mt-6">
        <div className="h-12 bg-white rounded-2xl w-72 shadow-sm" />
        <div className="grid md:grid-cols-12 gap-5">
          <div className="md:col-span-8 h-52 bg-white rounded-2xl shadow-sm" />
          <div className="md:col-span-4 h-52 bg-white rounded-2xl shadow-sm" />
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl shadow-sm" />)}
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

  const waterPct = Math.min(100, Math.round((water / 2.5) * 100))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F8F9FF] dark:bg-[#0E0E0E] text-[#151C25] dark:text-white font-space pt-20 pb-28 px-6 md:px-10" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Header ── */}
        <header className="flex flex-wrap justify-between items-start gap-4 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-1">KINETIC Dashboard</p>
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-[#151C25] dark:text-white">
              ברוך הבא, <span style={{ WebkitTextStroke: '2px #151C25' }} className="dark:text-white">{displayName}</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="bg-white dark:bg-[#151C25] shadow-sm px-4 py-2 rounded-full text-xs font-bold text-[#656464] dark:text-gray-400 flex items-center gap-1.5">
              ⏱ {Math.round((d.activeMinutes || 0))}m {t('activeWorkout.elapsed')}
            </span>
            <span className="bg-[#CCFF00] text-black px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              🔥 {d.streak ?? 0} {t('dashboard.streak')}
            </span>
          </div>
        </header>

        {/* ── Daily Challenge ── */}
        {challenge && (
          <div className="bg-white dark:bg-[#151C25] rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-200">
            <div className="text-3xl shrink-0">{challenge.text.split(' ').pop()}</div>
            <div className="flex-1">
              <span className="text-[10px] text-[#656464] uppercase tracking-widest font-bold block mb-0.5">{t('dashboard.dailyChallenge')}</span>
              <p className="font-black text-sm">{challenge.text.split(' ').slice(0, -1).join(' ')}</p>
              <span className="text-xs text-[#CCFF00] font-bold">+{challenge.xp} XP</span>
            </div>
            <button
              onClick={() => {
                setChallengeDone(true)
                authFetch(`${API}/api/daily-challenge/complete`, { method: 'POST' }).catch(console.error)
              }}
              className={`px-4 py-2 rounded-full font-black text-xs uppercase transition-all active:scale-95 ${
                challengeDone ? 'bg-[#CCFF00] text-black' : 'bg-[#F8F9FF] dark:bg-[#0E0E0E] text-[#656464] hover:bg-[#CCFF00] hover:text-black'
              }`}
            >
              {challengeDone ? t('dashboard.challengeDone') : t('dashboard.challengeComplete')}
            </button>
          </div>
        )}

        {/* ── Bento Row 1: Recovery (8) + Protein (4) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

          {/* Recovery Index — large card */}
          <div className="md:col-span-8 bg-white dark:bg-[#151C25] rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#656464]">Recovery Index</p>
                <h2 className="text-2xl font-black uppercase tracking-tight text-[#151C25] dark:text-white mt-0.5">
                  {t('dashboard.weeklyActivity')}
                </h2>
              </div>
              <span className="text-xs font-bold text-[#656464] uppercase tracking-wider">{t('dashboard.lastDays')}</span>
            </div>

            {/* Bar chart */}
            <div className="flex items-end justify-between h-36 gap-1">
              {(d.weeklyActivity || []).length === 0
                ? ['א','ב','ג','ד','ה','ו','ש'].map((l, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-full bg-[#F8F9FF] dark:bg-[#0E0E0E] rounded-lg h-24 animate-pulse" />
                      <span className="text-[10px] text-[#656464] font-bold">{l}</span>
                    </div>
                  ))
                : (d.weeklyActivity || []).map((day, i) => {
                    const isMax = day.pct === Math.max(...(d.weeklyActivity || []).map(x => x.pct))
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1 group relative">
                        {isMax && day.pct > 0 && (
                          <span className="text-[9px] text-[#CCFF00] font-black absolute -top-4">{day.pct}%</span>
                        )}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-[#151C25] text-white rounded-lg px-2 py-1 whitespace-nowrap z-10 pointer-events-none text-[10px]">
                          {day.label}: {day.pct}%
                        </div>
                        <div className="w-full bg-[#F8F9FF] dark:bg-[#0E0E0E] rounded-lg h-24 relative overflow-hidden mt-4">
                          <div className="absolute bottom-0 w-full rounded-lg transition-all duration-500"
                            style={{ height: `${day.pct}%`, backgroundColor: day.today ? '#CCFF00' : '#E2E8F0' }} />
                        </div>
                        <span className={`text-[10px] font-bold ${day.today ? 'text-[#CCFF00]' : 'text-[#656464]'}`}>{day.label}</span>
                      </div>
                    )
                  })
              }
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-[#F8F9FF] dark:border-[#0E0E0E]">
              {[
                { label: t('activeWorkout.volume'), value: `${Math.round(d.volume || 0)}`, unit: 'kg' },
                { label: t('dashboard.activeMinutes'), value: `${d.activeMinutes || 54}`, unit: 'min' },
                { label: t('dashboard.restingHR'), value: `${d.restingHR || 62}`, unit: 'bpm' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-xl font-black text-[#151C25] dark:text-white">{s.value}<span className="text-xs font-normal text-[#656464] ml-0.5">{s.unit}</span></p>
                  <p className="text-[10px] text-[#656464] uppercase tracking-wider font-bold">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Protein card */}
          <div className="md:col-span-4 bg-white dark:bg-[#151C25] rounded-2xl p-6 shadow-sm flex flex-col hover:-translate-y-1 transition-all duration-200">
            <p className="text-xs font-bold uppercase tracking-widest text-[#656464] mb-1">Protein</p>
            <h2 className="text-xl font-black uppercase text-[#151C25] dark:text-white mb-4">Daily Target</h2>

            <div className="flex items-center justify-center flex-1 relative">
              <Ring pct={proteinPercent} size={100} stroke={10} color="#CCFF00" />
              <div className="absolute text-center">
                <p className="text-2xl font-black text-[#151C25] dark:text-white leading-none">{proteinCurrent}</p>
                <p className="text-[10px] text-[#656464] font-bold">/ {proteinGoal}g</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#656464]">חלבון</span>
                  <span className="font-black text-[#CCFF00]">{Math.round(proteinPercent)}%</span>
                </div>
                <div className="h-2 bg-[#F8F9FF] dark:bg-[#0E0E0E] rounded-full overflow-hidden">
                  <div className="h-full bg-[#CCFF00] rounded-full transition-all duration-700" style={{ width: `${proteinPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#656464]">קלוריות</span>
                  <span className="font-black text-[#151C25] dark:text-white">{calorieCurrent}<span className="text-[#656464] font-normal">/{calorieGoal}</span></span>
                </div>
                <div className="h-2 bg-[#F8F9FF] dark:bg-[#0E0E0E] rounded-full overflow-hidden">
                  <div className="h-full bg-[#151C25] dark:bg-white rounded-full transition-all duration-700" style={{ width: `${caloriePercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bento Row 2: Steps (4) + Metabolic Load (4) + Neural Fatigue / TOM dark (4) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Daily Steps */}
          <div className="bg-white dark:bg-[#151C25] rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-all duration-200">
            <p className="text-xs font-bold uppercase tracking-widest text-[#656464] mb-1">Daily Steps</p>
            <div className="flex items-end justify-between mb-4">
              <p className="text-4xl font-black text-[#151C25] dark:text-white">{(d.steps || 0).toLocaleString()}</p>
              <p className="text-xs text-[#656464] font-bold mb-1">/ {(d.stepGoal || 10000).toLocaleString()}</p>
            </div>
            <div className="h-2.5 bg-[#F8F9FF] dark:bg-[#0E0E0E] rounded-full overflow-hidden">
              <div className="h-full bg-[#CCFF00] rounded-full transition-all duration-700" style={{ width: `${stepPct}%` }} />
            </div>
            <p className="text-xs text-[#656464] mt-2 font-medium">{stepPct}% of daily goal</p>
          </div>

          {/* Metabolic Load — Water */}
          <div className="bg-white dark:bg-[#151C25] rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-all duration-200">
            <p className="text-xs font-bold uppercase tracking-widest text-[#656464] mb-1">Metabolic Load</p>
            <div className="flex items-end justify-between mb-4">
              <p className="text-4xl font-black text-[#151C25] dark:text-white">{water.toFixed(1)}<span className="text-base font-normal text-[#656464] ml-1">L</span></p>
              <p className="text-xs text-[#656464] font-bold mb-1">/ 2.5L {t('dashboard.hydration')}</p>
            </div>
            <div className="h-2.5 bg-[#F8F9FF] dark:bg-[#0E0E0E] rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${waterPct}%`, background: 'linear-gradient(90deg,#0096c7,#48cae4)' }} />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[{ ml: 250, label: '250' }, { ml: 330, label: '330' }, { ml: 500, label: '500' }, { ml: 750, label: '750' }].map(b => (
                <button key={b.ml} onClick={() => addWater(b.ml / 1000)}
                  className="py-1.5 rounded-lg text-[10px] font-black text-[#0096c7] bg-[#e0f7ff] dark:bg-[#0E0E0E] hover:bg-[#0096c7] hover:text-white transition-colors active:scale-90">
                  +{b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Neural Fatigue / TOM — dark card */}
          <div className="bg-[#151C25] text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 transition-all duration-200">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#CCFF00] opacity-10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#CCFF00]/70 mb-1">Neural Fatigue</p>
              <h2 className="text-2xl font-black italic uppercase text-[#CCFF00]">TOM.</h2>
              <p className="text-gray-400 text-sm leading-relaxed mt-2">
                הוסף ארוחה, עדכן משקלים או בקש ניתוח התאוששות.
              </p>
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Sleep</span>
                <span className="font-black">{d.sleep || '7h 20m'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">HR Resting</span>
                <span className="font-black">{d.restingHR || 62} bpm</span>
              </div>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('kinetic:ai-open'))}
              className="w-full bg-[#CCFF00] text-black font-black uppercase tracking-wider py-3 rounded-xl hover:bg-white transition-colors duration-200 mt-5 active:scale-95 text-sm"
            >
              Open TOM →
            </button>
          </div>
        </div>

        {/* ── Recommended Protocol ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-[#151C25] dark:text-white">Recommended Protocol</h2>
            <span className="text-xs text-[#656464] font-bold uppercase tracking-wider">Today</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

            {/* Next Workout — dark card */}
            <div className="md:col-span-5 bg-[#151C25] text-white rounded-2xl relative overflow-hidden group min-h-[200px] hover:-translate-y-1 transition-all duration-200">
              <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-700"
                style={{ background: 'linear-gradient(135deg,#151C25 0%,#1a2744 60%,#0f3460 100%)' }} />
              <div className="relative z-10 h-full p-6 flex flex-col justify-between">
                <span className="self-start bg-[#CCFF00] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  {t('dashboard.upcoming')}
                </span>
                <div className="mt-4">
                  <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
                    {d.nextWorkout?.name || 'HIIT Training'}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-gray-400 text-xs font-medium">
                    <span>⏱ {d.nextWorkout?.duration || 20} {t('common.minutes')}</span>
                    <span>⚡ {t(`workouts.${(d.nextWorkout?.intensity || 'advanced').toLowerCase()}`)}</span>
                  </div>
                </div>
                <Link to="/active-workout" className="mt-5 block">
                  <button className="bg-[#CCFF00] text-black font-black py-3 px-6 rounded-xl w-full uppercase tracking-widest hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] active:scale-95 transition-all text-sm">
                    START NEXT SESSION
                  </button>
                </Link>
              </div>
            </div>

            {/* Macros + Metrics */}
            <div className="md:col-span-7 grid grid-cols-2 gap-5">

              {/* Macros */}
              {macros && (
                <div className="col-span-2 bg-white dark:bg-[#151C25] rounded-2xl p-6 shadow-sm hover:-translate-y-1 transition-all duration-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#656464] mb-4">{t('dashboard.macrosToday')}</p>
                  <div className="space-y-3">
                    {[
                      { key: 'calories', label: t('dashboard.calories'), unit: 'kcal', color: '#CCFF00' },
                      { key: 'protein',  label: t('dashboard.protein'),  unit: 'g',    color: '#ff734a' },
                      { key: 'carbs',    label: t('dashboard.carbs'),    unit: 'g',    color: '#00b4d8' },
                      { key: 'fat',      label: t('dashboard.fat'),      unit: 'g',    color: '#c77dff' },
                    ].map(({ key, label, unit, color }) => {
                      const m = macros[key]
                      if (!m) return null
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-[#656464] uppercase tracking-wider">{label}</span>
                            <span className="font-black" style={{ color }}>
                              {m.consumed ?? 0}<span className="text-[#656464] font-normal">/{m.target ?? 0}{unit}</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#F8F9FF] dark:bg-[#0E0E0E] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.pct ?? 0}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Metric cards */}
              {[
                { icon: '❤️', label: t('dashboard.restingHR'),    value: `${d.restingHR || 62}`,    unit: 'bpm' },
                { icon: '🌙', label: t('dashboard.sleep'),         value: d.sleep || '7h 20m',        unit: '' },
              ].map((m, i) => (
                <div key={i} className="bg-white dark:bg-[#151C25] rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-all duration-200">
                  <div className="text-2xl mb-2">{m.icon}</div>
                  <p className="text-[10px] text-[#656464] font-bold uppercase tracking-wider mb-0.5">{m.label}</p>
                  <p className="text-xl font-black text-[#151C25] dark:text-white">
                    {m.value}{m.unit && <span className="text-xs font-medium text-[#656464] ml-1">{m.unit}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pro Insight / Readiness ── */}
        <div className="bg-white dark:bg-[#151C25] rounded-2xl shadow-sm overflow-hidden hover:-translate-y-1 transition-all duration-200">
          <div className="px-6 pt-5 pb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#656464]">Pro Insight</p>
              <h3 className="font-black text-lg uppercase text-[#151C25] dark:text-white">Readiness Score</h3>
            </div>
            <span className="bg-[#CCFF00] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Live</span>
          </div>
          <ReadinessCard />
        </div>

      </div>
    </main>
  )
}
