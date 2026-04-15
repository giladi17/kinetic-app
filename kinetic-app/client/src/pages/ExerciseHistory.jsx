import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../api'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
}

function buildPath(history) {
  if (history.length < 2) return null
  const weights = history.map(h => h.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1
  const points = history.map((h, i) => ({
    x: Math.round((i / (history.length - 1)) * 380) + 10,
    y: Math.round(85 - ((h.weight - minW) / range) * 65),
    weight: h.weight,
    date: h.date,
  }))
  const line = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')
  const area = `${line} L${points[points.length - 1].x},100 L10,100 Z`
  return { line, area, points }
}

export default function ExerciseHistory() {
  const navigate = useNavigate()
  const [exerciseList, setExerciseList] = useState([])
  const [selected, setSelected] = useState(null)
  const [historyData, setHistoryData] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showPRs, setShowPRs] = useState(false)
  const [allPRs, setAllPRs] = useState([])

  useEffect(() => {
    fetch(`${API}/exercises/list`)
      .then(r => r.json())
      .then(data => {
        setExerciseList(data)
        if (data.length > 0) setSelected(data[0].name)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoadingHistory(true)
    fetch(`${API}/exercises/history?exercise=${encodeURIComponent(selected)}`)
      .then(r => r.json())
      .then(setHistoryData)
      .catch(() => setHistoryData(null))
      .finally(() => setLoadingHistory(false))
  }, [selected])

  useEffect(() => {
    if (!showPRs) return
    function onKey(e) { if (e.key === 'Escape') setShowPRs(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPRs])

  async function fetchAllPRs() {
    const res = await authFetch(`${API}/exercises/prs`)
    const data = await res.json()
    setAllPRs(data)
    setShowPRs(true)
  }

  const path = historyData?.history?.length >= 2 ? buildPath(historyData.history) : null
  const prWeight = historyData?.pr?.weight
  const reversedHistory = historyData?.history ? [...historyData.history].reverse() : []

  const firstWeight = historyData?.history?.[0]?.weight
  const improvement = firstWeight && prWeight
    ? { abs: Math.round((prWeight - firstWeight) * 10) / 10, pct: Math.round(((prWeight - firstWeight) / firstWeight) * 100) }
    : null

  return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-5 min-h-screen">

      {/* PR Modal */}
      {showPRs && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline font-bold text-xl uppercase">כל השיאים</h3>
              <button onClick={() => setShowPRs(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {allPRs.length === 0 ? (
              <p className="text-on-surface-variant text-center py-8">אין שיאים עדיין</p>
            ) : (
              <div className="space-y-3">
                {allPRs.map((pr, i) => (
                  <div key={i} className="bg-surface-container rounded-lg p-4 flex justify-between">
                    <div>
                      <p className="font-bold text-sm uppercase">{pr.exercise_name}</p>
                      <p className="text-xs text-on-surface-variant">{pr.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-headline font-black text-xl text-primary-fixed-dim">
                        {pr.weight}kg
                      </p>
                      <p className="text-xs text-on-surface-variant">× {pr.reps}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 pt-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <div className="flex-1">
          <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">TRAINING</span>
          <h1 className="font-headline text-2xl font-bold tracking-tight uppercase">היסטוריית תרגילים</h1>
        </div>
        <button
          onClick={fetchAllPRs}
          className="flex items-center gap-1 bg-surface-container px-3 py-2 rounded-xl font-label text-xs font-bold"
        >
          <span className="text-base">🏆</span> כל ה-PRs
        </button>
      </div>

      {/* Exercise Selector */}
      {exerciseList.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-8 text-center">
          <p className="font-label text-on-surface-variant text-sm">עדיין אין נתוני תרגילים — התחל לאמן!</p>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {exerciseList.map(ex => {
            const days = daysSince(ex.lastDate)
            return (
              <button
                key={ex.name}
                onClick={() => setSelected(ex.name)}
                className={`flex-shrink-0 rounded-xl px-4 py-3 text-left transition-all duration-200 active:scale-95 ${
                  selected === ex.name
                    ? 'bg-primary-container text-on-primary-fixed'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                <p className="font-headline font-bold text-sm whitespace-nowrap">{ex.name}</p>
                <p className={`font-label text-[10px] ${selected === ex.name ? 'opacity-70' : 'text-on-surface-variant'}`}>
                  {ex.totalSets} סטים · {days != null ? `לפני ${days} ימים` : '—'}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {loadingHistory && (
        <div className="h-40 bg-surface-container-low rounded-xl animate-pulse" />
      )}

      {!loadingHistory && historyData && (
        <>
          {/* PR Card */}
          {historyData.pr ? (
            <div className="bg-primary-container rounded-xl p-6 text-center">
              <p className="font-label text-xs text-on-primary-fixed/70 uppercase tracking-widest mb-1">🏆 שיא אישי</p>
              <div className="font-headline text-5xl font-black text-on-primary-fixed">{historyData.pr.weight}kg</div>
              <p className="font-label text-sm text-on-primary-fixed/80 mt-1">
                {historyData.pr.reps} חזרות · {historyData.pr.date}
              </p>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-xl p-6 text-center">
              <p className="font-label text-sm text-on-surface-variant">אין שיא עדיין — המשך לאמן!</p>
            </div>
          )}

          {/* SVG Chart */}
          {path && (
            <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">התקדמות משקל</p>
              <svg viewBox="0 0 400 100" className="w-full h-32" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(202,253,0)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(202,253,0)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d={path.area} fill="url(#exGrad)" />
                <path d={path.line} fill="none" stroke="rgb(202,253,0)" strokeWidth="2" strokeLinecap="round" />
                {path.points.map((p, i) => {
                  const isPR = p.weight === prWeight
                  return (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={isPR ? 5 : 3}
                      fill={isPR ? 'rgb(202,253,0)' : 'rgb(202,253,0)'}
                      opacity={isPR ? 1 : 0.6}
                    />
                  )
                })}
              </svg>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'סה״כ סטים', value: historyData.totalSets },
              { label: 'ממוצע משקל', value: `${historyData.avgWeight}kg` },
              { label: 'שיפור', value: improvement ? `+${improvement.abs}kg` : '—', sub: improvement ? `+${improvement.pct}%` : '' },
            ].map((s, i) => (
              <div key={i} className="bg-surface-container-low rounded-xl p-4 text-center">
                <p className="font-headline font-bold text-xl text-primary-container">{s.value}</p>
                {s.sub && <p className="font-label text-[10px] text-primary-fixed-dim">{s.sub}</p>}
                <p className="font-label text-[10px] text-on-surface-variant uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* History Table */}
          {reversedHistory.length > 0 && (
            <div className="bg-surface-container-low rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_60px_48px_40px_64px] gap-2 px-4 py-2 bg-surface-container">
                {['תאריך', 'משקל', 'חזרות', 'RPE', 'נפח'].map(h => (
                  <span key={h} className="font-label text-[9px] text-on-surface-variant uppercase text-center">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-surface-container">
                {reversedHistory.map((row, i) => {
                  const isRowPR = row.weight === prWeight
                  return (
                    <div
                      key={i}
                      className={`grid grid-cols-[1fr_60px_48px_40px_64px] gap-2 px-4 py-3 items-center ${isRowPR ? 'bg-primary-container/10' : ''}`}
                    >
                      <span className="font-label text-xs text-on-surface-variant">{row.date}</span>
                      <span className={`font-headline font-bold text-sm text-center ${isRowPR ? 'text-primary-fixed-dim' : ''}`}>{row.weight}kg</span>
                      <span className="font-label text-sm text-center">{row.reps}</span>
                      <span className="font-label text-sm text-center text-on-surface-variant">{row.rpe}</span>
                      <span className="font-label text-xs text-center text-on-surface-variant">{Math.round(row.volume)}kg</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
