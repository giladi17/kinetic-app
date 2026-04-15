import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { premiumFetch } from '../api'
import { useUser } from '../context/UserContext'
import { getPersona } from '../data/personas'
import { SkeletonCard, SkeletonText } from '../components/Skeleton'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`
const GOALS_KEY = 'kinetic_warroom_goals'

export default function WarRoom() {
    const navigate = useNavigate()
    const { user } = useUser()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [checkedGoals, setCheckedGoals] = useState(() => {
          try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '{}') }
          catch { return {} }
    })
    const persona = getPersona(user?.gender, user?.aiPersona)

  useEffect(() => {
        premiumFetch(`${API}/analytics/war-room`)
          .then(r => r ? r.json() : null)
          .then(d => {
                    // Only store data if it's a valid war-room object with a week property
                        if (d && !d.error && d.week) setData(d)
          })
          .catch(() => {})
          .finally(() => setLoading(false))
  }, [])

  function toggleGoal(i) {
        setCheckedGoals(prev => {
                const next = { ...prev, [i]: !prev[i] }
                localStorage.setItem(GOALS_KEY, JSON.stringify(next))
                return next
        })
  }

  function askAI() {
        if (!data) return
        const msg = `${persona.name}, תנתח את השבוע שלי: ${data.week.workouts} אימונים, ${data.week.avgCalories} קאל ממוצע, streak ${data.week.streak}`
        window.dispatchEvent(new CustomEvent('kinetic:ai-open', { detail: { message: msg } }))
  }

  if (loading) return (
        <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-6 min-h-screen">
              <SkeletonText width="w-48" />
              <SkeletonCard className="h-40" />
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <SkeletonCard key={i} className="h-24" />)}
              </div>
              <SkeletonCard className="h-32" />
        </main>
      )
    
      if (!data) return (
            <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto min-h-screen flex items-center justify-center">
                  <div className="text-center space-y-3">
                          <span className="material-symbols-outlined text-5xl text-on-surface-variant">analytics</span>
                          <p className="font-headline font-bold text-lg">עדיין אין נתוני שבוע</p>
                          <p className="font-body text-sm text-on-surface-variant">השלם אימון ראשון כדי להפעיל את ה-War Room</p>
                  </div>
            </main>
          )
        
          const { week, vsLastWeek, insights, goals, score } = data
            
              return (
                    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-6 min-h-screen">
                      {/* Header */}
                          <div className="animate-fade-up">
                                  <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-on-surface-variant font-label text-xs mb-4 active:opacity-70">
                                            <span className="material-symbols-outlined text-base">arrow_back</span> חזור
                                  </button>
                                  <span className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase block">דוח שבועי</span>
                                  <h1 className="font-headline text-4xl font-bold tracking-tight uppercase">WAR ROOM</h1>
                                  <span className="font-label text-xs text-on-surface-variant">{week.weekLabel}</span>
                          </div>
                    
                      {/* Score ring */}
                          <section className="bg-surface-container-low rounded-xl p-6 flex items-center gap-6 animate-fade-up-delay-1">
                                  <ScoreRing score={score} />
                                  <div className="flex-1">
                                            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">ציון שבועי</p>
                                            <p className="font-headline font-bold text-3xl">
                                                        <span style={{ color: score >= 75 ? '#CCFF00' : score >= 50 ? '#FFB700' : '#FF4D4D' }}>{score}</span>
                                                        <span className="text-on-surface-variant text-lg font-normal">/100</span>
                                            </p>
                                            <p className="font-body text-sm text-on-surface-variant mt-1">
                                              {score >= 75 ? 'שבוע מצוין — המשך כך!' : score >= 50 ? 'שבוע סביר — יש מקום לשיפור' : 'שבוע חלש — בוא נחזק את הבא'}
                                            </p>
                                  </div>
                          </section>
                    
                      {/* Stats grid */}
                          <div className="grid grid-cols-2 gap-3 animate-fade-up-delay-2">
                                  <StatBox icon="fitness_center" label="אימונים השבוע" value={week.workouts ?? 0} unit="אימונים" delta={vsLastWeek?.workouts} />
                                  <StatBox icon="weight" label="נפח כולל" value={(week.totalVolume ?? 0).toLocaleString()} unit="kg" delta={vsLastWeek?.volume} isPercent />
                                  <StatBox icon="local_fire_department" label="קלוריות ממוצע" value={week.avgCalories ?? 0} unit="kcal/יום" delta={null} />
                                  <StatBox icon="egg" label="חלבון ממוצע" value={week.avgProtein ?? 0} unit="g/יום" delta={null} />
                          </div>
                    
                      {/* Best workout */}
                      {week.bestWorkout && (
                              <div className="bg-surface-container-low rounded-xl px-5 py-4 flex items-center gap-3 animate-fade-up-delay-2">
                                        <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                                        <div>
                                                    <span className="font-label text-[9px] text-on-surface-variant uppercase block">האימון הטוב של השבוע</span>
                                                    <span className="font-headline font-bold text-sm">{week.bestWorkout}</span>
                                        </div>
                              </div>
                          )}
                    
                      {/* TOM/JANE Insights */}
                          <section className="space-y-3 animate-fade-up-delay-3">
                                  <div className="flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full shrink-0 overflow-hidden" style={{ border: `2px solid ${persona.color}` }}
                                                          dangerouslySetInnerHTML={{ __html: persona.avatar }} />
                                            <div>
                                                        <span className="font-headline font-bold text-sm block" style={{ color: persona.color }}>{persona.name} אומר</span>
                                                        <span className="font-label text-[9px] text-on-surface-variant">תובנות שבועיות</span>
                                            </div>
                                  </div>
                                  <div className="space-y-2 mr-10">
                                    {(insights || []).map((insight, i) => (
                                  <div key={i} className="bg-surface-container-low rounded-xl px-4 py-3 rounded-tr-sm">
                                                <p className="font-body text-sm">{insight}</p>
                                  </div>
                                ))}
                                  </div>
                          </section>
                    
                      {/* Goals for next week */}
                          <section className="space-y-3 animate-fade-up-delay-3">
                                  <h2 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">מטרות לשבוע הבא</h2>
                                  <div className="space-y-2">
                                    {(goals || []).map((goal, i) => (
                                  <button key={i} onClick={() => toggleGoal(i)}
                                                  className="w-full bg-surface-container-low rounded-xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] duration-200 text-right"
                                                >
                                                <span className="w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all duration-200"
                                                                  style={{ borderColor: checkedGoals[i] ? '#CCFF00' : '#444', backgroundColor: checkedGoals[i] ? '#CCFF00' : 'transparent' }}>
                                                  {checkedGoals[i] && (
                                                                                      <span className="material-symbols-outlined text-xs font-bold" style={{ color: '#0e0e0e', fontVariationSettings: "'FILL' 1", fontSize: 14 }}>check</span>
                                                                )}
                                                </span>
                                                <span className={`font-body text-sm flex-1 text-right ${checkedGoals[i] ? 'line-through text-on-surface-variant' : ''}`}>{goal}</span>
                                  </button>
                                ))}
                                  </div>
                          </section>
                    
                      {/* Ask AI button */}
                          <button onClick={askAI}
                                    className="w-full rounded-xl py-4 font-headline font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] duration-200"
                                    style={{ backgroundColor: persona.color, color: '#0e0e0e' }}
                                  >
                                  <span className="w-6 h-6 rounded-full overflow-hidden shrink-0" dangerouslySetInnerHTML={{ __html: persona.avatar }} />
                                  שאל את {persona.name} על השבוע
                          </button>
                    </main>
                  )
}

function ScoreRing({ score }) {
    const R = 36, CX = 44, CY = 44, circ = 2 * Math.PI * R
        const pct = score / 100
            const color = score >= 75 ? '#CCFF00' : score >= 50 ? '#FFB700' : '#FF4D4D'
                return (
                      <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
                            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#2a2a2a" strokeWidth="8" />
                            <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                                      strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
                                      strokeDashoffset={circ * 0.25}
                                      style={{ transition: 'stroke-dasharray 1s ease' }}
                                    />
                            <text x={CX} y={CY - 3} textAnchor="middle" fontSize="16" fontWeight="bold" fill={color} fontFamily="sans-serif">{score}</text>
                            <text x={CX} y={CY + 13} textAnchor="middle" fontSize="9" fill="#888" fontFamily="sans-serif">/ 100</text>
                      </svg>
                    )
}

function StatBox({ icon, label, value, unit, delta, isPercent }) {
    const hasDelta = delta !== null && delta !== undefined
        const positive = delta > 0
            const neutral = delta === 0
                return (
                      <div className="bg-surface-container-low rounded-xl p-4 space-y-1">
                            <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm text-on-surface-variant">{icon}</span>
                                    <span className="font-label text-[9px] text-on-surface-variant uppercase">{label}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                    <span className="font-headline font-bold text-2xl">{value}</span>
                                    <span className="font-label text-[10px] text-on-surface-variant">{unit}</span>
                            </div>
                        {hasDelta && (
                                <div className={`flex items-center gap-1 font-label text-[9px] font-bold ${neutral ? 'text-on-surface-variant' : positive ? 'text-[#CCFF00]' : 'text-[#FF4D4D]'}`}>
                                          <span className="material-symbols-outlined text-xs">{neutral ? 'remove' : positive ? 'arrow_upward' : 'arrow_downward'}</span>
                                  {isPercent ? `${Math.abs(delta)}% vs שבוע שעבר` : `${positive ? '+' : ''}${delta} vs שבוע שעבר`}
                                </div>
                            )}
                      </div>
                    )
}
