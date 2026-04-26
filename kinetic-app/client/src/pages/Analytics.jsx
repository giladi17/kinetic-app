import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { premiumFetch } from '../api'
import { SkeletonCard, SkeletonText } from '../components/Skeleton'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

const TYPE_COLORS = {
  STRENGTH: '#CCFF00',
  HIIT: '#FF6B35',
  CARDIO: '#00D4FF',
  FLEXIBILITY: '#A855F7',
  OTHER: '#666666',
}

const TYPE_LABELS = {
  STRENGTH: 'כוח',
  HIIT: 'HIIT',
  CARDIO: 'קרדיו',
  FLEXIBILITY: 'גמישות',
  YOGA: 'יוגה',
  OTHER: 'אחר',
}

const DNA_LABELS = {
  STRENGTH: 'אתה Strength-First Athlete',
  HIIT: 'אתה HIIT Warrior',
  CARDIO: 'אתה Endurance Runner',
  YOGA: 'אתה Mind-Body Expert',
  OTHER: 'אתה Well-Rounded Athlete',
}

export default function Analytics() {
  const navigate = useNavigate()
  const [compound, setCompound] = useState(null)
  const [plateaus, setPlateaus] = useState(null)
  const [movingAvg, setMovingAvg] = useState(null)
  const [dna, setDna] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState('')

  useEffect(() => {
    Promise.all([
      premiumFetch(`${API}/analytics/compound`),
      premiumFetch(`${API}/analytics/plateaus`),
      premiumFetch(`${API}/analytics/moving-average`),
      premiumFetch(`${API}/analytics/workout-dna`),
    ]).then(async ([cr, pr, mr, dr]) => {
      const [c, p, m, d] = await Promise.all([
        cr ? cr.json() : null,
        pr ? pr.json() : null,
        mr ? mr.json() : null,
        dr ? dr.json() : null,
      ])
      if (c) setCompound(c)
      if (p) setPlateaus(p)
      if (m) {
        setMovingAvg(m)
        const exNames = Object.keys(m.exercises || {})
        if (exNames.length > 0) setSelectedExercise(exNames[0])
      }
      if (d) setDna(d)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function askAI(message) {
    window.dispatchEvent(new CustomEvent('kinetic:ai-open', { detail: { message } }))
  }

  if (loading) return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-8 min-h-screen">
      <div className="pt-4 space-y-2">
        <SkeletonText width="w-24" />
        <SkeletonText width="w-40" />
      </div>
      <SkeletonCard className="h-48" />
      <SkeletonCard className="h-32" />
      <SkeletonCard className="h-40" />
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <SkeletonCard key={i} className="h-24" />)}
      </div>
    </main>
  )

  const exList = Object.keys(movingAvg?.exercises || {})
  const maData = movingAvg?.exercises?.[selectedExercise] || []

  return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-8 min-h-screen">

      {/* Header */}
      <div className="pt-4 space-y-1 animate-fade-up">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold">PORTFOLIO</span>
        <h1 className="font-headline text-4xl font-bold tracking-tight uppercase">אנליטיקה</h1>
      </div>

      {/* ── 0. DNA של האימון ── */}
      {dna && <WorkoutDna dna={dna} navigate={navigate} />}

      {/* ── 1. ריבית דריבית ── */}
      <section className="bg-surface-container-low rounded-xl p-6 space-y-4 animate-fade-up-delay-1">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase block">ריבית דריבית</span>
            <h2 className="font-headline text-3xl font-bold text-primary-container">
              {(compound?.totalLifted || 0).toLocaleString()}
              <span className="text-lg text-on-surface-variant font-normal ml-1">kg</span>
            </h2>
            <p className="font-body text-xs text-on-surface-variant mt-1">סה"כ הורם אי פעם</p>
          </div>
          <div className="bg-primary-container/10 rounded-xl px-4 py-3 text-center">
            <span className="font-label text-[9px] text-on-surface-variant uppercase block">תחזית חודשית</span>
            <span className="font-headline font-bold text-lg text-primary-fixed-dim">
              ~{(compound?.projectedMonthly || 0).toLocaleString()}kg
            </span>
          </div>
        </div>

        {/* Cumulative volume graph */}
        {compound?.cumulativeVolume?.length >= 2 ? (
          <div className="space-y-1">
            <span className="font-label text-[9px] text-on-surface-variant uppercase">נפח מצטבר לאורך זמן</span>
            <CumulativeGraph data={compound.cumulativeVolume} />
          </div>
        ) : (
          <EmptyGraph label="השלם אימונים כדי לראות את הגרף" />
        )}

        {/* Projection cards */}
        {compound?.projection && (
          <div className="space-y-2">
            <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">בקצב הנוכחי עד סוף השנה:</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '3 חודשים', val: compound.projection.months3 },
                { label: '6 חודשים', val: compound.projection.months6 },
                { label: '12 חודשים', val: compound.projection.months12 },
              ].map(({ label, val }) => (
                <div key={label} className="bg-surface-container rounded-xl p-3 text-center">
                  <span className="font-label text-[9px] text-on-surface-variant block">{label}</span>
                  <span className="font-headline font-bold text-sm text-primary-fixed-dim">+{((val || 0) - (compound.totalLifted || 0)).toLocaleString()}kg</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestone banner */}
        {compound?.milestone && compound.milestone.daysLeft <= 60 && (
          <div className="flex items-center gap-3 bg-primary-container/10 rounded-xl px-4 py-3 border border-primary-fixed-dim/20">
            <span className="material-symbols-outlined text-primary-fixed-dim text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
            <p className="font-body text-sm flex-1">
              עוד <span className="font-bold text-primary-fixed-dim">{compound.milestone.daysLeft} ימים</span> תגיע ל-{compound.milestone.name}
            </p>
          </div>
        )}

        {/* Einstein quote */}
        <div className="border-r-2 border-primary-fixed-dim pr-4 py-1">
          <p className="font-body text-xs text-on-surface-variant italic">"ריבית דריבית היא הפלא השמיני של העולם"</p>
          <span className="font-label text-[9px] text-on-surface-variant/60 mt-1 block">— Albert Einstein</span>
        </div>
      </section>

      {/* ── 2. זיהוי תקיעות ── */}
      <section className="space-y-3 animate-fade-up-delay-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary-dim text-lg">warning</span>
          <h2 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">זיהוי תקיעות</h2>
        </div>

        {(!plateaus?.plateaus?.length) ? (
          <div className="bg-surface-container-low rounded-xl p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <div>
              <p className="font-headline font-bold text-base">אתה מתקדם בכל התרגילים</p>
              <p className="font-body text-xs text-on-surface-variant">המשך כך — אין תקיעות שזוהו</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(plateaus?.plateaus || []).map((p, i) => (
              <PlateauCard key={i} plateau={p} onAsk={askAI} />
            ))}
          </div>
        )}
      </section>

      {/* ── 3. ממוצעים נעים ── */}
      <section className="bg-surface-container-low rounded-xl p-6 space-y-4 animate-fade-up-delay-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase block">ממוצעים נעים</span>
            <h2 className="font-headline font-bold text-lg">Moving Average — MA3</h2>
          </div>
          {exList.length > 0 && (
            <select
              value={selectedExercise}
              onChange={e => setSelectedExercise(e.target.value)}
              className="bg-surface-container-highest rounded-lg px-3 py-2 font-label text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary-container max-w-[140px]"
            >
              {exList.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          )}
        </div>

        {maData.length >= 2 ? (
          <>
            <MovingAvgGraph data={maData} />
            <div className="flex items-center gap-4 text-xs font-label">
              <div className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-white/40 inline-block"></span>
                <span className="text-on-surface-variant">משקל בפועל</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-[#CCFF00] inline-block"></span>
                <span className="text-primary-fixed-dim">MA3</span>
              </div>
            </div>
          </>
        ) : (
          <EmptyGraph label={exList.length === 0 ? "עדיין אין מספיק נתוני אימון" : "דרושים לפחות 2 אימונים לגרף"} />
        )}
      </section>

      {/* ── 4. סטטיסטיקות כלליות ── */}
      <section className="space-y-3">
        <span className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase">סטטיסטיקות כלליות</span>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon="emoji_events"
            label="תרגיל מוביל"
            value={compound?.generalStats?.topExercise?.name || '—'}
            sub={compound?.generalStats?.topExercise ? `${compound.generalStats.topExercise.volume.toLocaleString()}kg נפח` : 'אין נתונים'}
            accent
          />
          <StatCard
            icon="speed"
            label="ממוצע RPE שבועי"
            value={compound?.generalStats?.avgRpeThisWeek ?? '—'}
            sub="7 ימים אחרונים"
          />
          <StatCard
            icon="fitness_center"
            label="סטים השבוע"
            value={compound?.generalStats?.setsThisWeek ?? 0}
            sub={`שבוע שעבר: ${compound?.generalStats?.setsPrevWeek ?? 0}`}
            accent={
              (compound?.generalStats?.setsThisWeek ?? 0) > (compound?.generalStats?.setsPrevWeek ?? 0)
            }
          />
          <StatCard
            icon="trending_up"
            label="שבועות פעילים"
            value={compound?.weeklyVolume?.length ?? 0}
            sub="עם נתוני נפח"
          />
        </div>
      </section>

      {/* War Room link */}
      <button
        onClick={() => navigate('/war-room')}
        className="w-full bg-surface-container-low rounded-xl p-4 flex items-center justify-between active:scale-[0.98] duration-200 border border-primary-fixed-dim/20"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
          <div>
            <span className="font-headline font-bold text-sm block">War Room השבועי</span>
            <span className="font-label text-[10px] text-on-surface-variant">ניתוח שבועי מלא עם ציון</span>
          </div>
        </div>
        <span className="font-label text-xs text-primary-fixed-dim flex items-center gap-1 font-bold">
          כנס <span className="material-symbols-outlined text-base">arrow_forward</span>
        </span>
      </button>

      {/* Exercise History Link */}
      <button
        onClick={() => navigate('/exercises')}
        className="w-full bg-surface-container-low rounded-xl p-4 flex items-center justify-between active:scale-[0.98] duration-200"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed-dim">history</span>
          <span className="font-headline font-bold text-sm">היסטוריית תרגילים</span>
        </div>
        <span className="font-label text-xs text-on-surface-variant flex items-center gap-1">
          צפה בכל התרגילים <span className="material-symbols-outlined text-base">arrow_forward</span>
        </span>
      </button>

    </main>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PlateauCard({ plateau, onAsk }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-5 border-l-4 border-[#ffa500] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-headline font-bold text-base">{plateau.exercise}</h3>
          <div className="flex gap-3 mt-1">
            <span className="font-label text-xs text-on-surface-variant">{plateau.currentWeight}kg נוכחי</span>
            <span className="font-label text-xs text-[#ffa500] font-bold">{plateau.sessionsStuck} אימונים תקוע</span>
          </div>
        </div>
        <span className="material-symbols-outlined text-[#ffa500] text-2xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          warning
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-on-surface-variant">{plateau.suggestion}</span>
        <button
          onClick={() => onAsk(`אני תקוע ב-${plateau.exercise} על ${plateau.currentWeight}kg כבר ${plateau.sessionsStuck} אימונים. מה לעשות?`)}
          className="flex items-center gap-1.5 bg-surface-container-highest px-3 py-2 rounded-lg font-label text-xs font-bold active:scale-95 duration-200 hover:text-primary-fixed-dim shrink-0"
        >
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          שאל את ה-AI
        </button>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined text-base ${accent ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>
          {icon}
        </span>
        <span className="font-label text-[10px] text-on-surface-variant uppercase">{label}</span>
      </div>
      <span className={`font-headline font-bold text-2xl block ${accent ? 'text-primary-fixed-dim' : ''}`}>{value}</span>
      <span className="font-label text-[10px] text-on-surface-variant mt-0.5 block">{sub}</span>
    </div>
  )
}

function EmptyGraph({ label }) {
  return (
    <div className="w-full h-20 rounded-lg bg-surface-container flex items-center justify-center">
      <span className="font-label text-xs text-on-surface-variant">{label}</span>
    </div>
  )
}

function CumulativeGraph({ data }) {
  const W = 300, H = 70
  const values = data.map(d => d.total)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((d.total - minV) / range) * (H - 12) - 6,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 70 }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CCFF00" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#CCFF00" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#cg)" />
      <path d={linePath} fill="none" stroke="#CCFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="3.5" fill="#CCFF00" />
    </svg>
  )
}

function WorkoutDna({ dna, navigate }) {
  const { dominantType, sessionCount, typeBreakdown, pushPullBalance, weaknesses, strengths, recommendations } = dna

  return (
    <section className="bg-surface-container-low rounded-xl overflow-hidden animate-fade-up space-y-0">
      {/* Identity header */}
      <div className="p-6 pb-4" style={{ background: `linear-gradient(135deg, ${TYPE_COLORS[dominantType] || '#CCFF00'}18 0%, transparent 70%)` }}>
        <span className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase block mb-1">ה-DNA של האימון שלך</span>
        <h2 className="font-headline font-bold text-2xl" style={{ color: TYPE_COLORS[dominantType] || '#CCFF00' }}>
          {DNA_LABELS[dominantType] || dominantType}
        </h2>
        <p className="font-body text-xs text-on-surface-variant mt-1">מבוסס על {sessionCount} אימונים</p>
      </div>

      {/* Donut + breakdown */}
      {Object.keys(typeBreakdown || {}).length > 0 && (
        <div className="px-6 pb-4 flex items-center gap-5">
          <DonutChart breakdown={typeBreakdown} />
          <div className="flex-1 space-y-2">
            {Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]).map(([type, pct]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[type] || '#666' }} />
                <span className="font-label text-xs text-on-surface-variant flex-1">{TYPE_LABELS[type] || type}</span>
                <span className="font-headline font-bold text-xs" style={{ color: TYPE_COLORS[type] || '#aaa' }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-outline-variant/10 mx-6" />

      {/* Push/Pull balance */}
      {pushPullBalance && (
        <div className="px-6 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">איזון Push / Pull</span>
            {!pushPullBalance.balanced && (
              <span className="font-label text-[9px] text-[#FF6B35] font-bold uppercase flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">warning</span>חוסר איזון
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label text-[10px] text-on-surface-variant w-8 text-right">Push</span>
            <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden flex">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pushPullBalance.push + pushPullBalance.pull > 0 ? (pushPullBalance.push / (pushPullBalance.push + pushPullBalance.pull)) * 100 : 50}%`, backgroundColor: '#CCFF00' }}
              />
              <div className="h-full flex-1 rounded-full" style={{ backgroundColor: '#00D4FF' }} />
            </div>
            <span className="font-label text-[10px] text-on-surface-variant w-8">Pull</span>
          </div>
          <div className="flex justify-between">
            <span className="font-headline font-bold text-sm" style={{ color: '#CCFF00' }}>{pushPullBalance.push} תרגילי Push</span>
            <span className="font-headline font-bold text-sm" style={{ color: '#00D4FF' }}>{pushPullBalance.pull} תרגילי Pull</span>
          </div>
        </div>
      )}

      <div className="border-t border-outline-variant/10 mx-6" />

      {/* Strengths + Weaknesses */}
      {((strengths?.length > 0) || (weaknesses?.length > 0)) && (
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          {strengths?.length > 0 && (
            <div className="space-y-2">
              <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-[#CCFF00]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>חוזקות
              </span>
              <div className="flex flex-wrap gap-1.5">
                {strengths.map((s, i) => (
                  <span key={i} className="font-label text-[10px] px-2 py-1 rounded-full font-bold" style={{ backgroundColor: '#CCFF0020', color: '#CCFF00', border: '1px solid #CCFF0040' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {weaknesses?.length > 0 && (
            <div className="space-y-2">
              <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-[#FF6B35]" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>לשיפור
              </span>
              <div className="flex flex-wrap gap-1.5">
                {weaknesses.map((w, i) => (
                  <span key={i} className="font-label text-[10px] px-2 py-1 rounded-full font-bold" style={{ backgroundColor: '#FF6B3520', color: '#FF6B35', border: '1px solid #FF6B3540' }}>
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <>
          <div className="border-t border-outline-variant/10 mx-6" />
          <div className="px-6 py-4 space-y-2">
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">המלצות אימון</span>
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="bg-surface-container rounded-xl p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-sm truncate">{rec.title}</p>
                    <p className="font-body text-xs text-on-surface-variant mt-0.5">{rec.desc}</p>
                  </div>
                  {rec.workoutId && (
                    <button
                      onClick={() => navigate('/plans')}
                      className="shrink-0 px-3 py-1.5 rounded-lg font-headline font-bold text-xs active:scale-95 duration-200"
                      style={{ backgroundColor: '#CCFF00', color: '#0e0e0e' }}
                    >
                      לתוכנית
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function DonutChart({ breakdown }) {
  const SIZE = 80, CX = 40, CY = 40, R = 30, STROKE = 10
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const circ = 2 * Math.PI * R

  let cumAngle = -Math.PI / 2
  const arcs = entries.map(([type, pct]) => {
    const angle = (pct / 100) * 2 * Math.PI
    const x1 = CX + R * Math.cos(cumAngle)
    const y1 = CY + R * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = CX + R * Math.cos(cumAngle)
    const y2 = CY + R * Math.sin(cumAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    return {
      type,
      pct,
      d: `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
    }
  })

  const dominant = entries[0]?.[0]

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
      {arcs.map(arc => (
        <path key={arc.type} d={arc.d} fill={TYPE_COLORS[arc.type] || '#666'} opacity={arc.type === dominant ? 1 : 0.6} />
      ))}
      {/* Center hole */}
      <circle cx={CX} cy={CY} r={R - STROKE} fill="#1e1e1e" />
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="sans-serif">
        {TYPE_LABELS[dominant] || dominant}
      </text>
      <text x={CX} y={CY + 8} textAnchor="middle" fontSize="7" fill="#aaa" fontFamily="sans-serif">
        {entries[0]?.[1]}%
      </text>
    </svg>
  )
}

function MovingAvgGraph({ data }) {
  const W = 300, H = 100
  const allWeights = data.flatMap(d => [d.weight, d.ma3]).filter(Boolean)
  const minW = Math.min(...allWeights)
  const maxW = Math.max(...allWeights)
  const range = maxW - minW || 1

  const toX = i => data.length > 1 ? (i / (data.length - 1)) * W : W / 2
  const toY = val => H - ((val - minW) / range) * (H - 16) - 8

  const actualPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.weight).toFixed(1)}`).join(' ')
  const maPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.ma3).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
      {/* Actual weight — dashed dim line */}
      <path d={actualPath} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" />
      {/* Actual dots */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.weight)} r="2.5" fill="rgba(255,255,255,0.45)" />
      ))}
      {/* MA3 line — lime */}
      <path d={maPath} fill="none" stroke="#CCFF00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
