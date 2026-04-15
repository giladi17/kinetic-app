import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../api'
import { useLang } from '../context/LanguageContext'
import { EXERCISE_VIDEOS } from '../data/exerciseVideos'
import ExerciseInfographic from '../components/ExerciseInfographic'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

const ACTIVE_KEY = 'kinetic_active_plan'

export default function Plans() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [videoExercise, setVideoExercise] = useState(null)
  const [plans, setPlans] = useState([])
  const [selected, setSelected] = useState(null) // plan detail
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
    showToast(`✓ "${plan.name}" ${t('plans.activate')}`)
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
    showToast('✓ תוכנית נוצרה!')
    openPlan(data.id)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // Get today's day in active plan (cycle by day of week)
  const todayDay = activePlan?.days
    ? activePlan.days[(new Date().getDay()) % activePlan.days.length]
    : null

  if (loading) return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto min-h-screen flex items-center justify-center">
      <span className="font-headline text-2xl font-bold animate-pulse text-primary-fixed-dim">LOADING...</span>
    </main>
  )

  return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-6 min-h-screen">
      {/* Video Modal */}
      {videoExercise && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
             onClick={() => setVideoExercise(null)}>
          <div className="w-full max-w-md my-4"
               onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setVideoExercise(null)}
                      className="text-white bg-surface-container rounded-full p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <ExerciseInfographic exerciseName={videoExercise} />
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary-container text-on-primary-fixed px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end pt-4">
        <div>
          <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">TRAINING</span>
          <h1 className="font-headline text-4xl font-bold tracking-tight uppercase">{t('plans.title')}</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary-container text-on-primary-fixed px-4 py-2 rounded-xl font-headline font-bold text-sm active:scale-95 duration-200"
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          {t('plans.create')}
        </button>
      </div>

      {/* Active plan banner */}
      {activePlan && todayDay && (
        <div className="bg-primary-container rounded-xl p-5 space-y-3">
          <div>
            <span className="font-label text-[10px] text-on-primary-fixed/70 uppercase tracking-widest block">{t('plans.activePlan')}</span>
            <p className="font-headline font-bold text-xl text-on-primary-fixed">{activePlan.name}</p>
            <p className="font-label text-sm text-on-primary-fixed/80 mt-0.5">{t('plans.todayWorkout')}: {todayDay.name}</p>
          </div>
          <button
            onClick={() => navigate(`/workouts`)}
            className="w-full bg-on-primary-fixed text-primary-container py-3 rounded-xl font-headline font-bold text-sm uppercase tracking-widest active:scale-[0.98] duration-200"
          >
            {t('plans.startToday')}
          </button>
        </div>
      )}

      {/* Plan detail view */}
      {selected && (
        <div className="bg-surface-container-low rounded-xl overflow-hidden">
          <div className="p-5 flex items-start justify-between">
            <div>
              <h2 className="font-headline font-bold text-xl">{selected.name}</h2>
              <p className="font-body text-sm text-on-surface-variant mt-1">{selected.description}</p>
              <span className="font-label text-xs text-on-surface-variant mt-1 block">{selected.days?.length} {t('plans.days')}</span>
            </div>
            <button onClick={() => setSelected(null)} className="text-on-surface-variant">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="divide-y divide-surface-container">
            {selected.days?.map(day => (
              <div key={day.id} className="px-5 py-4 space-y-2">
                <p className="font-headline font-bold text-sm">{day.name}</p>
                <div className="space-y-1">
                  {day.exercises?.map((ex, i) => {
                    const vid = EXERCISE_VIDEOS[ex.exercise_name]
                    const displayName = vid?.hebrewName || ex.exercise_name
                    return (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="font-body text-on-surface">{displayName}</span>
                          {vid && (
                            <button
                              onClick={() => setVideoExercise(ex.exercise_name)}
                              className="text-primary-fixed-dim hover:opacity-80 mr-2"
                            >
                              <span className="material-symbols-outlined text-sm">play_circle</span>
                            </button>
                          )}
                        </div>
                        <span className="font-label text-xs text-on-surface-variant">{ex.sets}×{ex.reps}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="p-5 flex gap-3">
            <button
              onClick={() => activatePlan(selected)}
              className="flex-1 bg-primary-container text-on-primary-fixed py-3 rounded-xl font-headline font-bold text-sm uppercase active:scale-[0.98] duration-200"
            >
              {t('plans.activate')}
            </button>
            {selected.is_custom === 1 && (
              <button
                onClick={() => deletePlan(selected.id)}
                className="px-4 py-3 rounded-xl bg-surface-container text-on-surface-variant font-headline font-bold text-sm active:scale-[0.98] duration-200"
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="space-y-3">
        {plans.map(plan => (
          <button
            key={plan.id}
            onClick={() => openPlan(plan.id)}
            className={`w-full text-right bg-surface-container-low rounded-xl p-5 flex items-center gap-4 active:scale-[0.98] duration-200 transition-all ${
              activePlan?.id === plan.id ? 'border-l-4 border-primary-container' : ''
            }`}
          >
            <span className="material-symbols-outlined text-3xl text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
              event_note
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-bold text-base">{plan.name}</p>
              <p className="font-body text-xs text-on-surface-variant truncate mt-0.5">{plan.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-label text-[10px] text-on-surface-variant">{plan.days?.length} {t('plans.days')}</span>
                {plan.is_custom ? (
                  <span className="font-label text-[10px] bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant">{t('plans.custom')}</span>
                ) : (
                  <span className="font-label text-[10px] bg-primary-container/20 text-primary-fixed-dim px-2 py-0.5 rounded-full">{t('plans.builtin')}</span>
                )}
                {activePlan?.id === plan.id && (
                  <span className="font-label text-[10px] bg-primary-container text-on-primary-fixed px-2 py-0.5 rounded-full">{t('plans.activePlan')}</span>
                )}
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
          </button>
        ))}
      </div>

      {/* Create plan modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center px-4 pb-8">
          <div className="bg-surface-container-low rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="font-headline font-bold text-xl uppercase">{t('plans.createNew')}</h2>
              <button onClick={() => setShowCreate(false)}>
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <input
              className="w-full bg-surface-container-highest rounded-lg px-4 py-3 font-body text-sm outline-none"
              placeholder={t('plans.planName')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              dir="rtl"
            />
            <input
              className="w-full bg-surface-container-highest rounded-lg px-4 py-3 font-body text-sm outline-none"
              placeholder={t('plans.description')}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              dir="rtl"
            />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-label text-xs text-on-surface-variant uppercase">{t('plans.days')}</span>
                <button
                  onClick={() => setNewDays(d => [...d, { name: '', exercises: '' }])}
                  className="font-label text-xs text-primary-fixed-dim font-bold"
                >
                  + {t('plans.addExercise')}
                </button>
              </div>
              {newDays.map((day, i) => (
                <div key={i} className="bg-surface-container rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-label text-xs text-on-surface-variant">יום {i + 1}</span>
                    {newDays.length > 1 && (
                      <button onClick={() => setNewDays(d => d.filter((_, j) => j !== i))} className="text-on-surface-variant">
                        <span className="material-symbols-outlined text-base">remove_circle</span>
                      </button>
                    )}
                  </div>
                  <input
                    className="w-full bg-surface-container-highest rounded-lg px-3 py-2 font-body text-sm outline-none"
                    placeholder="שם היום — למשל: PUSH — חזה + כתפיים"
                    value={day.name}
                    onChange={e => setNewDays(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    dir="rtl"
                  />
                  <textarea
                    className="w-full bg-surface-container-highest rounded-lg px-3 py-2 font-body text-sm outline-none resize-none"
                    placeholder={'תרגילים — שורה לכל תרגיל:\nBench Press\nPull-ups\nSquat'}
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
              className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-headline font-bold text-sm uppercase tracking-widest active:scale-[0.98] duration-200 disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('plans.createNew')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
