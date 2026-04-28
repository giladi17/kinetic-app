import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../api'
import { useLang } from '../context/LanguageContext'
import { EXERCISE_VIDEOS } from '../data/exerciseVideos'
import ExerciseInfographic from '../components/ExerciseInfographic'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`
const ACTIVE_KEY = 'kinetic_active_plan'

function getPlanBadge(name = '') {
  const n = name.toUpperCase()
  if (n.includes('AB') || n.includes('בטן')) return 'AB SPLIT'
  if (n.includes('FULL') || n.includes('כל הגוף')) return 'FULL BODY'
  if (n.includes('ABC') || n.includes('מתקדם')) return 'ABC ADVANCED'
  if (n.includes('PUSH') || n.includes('דחיפה')) return 'PUSH'
  if (n.includes('PULL') || n.includes('משיכה')) return 'PULL'
  if (n.includes('LEG') || n.includes('רגליים')) return 'LEGS'
  return 'PROTOCOL'
}

export default function Plans() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [videoExercise, setVideoExercise] = useState(null)
  const [plans, setPlans] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePlan, setActivePlan] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ACTIVE_KEY)) } catch { return null }
  })
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDays, setNewDays] = useState([{ name: '', exercises: '' }])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    authFetch(`${API}/plans`)
      .then(r => r.json())
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!showCreate) return
    function onKey(e) { if (e.key === 'Escape') setShowCreate(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCreate])

  async function openPlan(id) {
    const res = await authFetch(`${API}/plans/${id}`)
    const data = await res.json()
    setSelected(data)
  }

  function activatePlan(plan) {
    const active = { id: plan.id, name: plan.name, days: plan.days }
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
    setActivePlan(active)
    showToast(`"${plan.name}" הופעל!`)
  }

  async function deletePlan(id) {
    await authFetch(`${API}/plans/${id}`, { method: 'DELETE' })
    setPlans(prev => prev.filter(p => p.id !== id))
    if (selected?.id === id) setSelected(null)
    showToast('תוכנית נמחקה')
  }

  async function createPlan() {
    if (!newName.trim() || newDays.some(d => !d.name.trim())) return
    setSaving(true)
    const days = newDays.map(d => ({
      name: d.name,
      exercises: d.exercises.split('\n').filter(Boolean).map(e => ({ name: e.trim(), sets: 3, reps: '8-12' })),
    }))
    const res = await authFetch(`${API}/plans`, {
      method: 'POST',
      body: JSON.stringify({ name: newName, description: newDesc, days }),
    })
    const data = await res.json()
    setSaving(false)
    setShowCreate(false)
    setNewName(''); setNewDesc(''); setNewDays([{ name: '', exercises: '' }])
    const updated = await authFetch(`${API}/plans`).then(r => r.json())
    setPlans(updated)
    showToast('תוכנית נוצרה!')
    openPlan(data.id)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const todayDay = activePlan?.days
    ? activePlan.days[(new Date().getDay()) % activePlan.days.length]
    : null

  if (loading) return (
    <main className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
      <span className="text-2xl font-black tracking-widest animate-pulse text-[#506600]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        LOADING...
      </span>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#F8F9FF] text-[#151C25]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Exercise Modal */}
      {videoExercise && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setVideoExercise(null)}>
          <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-3">
              <button onClick={() => setVideoExercise(null)} className="bg-white rounded-full p-2 shadow-md hover:bg-[#CCFF00] transition-colors">
                <span className="material-symbols-outlined text-[#151C25]">close</span>
              </button>
            </div>
            <ExerciseInfographic exerciseName={videoExercise} />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#CCFF00] text-black px-6 py-3 font-black text-sm shadow-xl tracking-wider">
          {toast}
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6 border-b-2 border-[#CCFF00]">
        <div className="max-w-6xl mx-auto">
          <span className="block text-xs font-black tracking-[0.3em] text-[#506600] mb-3 uppercase">TRAINING PROTOCOLS</span>
          <div className="flex items-end justify-between gap-6">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none text-[#151C25]" dir="rtl">
              תוכניות אימון
            </h1>
            <button
              onClick={() => setShowCreate(true)}
              className="flex-shrink-0 flex items-center gap-2 px-6 py-3 font-black text-sm uppercase tracking-widest transition-all duration-200 active:scale-95 hover:bg-black hover:text-[#CCFF00] bg-[#CCFF00] text-black"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              {t('plans.create')}
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">

        {/* Active Plan Banner */}
        {activePlan && todayDay && (
          <section className="bg-[#CCFF00] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="block text-[10px] font-black tracking-[0.3em] uppercase mb-2 text-[#506600]">
                {t('plans.activePlan')}
              </span>
              <p className="text-2xl font-black uppercase text-black" dir="rtl">{activePlan.name}</p>
              <p className="text-black/60 text-sm mt-1 font-medium" dir="rtl">
                {t('plans.todayWorkout')}: <span className="text-black font-black">{todayDay.name}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/plans')}
              className="px-8 py-4 font-black text-sm uppercase tracking-widest bg-black text-[#CCFF00] hover:bg-[#151C25] transition-all duration-200 active:scale-[0.98]"
            >
              {t('plans.startToday')}
            </button>
          </section>
        )}

        {/* Plan Detail Panel */}
        {selected && (
          <section className="bg-white border-2 border-black overflow-hidden">
            <div className="flex items-start justify-between p-6 border-b-2 border-black">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black tracking-widest px-3 py-1 bg-[#CCFF00] text-black uppercase">
                    {getPlanBadge(selected.name)}
                  </span>
                  {selected.is_custom === 1 && (
                    <span className="text-[10px] font-black tracking-widest px-3 py-1 border-2 border-black text-[#151C25] uppercase">
                      {t('plans.custom')}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black uppercase mt-2 text-[#151C25]" dir="rtl">{selected.name}</h2>
                {selected.description && (
                  <p className="text-[#656464] text-sm mt-1" dir="rtl">{selected.description}</p>
                )}
                <span className="text-[#656464] text-xs font-bold tracking-widest mt-1 block">
                  {selected.days?.length} {t('plans.days')}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#656464] hover:text-black transition-colors p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="divide-y divide-black/10">
              {selected.days?.map(day => (
                <div key={day.id} className="px-6 py-5">
                  <p className="text-xs font-black tracking-widest uppercase mb-3 text-[#506600]" dir="rtl">{day.name}</p>
                  <div className="space-y-2">
                    {day.exercises?.map((ex, i) => {
                      const vid = EXERCISE_VIDEOS[ex.exercise_name]
                      const displayName = vid?.hebrewName || ex.exercise_name
                      return (
                        <div key={i} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#151C25] font-medium" dir="rtl">{displayName}</span>
                            {vid && (
                              <button onClick={() => setVideoExercise(ex.exercise_name)} className="text-[#506600] hover:text-[#CCFF00] transition-colors">
                                <span className="material-symbols-outlined text-base">play_circle</span>
                              </button>
                            )}
                          </div>
                          <span className="text-xs font-black text-[#656464] tracking-widest">{ex.sets}x{ex.reps}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 flex gap-3 border-t-2 border-black bg-[#F8F9FF]">
              <button
                onClick={() => activatePlan(selected)}
                className="flex-1 py-4 font-black text-sm uppercase tracking-widest bg-black text-[#CCFF00] hover:bg-[#151C25] transition-all duration-200 active:scale-[0.98]"
              >
                {t('plans.activate')}
              </button>
              {selected.is_custom === 1 && (
                <button
                  onClick={() => deletePlan(selected.id)}
                  className="px-5 py-4 font-black text-sm transition-all duration-200 bg-white border-2 border-black hover:bg-red-50 active:scale-[0.98] text-[#656464] hover:text-red-600"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Premium Catalog Grid */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="text-xs font-black tracking-[0.3em] uppercase text-[#506600]">PREMIUM CATALOG</span>
            <div className="flex-1 h-0.5 bg-black/10" />
            <span className="text-xs font-black text-[#656464]">{plans.length} PROTOCOLS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => {
              const isActive = activePlan?.id === plan.id
              const badge = getPlanBadge(plan.name)
              return (
                <button
                  key={plan.id}
                  onClick={() => openPlan(plan.id)}
                  className={`group text-right p-6 flex flex-col gap-4 transition-all duration-300 hover:bg-[#CCFF00] active:scale-[0.98] border-2 border-black bg-white ${isActive ? 'bg-[#CCFF00]' : ''}`}
                  style={{ outline: 'none' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col items-start gap-2">
                      <span className={`text-[10px] font-black tracking-widest px-3 py-1 uppercase ${isActive ? 'bg-black text-[#CCFF00]' : 'bg-black text-[#CCFF00] group-hover:bg-black group-hover:text-[#CCFF00]'}`}>
                        {badge}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-black tracking-widest px-3 py-1 uppercase bg-black text-[#CCFF00]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-black/30 group-hover:text-black transition-colors mt-1">chevron_left</span>
                  </div>

                  <div className="flex-1">
                    <p className="text-lg font-black uppercase leading-tight text-[#151C25]" dir="rtl">{plan.name}</p>
                    {plan.description && (
                      <p className="text-[#656464] text-xs mt-1 font-medium line-clamp-2 group-hover:text-black/60" dir="rtl">{plan.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t-2 border-black/10 group-hover:border-black/20">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#656464]">calendar_today</span>
                      <span className="text-xs font-black text-[#656464] tracking-widest group-hover:text-black/60">
                        {plan.days?.length} {t('plans.days')}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 uppercase ${plan.is_custom ? 'border-2 border-black/30 text-[#656464]' : 'bg-[#506600] text-white'}`}>
                      {plan.is_custom ? t('plans.custom') : t('plans.builtin')}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* AI Coach Section */}
        <section className="bg-[#151C25] p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]" style={{ background: '#CCFF00' }} />
          <div className="relative z-10">
            <span className="block text-xs font-black tracking-[0.3em] uppercase mb-4 text-[#CCFF00]">AI COACH</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-3 text-white tracking-tighter" dir="rtl">
              רוצה תוכנית מותאמת אישית?
            </h2>
            <p className="text-white/50 text-sm font-medium mb-8 max-w-md mx-auto" dir="rtl">
              צור תוכנית חדשה בהתאם למטרות שלך, ימי האימון וציוד זמין.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-8 py-4 font-black text-sm uppercase tracking-widest bg-[#CCFF00] text-black hover:bg-white hover:text-black transition-all duration-200 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              {t('plans.create')}
            </button>
          </div>
        </section>

      </div>

      {/* Create Plan Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center px-4 pb-4 md:pb-0">
          <div className="w-full max-w-lg bg-white border-2 border-black p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-black pb-4">
              <h2 className="text-xl font-black uppercase tracking-tight text-[#151C25]">{t('plans.createNew')}</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#656464] hover:text-black transition-colors p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <input
              className="w-full px-4 py-3 font-bold text-sm outline-none border-b-2 border-[#CCFF00] bg-[#F8F9FF] text-[#151C25] placeholder:text-[#656464]"
              placeholder={t('plans.planName')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              dir="rtl"
            />
            <input
              className="w-full px-4 py-3 font-bold text-sm outline-none border-b-2 border-black/20 bg-[#F8F9FF] text-[#151C25] placeholder:text-[#656464]"
              placeholder={t('plans.description')}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              dir="rtl"
            />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-[#656464] uppercase tracking-widest">{t('plans.days')}</span>
                <button
                  onClick={() => setNewDays(d => [...d, { name: '', exercises: '' }])}
                  className="text-xs font-black uppercase tracking-widest text-[#506600] hover:text-black transition-colors"
                >
                  + {t('plans.addExercise')}
                </button>
              </div>
              {newDays.map((day, i) => (
                <div key={i} className="bg-[#F8F9FF] border-2 border-black/10 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-[#656464] tracking-widest">יום {i + 1}</span>
                    {newDays.length > 1 && (
                      <button onClick={() => setNewDays(d => d.filter((_, j) => j !== i))} className="text-[#656464] hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-base">remove_circle</span>
                      </button>
                    )}
                  </div>
                  <input
                    className="w-full px-3 py-2 font-bold text-sm outline-none border-b-2 border-[#CCFF00] bg-white text-[#151C25] placeholder:text-[#656464]"
                    placeholder="שם היום — למשל: PUSH"
                    value={day.name}
                    onChange={e => setNewDays(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    dir="rtl"
                  />
                  <textarea
                    className="w-full px-3 py-2 font-bold text-sm outline-none resize-none bg-white border-b-2 border-black/20 text-[#151C25] placeholder:text-[#656464]"
                    placeholder={'תרגילים — שורה לכל תרגיל:\nBench Press\nPull-ups'}
                    rows={4}
                    value={day.exercises}
                    onChange={e => setNewDays(d => d.map((x, j) => j === i ? { ...x, exercises: e.target.value } : x))}
                    dir="rtl"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={createPlan}
              disabled={saving || !newName.trim()}
              className="w-full py-4 font-black text-sm uppercase tracking-widest bg-black text-[#CCFF00] hover:bg-[#151C25] transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? t('common.loading') : t('plans.createNew')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
