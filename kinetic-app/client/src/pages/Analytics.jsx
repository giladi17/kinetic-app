import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { premiumFetch } from '../api'
import { SkeletonCard, SkeletonText } from '../components/Skeleton'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

const TYPE_COLORS = { STRENGTH: '#CCFF00', HIIT: '#FF6B35', CARDIO: '#00D4FF', FLEXIBILITY: '#A855F7', OTHER: '#666666' }
const TYPE_LABELS = { STRENGTH: 'כוח', HIIT: 'HIIT', CARDIO: 'קרדיו', FLEXIBILITY: 'גמישות', YOGA: 'יוגה', OTHER: 'אחר' }
const DNA_LABELS = { STRENGTH: 'אתה Strength-First Athlete', HIIT: 'אתה HIIT Warrior', CARDIO: 'אתה Endurance Runner', YOGA: 'אתה Mind-Body Expert', OTHER: 'אתה Well-Rounded Athlete' }

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
        cr ? cr.json() : null, pr ? pr.json() : null, mr ? mr.json() : null, dr ? dr.json() : null,
      ])
      if (c) setCompound(c)
      if (p) setPlateaus(p)
      if (m) { setMovingAvg(m); const exNames = Object.keys(m.exercises || {}); if (exNames.length > 0) setSelectedExercise(exNames[0]) }
      if (d) setDna(d)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function askAI(message) { window.dispatchEvent(new CustomEvent('kinetic:ai-open', { detail: { message } })) }

  if (loading) return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-8 min-h-screen bg-[#F8F9FF]">
      <div className="pt-4 space-y-2"><SkeletonText width="w-24" /><SkeletonText width="w-40" /></div>
      <SkeletonCard className="h-48" /><SkeletonCard className="h-32" /><SkeletonCard className="h-40" />
      <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <SkeletonCard key={i} className="h-24" />)}</div>
    </main>
  )

  const exList = Object.keys(movingAvg?.exercises || {})
  const maData = movingAvg?.exercises?.[selectedExercise] || []

  return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-10 min-h-screen bg-[#F8F9FF] text-[#151C25]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Header */}
      <div className="pt-4 space-y-1 border-b-2 border-[#CCFF00] pb-8">
        <span className="text-[#506600] text-[10px] tracking-[0.25em] font-black uppercase block">PERFORMANCE DATA</span>
        <h1 className="text-[#151C25] font-black text-6xl md:text-8xl tracking-tighter leading-none">אנליטיקה</h1>
        <p className="text-[#656464] text-lg mt-3">ניתוח נתונים בזמן אמת לביצועים טובים יותר</p>
      </div>

      {/* DNA */}
      {dna && <WorkoutDna dna={dna} navigate={navigate} />}

      {/* Compound Volume */}
      <section className="bg-white border-2 border-black/10 overflow-hidden border-r-4 border-r-[#CCFF00]">
        <div className="px-6 pt-6 pb-0">
          <span className="text-[#506600] text-[10px] tracking-[0.25em] font-black uppercase block mb-1">TOTAL VOLUME</span>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[#151C25] font-black text-5xl tracking-tighter leading-none">
                {(compound?.totalLifted || 0).toLocaleString()}
                <span className="text-[#656464] text-xl font-normal ml-2">kg</span>
              </h2>
              <p className="text-[#656464] text-xs mt-1">סה"כ הורם אי פעם</p>
            </div>
            <div className="bg-[#EEF4FF] border border-[#CCFF00]/50 px-4 py-3 text-center shrink-0">
              <span className="text-[#656464] text-[9px] uppercase tracking-widest block">תחזית חודשית</span>
              <span className="text-[#506600] font-black text-xl">~{(compound?.projectedMonthly || 0).toLocaleString()}kg</span>
            </div>
          </div>
        </div>
        <div className="px-6 pt-5 pb-2">
          {compound?.cumulativeVolume?.length >= 2 ? (
            <div className="space-y-1">
              <span className="text-[#656464] text-[9px] uppercase tracking-widest">נפח מצטבר לאורך זמן</span>
              <CumulativeGraph data={compound.cumulativeVolume} />
            </div>
          ) : <EmptyGraph label="השלם אימונים כדי לראות את הגרף" />}
        </div>
        {compound?.projection && (
          <div className="px-6 pb-5 space-y-2">
            <span className="text-[#656464] text-[9px] uppercase tracking-widest">בקצב הנוכחי עד סוף השנה:</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '3 חודשים', val: compound.projection.months3 },
                { label: '6 חודשים', val: compound.projection.months6 },
                { label: '12 חודשים', val: compound.projection.months12 },
              ].map(({ label, val }) => (
                <div key={label} className="bg-[#F8F9FF] border border-black/10 p-3 text-center">
                  <span className="text-[#656464] text-[9px] block">{label}</span>
                  <span className="text-[#506600] font-black text-sm">+{((val || 0) - (compound.totalLifted || 0)).toLocaleString()}kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {compound?.milestone && compound.milestone.daysLeft <= 60 && (
          <div className="mx-6 mb-5 flex items-center gap-3 bg-[#EEF4FF] border border-[#CCFF00]/40 px-4 py-3">
            <span className="material-symbols-outlined text-[#506600] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
            <p className="text-[#151C25] text-sm flex-1">עוד <span className="font-black text-[#506600]">{compound.milestone.daysLeft} ימים</span> תגיע ל-{compound.milestone.name}</p>
          </div>
        )}
        <div className="mx-6 mb-6 border-r-2 border-[#CCFF00] pr-4 py-1">
          <p className="text-[#656464] text-xs italic">"ריבית דריבית היא הפלא השמיני של העולם"</p>
          <span className="text-[#656464]/60 text-[9px] mt-1 block">— Albert Einstein</span>
        </div>
      </section>

      {/* Plateau Detection */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <span className="text-[#506600] text-[10px] tracking-[0.25em] font-black uppercase block">PLATEAU DETECTION</span>
          <h2 className="text-[#151C25] font-black text-3xl tracking-tighter uppercase">זיהוי תקיעות</h2>
        </div>
        {(!plateaus?.plateaus?.length) ? (
          <div className="bg-white border-2 border-black/10 p-5 flex items-center gap-3 border-r-4 border-r-[#CCFF00]">
            <span className="material-symbols-outlined text-2xl text-[#506600]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <div>
              <p className="text-[#151C25] font-black text-base">אתה מתקדם בכל התרגילים</p>
              <p className="text-[#656464] text-xs">המשך כך — אין תקיעות שזוהו</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">{(plateaus?.plateaus || []).map((p, i) => <PlateauCard key={i} plateau={p} onAsk={askAI} />)}</div>
        )}
      </section>

      {/* Moving Average */}
      <section className="bg-white border-2 border-black/10 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[#506600] text-[10px] tracking-[0.25em] font-black uppercase block mb-1">MOVING AVERAGE</span>
            <h2 className="text-[#151C25] font-black text-2xl tracking-tighter uppercase leading-none">ממוצעים נעים — MA3</h2>
          </div>
          {exList.length > 0 && (
            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}
              className="bg-[#F8F9FF] border-2 border-black/10 px-3 py-2 text-[#151C25] text-xs outline-none focus:border-[#CCFF00] max-w-[140px] shrink-0">
              {exList.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          )}
        </div>
        {maData.length >= 2 ? (
          <>
            <MovingAvgGraph data={maData} />
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-[#656464] inline-block"></span>
                <span className="text-[#656464]">משקל בפועל</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-[#CCFF00] inline-block"></span>
                <span className="text-[#506600] font-black">MA3</span>
              </div>
            </div>
          </>
        ) : <EmptyGraph label={exList.length === 0 ? "עדיין אין מספיק נתוני אימון" : "דרושים לפחות 2 אימונים לגרף"} />}
      </section>

      {/* Stats Grid */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <span className="text-[#506600] text-[10px] tracking-[0.25em] font-black uppercase block">BY THE NUMBERS</span>
          <h2 className="text-[#151C25] font-black text-3xl tracking-tighter uppercase leading-none">סטטיסטיקות</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="emoji_events" label="תרגיל מוביל" value={compound?.generalStats?.topExercise?.name || '—'} sub={compound?.generalStats?.topExercise ? `${compound.generalStats.topExercise.volume.toLocaleString()}kg נפח` : 'אין נתונים'} accent />
          <StatCard icon="speed" label="ממוצע RPE שבועי" value={compound?.generalStats?.avgRpeThisWeek ?? '—'} sub="7 ימים אחרונים" />
          <StatCard icon="fitness_center" label="סטים השבוע" value={compound?.generalStats?.setsThisWeek ?? 0} sub={`שבוע שעבר: ${compound?.generalStats?.setsPrevWeek ?? 0}`} accent={(compound?.generalStats?.setsThisWeek ?? 0) > (compound?.generalStats?.setsPrevWeek ?? 0)} />
          <StatCard icon="trending_up" label="שבועות פעילים" value={compound?.weeklyVolume?.length ?? 0} sub="עם נתוני נפח" />
        </div>
      </section>

      {/* Quick Links */}
      <div className="space-y-3">
        <button onClick={() => navigate('/war-room')} className="w-full bg-white border-2 border-black/10 p-5 flex items-center justify-between active:scale-[0.98] duration-200 hover:bg-[#CCFF00] transition-all group">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#506600] group-hover:text-black transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            <div className="text-right">
              <span className="text-[#151C25] font-black text-sm block">War Room השבועי</span>
              <span className="text-[#656464] group-hover:text-black/60 text-[10px] transition-colors">ניתוח שבועי מלא עם ציון</span>
            </div>
          </div>
          <span className="text-[#506600] group-hover:text-black text-xs flex items-center gap-1 font-black transition-colors">כנס <span className="material-symbols-outlined text-base">arrow_forward</span></span>
        </button>
        <button onClick={() => navigate('/exercises')} className="w-full bg-white border-2 border-black/10 p-5 flex items-center justify-between active:scale-[0.98] duration-200 hover:bg-[#EEF4FF] transition-all">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#506600]">history</span>
            <span className="text-[#151C25] font-black text-sm">היסטוריית תרגילים</span>
          </div>
          <span className="text-[#656464] text-xs flex items-center gap-1">צפה בכל התרגילים <span className="material-symbols-outlined text-base">arrow_forward</span></span>
        </button>
      </div>
    </main>
  )
}

function PlateauCard({ plateau, onAsk }) {
  return (
    <div className="bg-white border-2 border-black/10 p-5 border-r-4 border-r-[#CCFF00] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[#151C25] font-black text-base tracking-tight">{plateau.exercise}</h3>
          <div className="flex gap-3 mt-1">
            <span className="text-[#656464] text-xs">{plateau.currentWeight}kg נוכחי</span>
            <span className="text-[#506600] text-xs font-black">{plateau.sessionsStuck} אימונים תקוע</span>
          </div>
        </div>
        <span className="material-symbols-outlined text-[#CCFF00] text-2xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[#656464] text-sm flex-1">{plateau.suggestion}</span>
        <button onClick={() => onAsk(`אני תקוע ב-${plateau.exercise} על ${plateau.currentWeight}kg כבר ${plateau.sessionsStuck} אימונים. מה לעשות?`)}
          className="flex items-center gap-1.5 bg-[#EEF4FF] border border-[#CCFF00]/50 text-[#506600] px-3 py-2 text-xs font-black active:scale-95 duration-200 hover:bg-[#CCFF00] hover:text-black transition-all shrink-0">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          שאל את ה-AI
        </button>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className={`bg-white border-2 p-5 ${accent ? 'border-[#CCFF00] border-r-4 border-r-[#CCFF00]' : 'border-black/10'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined text-base ${accent ? 'text-[#506600]' : 'text-[#656464]'}`}>{icon}</span>
        <span className="text-[#656464] text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <span className={`font-black text-3xl tracking-tighter block ${accent ? 'text-[#506600]' : 'text-[#151C25]'}`}>{value}</span>
      <span className="text-[#656464] text-[10px] mt-1 block">{sub}</span>
    </div>
  )
}

function EmptyGraph({ label }) {
  return (
    <div className="w-full h-20 bg-[#EEF4FF] border border-black/10 flex items-center justify-center">
      <span className="text-[#656464] text-xs">{label}</span>
    </div>
  )
}

function CumulativeGraph({ data }) {
  const W = 300, H = 70
  const values = data.map(d => d.total)
  const minV = Math.min(...values), maxV = Math.max(...values)
  const range = maxV - minV || 1
  const pts = data.map((d, i) => ({ x: (i / (data.length - 1)) * W, y: H - ((d.total - minV) / range) * (H - 12) - 6 }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 70 }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CCFF00" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#CCFF00" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#cg)" />
      <path d={linePath} fill="none" stroke="#CCFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="3.5" fill="#506600" />
    </svg>
  )
}

function WorkoutDna({ dna, navigate }) {
  const { dominantType, sessionCount, typeBreakdown, pushPullBalance, weaknesses, strengths, recommendations } = dna
  return (
    <section className="bg-white border-2 border-black/10 overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b-4 border-[#CCFF00]">
        <span className="text-[#506600] text-[10px] tracking-[0.25em] font-black uppercase block mb-1">WORKOUT DNA</span>
        <h2 className="font-black text-2xl tracking-tighter text-[#151C25]">{DNA_LABELS[dominantType] || dominantType}</h2>
        <p className="text-[#656464] text-xs mt-1">מבוסס על {sessionCount} אימונים</p>
      </div>
      {Object.keys(typeBreakdown || {}).length > 0 && (
        <div className="px-6 py-4 flex items-center gap-5">
          <DonutChart breakdown={typeBreakdown} />
          <div className="flex-1 space-y-2">
            {Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]).map(([type, pct]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="w-2 h-2 shrink-0" style={{ backgroundColor: TYPE_COLORS[type] || '#666' }} />
                <span className="text-[#656464] text-xs flex-1">{TYPE_LABELS[type] || type}</span>
                <span className="font-black text-xs" style={{ color: TYPE_COLORS[type] || '#aaa' }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {pushPullBalance && (
        <div className="px-6 py-4 space-y-2 border-t border-black/10">
          <div className="flex items-center justify-between">
            <span className="text-[#656464] text-[10px] uppercase tracking-widest">איזון Push / Pull</span>
            {!pushPullBalance.balanced && <span className="text-orange-500 text-[9px] font-black uppercase flex items-center gap-1"><span className="material-symbols-outlined text-xs">warning</span>חוסר איזון</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#656464] text-[10px] w-8 text-right">Push</span>
            <div className="flex-1 h-3 bg-[#EEF4FF] overflow-hidden flex">
              <div className="h-full transition-all duration-700" style={{ width: `${pushPullBalance.push + pushPullBalance.pull > 0 ? (pushPullBalance.push / (pushPullBalance.push + pushPullBalance.pull)) * 100 : 50}%`, backgroundColor: '#CCFF00' }} />
              <div className="h-full flex-1" style={{ backgroundColor: '#00D4FF' }} />
            </div>
            <span className="text-[#656464] text-[10px] w-8">Pull</span>
          </div>
          <div className="flex justify-between">
            <span className="font-black text-sm text-[#506600]">{pushPullBalance.push} Push</span>
            <span className="font-black text-sm" style={{ color: '#00D4FF' }}>{pushPullBalance.pull} Pull</span>
          </div>
        </div>
      )}
      {((strengths?.length > 0) || (weaknesses?.length > 0)) && (
        <div className="px-6 py-4 grid grid-cols-2 gap-4 border-t border-black/10">
          {strengths?.length > 0 && (
            <div className="space-y-2">
              <span className="text-[#656464] text-[9px] uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-[#506600]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>חוזקות
              </span>
              <div className="flex flex-wrap gap-1.5">
                {strengths.map((s, i) => <span key={i} className="text-[10px] px-2 py-1 font-black bg-[#EEF4FF] text-[#506600] border border-[#CCFF00]/40">{s}</span>)}
              </div>
            </div>
          )}
          {weaknesses?.length > 0 && (
            <div className="space-y-2">
              <span className="text-[#656464] text-[9px] uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-orange-500" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>לשיפור
              </span>
              <div className="flex flex-wrap gap-1.5">
                {weaknesses.map((w, i) => <span key={i} className="text-[10px] px-2 py-1 font-black bg-orange-50 text-orange-600 border border-orange-200">{w}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
      {recommendations?.length > 0 && (
        <div className="px-6 py-4 space-y-2 border-t border-black/10">
          <span className="text-[#506600] text-[10px] uppercase tracking-[0.25em] font-black">המלצות אימון</span>
          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec, i) => (
              <div key={i} className="bg-[#F8F9FF] border border-black/10 p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[#151C25] font-black text-sm truncate">{rec.title}</p>
                  <p className="text-[#656464] text-xs mt-0.5">{rec.desc}</p>
                </div>
                {rec.workoutId && (
                  <button onClick={() => navigate('/plans')} className="shrink-0 px-3 py-1.5 font-black text-xs bg-[#CCFF00] text-black hover:bg-black hover:text-[#CCFF00] transition-all active:scale-95 duration-200">לתוכנית</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function DonutChart({ breakdown }) {
  const SIZE = 80, CX = 40, CY = 40, R = 30
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1])
  let cumAngle = -Math.PI / 2
  const arcs = entries.map(([type, pct]) => {
    const angle = (pct / 100) * 2 * Math.PI
    const x1 = CX + R * Math.cos(cumAngle), y1 = CY + R * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = CX + R * Math.cos(cumAngle), y2 = CY + R * Math.sin(cumAngle)
    return { type, pct, d: `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z` }
  })
  const dominant = entries[0]?.[0]
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
      {arcs.map(arc => <path key={arc.type} d={arc.d} fill={TYPE_COLORS[arc.type] || '#666'} opacity={arc.type === dominant ? 1 : 0.5} />)}
      <circle cx={CX} cy={CY} r={R - 10} fill="white" />
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="8" fill="#151C25" fontWeight="bold" fontFamily="sans-serif">{TYPE_LABELS[dominant] || dominant}</text>
      <text x={CX} y={CY + 8} textAnchor="middle" fontSize="7" fill="#656464" fontFamily="sans-serif">{entries[0]?.[1]}%</text>
    </svg>
  )
}

function MovingAvgGraph({ data }) {
  const W = 300, H = 100
  const allWeights = data.flatMap(d => [d.weight, d.ma3]).filter(Boolean)
  const minW = Math.min(...allWeights), maxW = Math.max(...allWeights)
  const range = maxW - minW || 1
  const toX = i => data.length > 1 ? (i / (data.length - 1)) * W : W / 2
  const toY = val => H - ((val - minW) / range) * (H - 16) - 8
  const actualPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.weight).toFixed(1)}`).join(' ')
  const maPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.ma3).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
      <path d={actualPath} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" />
      {data.map((d, i) => <circle key={i} cx={toX(i)} cy={toY(d.weight)} r="2.5" fill="rgba(0,0,0,0.3)" />)}
      <path d={maPath} fill="none" stroke="#CCFF00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
