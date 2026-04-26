import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../api'
import { useLang } from '../context/LanguageContext'
import { EXERCISE_VIDEOS } from '../data/exerciseVideos'
import ExerciseInfographic from '../components/ExerciseInfographic'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

const ACTIVE_KEY = 'kinetic_active_plan'

// Badge labels per plan name keywords
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
    <main className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
      <span
        className="text-2xl font-black tracking-widest animate-pulse"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#CCFF00' }}
      >
        LOADING...
      </span>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#0e0e0e] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Exercise Infographic Modal */}
      {videoExercise && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setVideoExercise(null)}
        >
          <div className="w-full max-w-md my-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setVideoExercise(null)}
                className="text-white/70 hover:text-white bg-[#1A1A1A] rounded-full p-2 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <ExerciseInfographic exerciseName={videoExercise} />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-black text-sm shadow-2xl tracking-wider"
          style={{ background: '#CCFF00', color: '#000' }}
        >
          {toast}
        </div>
      )}

      {/* ── HERO HEADER ── */}
      <section className="pt-24 pb-12 px-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-end justify-between gap-6">
          <div>
            <span
              className="block text-xs font-black tracking-[0.3em] mb-3"
              style={{ color: '#CCFF00' }}
            >
              TRAINING PROTOCOLS
            </span>
            <h1
              className="text-5xl md:text-7xl font-black tracking-tight leading-none uppercase"
              dir="rtl"
            >
              תוכניות אימון
            </h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 active:scale-95 hover:opacity-90"
            style={{ background: '#CCFF00', color: '#000' }}
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            {t('plans.create')}
          </button>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* ── ACTIVE PLAN BANNER ── */}
        {activePlan && todayDay && (
          <section
            className="rounded-2xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
            style={{ background: '#141414', border: '1px solid #CCFF00' }}
          >
            <div>
              <span
                className="block text-[10px] font-black tracking-[0.3em] uppercase mb-2"
                style={{ color: '#CCFF00' }}
              >
                {t('plans.activePlan')}
              </span>
              <p className="text-2xl font-black uppercase" dir="rtl">{activePlan.name}</p>
              <p className="text-white/50 text-sm mt-1 font-medium" dir="rtl">
                {t('plans.todayWorkout')}: <span className="text-white font-bold">{todayDay.name}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/plans')}
              className="px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ background: '#CCFF00', color: '#000' }}
            >
              {t('plans.startToday')}
            </button>
          </section>
        )}

        {/* ── PLAN DETAIL PANEL ── */}
        {selected && (
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Panel header */}
            <div className="flex items-start justify-between p-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase"
                    style={{ background: '#CCFF00', color: '#000' }}
                  >
                    {getPlanBadge(selected.name)}
                  </span>
                  {selected.is_custom === 1 && (
                    <span
                      className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase border"
                      style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      {t('plans.custom')}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black uppercase mt-2" dir="rtl">{selected.name}</h2>
                {selected.description && (
                  <p className="text-white/50 text-sm mt-1" dir="rtl">{selected.description}</p>
                )}
                <span className="text-white/40 text-xs font-bold tracking-widest mt-1 block">
                  {selected.days?.length} {t('plans.days')}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-white/40 hover:text-white transition-colors p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Days + exercises */}
            <div className="divide-y divide-white/5">
              {selected.days?.map(day => (
                <div key={day.id} className="px-6 py-5">
                  <p
                    className="text-xs font-black tracking-widest uppercase mb-3"
                    style={{ color: '#CCFF00' }}
                    dir="rtl"
                  >
                    {day.name}
                  </p>
                  <div className="space-y-2">
                    {day.exercises?.map((ex, i) => {
                      const vid = EXERCISE_VIDEOS[ex.exercise_name]
                      const displayName = vid?.hebrewName || ex.exercise_name
                      return (
                        <div key={i} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/80 font-medium" dir="rtl">{displayName}</span>
                            {vid && (
                              <button
                                onClick={() => setVideoExercise(ex.exercise_name)}
                                className="transition-colors hover:opacity-80"
                                style={{ color: '#CCFF00' }}
                              >
                                <span className="material-symbols-outlined text-base">play_circle</span>
                              </button>
                            )}
                          </div>
                          <span className="text-xs font-black text-white/40 tracking-widest">
                            {ex.sets}×{ex.reps}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Panel actions */}
            <div className="p-6 flex gap-3 border-t border-white/10">
              <button
                onClick={() => activatePlan(selected)}
                className="flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{ background: '#CCFF00', color: '#000' }}
              >
                {t('plans.activate')}
              </button>
              {selected.is_custom === 1 && (
                <button
                  onClick={() => deletePlan(selected.id)}
                  className="px-5 py-4 rounded-xl font-black text-sm transition-all duration-200 hover:bg-red-900/40 active:scale-[0.98]"
                  style={{ background: '#1A1A1A', color: 'rgba(255,255,255,0.4)' }}
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── PREMIUM CATALOG GRID ── */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <span
              className="text-xs font-black tracking-[0.3em] uppercase"
              style={{ color: '#CCFF00' }}
            >
              PREMIUM CATALOG
            </span>
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs font-bold text-white/30">{plans.length} PROTOCOLS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => {
              const isActive = activePlan?.id === plan.id
              const badge = getPlanBadge(plan.name)
              return (
                <button
                  key={plan.id}
                  onClick={() => openPlan(plan.id)}
                  className="group text-right rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
                  style={{
                    background: '#1A1A1A',
                    border: isActive ? '2px solid #CCFF00' : '2px solid transparent',
                    outline: 'none',
                  }}
                >
                  {/* Top row: badge + active indicator */}
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col items-start gap-2">
                      <span
                        className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase transition-colors duration-300"
                        style={
                          isActive
                            ? { background: '#CCFF00', color: '#000' }
                            : { background: 'rgba(204,255,0,0.12)', color: '#CCFF00' }
                        }
                      >
                        {badge}
                      </span>
                      {isActive && (
                        <span
                          className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase"
                          style={{ background: '#CCFF00', color: '#000' }}
                        >
                          {t('plans.activePlan')}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-white/20 group-hover:text-white/60 transition-colors duration-200 material-symbols-outlined mt-1"
                    >
                      chevron_left
                    </span>
                  </div>

                  {/* Plan name */}
                  <div className="flex-1">
                    <p
                      className="text-lg font-black uppercase leading-tight group-hover:text-white transition-colors"
                      dir="rtl"
                    >
                      {plan.name}
                    </p>
                    {plan.description && (
                      <p className="text-white/40 text-xs mt-1 font-medium line-clamp-2" dir="rtl">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Footer: days + type */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-white/30">calendar_today</span>
                      <span className="text-xs font-black text-white/40 tracking-widest">
                        {plan.days?.length} {t('plans.days')}
                      </span>
                    </div>
                    {plan.is_custom ? (
                      <span
                        className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase border"
                        style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)' }}
                      >
                        {t('plans.custom')}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase"
                        style={{ background: 'rgba(204,255,0,0.08)', color: '#CCFF00' }}
                      >
                        {t('plans.builtin')}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── AI COACH DARK SECTION ── */}
        <section
          className="rounded-2xl p-8 md:p-12 text-center"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span
            className="block text-xs font-black tracking-[0.3em] uppercase mb-4"
            style={{ color: '#CCFF00' }}
          >
            AI COACH
          </span>
          <h2 className="text-3xl md:text-4xl font-black uppercase mb-3" dir="rtl">
            רוצה תוכנית מותאמת אישית?
          </h2>
          <p className="text-white/40 text-sm font-medium mb-8 max-w-md mx-auto" dir="rtl">
            צור תוכנית חדשה בהתאם למטרות שלך, ימי האימון וציוד זמין.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#CCFF00', color: '#000' }}
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            {t('plans.create')}
          </button>
        </section>

      </div>

      {/* ── CREATE PLAN MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center px-4 pb-4 md:pb-0">
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tight">{t('plans.createNew')}</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-white/40 hover:text-white transition-colors p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <input
              className="w-full rounded-xl px-4 py-3 font-bold text-sm outline-none transition-colors placeholder:text-white/30"
              style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              placeholder={t('plans.planName')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              dir="rtl"
            />
            <input
              className="w-full rounded-xl px-4 py-3 font-bold text-sm outline-none transition-colors placeholder:text-white/30"
              style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              placeholder={t('plans.description')}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              dir="rtl"
            />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-white/40 uppercase tracking-widest">{t('plans.days')}</span>
                <button
                  onClick={() => setNewDays(d => [...d, { name: '', exercises: '' }])}
                  className="text-xs font-black uppercase tracking-widest transition-colors hover:opacity-80"
                  style={{ color: '#CCFF00' }}
                >
                  + {t('plans.addExercise')}
                </button>
              </div>
              {newDays.map((day, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white/30 tracking-widest">יום {i + 1}</span>
                    {newDays.length > 1 && (
                      <button
                        onClick={() => setNewDays(d => d.filter((_, j) => j !== i))}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">remove_circle</span>
                      </button>
                    )}
                  </div>
                  <input
                    className="w-full rounded-lg px-3 py-2 font-bold text-sm outline-none placeholder:text-white/20"
                    style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                    placeholder="שם היום — למשל: PUSH — חזה + כתפיים"
                    value={day.name}
                    onChange={e => setNewDays(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    dir="rtl"
                  />
                  <textarea
                    className="w-full rounded-lg px-3 py-2 font-bold text-sm outline-none resize-none placeholder:text-white/20"
                    style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
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
              className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#CCFF00', color: '#000' }}
            >
              {saving ? t('common.loading') : t('plans.createNew')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
