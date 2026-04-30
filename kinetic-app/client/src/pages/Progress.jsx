import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProgress, addWeightLog } from '../api'
import { SkeletonCard, SkeletonText } from '../components/Skeleton'
import progressHeroImg from '../assets/progress-hero.jpg'

const LIME = '#CCFF00'
const SEEN_BADGES_KEY = 'kinetic_seen_badges'

export default function Progress() {
  const navigate = useNavigate()
  const [data,          setData]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [newBadgeToast, setNewBadgeToast] = useState(null)
  const [showModal,     setShowModal]     = useState(false)

  const load = () => {
    fetchProgress()
      .then(d => {
        setData(d)
        if (d?.badgeProgress) {
          const seen = JSON.parse(localStorage.getItem(SEEN_BADGES_KEY) || '{}')
          for (const badge of d.badgeProgress) {
            if (badge.unlocked && !seen[badge.id]) {
              seen[badge.id] = true
              setNewBadgeToast(badge)
              setTimeout(() => setNewBadgeToast(null), 4000)
              break
            }
          }
          localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(seen))
        }
      })
      .catch(() => setData(FALLBACK))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <main className="pt-32 pb-20 px-6 md:px-16 max-w-7xl mx-auto min-h-screen bg-[#F8F9FF]">
      <div className="flex gap-12 mb-24">
        <SkeletonCard className="flex-1 h-64" />
        <SkeletonCard className="flex-1 h-64" />
      </div>
      <div className="grid grid-cols-12 gap-8 mb-24">
        <SkeletonCard className="col-span-4 h-80" />
        <SkeletonCard className="col-span-8 h-80" />
      </div>
      <div className="grid grid-cols-3 gap-8">
        {[1,2,3].map(i => <SkeletonCard key={i} className="h-36" />)}
      </div>
    </main>
  )

  const d          = data || FALLBACK
  const logs       = d.weightLogs || []
  const isPro      = d.isPro !== false
  const svgData    = buildWeightPath(logs)
  const prs        = d.personalRecords || []
  const weekly     = d.weeklySummary || { sessions: 0, avgCalories: 0, weightDelta: 0 }
  const streakDots = Math.min(d.streak, 30)
  const badges     = d.badgeProgress || []
  const weekScore  = Math.min(100, Math.round((weekly.sessions / 5) * 100)) || 82
  const weeklyBars = d.weeklyActivity?.length > 0 ? d.weeklyActivity : [
    { pct: 80 }, { pct: 55 }, { pct: 90 }, { pct: 45 }, { pct: 100 }, { pct: 30 }, { pct: 60 }
  ]
  const maxBar = Math.max(...weeklyBars.map(b => b.pct || 0), 1)
  const dayLabels = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']

  function openModal() { setShowModal(true) }

  return (
    <main className="pb-20 min-h-screen bg-[#F8F9FF]" dir="rtl"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── Badge toast ── */}
      {newBadgeToast && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-[#121212] rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
          <span className="material-symbols-outlined text-2xl" style={{ color: newBadgeToast.color, fontVariationSettings: "'FILL' 1" }}>{newBadgeToast.icon}</span>
          <div className="flex-1">
            <p className="font-black text-white text-sm">Badge חדש: {newBadgeToast.name}!</p>
            <p className="text-white/40 text-xs">{newBadgeToast.desc}</p>
          </div>
          <span className="text-lg">🎉</span>
        </div>
      )}

      {showModal && (
        <AddMeasurementModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setLoading(true); load() }}
        />
      )}

      {/* ══════════════════════════════════════
          HERO — Asymmetric two-column (screen.png)
          Text right · Photo left · No overlay
      ══════════════════════════════════════ */}
      <section className="pt-32 pb-24 px-6 md:px-16 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row-reverse items-center gap-12">

          {/* Text block — right column */}
          <div className="w-full md:w-1/2 text-right">
            <span className="text-[10px] uppercase tracking-[0.4em] font-black block mb-4"
              style={{ color: '#656464' }}>PERFORMANCE DATA</span>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-8 text-[#151C25]">
              הגבולות שלך<br />נמצאים מאחוריך
            </h1>
            <p className="text-lg text-[#656464] max-w-md mr-auto leading-relaxed mb-8">
              ניתוח נתונים בזמן אמת המבוסס על ביצועי העבר שלך כדי להבטיח עתיד חזק יותר.
            </p>
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 font-black text-sm px-6 py-3 rounded-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-[0_4px_24px_rgba(204,255,0,0.35)] hover:shadow-[0_8px_32px_rgba(204,255,0,0.5)] text-[#151C25]"
              style={{ backgroundColor: LIME }}
            >
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              הוסף מדידה
            </button>
          </div>

          {/* Photo — left column (floats, no overlay) */}
          <div className="w-full md:w-1/2 relative">
            <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full opacity-20" style={{ backgroundColor: LIME }} />
            <img
              src={progressHeroImg}
              alt="athlete"
              className="rounded-xl shadow-2xl relative z-10 w-full object-cover"
              style={{ aspectRatio: '4/3' }}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          MAIN DASHBOARD — Circle + Bar chart
      ══════════════════════════════════════ */}
      <section className="px-6 md:px-16 max-w-7xl mx-auto mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Weekly Progress Circle — 4 cols */}
          <div className="lg:col-span-4 bg-white rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-[0_4px_40px_rgba(21,28,37,0.05)]">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#656464] font-black mb-8 block">
              מדד התקדמות שבועי
            </span>
            <div className="relative w-56 h-56 mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 224 224">
                <circle cx="112" cy="112" r="96" fill="transparent"
                  stroke="#EEF4FF" strokeWidth="12" />
                <circle cx="112" cy="112" r="96" fill="transparent"
                  stroke={LIME} strokeWidth="12"
                  strokeDasharray={`${(weekScore / 100) * 2 * Math.PI * 96} ${2 * Math.PI * 96}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.34,1.56,0.64,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-[#151C25] tracking-tighter">{weekScore}%</span>
                <span className="text-xs font-black tracking-widest uppercase mt-1" style={{ color: '#506600' }}>Excellent</span>
              </div>
            </div>
            <p className="text-[#656464] font-medium text-sm">
              {weekly.sessions > 0 ? `${weekly.sessions} אימונים השבוע` : 'עליה של 4% משבוע שעבר'}
            </p>
          </div>

          {/* Bar Chart — 8 cols */}
          <div className="lg:col-span-8 bg-[#EEF4FF] rounded-xl p-10">
            <div className="flex justify-between items-end mb-12">
              <div className="text-right">
                <h3 className="text-2xl font-black text-[#151C25]">נפח אימונים</h3>
                <p className="text-[#656464] text-sm mt-1">ממוצע שבועי של קילוגרמים מורמים</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: LIME }} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#151C25]">נוכחי</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#DCE3F0]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#656464]">ממוצע</span>
                </div>
              </div>
            </div>

            <div className="flex flex-row-reverse items-end justify-between gap-4 px-2" style={{ height: '200px' }}>
              {weeklyBars.map((bar, i) => {
                const h = Math.max(8, Math.round((bar.pct / maxBar) * 180))
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-full relative rounded-t-lg" style={{ height: '180px', backgroundColor: '#DCE3F0' }}>
                      <div
                        className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700 hover:brightness-110"
                        style={{ height: `${h}px`, backgroundColor: LIME }}
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase text-[#656464]">{dayLabels[i]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          METRICS GRID — 3 cards with lime border
      ══════════════════════════════════════ */}
      <section className="px-6 md:px-16 max-w-7xl mx-auto mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              label: 'Body Fat %',
              value: d.bodyFat ? `${d.bodyFat}%` : (prs[0] ? `${d.bodyFat || 14.2}%` : '14.2%'),
              trend: '-0.8% החודש', icon: 'trending_down', border: LIME,
            },
            {
              label: 'Lean Muscle Mass',
              value: d.currentWeight ? `${d.currentWeight}kg` : '72.4kg',
              trend: '+1.2kg החודש', icon: 'trending_up', border: '#506600',
            },
            {
              label: 'Strength PRs',
              value: prs[0] ? `${prs[0].weight}kg` : '140kg',
              trend: prs[0]?.exercise_name || 'Deadlift Peak', icon: 'star', border: LIME,
            },
          ].map((m, i) => (
            <div key={i} className="bg-[#EEF4FF] p-8 rounded-xl" style={{ borderRight: `8px solid ${m.border}` }}>
              <span className="text-[10px] uppercase tracking-widest text-[#656464] font-black block mb-2">{m.label}</span>
              <div className="text-5xl font-black text-[#151C25] tracking-tighter">{m.value}</div>
              <div className="flex items-center gap-2 mt-4 font-black" style={{ color: '#506600' }}>
                <span className="material-symbols-outlined text-lg">{m.icon}</span>
                <span className="text-sm">{m.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          WEIGHT CHART
      ══════════════════════════════════════ */}
      {logs.length >= 2 && (
        <section className="px-6 md:px-16 max-w-7xl mx-auto mb-24">
          <div className="bg-white rounded-xl p-8 shadow-[0_4px_40px_rgba(21,28,37,0.05)]">
            <div className="flex justify-between items-start mb-6">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#656464] font-black block mb-1">WEIGHT TRENDS</span>
                <h2 className="font-black text-2xl tracking-tighter text-[#151C25]">מגמת משקל</h2>
                <p className="text-[#656464] text-sm mt-0.5">
                  {isPro ? `${logs.length} מדידות` : (
                    <>אחרונים 7 ימים — <button onClick={() => navigate('/pricing')} className="font-black underline underline-offset-2" style={{ color: LIME }}>שדרג ל-Pro</button></>
                  )}
                </p>
              </div>
              <div className="text-left">
                <span className="block font-black text-4xl leading-none" style={{ color: LIME }}>
                  {d.currentWeight}<span className="text-base text-[#656464] mr-1 font-bold">kg</span>
                </span>
                <span className={`text-xs font-black ${d.weightDelta <= 0 ? '' : 'text-orange-400'}`}
                  style={d.weightDelta <= 0 ? { color: LIME } : {}}>
                  {d.weightDelta > 0 ? '+' : ''}{d.weightDelta} kg סה"כ
                </span>
              </div>
            </div>
            <WeightChart logs={logs} svgData={svgData} />
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          MILESTONES TIMELINE (from screen.png)
      ══════════════════════════════════════ */}
      <section className="px-6 md:px-16 max-w-7xl mx-auto mb-24">
        <div className="bg-[#EEF4FF] p-12 rounded-xl text-right">
          <h2 className="text-4xl font-black text-[#151C25] mb-12 tracking-tighter">ציוני דרך</h2>
          <div className="relative">
            <div className="absolute top-4 right-0 w-full h-1 bg-[#DCE3F0]" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
              {[
                { month: 'אוגוסט',            label: 'תחילת התוכנית',    done: true,    active: false },
                { month: 'ספטמבר',            label: 'שבירת שיא סקוואט', done: true,    active: false },
                { month: 'אוקטובר (היום)',    label: 'יעד ירידה בשומן',  done: false,   active: true  },
                { month: 'נובמבר',            label: 'מרתון 10 ק"מ',     done: false,   active: false },
              ].map((m, i) => (
                <div key={i} className={`flex flex-col items-end md:items-center text-center ${!m.done && !m.active ? 'opacity-40' : ''}`}>
                  <div className="w-8 h-8 rounded-full mb-4 border-4 border-[#F8F9FF]"
                    style={{ backgroundColor: m.active ? LIME : m.done ? '#506600' : '#DCE3F0' }} />
                  <div className={`bg-white p-4 rounded-xl shadow-sm w-full ${m.active ? 'ring-2' : ''}`}
                    style={m.active ? { '--tw-ring-color': LIME, boxShadow: `0 0 0 2px ${LIME}` } : {}}>
                    <span className="text-[10px] font-black uppercase text-[#656464] block"
                      style={m.active ? { color: '#506600' } : {}}>{m.month}</span>
                    <h4 className="font-black text-base text-[#151C25] mt-1">{m.label}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PERSONAL RECORDS
      ══════════════════════════════════════ */}
      {prs.length > 0 && (
        <section className="px-6 md:px-16 max-w-7xl mx-auto mb-24">
          <div className="flex items-center justify-between mb-8 text-right">
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#656464] font-black block mb-1">PERSONAL RECORDS</span>
              <h2 className="font-black text-3xl tracking-tighter text-[#151C25]">שיאים אישיים</h2>
            </div>
            <button onClick={() => navigate('/exercises')}
              className="flex items-center gap-1 text-sm font-black" style={{ color: LIME }}>
              כל ההיסטוריה
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>
          </div>
          <div className="bg-white rounded-xl overflow-hidden shadow-[0_4px_40px_rgba(21,28,37,0.05)]">
            {prs.map((pr, i) => (
              <div key={i}
                className="flex items-center justify-between px-8 py-5 hover:bg-[#F8F9FF] transition-colors"
                style={i < prs.length - 1 ? { backgroundColor: i % 2 === 0 ? '#fff' : '#fafbff' } : {}}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm" style={{ color: LIME, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                  <span className="text-[#151C25] font-black text-sm">{pr.exercise_name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <span className="font-black text-xl leading-none block" style={{ color: LIME }}>{pr.weight}</span>
                    <span className="text-[#656464] text-[9px]">kg</span>
                  </div>
                  <span className="text-[#656464] text-sm">{pr.reps} ×</span>
                  <span className="text-[#656464] text-xs">{formatDate(pr.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          STREAK — kept dramatic dark as accent
      ══════════════════════════════════════ */}
      <section className="px-6 md:px-16 max-w-7xl mx-auto mb-24">
        <div className="relative overflow-hidden bg-[#151C25] rounded-xl p-12">
          <div className="absolute -right-8 -top-8 opacity-5 select-none pointer-events-none">
            <span className="text-[9rem] font-black italic text-white">STREAK</span>
          </div>
          <div className="mb-6">
            <p className="text-white/30 text-[10px] uppercase tracking-widest font-black mb-2">רצף נוכחי</p>
            <div className="flex items-baseline gap-3">
              <h2 className="font-black text-8xl leading-none" style={{ color: LIME }}>{d.streak}</h2>
              <span className="font-black text-2xl text-white uppercase">ימים</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: streakDots }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `${LIME}b0` }} />
            ))}
            {Array.from({ length: Math.max(0, 30 - streakDots) }).map((_, i) => (
              <div key={`e${i}`} className="w-2.5 h-2.5 rounded-full bg-white/10" />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          ACHIEVEMENTS
      ══════════════════════════════════════ */}
      {badges.length > 0 && (
        <section className="px-6 md:px-16 max-w-7xl mx-auto mb-8">
          <div className="mb-8 text-right">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#656464] font-black block mb-1">ACHIEVEMENTS</span>
            <h2 className="font-black text-3xl tracking-tighter text-[#151C25]">הישגים</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {badges.map((badge, i) => (
              <div key={badge.id || i}
                className={`bg-white rounded-xl p-5 shadow-[0_4px_40px_rgba(21,28,37,0.05)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-3 ${badge.locked ? 'opacity-40 grayscale' : ''}`}
                style={badge.unlocked ? { boxShadow: `0 4px 20px rgba(204,255,0,0.12)` } : {}}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${badge.color}18` }}>
                    <span className="material-symbols-outlined text-2xl"
                      style={{ color: badge.locked ? '#ccc' : badge.color, fontVariationSettings: "'FILL' 1" }}>
                      {badge.locked ? 'lock' : badge.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm leading-tight truncate text-[#151C25]">{badge.name}</h4>
                    <p className="text-[#656464] text-[9px]">{badge.desc}</p>
                  </div>
                </div>
                {!badge.locked && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-[#EEF4FF] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${badge.pct}%`, backgroundColor: badge.unlocked ? badge.color : `${badge.color}99` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#656464] text-[9px]">{badge.current} / {badge.target}</span>
                      <span className="text-[9px] font-black"
                        style={{ color: badge.unlocked ? badge.color : '#aaa' }}>
                        {badge.unlocked ? '✓ הושג' : `${badge.pct}%`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

/* ── Weight Chart ── */
function WeightChart({ logs, svgData }) {
  const [tooltip, setTooltip] = useState(null)
  const weights = logs.map(l => l.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)

  return (
    <div className="relative select-none">
      <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
        <span className="text-[9px] text-[#656464]">{maxW}kg</span>
        <span className="text-[9px] text-[#656464]">{((minW + maxW) / 2).toFixed(1)}kg</span>
        <span className="text-[9px] text-[#656464]">{minW}kg</span>
      </div>
      <div className="mr-8">
        <svg className="w-full" viewBox="0 0 400 120" preserveAspectRatio="none" style={{ height: '160px' }}>
          <defs>
            <linearGradient id="wGrad" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%"   style={{ stopColor: '#CCFF00', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#CCFF00', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={svgData.area} fill="url(#wGrad)" />
          <path d={svgData.line} fill="none" stroke="#CCFF00" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          {svgData.points.map((p, i) => (
            <g key={i} style={{ cursor: 'pointer' }}
              onClick={() => setTooltip(tooltip?.i === i ? null : { i, ...p, log: logs[i] })}>
              <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
              <circle cx={p.x} cy={p.y} r={tooltip?.i === i ? 5 : 3.5}
                fill={i === svgData.points.length - 1 ? '#CCFF00' : '#fff'}
                stroke="#CCFF00" strokeWidth="2" className="transition-all" />
            </g>
          ))}
        </svg>
        {tooltip && (
          <div className="absolute bg-[#151C25] rounded-xl px-3 py-2 pointer-events-none z-10 text-center shadow-2xl"
            style={{ left: `${(tooltip.x / 400) * 100}%`, top: `${(tooltip.y / 120) * 100}%`, transform: 'translate(-50%, -130%)' }}>
            <p className="font-black text-sm" style={{ color: '#CCFF00' }}>{tooltip.log.weight} kg</p>
            {tooltip.log.body_fat && <p className="text-white/60 text-[10px]">{tooltip.log.body_fat}% שומן</p>}
            <p className="text-white/40 text-[10px]">{formatDate(tooltip.log.date)}</p>
          </div>
        )}
        <div className="flex justify-between mt-3">
          {svgData.points.map((p, i) => (
            <span key={i} className="text-[9px] text-[#656464]">{formatDateShort(logs[i]?.date)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Add Measurement Modal ── */
function AddMeasurementModal({ onClose, onSaved }) {
  const [form,   setForm]   = useState({ weight: '', body_fat: '', notes: '', date: todayStr() })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSave = async () => {
    const w = parseFloat(form.weight)
    if (!w || w < 20 || w > 300) { setError('הכנס משקל תקין (20–300 ק"ג)'); return }
    setSaving(true)
    try {
      await addWeightLog({ weight: w, date: form.date, body_fat: form.body_fat ? parseFloat(form.body_fat) : undefined, notes: form.notes.trim() || undefined })
      onSaved()
    } catch { setError('שגיאה בשמירה, נסה שוב') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#151C25] rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-6 space-y-5 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto md:hidden" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: '#CCFF00' }}>NEW ENTRY</p>
            <h3 className="font-black text-white text-xl">הוסף מדידה</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {error && <p className="text-red-400 font-bold text-sm bg-red-400/10 rounded-xl px-3 py-2">{error}</p>}
        {[
          { label: 'תאריך', type: 'date', key: 'date', extra: { max: todayStr() } },
          { label: 'משקל', type: 'number', key: 'weight', placeholder: '78.5', unit: 'ק"ג', required: true },
          { label: 'אחוז שומן', type: 'number', key: 'body_fat', placeholder: '14.5', unit: '%' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">
              {f.label} {f.required && <span style={{ color: '#CCFF00' }}>*</span>}
            </label>
            <div className="relative">
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]} {...(f.extra || {})}
                onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); if (f.required) setError('') }}
                className="w-full bg-white/5 rounded-xl px-4 py-3 text-white outline-none focus:bg-white/10 transition-colors"
                style={f.required ? { fontSize: '1.125rem', fontWeight: 900 } : { fontSize: '0.875rem' }} />
              {f.unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">{f.unit}</span>}
            </div>
          </div>
        ))}
        <div>
          <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">הערות</label>
          <textarea rows={2} placeholder="לאחר ארוחת בוקר..." value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:bg-white/10 transition-colors resize-none" />
        </div>
        <button onClick={handleSave} disabled={saving || !form.weight}
          className="w-full font-black text-base py-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-black"
          style={{ backgroundColor: '#CCFF00', boxShadow: '0 4px_24px_rgba(204,255,0,0.35)' }}>
          {saving ? 'שומר...' : 'שמור מדידה'}
        </button>
      </div>
    </div>
  )
}

/* ── Helpers ── */
function buildWeightPath(logs) {
  if (logs.length < 2) return { line: '', area: '', points: [] }
  const weights = logs.map(l => l.weight)
  const minW = Math.min(...weights), maxW = Math.max(...weights), range = maxW - minW || 1
  const points = logs.map((l, i) => ({ x: Math.round((i / (logs.length - 1)) * 400), y: Math.round(100 - ((l.weight - minW) / range) * 80) }))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  return { line, area: `${line} L${points[points.length-1].x},120 L0,120 Z`, points }
}
function todayStr() { return new Date().toISOString().split('T')[0] }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '' }
function formatDateShort(d) { return d ? new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : '' }

const FALLBACK = {
  streak: 0, currentWeight: 0, bodyFat: 0, weightDelta: 0,
  totalSessions: 0, totalVolume: 0, weightLogs: [],
  personalRecords: [], isPro: true,
  weeklySummary: { sessions: 0, avgCalories: 0, weightDelta: 0 },
  badgeProgress: [], weeklyActivity: [],
}
