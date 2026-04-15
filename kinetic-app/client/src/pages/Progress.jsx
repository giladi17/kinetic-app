import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProgress, addWeightLog } from '../api'
import { SkeletonCard, SkeletonText } from '../components/Skeleton'

const SEEN_BADGES_KEY = 'kinetic_seen_badges'

export default function Progress() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newBadgeToast, setNewBadgeToast] = useState(null)
  const [showModal, setShowModal] = useState(false)

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
    <main className="pt-24 pb-32 px-6 max-w-7xl mx-auto space-y-8 min-h-screen">
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

  const d = data || FALLBACK
  const logs = d.weightLogs || []
  const isPro = d.isPro !== false // treat missing as pro (fallback)
  const svgData = buildWeightPath(logs)
  const prs = d.personalRecords || []
  const weekly = d.weeklySummary || { sessions: 0, avgCalories: 0, weightDelta: 0 }

  const streakDots = Math.min(d.streak, 30)
  const badges = d.badgeProgress || []

  return (
    <main className="pt-24 pb-32 px-6 max-w-7xl mx-auto min-h-screen space-y-8">

      {/* Badge unlock toast */}
      {newBadgeToast && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-surface-container-high rounded-xl p-4 flex items-center gap-3 shadow-lg animate-fade-up border border-primary-fixed-dim/30">
          <span className="material-symbols-outlined text-2xl" style={{ color: newBadgeToast.color, fontVariationSettings: "'FILL' 1" }}>{newBadgeToast.icon}</span>
          <div className="flex-1">
            <p className="font-headline font-bold text-sm">Badge חדש: {newBadgeToast.name}!</p>
            <p className="font-label text-xs text-on-surface-variant">{newBadgeToast.desc}</p>
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

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="font-headline text-3xl font-black uppercase tracking-tight">Progress</h1>
          <p className="font-label text-sm text-on-surface-variant mt-0.5">מעקב התקדמות אישי</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#CCFF00] text-[#0e0e0e] font-headline font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          הוסף מדידה
        </button>
      </div>

      {/* ── Weekly Summary ── */}
      <section className="grid grid-cols-3 gap-4 animate-fade-up">
        <div className="bg-surface-container-low rounded-xl p-4 text-center">
          <span className="material-symbols-outlined text-2xl text-[#CCFF00] block mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
          <p className="font-headline text-2xl font-black">{weekly.sessions}</p>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wide">אימונים השבוע</p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-4 text-center">
          <span className="material-symbols-outlined text-2xl text-[#CCFF00] block mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          <p className="font-headline text-2xl font-black">{weekly.avgCalories || '—'}</p>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wide">קלוריות ממוצע</p>
        </div>
        <div className="bg-surface-container-low rounded-xl p-4 text-center">
          <span className="material-symbols-outlined text-2xl text-[#CCFF00] block mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>monitor_weight</span>
          <p className={`font-headline text-2xl font-black ${weekly.weightDelta < 0 ? 'text-[#CCFF00]' : weekly.weightDelta > 0 ? 'text-orange-400' : ''}`}>
            {weekly.weightDelta !== 0 ? `${weekly.weightDelta > 0 ? '+' : ''}${weekly.weightDelta}` : '—'}
          </p>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wide">שינוי משקל (7 ימים)</p>
        </div>
      </section>

      {/* ── Weight Chart ── */}
      <section className="bg-surface-container-low rounded-2xl p-6 animate-fade-up">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-headline text-xl font-bold uppercase tracking-tight">Weight Trends</h2>
            <p className="font-label text-sm text-on-surface-variant">
              {isPro ? `${logs.length} מדידות` : 'אחרונים 7 ימים — '}
              {!isPro && (
                <button onClick={() => navigate('/pricing')} className="text-[#CCFF00] font-bold underline underline-offset-2">שדרג ל-Pro לצפייה מלאה</button>
              )}
            </p>
          </div>
          <div className="text-right">
            <span className="block font-headline text-3xl font-black text-[#CCFF00]">
              {d.currentWeight}<span className="text-base font-label text-on-surface-variant ml-1">kg</span>
            </span>
            <span className={`font-label text-xs font-bold ${d.weightDelta <= 0 ? 'text-[#CCFF00]' : 'text-orange-400'}`}>
              {d.weightDelta > 0 ? '+' : ''}{d.weightDelta} kg סה"כ
            </span>
          </div>
        </div>

        {logs.length >= 2 ? (
          <WeightChart logs={logs} svgData={svgData} />
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-on-surface-variant gap-2">
            <span className="material-symbols-outlined text-4xl opacity-30">show_chart</span>
            <p className="font-label text-sm">הוסף לפחות 2 מדידות לצפייה בגרף</p>
          </div>
        )}
      </section>

      {/* ── Personal Records ── */}
      <section className="animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-xl font-bold uppercase tracking-tight">Personal Records</h2>
          <button
            onClick={() => navigate('/exercises')}
            className="flex items-center gap-1 text-[#CCFF00] font-label text-sm font-bold active:opacity-70"
          >
            כל ההיסטוריה
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>

        {prs.length > 0 ? (
          <div className="bg-surface-container-low rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="text-left font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-5 py-3">תרגיל</th>
                  <th className="text-center font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-3 py-3">משקל</th>
                  <th className="text-center font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-3 py-3">חזרות</th>
                  <th className="text-right font-label text-[10px] text-on-surface-variant uppercase tracking-widest px-5 py-3">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {prs.map((pr, i) => (
                  <tr key={i} className={`transition-colors hover:bg-surface-container ${i < prs.length - 1 ? 'border-b border-outline-variant/10' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-[#CCFF00]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                        <span className="font-label text-sm font-bold">{pr.exercise_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="font-headline text-base font-black text-[#CCFF00]">{pr.weight}</span>
                      <span className="font-label text-xs text-on-surface-variant ml-0.5">kg</span>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="font-label text-sm">{pr.reps} ×</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-label text-xs text-on-surface-variant">
                      {formatDate(pr.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-2xl p-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl opacity-30 block mb-2">emoji_events</span>
            <p className="font-label text-sm">עוד אין שיאים אישיים — התחל להתאמן!</p>
          </div>
        )}
      </section>

      {/* ── Streak ── */}
      <section className="animate-fade-up">
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6">
          <div className="absolute -right-8 -top-8 opacity-5 select-none pointer-events-none">
            <span className="text-[8rem] font-black italic font-headline">STREAK</span>
          </div>
          <div className="z-10 mb-4">
            <span className="font-label text-xs tracking-widest text-on-surface-variant uppercase mb-1 block">רצף נוכחי</span>
            <div className="flex items-baseline gap-2">
              <h2 className="font-headline text-6xl font-black text-[#CCFF00] leading-none">{d.streak}</h2>
              <span className="font-headline text-xl font-bold text-on-surface uppercase">ימים</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 z-10">
            {Array.from({ length: streakDots }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-[#CCFF00]/60" />
            ))}
            {Array.from({ length: Math.max(0, 30 - streakDots) }).map((_, i) => (
              <div key={`e${i}`} className="w-2 h-2 rounded-full bg-surface-container" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Achievements ── */}
      {badges.length > 0 && (
        <section className="animate-fade-up">
          <h2 className="font-headline text-xl font-bold uppercase tracking-tight mb-4">Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((badge, i) => (
              <div
                key={badge.id || i}
                className={`bg-surface-container-low p-5 rounded-xl flex flex-col gap-3 transition-colors ${badge.locked ? 'opacity-40 grayscale' : ''} ${badge.unlocked ? 'border border-[#CCFF00]/20' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${badge.color}18` }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: badge.locked ? '#767575' : badge.color, fontVariationSettings: "'FILL' 1" }}>
                      {badge.locked ? 'lock' : badge.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-headline text-sm font-bold leading-tight truncate">{badge.name}</h4>
                    <p className="font-label text-[9px] text-on-surface-variant">{badge.desc}</p>
                  </div>
                </div>
                {!badge.locked && (
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${badge.pct}%`, backgroundColor: badge.unlocked ? badge.color : `${badge.color}99` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-label text-[9px] text-on-surface-variant">{badge.current} / {badge.target}</span>
                      <span className="font-label text-[9px] font-bold" style={{ color: badge.unlocked ? badge.color : '#aaa' }}>
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

// ── Weight Chart Component ──────────────────────────────────────────────────
function WeightChart({ logs, svgData }) {
  const [tooltip, setTooltip] = useState(null)

  const weights = logs.map(l => l.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)

  return (
    <div className="relative select-none">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
        <span className="font-label text-[9px] text-on-surface-variant">{maxW}kg</span>
        <span className="font-label text-[9px] text-on-surface-variant">{((minW + maxW) / 2).toFixed(1)}kg</span>
        <span className="font-label text-[9px] text-on-surface-variant">{minW}kg</span>
      </div>

      {/* SVG Chart */}
      <div className="ml-8">
        <svg
          className="w-full"
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          style={{ height: '160px' }}
        >
          <defs>
            <linearGradient id="wGrad" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#CCFF00', stopOpacity: 0.25 }} />
              <stop offset="100%" style={{ stopColor: '#CCFF00', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[20, 50, 80].map(y => (
            <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}
          <path d={svgData.area} fill="url(#wGrad)" />
          <path d={svgData.line} fill="none" stroke="#CCFF00" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          {svgData.points.map((p, i) => (
            <g key={i} style={{ cursor: 'pointer' }} onClick={() => setTooltip(tooltip?.i === i ? null : { i, ...p, log: logs[i] })}>
              <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
              <circle
                cx={p.x} cy={p.y} r={tooltip?.i === i ? 5 : 3.5}
                fill={i === svgData.points.length - 1 ? '#CCFF00' : '#0e0e0e'}
                stroke="#CCFF00"
                strokeWidth="2"
                className="transition-all"
              />
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute bg-surface-container-highest border border-[#CCFF00]/30 rounded-lg px-3 py-2 pointer-events-none z-10 text-center shadow-lg"
            style={{
              left: `${(tooltip.x / 400) * 100}%`,
              top: `${(tooltip.y / 120) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <p className="font-headline font-black text-sm text-[#CCFF00]">{tooltip.log.weight} kg</p>
            {tooltip.log.body_fat && <p className="font-label text-[10px] text-on-surface-variant">{tooltip.log.body_fat}% שומן</p>}
            <p className="font-label text-[10px] text-on-surface-variant">{formatDate(tooltip.log.date)}</p>
            {tooltip.log.notes && <p className="font-label text-[10px] text-on-surface-variant/70 mt-0.5 max-w-[120px] truncate">{tooltip.log.notes}</p>}
          </div>
        )}

        {/* X-axis labels */}
        <div className="flex justify-between mt-3">
          {svgData.points.map((p, i) => (
            <span key={i} className="font-label text-[9px] text-on-surface-variant" style={{ minWidth: 0 }}>
              {formatDateShort(logs[i]?.date)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Add Measurement Modal ───────────────────────────────────────────────────
function AddMeasurementModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ weight: '', body_fat: '', notes: '', date: todayStr() })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a1a] rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-6 space-y-5 border border-white/10 shadow-2xl animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto md:hidden" />

        <div className="flex items-center justify-between">
          <h3 className="font-headline text-xl font-bold">הוסף מדידה</h3>
          <button onClick={onClose} className="text-on-surface-variant active:opacity-50">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && <p className="text-red-400 font-label text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

        {/* Date */}
        <div>
          <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest block mb-1.5">תאריך</label>
          <input
            type="date"
            value={form.date}
            max={todayStr()}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full bg-surface-container rounded-xl px-4 py-3 font-label text-sm border border-outline-variant/30 focus:outline-none focus:border-[#CCFF00]/50 text-on-surface"
          />
        </div>

        {/* Weight */}
        <div>
          <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest block mb-1.5">
            משקל <span className="text-[#CCFF00]">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="78.5"
              value={form.weight}
              onChange={e => { setForm(f => ({ ...f, weight: e.target.value })); setError('') }}
              className="w-full bg-surface-container rounded-xl px-4 py-3 font-headline font-bold text-lg border border-outline-variant/30 focus:outline-none focus:border-[#CCFF00]/50 text-on-surface pr-14"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label text-sm text-on-surface-variant">ק"ג</span>
          </div>
        </div>

        {/* Body Fat */}
        <div>
          <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest block mb-1.5">
            אחוז שומן <span className="text-on-surface-variant/50">(אופציונלי)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="1"
              max="60"
              placeholder="14.5"
              value={form.body_fat}
              onChange={e => setForm(f => ({ ...f, body_fat: e.target.value }))}
              className="w-full bg-surface-container rounded-xl px-4 py-3 font-label text-sm border border-outline-variant/30 focus:outline-none focus:border-[#CCFF00]/50 text-on-surface pr-8"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label text-sm text-on-surface-variant">%</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest block mb-1.5">
            הערות <span className="text-on-surface-variant/50">(אופציונלי)</span>
          </label>
          <textarea
            rows={2}
            placeholder="לאחר ארוחת בוקר, ישנתי טוב..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-surface-container rounded-xl px-4 py-3 font-label text-sm border border-outline-variant/30 focus:outline-none focus:border-[#CCFF00]/50 text-on-surface resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !form.weight}
          className="w-full bg-[#CCFF00] text-[#0e0e0e] font-headline font-bold text-base py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'שומר...' : 'שמור מדידה'}
        </button>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────
function buildWeightPath(logs) {
  if (logs.length < 2) return { line: '', area: '', points: [] }

  const weights = logs.map(l => l.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const points = logs.map((l, i) => ({
    x: Math.round((i / (logs.length - 1)) * 400),
    y: Math.round(100 - ((l.weight - minW) / range) * 80),
  }))

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${points[points.length - 1].x},120 L0,120 Z`

  return { line, area, points }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

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
