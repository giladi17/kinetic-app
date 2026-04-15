import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDashboard, authFetch } from '../api'
import { useUser } from '../context/UserContext'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { SkeletonCard, SkeletonText } from '../components/Skeleton'
import { useLang } from '../context/LanguageContext'
import ReadinessCard from '../components/ReadinessCard'
import { registerPushNotifications, isPushSupported } from '../utils/pushNotifications'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function Dashboard() {
    const navigate = useNavigate()
    const { user } = useUser()
    const { user: authUser } = useAuth()
    const { t } = useLang()
    const { dashboard: appDashboard, todayNutrition: appMacros, loading: appLoading } = useAppData() || {}
        const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [water, setWater] = useState(0)
    const [macros, setMacros] = useState(null)
    const [challenge, setChallenge] = useState(null)
    const [challengeDone, setChallengeDone] = useState(false)

  useEffect(() => {
        // Only use appDashboard if it's a valid data object (not an error response)
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
    if (Notification.permission === 'granted') return // already registered
    const timer = setTimeout(async () => {
      await registerPushNotifications()
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  async function addWater(amount) {
        try {
                const res = await authFetch(`${API}/api/stats/water`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ amount }),
                })
                const data = await res.json()
                setWater(data.water_today)
        } catch {}
  }

  if (loading) return (
        <main className="mt-24 px-6 max-w-7xl mx-auto space-y-10 pb-32">
              <section className="flex flex-col gap-6">
                      <SkeletonText width="w-48" />
                      <SkeletonText width="w-64" />
              </section>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <SkeletonCard className="md:col-span-4 h-64" />
                      <SkeletonCard className="md:col-span-4 h-64" />
                      <SkeletonCard className="md:col-span-4 h-64" />
              </div>
        </main>
      )
    
      const d = data || fallback
          const stepPct = Math.min(100, Math.round(((d.steps ?? 0) / (d.stepGoal || 10000)) * 100))
              const displayName = user?.name || authUser?.name || d.userName || 'Athlete'
                
                  return (
                        <main className="mt-24 px-6 max-w-7xl mx-auto space-y-10 pb-32">
                          {/* Welcome HUD */}
                              <section className="flex flex-col md:flex-row justify-between items-end gap-6 animate-fade-up">
                                      <div className="space-y-1">
                                                <h1 className="font-headline text-4xl font-bold tracking-tight uppercase">{t('dashboard.title')}</h1>
                                                <p className="font-body text-on-surface-variant tracking-wide">
                                                            {t('dashboard.greeting')}, <span className="text-primary-fixed-dim">{displayName}</span>
                                                </p>
                                      </div>
                                      <div className="flex gap-4">
                                                <div className="bg-surface-container-low px-4 py-2 rounded-xl flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                                            <span className="font-headline font-bold text-xl">{d.streak ?? 0} {t('dashboard.streak')}</span>
                                                </div>
                                      </div>
                              </section>
                        
                          {/* Readiness Score */}
                          <ReadinessCard />
                        
                          {/* Daily Challenge */}
                          {challenge && (
                            <div className="bg-surface-container-low rounded-xl p-5 flex items-center gap-4">
                              <div className="text-3xl shrink-0">{challenge.text.split(' ').pop()}</div>
                              <div className="flex-1">
                                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest block mb-1">{t('dashboard.dailyChallenge')}</span>
                                <p className="font-headline font-bold text-sm">{challenge.text.split(' ').slice(0, -1).join(' ')}</p>
                                <span className="font-label text-xs text-primary-fixed-dim">+{challenge.xp} XP</span>
                              </div>
                              <button
                                onClick={() => {
                                  setChallengeDone(true)
                                  authFetch(`${API}/api/daily-challenge/complete`, { method: 'POST' }).catch(console.error)
                                }}
                                className={`px-4 py-2 rounded-lg font-headline font-bold text-xs uppercase transition-all ${
                                  challengeDone
                                    ? 'bg-primary-container text-on-primary-fixed'
                                    : 'bg-surface-container border border-primary-container text-primary-fixed-dim'
                                }`}
                              >
                                {challengeDone ? t('dashboard.challengeDone') : t('dashboard.challengeComplete')}
                              </button>
                            </div>
                          )}

                          {/* Bento Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-up-delay-1">
                                {/* Steps */}
                                      <div className="md:col-span-4 bg-surface-container-low rounded-xl p-8 relative flex flex-col items-center justify-center overflow-hidden">
                                                <div className="absolute top-2 right-3 opacity-5 font-headline font-black text-8xl italic select-none pointer-events-none">STEPS</div>
                                                <div
                                                              className="relative w-48 h-48 circular-progress rounded-full flex items-center justify-center"
                                                              style={{ '--progress': `${stepPct}%` }}
                                                            >
                                                            <div className="text-center">
                                                                          <span className="block font-headline font-black text-4xl">{(d.steps ?? 0).toLocaleString()}</span>
                                                                          <span className="block font-label text-[10px] tracking-widest text-on-surface-variant uppercase">/ {(d.stepGoal ?? 10000).toLocaleString()}</span>
                                                            </div>
                                                </div>
                                                <div className="mt-8 flex items-center gap-4">
                                                            <div className="flex flex-col items-center">
                                                                          <span className="font-headline font-bold text-primary-fixed-dim">{stepPct}%</span>
                                                                          <span className="font-label text-[10px] text-on-surface-variant uppercase">{t('dashboard.dailyGoal')}</span>
                                                            </div>
                                                </div>
                                      </div>
                              
                                {/* Next Workout */}
                                      <div className="md:col-span-8 bg-surface-container-low rounded-xl relative overflow-hidden group min-h-[260px]">
                                                <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent z-10"></div>
                                                <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-700" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)' }} />
                                                <div className="relative z-20 h-full p-8 flex flex-col justify-between items-start">
                                                            <div className="bg-primary-container text-on-primary-container px-3 py-1 rounded font-headline text-xs font-black italic tracking-widest uppercase">{t('dashboard.upcoming')}</div>
                                                            <div className="mt-20">
                                                                          <h2 className="font-headline text-5xl font-black italic tracking-tighter uppercase leading-none">{d.nextWorkout?.name || 'HIIT Training'}</h2>
                                                                          <div className="flex items-center gap-6 mt-4">
                                                                                          <div className="flex items-center gap-2">
                                                                                                            <span className="material-symbols-outlined text-primary-fixed-dim">schedule</span>
                                                                                                            <span className="font-body font-bold">{d.nextWorkout?.duration || 20} {t('common.minutes')}</span>
                                                                                            </div>
                                                                                          <div className="flex items-center gap-2">
                                                                                                            <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                                                                                                            <span className="font-body font-bold">{t(`workouts.${(d.nextWorkout?.intensity || 'advanced').toLowerCase()}`)}</span>
                                                                                            </div>
                                                                          </div>
                                                            </div>
                                                            <button
                                                                            onClick={() => navigate(`/workout/${d.nextWorkout?.id || 1}`)}
                                                                            className="mt-8 bg-primary-container text-on-primary-fixed px-8 py-4 rounded-md font-headline font-black tracking-widest uppercase active:scale-95 duration-200"
                                                                          >
                                                                          {t('dashboard.startWorkout')}
                                                            </button>
                                                </div>
                                      </div>
                              
                                {/* Weekly Activity */}
                                      <div className="md:col-span-7 bg-surface-container-low rounded-xl p-8 space-y-6">
                                                <div className="flex justify-between items-center">
                                                            <h3 className="font-headline font-bold text-xl tracking-tight uppercase">{t('dashboard.weeklyActivity')}</h3>
                                                            <span className="font-label text-xs text-on-surface-variant">{t('dashboard.lastDays')}</span>
                                                </div>
                                                <div className="flex items-end justify-between h-48 pt-4">
                                                  {(d.weeklyActivity || []).length === 0 ? (
                                        <div className="w-full flex items-end justify-between gap-2">
                                          {['א','ב','ג','ד','ה','ו','ש'].map((l, i) => (
                                                            <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                                                                <div className="w-full bg-surface-container-highest rounded-full h-24 animate-pulse" />
                                                                                <span className="font-label text-[10px] text-on-surface-variant">{l}</span>
                                                            </div>
                                                          ))}
                                        </div>
                                      ) : (d.weeklyActivity || []).map((day, i) => {
                                        const isMax = day.pct === Math.max(...(d.weeklyActivity || []).map(x => x.pct))
                                                        return (
                                                                          <div key={i} className="flex flex-col items-center gap-1 w-8 group relative">
                                                                            {isMax && day.pct > 0 && (
                                                                                                <span className="font-label text-[9px] text-primary-fixed-dim font-bold absolute -top-4">{day.pct}%</span>
                                                                                            )}
                                                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-surface-container-highest rounded-lg px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                                                                                                                <span className="font-label text-[10px] text-on-surface">{day.label}: {day.pct}%</span>
                                                                                              </div>
                                                                                            <div className="w-full bg-surface-container-highest rounded-full h-24 relative overflow-hidden mt-4">
                                                                                                                <div
                                                                                                                                        className="absolute bottom-0 w-full rounded-full transition-all duration-300"
                                                                                                                                        style={{ height: `${day.pct}%`, backgroundColor: day.pct > 0 ? 'var(--accent-color, #beee00)' : 'transparent' }}
                                                                                                                                      />
                                                                                              </div>
                                                                                            <span className={`font-label text-[10px] font-bold ${day.today ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>
                                                                                              {day.label}
                                                                                              </span>
                                                                          </div>
                                                                        )
                                                  })}
                                                </div>
                                      </div>
                              
                                {/* Calories */}
                                      <div className="md:col-span-5 bg-surface-container-low rounded-xl p-8 flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                            <div>
                                                                          <span className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase block mb-1">{t('dashboard.totalCalories')}</span>
                                                                          <h3 className="font-headline font-black text-4xl text-secondary">
                                                                            {d.calories?.toLocaleString() || '2,480'} <span className="text-lg font-bold text-on-surface-variant">kcal</span>
                                                                          </h3>
                                                            </div>
                                                            <div className="p-2 bg-secondary/10 rounded-lg">
                                                                          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>energy_savings_leaf</span>
                                                            </div>
                                                </div>
                                                <div className="h-16 flex items-end gap-1 overflow-hidden">
                                                  {(() => {
                                    const hist = d.calorieHistory || [0,0,0,0,0,0,0,0,0]
                                    const maxVal = Math.max(...hist, 1)
                                    return hist.map((v, i) => (
                                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(4, Math.round((v / maxVal) * 64))}px`, backgroundColor: `rgba(255,115,74,${0.15 + i * 0.09})` }} />
                                    ))
                                  })()}
                                                </div>
                                                <div className="flex justify-between items-center pt-4">
                                                            <div className="text-xs font-body font-medium text-on-surface-variant">
                                                                          {(() => {
                                            const today = d.todayCalories ?? 0
                                            const yest = d.yesterdayCalories ?? 0
                                            if (yest === 0) return null
                                            const pct = Math.round(((today - yest) / yest) * 100)
                                            return <span className={`font-bold ${pct >= 0 ? 'text-secondary' : 'text-error'}`}>{pct >= 0 ? '+' : ''}{pct}%</span>
                                          })()} {t('dashboard.vsYesterday')}
                                                            </div>
                                                            <span className="font-label text-[10px] text-outline">{t('dashboard.dailyAvg')}: {d.avgCalories || '2,150'}</span>
                                                </div>
                                      </div>
                              </div>
                        
                          {/* Metrics */}
                              <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                          { icon: 'favorite', label: t('dashboard.restingHR'), value: `${d.restingHR || 62}`, unit: 'bpm' },
                          { icon: 'bedtime', label: t('dashboard.sleep'), value: d.sleep || '7h 20m', unit: '' },
                          { icon: 'water_drop', label: t('dashboard.hydration'), value: `${d.hydration || 1.8}`, unit: 'L' },
                          { icon: 'timer', label: t('dashboard.activeMinutes'), value: `${d.activeMinutes || 54}`, unit: t('common.minutes') },
                                  ].map((m, i) => (
                                              <div key={i} className="bg-surface-container-high p-6 rounded-xl space-y-2">
                                                          <span className="material-symbols-outlined text-primary-fixed-dim">{m.icon}</span>
                                                          <span className="block font-label text-[10px] text-on-surface-variant uppercase">{m.label}</span>
                                                          <span className="block font-headline font-bold text-2xl">
                                                            {m.value} {m.unit && <span className="text-sm font-normal text-on-surface-variant">{m.unit}</span>}
                                                          </span>
                                              </div>
                                            ))}
                              </section>
                        
                          {/* Water Tracker */}
                              <section className="bg-surface-container-low rounded-xl p-6 space-y-4">
                                      <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[#00b4d8]" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                                                            <h3 className="font-headline font-bold text-lg uppercase tracking-tight">{t('dashboard.waterIntake')}</h3>
                                                </div>
                                                <span className="font-headline font-bold text-lg text-[#00b4d8]">
                                                  {water.toFixed(2)} <span className="text-sm font-normal text-on-surface-variant ml-1">/ 2.5L</span>
                                                </span>
                                      </div>
                                      <div className="relative w-full h-8 bg-surface-container-highest rounded-full overflow-hidden">
                                                <div
                                                              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                                              style={{ width: `${Math.min(100, Math.round(water / 2.5 * 100))}%`, background: 'linear-gradient(90deg, #0096c7, #00b4d8, #48cae4)' }}
                                                            />
                                                <div className="absolute inset-0 flex items-center justify-center font-label text-xs font-bold" style={{ color: water > 1.25 ? '#0e0e0e' : '#90e0ef' }}>
                                                  {Math.min(100, Math.round(water / 2.5 * 100))}%
                                                </div>
                                      </div>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[{ ml: 250, label: '250ml' }, { ml: 330, label: '330ml' }, { ml: 500, label: '500ml' }, { ml: 750, label: '750ml' }].map(b => (
                                      <button
                                                      key={b.ml}
                                                      onClick={() => addWater(b.ml / 1000)}
                                                      className="py-2.5 rounded-xl font-headline font-bold text-xs active:scale-90 duration-200 transition-colors"
                                                      style={{ backgroundColor: '#023e8a22', color: '#00b4d8', border: '1px solid #0096c730' }}
                                                    >
                                                    +{b.label}
                                      </button>
                                    ))}
                                      </div>
                              </section>
                        
                          {/* Macros Today */}
                          {macros && (
                                  <section className="bg-surface-container-low rounded-xl p-6 space-y-4">
                                            <h3 className="font-headline font-bold text-lg uppercase tracking-tight">{t('dashboard.macrosToday')}</h3>
                                            <div className="space-y-3">
                                              {[
                                    { key: 'calories', label: t('dashboard.calories'), unit: 'kcal', color: '#CCFF00' },
                                    { key: 'protein', label: t('dashboard.protein'), unit: 'g', color: '#ff734a' },
                                    { key: 'carbs', label: t('dashboard.carbs'), unit: 'g', color: '#00b4d8' },
                                    { key: 'fat', label: t('dashboard.fat'), unit: 'g', color: '#c77dff' },
                                                ].map(({ key, label, unit, color }) => {
                                                                const m = macros[key]
                                                                                if (!m) return null
                                                                                                return (
                                                                                                                  <div key={key} className="space-y-1">
                                                                                                                                    <div className="flex justify-between items-center">
                                                                                                                                                        <span className="font-label text-xs text-on-surface-variant uppercase">{label}</span>
                                                                                                                                                        <span className="font-label text-xs font-bold" style={{ color }}>
                                                                                                                                                          {m.consumed ?? 0}<span className="text-on-surface-variant font-normal">/{m.target ?? 0}{unit}</span>
                                                                                                                                                          </span>
                                                                                                                                      </div>
                                                                                                                                    <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                                                                                                                                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.pct ?? 0}%`, backgroundColor: color }} />
                                                                                                                                      </div>
                                                                                                                    </div>
                                                                                                                )
                                              })}
                                            </div>
                                  </section>
                              )}
                        </main>
                      )
                    }
                    
                    const fallback = {
                              steps: 0,
                              stepGoal: 10000,
                              streak: 0,
                              calories: 0,
                              avgCalories: 0,
                              restingHR: 62,
                              sleep: '—',
                              hydration: 0,
                              activeMinutes: 0,
                              weeklyActivity: [],
                              nextWorkout: { id: 1, name: 'HIIT Training', duration: 20, intensity: 'HIGH' },
                          }
