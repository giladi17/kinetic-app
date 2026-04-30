import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProgress, addWeightLog } from '../api'
import { SkeletonCard, SkeletonText } from '../components/Skeleton'
import progressHeroImg from '../assets/progress-hero.jpg'

const SEEN_BADGES_KEY = 'kinetic_seen_badges'

export default function Progress() {
  const navigate  = useNavigate()
  const [data, setData]                   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [newBadgeToast, setNewBadgeToast] = useState(null)
  const [showModal, setShowModal]         = useState(false)

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
    <main className="pt-24 pb-32 px-6 max-w-7xl mx-auto space-y-8 min-h-screen bg-[#FBFBFA]">
      <SkeletonCard className="h-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-28" />)}
      </div>
      <SkeletonCard className="h-72" />
      <div className="space-y-3">
        <SkeletonText width="w-32" />
        {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-14" />)}
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

  return (
    <main className="pb-32 min-h-screen space-y-8 bg-[#FBFBFA]">

      {/* Badge unlock toast */}
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

      {/* Add Measurement Modal */}
      {showModal && (
        <AddMeasurementModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setLoading(true); load() }}
        />
      )}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ height: '320px' }}>
        <img src={progressHeroImg} alt="progress" className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-[#121212]/85" />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 pb-10 pt-24 max-w-7xl mx-auto">
          <p className="text-[#CCFF00] text-[10px] font-black tracking-[0.4em] uppercase mb-3">PERFORMANCE TRACKER</p>
          <h1 className="text-7xl md:text-[9rem] font-black uppercase tracking-[-0.04em] leading-none text-white">Progress</h1>
          <p className="text-white/50 text-sm mt-2 uppercase tracking-widest font-bold">מעקב התקדמות אישי</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-6 max-w-7xl mx-auto space-y-8">

      {/* ── Add Measurement Button ── */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#CCFF00] text-black font-black text-sm px-5 py-3 rounded-xl shadow-[0_4px_24px_rgba(204,255,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(204,255,0,0.5)] active:scale-95 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          הוסף מדידה
        </button>
      </div>

      {/* ── Weekly Summary ── */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { icon: 'fitness_center',        label: 'אימונים השבוע',      value: weekly.sessions,                                                              color: '#CCFF00' },
          { icon: 'local_fire_department', label: 'קלוריות ממוצע',      value: weekly.avgCalories || '—',                                                    color: '#ff734a' },
          { icon: 'monitor_weight',        label: 'שינוי משקל (7 ימים)', value: weekly.weightDelta !== 0 ? `${weekly.weightDelta > 0 ? '+' : ''}${weekly.weightDelta}` : '—', color: weekly.weightDelta < 0 ? '#CCFF00' : weekly.weightDelta > 0 ? '#f97316' : '#666' },
        ].map((s, i) => (
          <div key={i} className="bg-[#121212] rounded-2xl p-5 shadow-2xl text-center hover:-translate-y-1 transition-all duration-300">
            <span className="material-symbols-outlined text-2xl block mb-2" style={{ color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            <p className="font-black text-2xl leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-white/40 text-[9px] uppercase tracking-widest mt-1.5 font-black">{s.label}</p>
          </div>
        ))}
      </section>

      {/* ── Weight Chart ── */}
      <section className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[#CCFF00] text-[10px] font-black tracking-[0.3em] uppercase mb-1">WEIGHT TRENDS</p>
            <h2 className="font-black text-xl uppercase tracking-tight text-[#121212]">מגמת משקל</h2>
            <p className="text-[#656464] text-sm mt-0.5">
              {isPro ? `${logs.length} מדידות` : 'אחרונים 7 ימים — '}
              {!isPro && (
                <button onClick={() => navigate('/pricing')} className="text-[#CCFF00] font-black underline underline-offset-2">שדרג ל-Pro לצפייה מלאה</button>
              )}
            </p>
          </div>
          <div className="text-right">
            <span className="block font-black text-4xl text-[#CCFF00] leading-none">
              {d.currentWeight}<span className="text-base text-[#656464] ml-1 font-bold">kg</span>
            </span>
            <span className={`text-xs font-black ${d.weightDelta <= 0 ? 'text-[#CCFF00]' : 'text-orange-400'}`}>
              {d.weightDelta > 0 ? '+' : ''}{d.weightDelta} kg סה"כ
            </span>
          </div>
        </div>
        {logs.length >= 2 ? (
          <WeightChart logs={logs} svgData={svgData} />
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-[#656464] gap-2">
            <span className="material-symbols-outlined text-4xl opacity-30">show_chart</span>
            <p className="text-sm">הוסף לפחות 2 מדידות לצפייה בגרף</p>
          </div>
        )}
      </section>

      {/* ── Personal Records ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[#CCFF00] text-[10px] font-black tracking-[0.3em] uppercase mb-1">PERSONAL RECORDS</p>
            <h2 className="font-black text-2xl uppercase tracking-tight text-[#121212]">שיאים אישיים</h2>
          </div>
          <button onClick={() => navigate('/exercises')} className="flex items-center gap-1 text-[#CCFF00] text-sm font-black active:opacity-70">
            כל ההיסטוריה
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
        {prs.length > 0 ? (
          <div className="bg-[#121212] rounded-2xl overflow-hidden shadow-2xl">
            {prs.map((pr, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-4 hover:bg-[#1a1a1a] transition-colors"
                style={i < prs.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm text-[#CCFF00]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                  <span className="text-white font-black text-sm">{pr.exercise_name}</span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <span className="font-black text-[#CCFF00] text-lg leading-none block">{pr.weight}</span>
                    <span className="text-white/30 text-[9px]">kg</span>
                  </div>
                  <span className="text-white/60 text-sm">{pr.reps} ×</span>
                  <span className="text-white/30 text-xs">{formatDate(pr.date)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#121212] rounded-2xl p-8 text-center shadow-xl">
            <span className="material-symbols-outlined text-4xl opacity-20 block mb-2 text-white">emoji_events</span>
            <p className="text-white/40 text-sm">עוד אין שיאים אישיים — התחל להתאמן!</p>
          </div>
        )}
      </section>

      {/* ── Streak ── */}
      <section>
        <div className="relative overflow-hidden bg-[#121212] rounded-2xl p-8 shadow-2xl">
          <div className="absolute -right-8 -top-8 opacity-5 select-none pointer-events-none">
            <span className="text-[9rem] font-black italic text-white">STREAK</span>
          </div>
          <div className="z-10 mb-5">
            <p className="text-white/30 text-[10px] uppercase tracking-widest font-black mb-2">רצף נוכחי</p>
            <div className="flex items-baseline gap-3">
              <h2 className="font-black text-8xl text-[#CCFF00] leading-none">{d.streak}</h2>
              <span className="font-black text-2xl text-white uppercase">ימים</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 z-10">
            {Array.from({ length: streakDots }).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#CCFF00]/70" />
            ))}
            {Array.from({ length: Math.max(0, 30 - streakDots) }).map((_, i) => (
              <div key={`e${i}`} className="w-2.5 h-2.5 rounded-full bg-white/10" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Achievements ── */}
      {badges.length > 0 && (
        <section>
          <div className="mb-5">
            <p className="text-[#CCFF00] text-[10px] font-black tracking-[0.3em] uppercase mb-1">ACHIEVEMENTS</p>
            <h2 className="font-black text-2xl uppercase tracking-tight text-[#121212]">הישגים</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((badge, i) => (
              <div
                key={badge.id || i}
                className={`bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3 ${badge.locked ? 'opacity-40 grayscale' : ''}`}
                style={badge.unlocked ? { boxShadow: '0 4px 20px rgba(204,255,0,0.12)' } : {}}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${badge.color}18` }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: badge.locked ? '#999' : badge.color, fontVariationSettings: "'FILL' 1" }}>
                      {badge.locked ? 'lock' : badge.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm leading-tight truncate text-[#121212]">{badge.name}</h4>
                    <p className="text-[#656464] text-[9px]">{badge.desc}</p>
                  </div>
                </div>
                {!badge.locked && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${badge.pct}%`, backgroundColor: badge.unlocked ? badge.color : `${badge.color}99` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#656464] text-[9px]">{badge.current} / {badge.target}</span>
                      <span className="text-[9px] font-black" style={{ color: badge.unlocked ? badge.color : '#aaa' }}>
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
      </div>{/* content wrapper */}
    </main>
  )
}

/* ── Weight Chart ── */
function WeightChart({ logs, svgData }) {
  const [tooltip, setTooltip] = useState(null)
  const weights = logs.map(l => l.weight)
  const minW    = Math.min(...weights)
  const maxW    = Math.max(...weights)

  return (
    <div className="relative select-none">
      <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
        <span className="text-[9px] text-[#656464]">{maxW}kg</span>
        <span className="text-[9px] text-[#656464]">{((minW + maxW) / 2).toFixed(1)}kg</span>
        <span className="text-[9px] text-[#656464]">{minW}kg</span>
      </div>
      <div className="ml-8">
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
            <g key={i} style={{ cursor: 'pointer' }} onClick={() => setTooltip(tooltip?.i === i ? null : { i, ...p, log: logs[i] })}>
              <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
              <circle cx={p.x} cy={p.y} r={tooltip?.i === i ? 5 : 3.5}
                fill={i === svgData.points.length - 1 ? '#CCFF00' : '#fff'}
                stroke="#CCFF00" strokeWidth="2" className="transition-all" />
            </g>
          ))}
        </svg>
        {tooltip && (
          <div
            className="absolute bg-[#121212] rounded-xl px-3 py-2 pointer-events-none z-10 text-center shadow-2xl"
            style={{ left: `${(tooltip.x / 400) * 100}%`, top: `${(tooltip.y / 120) * 100}%`, transform: 'translate(-50%, -130%)' }}
          >
            <p className="font-black text-sm text-[#CCFF00]">{tooltip.log.weight} kg</p>
            {tooltip.log.body_fat && <p className="text-white/40 text-[10px]">{tooltip.log.body_fat}% שומן</p>}
            <p className="text-white/40 text-[10px]">{formatDate(tooltip.log.date)}</p>
            {tooltip.log.notes && <p className="text-white/30 text-[10px] mt-0.5 max-w-[120px] truncate">{tooltip.log.notes}</p>}
          </div>
        )}
        <div className="flex justify-between mt-3">
          {svgData.points.map((p, i) => (
            <span key={i} className="text-[9px] text-[#656464]" style={{ minWidth: 0 }}>
              {formatDateShort(logs[i]?.date)}
            </span>
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
      await addWeightLog({
        weight: w,
        date: form.date,
        body_fat: form.body_fat ? parseFloat(form.body_fat) : undefined,
        notes: form.notes.trim() || undefined,
      })
      onSaved()
    } catch {
      setError('שגיאה בשמירה, נסה שוב')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#121212] rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-6 space-y-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto md:hidden" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#CCFF00] text-[9px] font-black tracking-[0.3em] uppercase mb-1">NEW ENTRY</p>
            <h3 className="font-black text-white text-xl">הוסף מדידה</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white active:opacity-50 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {error && <p className="text-red-400 font-bold text-sm bg-red-400/10 rounded-xl px-3 py-2">{error}</p>}
        <div>
          <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">תאריך</label>
          <input type="date" value={form.date} max={todayStr()}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:bg-white/10 transition-colors" />
        </div>
        <div>
          <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">
            משקל <span className="text-[#CCFF00]">*</span>
          </label>
          <div className="relative">
            <input type="number" step="0.1" min="20" max="300" placeholder="78.5" value={form.weight}
              onChange={e => { setForm(f => ({ ...f, weight: e.target.value })); setError('') }}
              className="w-full bg-white/5 rounded-xl px-4 py-3 font-black text-lg text-white outline-none focus:bg-white/10 transition-colors pr-14" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">ק"ג</span>
          </div>
        </div>
        <div>
          <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">
            אחוז שומן <span className="text-white/20">(אופציונלי)</span>
          </label>
          <div className="relative">
            <input type="number" step="0.1" min="1" max="60" placeholder="14.5" value={form.body_fat}
              onChange={e => setForm(f => ({ ...f, body_fat: e.target.value }))}
              className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:bg-white/10 transition-colors pr-8" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
          </div>
        </div>
        <div>
          <label className="text-white/40 text-xs uppercase tracking-widest block mb-1.5">
            הערות <span className="text-white/20">(אופציונלי)</span>
          </label>
          <textarea rows={2} placeholder="לאחר ארוחת בוקר, ישנתי טוב..." value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:bg-white/10 transition-colors resize-none" />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !form.weight}
          className="w-full bg-[#CCFF00] text-black font-black text-base py-4 rounded-xl shadow-[0_4px_24px_rgba(204,255,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(204,255,0,0.5)] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
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
  const minW    = Math.min(...weights)
  const maxW    = Math.max(...weights)
  const range   = maxW - minW || 1
  const points  = logs.map((l, i) => ({
    x: Math.round((i / (logs.length - 1)) * 400),
    y: Math.round(100 - ((l.weight - minW) / range) * 80),
  }))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${points[points.length - 1].x},120 L0,120 Z`
  return { line, area, points }
}
function todayStr() { return new Date().toISOString().split('T')[0] }
function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatDateShort(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

const FALLBACK = {
  streak: 0, currentWeight: 0, bodyFat: 0, weightDelta: 0,
  totalSessions: 0, totalVolume: 0, weightLogs: [],
  personalRecords: [], isPro: true,
  weeklySummary: { sessions: 0, avgCalories: 0, weightDelta: 0 },
  badgeProgress: [], timeline: [],
}
