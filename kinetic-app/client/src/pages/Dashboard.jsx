import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDashboard, authFetch } from '../api'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { SkeletonCard, SkeletonText } from '../components/Skeleton'
import { useLang } from '../context/LanguageContext'
import { registerPushNotifications, isPushSupported } from '../utils/pushNotifications'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/* ─── Animated weekly bar chart ─── */
function RecoveryBarChart({ data }) {
  const days =
    data && data.length > 0
      ? data
      : [
          { label: 'שני',    pct: 65 },
          { label: 'שלישי', pct: 45 },
          { label: 'רביעי', pct: 80 },
          { label: 'חמישי', pct: 95, today: true },
          { label: 'שישי',  pct: 70 },
          { label: 'שבת',   pct: 60 },
          { label: 'ראשון', pct: 85 },
        ]
  const maxPct = Math.max(...days.map(d => d.pct || 0), 1)

  return (
    <div className="flex items-end justify-between h-44 gap-2 md:gap-3 px-1">
      {days.map((day, i) => {
        const height = Math.max(5, Math.round((day.pct / maxPct) * 100))
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-surface-container-highest rounded-t-lg relative overflow-hidden"
              style={{ height: '148px' }}
            >
              <div
                className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-1000 ease-out ${
                  day.today
                    ? 'bg-primary-container shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                    : 'bg-on-background'
                }`}
                style={{ height: `${height}%` }}
              />
            </div>
            <span
              className={`text-[9px] font-black uppercase ${
                day.today ? 'text-on-surface' : 'text-on-secondary-container'
              }`}
            >
              {day.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── SVG circular macro progress ─── */
function CircularMacroProgress({ value, target, color = '#151C25' }) {
  const pct    = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const r      = 76
  const circ   = 2 * Math.PI * r
  const filled = (pct / 100) * circ

  return (
    <svg className="w-44 h-44 -rotate-90" viewBox="0 0 176 176">
      <circle
        cx="88" cy="88" r={r}
        fill="transparent"
        stroke="#f1f4f9"
        strokeWidth="12"
      />
      <circle
        cx="88" cy="88" r={r}
        fill="transparent"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  )
}

/* ─────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const { user }            = useUser()
  const { user: authUser }  = useAuth()
  const { t }               = useLang()
  const {
    dashboard: appDashboard,
    todayNutrition: appMacros,
  } = useAppData() || {}

  const [data,          setData]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [water,         setWater]         = useState(0)
  const [macros,        setMacros]        = useState(null)
  const [challenge,     setChallenge]     = useState(null)
  const [challengeDone, setChallengeDone] = useState(false)
  const [readiness,     setReadiness]     = useState(null)

  /* ── Dashboard data ── */
  useEffect(() => {
    const validDash = appDashboard && !appDashboard.error ? appDashboard : null
    if (validDash) {
      setData(validDash)
      setLoading(false)
    } else {
      fetchDashboard()
        .then(d => setData(d && !d.error ? d : null))
        .catch(() => setData(null))
        .finally(() => setLoading(false))
    }
  }, [appDashboard])

  /* ── Macros ── */
  useEffect(() => {
    if (appMacros) { setMacros(appMacros); return }
    authFetch(`${API}/api/nutrition/macros/today`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setMacros(d) })
      .catch(() => {})
  }, [appMacros])

  /* ── Water ── */
  useEffect(() => {
    if (user?.waterToday !== undefined) setWater(user.waterToday)
  }, [user])

  /* ── Daily challenge ── */
  useEffect(() => {
    authFetch('/api/daily-challenge')
      .then(r => r.json())
      .then(d => { setChallenge(d.challenge); setChallengeDone(!!d.done) })
      .catch(console.error)
  }, [])

  /* ── Readiness ── */
  useEffect(() => {
    authFetch(`${API}/api/readiness`)
      .then(r => r.json())
      .then(setReadiness)
      .catch(() => {})
  }, [])

  /* ── Push notifications (delayed) ── */
  useEffect(() => {
    if (!isPushSupported() || Notification.permission === 'granted') return
    const timer = setTimeout(async () => { await registerPushNotifications() }, 3000)
    return () => clearTimeout(timer)
  }, [])

  /* ── Add water ── */
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

  /* ── Loading skeleton ── */
  if (loading) return (
    <main className="mt-24 px-4 md:px-8 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="space-y-3">
        <SkeletonText width="w-40" />
        <SkeletonText width="w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <SkeletonCard className="md:col-span-8 h-72" />
        <SkeletonCard className="md:col-span-4 h-72" />
        <SkeletonCard className="md:col-span-4 h-80" />
        <SkeletonCard className="md:col-span-8 h-80" />
        <SkeletonCard className="md:col-span-12 h-48" />
      </div>
    </main>
  )

  /* ── Derived values ── */
  const d            = data || fallback
  const stepPct      = Math.min(100, Math.round(((d.steps ?? 0) / (d.stepGoal || 10000)) * 100))
  const displayName  = user?.name || authUser?.name || d.userName || 'Athlete'

  const readinessScore  = readiness?.score ?? d.readinessScore ?? 88
  const readinessLabel  =
    readinessScore >= 80 ? 'מוכנות מלאה' :
    readinessScore >= 60 ? 'מוכנות בינונית' : 'מנוחה מומלצת'
  const readinessColor  =
    readinessScore >= 80 ? '#CCFF00' :
    readinessScore >= 60 ? '#FFB800' : '#FF6B6B'

  const weeklyBars    = (d.weeklyActivity || []).length > 0 ? d.weeklyActivity : []

  const protein       = macros?.protein?.consumed   ?? 0
  const proteinTarget = macros?.protein?.target     ?? 200
  const carbs         = macros?.carbs?.consumed     ?? 0
  const carbsTarget   = macros?.carbs?.target       ?? 250
  const fat           = macros?.fat?.consumed       ?? 0
  const fatTarget     = macros?.fat?.target         ?? 80
  const calories      = macros?.calories?.consumed  ?? d.todayCalories    ?? 0
  const calTarget     = macros?.calories?.target    ?? d.dailyCalorieTarget ?? 2000

  const waterTarget   = user?.waterTarget ?? 2.5
  const waterPct      = Math.min(100, Math.round((water / waterTarget) * 100))
  const calPct        = calTarget > 0 ? Math.min(100, Math.round((calories / calTarget) * 100)) : 0
  const sleepPct      = readiness?.breakdown?.sleep?.score ??
                        Math.round(((d.sleep || 7) / 9) * 100)
  const sleepHours    = readiness?.breakdown?.sleep?.hours ?? d.sleep ?? 7
  /* HR quality: lower HR → higher % (normalised 40-100 bpm) */
  const hrPct         = Math.max(10, Math.min(100, Math.round(100 - (((d.restingHR || 62) - 40) / 60) * 100)))

  function openAI(msg) {
    window.dispatchEvent(new CustomEvent('kinetic:ai-open', { detail: { message: msg } }))
  }

  /* ─────────────── RENDER ─────────────── */
  return (
    <main className="mt-20 md:mt-24 px-4 md:px-8 max-w-7xl mx-auto pb-32">

      {/* ── Page Header ── */}
      <header className="mb-8 pt-6">
        <p className="uppercase tracking-[0.2em] text-on-secondary-container font-black text-xs mb-2">
          הגבולות שלך נמצאים מאחוריך
        </p>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-on-surface leading-none">
          שלום, {displayName} —{' '}
          <span className="text-on-primary-container bg-on-background px-3 py-1 italic rounded-sm">
            לוח ביצועים
          </span>
        </h1>
      </header>

      {/* ── Daily Challenge ── */}
      {challenge && (
        <div className="mb-8 bg-surface-container-low border border-surface-container-high rounded-xl p-4 flex items-center gap-4">
          <div className="text-3xl shrink-0">{challenge.text.split(' ').pop()}</div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-on-secondary-container uppercase font-black tracking-widest block mb-0.5">
              אתגר יומי
            </span>
            <p className="font-black text-sm truncate">{challenge.text.split(' ').slice(0, -1).join(' ')}</p>
            <span className="text-xs font-bold" style={{ color: '#CCFF00' }}>+{challenge.xp} XP</span>
          </div>
          <button
            onClick={() => {
              setChallengeDone(true)
              authFetch(`${API}/api/daily-challenge/complete`, { method: 'POST' }).catch(console.error)
            }}
            className={`shrink-0 px-4 py-2 rounded-lg font-black text-xs uppercase transition-all ${
              challengeDone
                ? 'bg-primary-container text-on-background'
                : 'bg-surface-container border border-primary-container text-primary-fixed-dim'
            }`}
          >
            {challengeDone ? '✓ בוצע' : 'סמן כבוצע'}
          </button>
        </div>
      )}

      {/* ══════════════ BENTO GRID ══════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">

        {/* ① Recovery Index — 8 cols */}
        <div className="md:col-span-8 bg-white border border-surface-container-high p-6 md:p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-500">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">מדד התאוששות</h2>
              <p className="text-on-secondary-container font-bold text-sm mt-1">
                {readiness?.recommendation || 'כל אימון הוא צעד לקראת הניצחון'}
              </p>
            </div>
            <div className="text-left shrink-0">
              <span className="text-3xl md:text-4xl font-black text-on-surface">{readinessScore}%</span>
              <p className="text-xs uppercase tracking-widest font-black mt-0.5" style={{ color: readinessColor }}>
                {readinessLabel}
              </p>
            </div>
          </div>

          <RecoveryBarChart data={weeklyBars} />

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => openAI('מה אתה ממליץ היום לפי ציון המוכנות שלי?')}
              className="text-xs font-black uppercase tracking-widest border-b-2 border-primary-container pb-0.5 hover:opacity-60 transition-opacity"
            >
              שאל את המאמן AI
            </button>
          </div>
        </div>

        {/* ② Daily Steps — 4 cols */}
        <div className="md:col-span-4 bg-on-background p-6 md:p-8 rounded-xl text-white flex flex-col justify-between min-h-[280px]">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-primary-container text-4xl">bolt</span>
            <div className="text-left">
              <h2 className="text-xs font-black uppercase tracking-widest text-white/50">צעדים היום</h2>
              <p className="text-3xl md:text-4xl font-black tracking-tighter">
                {(d.steps ?? 0).toLocaleString()}
              </p>
              <p className="text-xs font-bold text-white/40">
                / {(d.stepGoal ?? 10000).toLocaleString()} יעד
              </p>
            </div>
          </div>

          {/* Step progress */}
          <div className="my-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs font-black uppercase text-white/50">התקדמות</span>
              <span className="text-xs font-black text-primary-container">{stepPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-white/15">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-700"
                style={{ width: `${stepPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-white/50">דקות בעצימות גבוהה</span>
              <span className="text-sm font-black">{d.activeMinutes || 0}ד'</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-white/50">רצף אימונים</span>
              <span className="text-sm font-black text-primary-container">{d.streak ?? 0} ימים 🔥</span>
            </div>
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest mt-4 text-primary-container">
            אין מקום לתירוצים
          </p>
        </div>

        {/* ③ Nutrition Circular — 4 cols */}
        <div className="md:col-span-4 bg-white p-6 md:p-8 rounded-xl border border-surface-container-high hover:shadow-xl transition-all duration-500">
          <h2 className="text-xl font-black uppercase tracking-tight mb-1">תזונה לביצועים</h2>
          <p className="text-on-secondary-container font-bold text-xs mb-5">הדלק שלך לניצחון</p>

          {/* Circular chart — protein */}
          <div className="relative flex justify-center items-center py-2">
            <CircularMacroProgress value={protein} target={proteinTarget} color="#151C25" />
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-on-surface">{protein}ג'</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-secondary-container">
                חלבון נצרך
              </span>
            </div>
          </div>

          {/* Macros row */}
          <div className="mt-5 pt-4 border-t border-surface-container-high flex justify-around text-center">
            <div>
              <p className="text-[10px] font-black uppercase text-on-secondary-container">פחמימות</p>
              <p className="text-lg font-black">{carbs}ג'</p>
              <p className="text-[10px] text-on-secondary-container">/ {carbsTarget}ג'</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-on-secondary-container">שומנים</p>
              <p className="text-lg font-black">{fat}ג'</p>
              <p className="text-[10px] text-on-secondary-container">/ {fatTarget}ג'</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-on-secondary-container">קלוריות</p>
              <p className="text-lg font-black">{calories}</p>
              <p className="text-[10px] text-on-secondary-container">/ {calTarget}</p>
            </div>
          </div>
        </div>

        {/* ④ Metabolic Analysis — 8 cols */}
        <div className="md:col-span-8 bg-white border border-surface-container-high p-6 md:p-8 rounded-xl">
          <div className="flex justify-between items-center mb-7">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">ניתוח מטבולי</h2>
            <span className="px-3 py-1 bg-on-background text-primary-container text-[10px] font-black rounded-full uppercase">
              בזמן אמת
            </span>
          </div>

          <div className="space-y-6">
            {/* Hydration */}
            <div>
              <div className="flex justify-between mb-2 items-end">
                <span className="text-sm font-black uppercase text-on-surface">הידרציה</span>
                <span className="text-lg font-black">{waterPct}%</span>
              </div>
              <div className="h-3 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-on-background rounded-full transition-all duration-700" style={{ width: `${waterPct}%` }} />
              </div>
              <p className="text-xs text-on-secondary-container mt-1 font-bold">
                {water.toFixed(1)}L / {waterTarget}L יעד יומי
              </p>
            </div>

            {/* Caloric goal */}
            <div>
              <div className="flex justify-between mb-2 items-end">
                <span className="text-sm font-black uppercase text-on-surface">יעד קלורי</span>
                <span className="text-lg font-black">{calPct}%</span>
              </div>
              <div className="h-3 bg-primary-container rounded-full overflow-hidden">
                <div className="h-full bg-on-background rounded-full transition-all duration-700" style={{ width: `${calPct}%` }} />
              </div>
            </div>

            {/* Sleep */}
            <div>
              <div className="flex justify-between mb-2 items-end">
                <span className="text-sm font-black uppercase text-on-surface">איכות שינה</span>
                <span className="text-lg font-black">{sleepPct}%</span>
              </div>
              <div className="h-3 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-on-background rounded-full transition-all duration-700" style={{ width: `${sleepPct}%` }} />
              </div>
              <p className="text-xs text-on-secondary-container mt-1 font-bold">{sleepHours}h שינה הלילה</p>
            </div>

            {/* HR */}
            <div>
              <div className="flex justify-between mb-2 items-end">
                <span className="text-sm font-black uppercase text-on-surface">דופק במנוחה</span>
                <span className="text-lg font-black">{d.restingHR || 62} bpm</span>
              </div>
              <div className="h-3 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-on-background rounded-full transition-all duration-700" style={{ width: `${hrPct}%` }} />
              </div>
            </div>
          </div>

          {/* Water quick-add */}
          <div className="mt-7 pt-5 border-t border-surface-container-high">
            <p className="text-xs font-black uppercase tracking-widest text-on-secondary-container mb-3">
              הוסף מים מהיר
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { ml: 250,  label: '250ml' },
                { ml: 330,  label: '330ml' },
                { ml: 500,  label: '500ml' },
                { ml: 750,  label: '750ml' },
              ].map(b => (
                <button
                  key={b.ml}
                  onClick={() => addWater(b.ml / 1000)}
                  className="py-2 rounded-lg font-black text-xs active:scale-90 duration-200 bg-surface-container border border-outline-variant hover:bg-primary-container hover:border-primary-container hover:text-on-background transition-all"
                >
                  +{b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ⑤ AI Insight + Next Workout — full width */}
        <div className="md:col-span-12">
          <div className="bg-primary-container p-8 md:p-12 rounded-xl flex flex-col md:flex-row items-center gap-8 overflow-hidden relative">
            {/* Text */}
            <div className="relative z-10 md:w-2/3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-primary-container/60 mb-2">
                המלצת AI אישית
              </p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-on-primary-container leading-none mb-4">
                מקסם את 24 השעות הבאות שלך.
              </h3>
              <p className="text-on-primary-container font-bold text-base max-w-xl opacity-80 leading-relaxed mb-6">
                {d.nextWorkout
                  ? `האימון הבא שלך: ${d.nextWorkout.name} — ${d.nextWorkout.duration} דקות. בהתבסס על ציון המוכנות שלך, הגוף מוכן לאימון!`
                  : 'בהתבסס על המדדים שלך, גופך מוכן לאימון כוח. אל תוותר לעצמך היום.'}
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/plans')}
                  className="bg-on-background text-primary-container px-8 py-3 rounded-md font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl"
                >
                  צפה בתוכנית האימונים
                </button>
                <button
                  onClick={() => openAI('תן לי תוכנית מפורטת לאימון היום')}
                  className="border-2 border-on-background text-on-background px-8 py-3 rounded-md font-black uppercase tracking-widest text-sm hover:bg-on-background hover:text-primary-container transition-all active:scale-95"
                >
                  שאל את AI
                </button>
              </div>
            </div>

            {/* Score circle */}
            <div className="md:w-1/3 flex justify-center">
              <div className="w-48 h-48 md:w-52 md:h-52 bg-on-background rounded-full flex flex-col items-center justify-center shadow-2xl relative">
                <span className="text-5xl font-black text-primary-container">{readinessScore}</span>
                <span className="text-xs font-black uppercase tracking-widest text-white/60 mt-1">ציון מוכנות</span>
                <span className="text-xs font-black mt-1" style={{ color: readinessColor }}>{readinessLabel}</span>
                <div className="absolute -top-2 -right-2 bg-primary-container text-on-background px-2 py-1 rounded-full font-black text-[10px] italic shadow-xl">
                  KINETIC AI
                </div>
              </div>
            </div>

            {/* Decorative bg text */}
            <div className="absolute -left-10 -bottom-10 text-[8rem] md:text-[12rem] font-black text-on-background/5 select-none pointer-events-none italic">
              POWER
            </div>
          </div>
        </div>

        {/* ⑥ Quick Stats — full width row */}
        <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'favorite',    label: 'דופק מנוחה',   value: `${d.restingHR || 62}`, unit: 'bpm',  color: '#FF6B6B' },
            { icon: 'bedtime',     label: 'שינה',         value: String(sleepHours),       unit: 'שעות', color: '#00b4d8' },
            { icon: 'water_drop',  label: 'הידרציה',      value: water.toFixed(1),         unit: 'L',    color: '#00b4d8' },
            { icon: 'timer',       label: 'דקות פעיל',    value: `${d.activeMinutes || 0}`,unit: 'דק׳',  color: '#CCFF00' },
          ].map((m, i) => (
            <div
              key={i}
              className="bg-white border border-surface-container-high p-5 rounded-xl space-y-2 hover:shadow-md transition-all duration-300"
            >
              <span
                className="material-symbols-outlined"
                style={{ color: m.color, fontVariationSettings: "'FILL' 1" }}
              >
                {m.icon}
              </span>
              <span className="block text-[10px] text-on-secondary-container uppercase font-black tracking-widest">
                {m.label}
              </span>
              <span className="block font-black text-2xl text-on-surface">
                {m.value}{' '}
                <span className="text-sm font-bold text-on-secondary-container">{m.unit}</span>
              </span>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}

/* ── Fallback data (all zeros) ── */
const fallback = {
  steps:              0,
  stepGoal:           10000,
  streak:             0,
  calories:           0,
  avgCalories:        0,
  restingHR:          62,
  sleep:              7,
  hydration:          0,
  activeMinutes:      0,
  weeklyActivity:     [],
  nextWorkout:        { id: 1, name: 'HIIT Training', duration: 20, intensity: 'HIGH' },
  todayCalories:      0,
  dailyCalorieTarget: 2000,
}
