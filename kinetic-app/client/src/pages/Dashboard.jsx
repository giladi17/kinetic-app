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
const LIME = '#CCFF00'

/* ─── Animated weekly bar chart (dark-card variant) ─── */
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
              className="w-full bg-white/10 rounded-t-lg relative overflow-hidden"
              style={{ height: '148px' }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t-lg transition-all duration-1000 ease-out"
                style={{
                  height: `${height}%`,
                  backgroundColor: day.today ? LIME : 'rgba(255,255,255,0.25)',
                  boxShadow: day.today ? `0 0 18px rgba(204,255,0,0.4)` : 'none',
                }}
              />
            </div>
            <span
              className="text-[9px] font-black uppercase"
              style={{ color: day.today ? LIME : 'rgba(255,255,255,0.35)' }}
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
function CircularMacroProgress({ value, target, color = LIME, trackColor = 'rgba(255,255,255,0.1)' }) {
  const pct    = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const r      = 76
  const circ   = 2 * Math.PI * r
  const filled = (pct / 100) * circ

  return (
    <svg className="w-44 h-44 -rotate-90" viewBox="0 0 176 176">
      <circle cx="88" cy="88" r={r} fill="transparent" stroke={trackColor} strokeWidth="12" />
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
  const { user }           = useUser()
  const { user: authUser } = useAuth()
  useLang()
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

  useEffect(() => {
    const validDash = appDashboard && !appDashboard.error ? appDashboard : null
    if (validDash) { setData(validDash); setLoading(false) }
    else {
      fetchDashboard()
        .then(d => setData(d && !d.error ? d : null))
        .catch(() => setData(null))
        .finally(() => setLoading(false))
    }
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
    authFetch(`${API}/api/readiness`)
      .then(r => r.json())
      .then(setReadiness)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isPushSupported() || Notification.permission === 'granted') return
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

  if (loading) return (
    <main className="mt-24 px-4 md:px-8 max-w-7xl mx-auto space-y-8 pb-32 bg-[#FBFBFA] min-h-screen">
      <div className="space-y-3"><SkeletonText width="w-40" /><SkeletonText width="w-64" /></div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <SkeletonCard className="md:col-span-8 h-72" />
        <SkeletonCard className="md:col-span-4 h-72" />
        <SkeletonCard className="md:col-span-4 h-80" />
        <SkeletonCard className="md:col-span-8 h-80" />
        <SkeletonCard className="md:col-span-12 h-48" />
      </div>
    </main>
  )

  const d            = data || fallback
  const stepPct      = Math.min(100, Math.round(((d.steps ?? 0) / (d.stepGoal || 10000)) * 100))
  const displayName  = user?.name || authUser?.name || d.userName || 'Athlete'

  const readinessScore = readiness?.score ?? d.readinessScore ?? 88
  const readinessLabel =
    readinessScore >= 80 ? 'מוכנות מלאה' :
    readinessScore >= 60 ? 'מוכנות בינונית' : 'מנוחה מומלצת'
  const readinessColor =
    readinessScore >= 80 ? LIME :
    readinessScore >= 60 ? '#FFB800' : '#FF6B6B'

  const weeklyBars    = (d.weeklyActivity || []).length > 0 ? d.weeklyActivity : []
  const protein       = macros?.protein?.consumed  ?? 0
  const proteinTarget = macros?.protein?.target    ?? 200
  const carbs         = macros?.carbs?.consumed    ?? 0
  const carbsTarget   = macros?.carbs?.target      ?? 250
  const fat           = macros?.fat?.consumed      ?? 0
  const fatTarget     = macros?.fat?.target        ?? 80
  const calories      = macros?.calories?.consumed ?? d.todayCalories    ?? 0
  const calTarget     = macros?.calories?.target   ?? d.dailyCalorieTarget ?? 2000
  const waterTarget   = user?.waterTarget ?? 2.5
  const waterPct      = Math.min(100, Math.round((water / waterTarget) * 100))
  const calPct        = calTarget > 0 ? Math.min(100, Math.round((calories / calTarget) * 100)) : 0
  const sleepPct      = readiness?.breakdown?.sleep?.score ?? Math.round(((d.sleep || 7) / 9) * 100)
  const sleepHours    = readiness?.breakdown?.sleep?.hours ?? d.sleep ?? 7
  const hrPct         = Math.max(10, Math.min(100, Math.round(100 - (((d.restingHR || 62) - 40) / 60) * 100)))

  function openAI(msg) {
    window.dispatchEvent(new CustomEvent('kinetic:ai-open', { detail: { message: msg } }))
  }

  /* ─────────────── RENDER ─────────────── */
  return (
    <main className="mt-20 md:mt-24 px-4 md:px-8 max-w-7xl mx-auto pb-32 bg-[#FBFBFA] min-h-screen">

      {/* ── Page Header ── */}
      <header className="mb-8 pt-6">
        <p className="uppercase tracking-[0.2em] text-[#656464] font-black text-xs mb-2">
          הגבולות שלך נמצאים מאחוריך
        </p>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-[#151C25] leading-none">
          שלום, {displayName} —{' '}
          <span className="bg-[#121212] text-[#CCFF00] px-3 py-1 italic rounded-sm">
            לוח ביצועים
          </span>
        </h1>
      </header>

      {/* ── Daily Challenge ── */}
      {challenge && (
        <div className="mb-8 bg-[#121212] rounded-xl p-4 flex items-center gap-4 shadow-[0_4px_40px_rgba(0,0,0,0.15)]">
          <div className="text-3xl shrink-0">{challenge.text.split(' ').pop()}</div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-0.5">
              אתגר יומי
            </span>
            <p className="font-black text-sm text-white truncate">{challenge.text.split(' ').slice(0, -1).join(' ')}</p>
            <span className="text-xs font-bold" style={{ color: LIME }}>+{challenge.xp} XP</span>
          </div>
          <button
            onClick={() => {
              setChallengeDone(true)
              authFetch(`${API}/api/daily-challenge/complete`, { method: 'POST' }).catch(console.error)
            }}
            className={`shrink-0 px-4 py-2 rounded-lg font-black text-xs uppercase transition-all ${
              challengeDone
                ? 'text-[#121212] font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            style={challengeDone ? { backgroundColor: LIME } : {}}
          >
            {challengeDone ? '✓ בוצע' : 'סמן כבוצע'}
          </button>
        </div>
      )}

      {/* ══════════════ BENTO GRID ══════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">

        {/* ① Recovery Index — 8 cols — DARK */}
        <div className="md:col-span-8 bg-[#121212] p-6 md:p-8 rounded-xl shadow-[0_4px_40px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-[0_12px_60px_rgba(0,0,0,0.3)] transition-all duration-500">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black mb-1">ביצועים שבועיים</p>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">מדד התאוששות</h2>
              <p className="text-white/40 font-bold text-sm mt-1">
                {readiness?.recommendation || 'כל אימון הוא צעד לקראת הניצחון'}
              </p>
            </div>
            <div className="text-left shrink-0">
              <span className="text-3xl md:text-4xl font-black text-white">{readinessScore}%</span>
              <p className="text-xs uppercase tracking-widest font-black mt-0.5" style={{ color: readinessColor }}>
                {readinessLabel}
              </p>
            </div>
          </div>

          <RecoveryBarChart data={weeklyBars} />

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => openAI('מה אתה ממליץ היום לפי ציון המוכנות שלי?')}
              className="text-xs font-black uppercase tracking-widest pb-0.5 hover:opacity-60 transition-opacity"
              style={{ color: LIME, borderBottom: `2px solid ${LIME}` }}
            >
              שאל את המאמן AI
            </button>
          </div>
        </div>

        {/* ② Daily Steps — 4 cols — photo + dark overlay */}
        <div
          className="md:col-span-4 p-6 md:p-8 rounded-xl text-white flex flex-col justify-between min-h-[280px] relative overflow-hidden shadow-[0_4px_40px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-500"
          style={{ backgroundImage: 'url(/images/athlete.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-[#0a0a0a]/82 rounded-xl" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <span className="material-symbols-outlined text-4xl" style={{ color: LIME }}>bolt</span>
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

            <div className="my-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs font-black uppercase text-white/50">התקדמות</span>
                <span className="text-xs font-black" style={{ color: LIME }}>{stepPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-white/15">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stepPct}%`, backgroundColor: LIME }}
                />
              </div>
            </div>

            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-white/50">דקות בעצימות גבוהה</span>
                <span className="text-sm font-black">{d.activeMinutes || 0}ד'</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-white/50">רצף אימונים</span>
                <span className="text-sm font-black" style={{ color: LIME }}>{d.streak ?? 0} ימים 🔥</span>
              </div>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest mt-4" style={{ color: LIME }}>
              אין מקום לתירוצים
            </p>
          </div>
        </div>

        {/* ③ Nutrition Circular — 4 cols — DARK */}
        <div className="md:col-span-4 bg-[#121212] p-6 md:p-8 rounded-xl shadow-[0_4px_40px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-[0_12px_60px_rgba(0,0,0,0.3)] transition-all duration-500">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black mb-1">מאקרו יומי</p>
          <h2 className="text-xl font-black uppercase tracking-tight text-white mb-1">תזונה לביצועים</h2>
          <p className="text-white/40 font-bold text-xs mb-5">הדלק שלך לניצחון</p>

          <div className="relative flex justify-center items-center py-2">
            <CircularMacroProgress value={protein} target={proteinTarget} color={LIME} trackColor="rgba(255,255,255,0.08)" />
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-white">{protein}ג'</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                חלבון נצרך
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 flex justify-around text-center">
            <div>
              <p className="text-[10px] font-black uppercase text-white/40">פחמימות</p>
              <p className="text-lg font-black text-white">{carbs}ג'</p>
              <p className="text-[10px] text-white/30">/ {carbsTarget}ג'</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white/40">שומנים</p>
              <p className="text-lg font-black text-white">{fat}ג'</p>
              <p className="text-[10px] text-white/30">/ {fatTarget}ג'</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white/40">קלוריות</p>
              <p className="text-lg font-black text-white">{calories}</p>
              <p className="text-[10px] text-white/30">/ {calTarget}</p>
            </div>
          </div>
        </div>

        {/* ④ Metabolic Analysis — 8 cols — WHITE (contrast card) */}
        <div className="md:col-span-8 bg-white p-6 md:p-8 rounded-xl shadow-[0_4px_40px_rgba(21,28,37,0.05)]">
          <div className="flex justify-between items-center mb-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#656464] font-black mb-1">נתוני גוף</p>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#151C25]">ניתוח מטבולי</h2>
            </div>
            <span className="px-3 py-1 bg-[#121212] text-[10px] font-black rounded-full uppercase" style={{ color: LIME }}>
              בזמן אמת
            </span>
          </div>

          <div className="space-y-6">
            {[
              { label: 'הידרציה',    pct: waterPct, sub: `${water.toFixed(1)}L / ${waterTarget}L יעד יומי`, barColor: '#151C25' },
              { label: 'יעד קלורי', pct: calPct,   sub: null,                                                barColor: LIME },
              { label: 'איכות שינה', pct: sleepPct, sub: `${sleepHours}h שינה הלילה`,                       barColor: '#151C25' },
              { label: `דופק במנוחה — ${d.restingHR || 62} bpm`, pct: hrPct, sub: null,                     barColor: '#151C25' },
            ].map((row, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2 items-end">
                  <span className="text-sm font-black uppercase text-[#151C25]">{row.label}</span>
                  <span className="text-lg font-black text-[#151C25]">{row.pct}%</span>
                </div>
                <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${row.pct}%`, backgroundColor: row.barColor }}
                  />
                </div>
                {row.sub && <p className="text-xs text-[#656464] mt-1 font-bold">{row.sub}</p>}
              </div>
            ))}
          </div>

          <div className="mt-7 pt-5">
            <p className="text-xs font-black uppercase tracking-widest text-[#656464] mb-3">הוסף מים מהיר</p>
            <div className="grid grid-cols-4 gap-2">
              {[250, 330, 500, 750].map(ml => (
                <button
                  key={ml}
                  onClick={() => addWater(ml / 1000)}
                  className="py-2 rounded-lg font-black text-xs active:scale-90 duration-200 bg-[#F5F5F5] text-[#151C25] hover:text-[#121212] transition-all"
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = LIME }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F5F5F5' }}
                >
                  +{ml}ml
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ⑤ AI Insight — full width — LIME hero */}
        <div className="md:col-span-12">
          <div
            className="p-8 md:p-12 rounded-xl flex flex-col md:flex-row items-center gap-8 overflow-hidden relative"
            style={{ backgroundImage: `url(/images/workout.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center 30%' }}
          >
            <div className="absolute inset-0 bg-[#0a0a0a]/88 rounded-xl" />
            <div className="relative z-10 md:w-2/3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-white/50">
                המלצת AI אישית
              </p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tighter leading-none mb-4 text-white">
                מקסם את{' '}
                <span style={{ color: LIME }}>24 השעות הבאות</span>{' '}
                שלך.
              </h3>
              <p className="font-bold text-base max-w-xl leading-relaxed mb-6 text-white/70">
                {d.nextWorkout
                  ? `האימון הבא שלך: ${d.nextWorkout.name} — ${d.nextWorkout.duration} דקות. בהתבסס על ציון המוכנות שלך, הגוף מוכן לאימון!`
                  : 'בהתבסס על המדדים שלך, גופך מוכן לאימון כוח. אל תוותר לעצמך היום.'}
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/plans')}
                  className="px-8 py-3 rounded-md font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl text-[#121212]"
                  style={{ backgroundColor: LIME }}
                >
                  צפה בתוכנית האימונים
                </button>
                <button
                  onClick={() => openAI('תן לי תוכנית מפורטת לאימון היום')}
                  className="border-2 text-white px-8 py-3 rounded-md font-black uppercase tracking-widest text-sm hover:text-[#121212] transition-all active:scale-95"
                  style={{ borderColor: LIME }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = LIME }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  שאל את AI
                </button>
              </div>
            </div>

            <div className="md:w-1/3 flex justify-center relative z-10">
              <div className="w-48 h-48 md:w-52 md:h-52 rounded-full flex flex-col items-center justify-center shadow-2xl relative border-2"
                style={{ backgroundColor: '#0f0f0f', borderColor: LIME }}>
                <span className="text-5xl font-black" style={{ color: LIME }}>{readinessScore}</span>
                <span className="text-xs font-black uppercase tracking-widest text-white/50 mt-1">ציון מוכנות</span>
                <span className="text-xs font-black mt-1" style={{ color: readinessColor }}>{readinessLabel}</span>
                <div className="absolute -top-2 -right-2 px-2 py-1 rounded-full font-black text-[10px] italic shadow-xl text-[#121212]"
                  style={{ backgroundColor: LIME }}>
                  KINETIC AI
                </div>
              </div>
            </div>

            <div className="absolute -left-10 -bottom-10 text-[8rem] md:text-[12rem] font-black select-none pointer-events-none italic text-white/5">
              POWER
            </div>
          </div>
        </div>

        {/* ⑥ Quick Stats — full width — DARK cards */}
        <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'favorite',   label: 'דופק מנוחה', value: `${d.restingHR || 62}`, unit: 'bpm',  color: '#FF6B6B' },
            { icon: 'bedtime',    label: 'שינה',        value: String(sleepHours),      unit: 'שעות', color: '#00b4d8' },
            { icon: 'water_drop', label: 'הידרציה',     value: water.toFixed(1),        unit: 'L',    color: '#00b4d8' },
            { icon: 'timer',      label: 'דקות פעיל',   value: `${d.activeMinutes || 0}`, unit: 'דק׳', color: LIME },
          ].map((m, i) => (
            <div
              key={i}
              className="bg-[#121212] p-5 rounded-xl space-y-2 shadow-[0_4px_40px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-[0_12px_60px_rgba(0,0,0,0.3)] transition-all duration-300"
            >
              <span
                className="material-symbols-outlined"
                style={{ color: m.color, fontVariationSettings: "'FILL' 1" }}
              >
                {m.icon}
              </span>
              <span className="block text-[10px] text-white/40 uppercase font-black tracking-widest">
                {m.label}
              </span>
              <span className="block font-black text-2xl text-white">
                {m.value}{' '}
                <span className="text-sm font-bold text-white/40">{m.unit}</span>
              </span>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}

/* ── Fallback data ── */
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
