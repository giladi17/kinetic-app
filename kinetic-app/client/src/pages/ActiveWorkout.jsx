import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PRCelebration from '../components/PRCelebration'
import { useLang } from '../context/LanguageContext'
import { EXERCISE_VIDEOS } from '../data/exerciseVideos'
import ExerciseInfographic from '../components/ExerciseInfographic'
import { authFetch } from '../api'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

const LEVEL_LABELS = {
  BEGINNER: 'מתחיל',
  INTERMEDIATE: 'בינוני',
  ADVANCED: 'מתקדם',
  ELITE: 'עילית',
}
const CATEGORY_LABELS = {
  STRENGTH: 'כוח',
  CARDIO: 'קרדיו',
  HIIT: 'HIIT',
  YOGA: 'יוגה',
  FLEXIBILITY: 'גמישות',
}

export default function ActiveWorkout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLang()

  const [workout, setWorkout] = useState(null)
  const [exercises, setExercises] = useState([])
  const [setData, setSetData] = useState({})
  const [sessionId, setSessionId] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [restActive, setRestActive] = useState(false)
  const [restSeconds, setRestSeconds] = useState(90)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [alternatives, setAlternatives] = useState([])
  const [loadingAlts, setLoadingAlts] = useState(false)
  const [summary, setSummary] = useState(null)
  const [pendingPR, setPendingPR] = useState(null)
  const [isStarted, setIsStarted] = useState(false)
  const [videoExercise, setVideoExercise] = useState(null)
  const [tomInput, setTomInput] = useState('')
  const [tomLoading, setTomLoading] = useState(false)

  const elapsedRef = useRef(null)
  const restRef = useRef(null)

  useEffect(() => {
    if (!isStarted) return
    elapsedRef.current = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(elapsedRef.current)
  }, [isStarted])

  useEffect(() => {
    // Free mode: no workout id — start empty session
    if (!id) {
      setWorkout({ name: 'Free Workout', level: 'INTERMEDIATE', category: 'STRENGTH', duration: 0 })
      return
    }

    async function init() {
      const [sessionRes, workoutData] = await Promise.all([
        fetch(`${API}/sessions/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workoutId: parseInt(id) }),
        }).then(r => r.json()),
        fetch(`${API}/workouts/${id}`).then(r => r.json()),
      ])

      setSessionId(sessionRes.session_id)

      let exNames = []
      try { exNames = JSON.parse(workoutData.exercises || '[]') } catch {}
      if (exNames.length === 0) exNames = ['Exercise 1', 'Exercise 2', 'Exercise 3']

      const prevResults = await Promise.all(
        exNames.map(name =>
          fetch(`${API}/sets/last?exercise=${encodeURIComponent(name)}`).then(r => r.json())
        )
      )

      const initSets = {}
      const exList = exNames.map((name, i) => {
        const prev = prevResults[i]
        const defaultSet = { weight: prev?.weight ?? '', reps: prev?.reps ?? '', rpe: prev?.rpe ?? 7, completed: false }
        initSets[name] = [{ ...defaultSet }, { ...defaultSet }, { ...defaultSet }]
        return { name, prevData: prev }
      })

      setWorkout(workoutData)
      setExercises(exList)
      setSetData(initSets)
    }
    init().catch(console.error)
  }, [id])

  useEffect(() => {
    if (restActive) {
      setRestSeconds(90)
      restRef.current = setInterval(() => {
        setRestSeconds(s => {
          if (s <= 1) { clearInterval(restRef.current); setRestActive(false); return 90 }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(restRef.current)
    }
    return () => clearInterval(restRef.current)
  }, [restActive])

  function fmt(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function updateSet(exName, setIdx, field, value) {
    setSetData(prev => {
      const updated = [...prev[exName]]
      updated[setIdx] = { ...updated[setIdx], [field]: value }
      return { ...prev, [exName]: updated }
    })
  }

  async function completeSet(exName, setIdx) {
    const set = setData[exName][setIdx]
    if (!set.weight || !set.reps) return

    const response = await fetch(`${API}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        exercise_name: exName,
        set_number: setIdx + 1,
        weight: parseFloat(set.weight) || 0,
        reps: parseInt(set.reps) || 0,
        rpe: set.rpe,
      }),
    }).then(r => r.json()).catch(() => ({}))

    if (response.isPR) setPendingPR(response.prDetails)
    updateSet(exName, setIdx, 'completed', true)
    setRestActive(true)
  }

  function addSet(exName) {
    const last = setData[exName]?.at(-1)
    setSetData(prev => ({
      ...prev,
      [exName]: [
        ...prev[exName],
        { weight: last?.weight ?? '', reps: last?.reps ?? '', rpe: last?.rpe ?? 7, completed: false },
      ],
    }))
  }

  const allSets = Object.values(setData).flat()
  const completedSets = allSets.filter(s => s.completed)
  const totalVolume = completedSets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0)
  const calories = completedSets.reduce((sum, s) => sum + Math.round((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) * 0.05), 0)

  async function finishWorkout() {
    if (completedSets.length === 0) return
    clearInterval(elapsedRef.current)
    await fetch(`${API}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: elapsed, calories, volume: Math.round(totalVolume) }),
    }).catch(() => {})
    setSummary({ volume: Math.round(totalVolume), duration: elapsed, sets: completedSets.length })
  }

  async function fetchAlternatives() {
    setLoadingAlts(true)
    setShowAlternatives(true)
    try {
      const data = await fetch(`${API}/workouts/alternatives?muscle_group=strength&exclude_id=${id}`).then(r => r.json())
      setAlternatives(data)
    } catch {
      setAlternatives([])
    } finally {
      setLoadingAlts(false)
    }
  }

  async function sendTomMessage() {
    if (!tomInput.trim() || tomLoading) return
    const msg = tomInput.trim()
    setTomInput('')
    setTomLoading(true)
    try {
      await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
    } catch {}
    setTomLoading(false)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!workout) return (
    <div className="bg-[#151C25] min-h-screen flex items-center justify-center">
      <span className="text-electric-lime text-2xl font-black italic uppercase animate-pulse font-space">
        LOADING...
      </span>
    </div>
  )

  // ── Pre-start screen ───────────────────────────────────────────────────────
  if (!isStarted) return (
    <div className="bg-[#151C25] min-h-screen flex flex-col items-center justify-center gap-8 px-6 font-space">
      <div className="text-center space-y-3">
        <span className="text-xs text-gray-500 uppercase tracking-[0.25em] font-bold block">
          {LEVEL_LABELS[workout.level] || workout.level} · {CATEGORY_LABELS[workout.category] || workout.category}
        </span>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
          {workout.name}
        </h1>
        <p className="text-gray-400 font-medium">
          {exercises.length} {t('activeWorkout.exercises')} · {workout.duration} {t('common.minutes')}
        </p>
      </div>
      <button
        onClick={() => setIsStarted(true)}
        className="bg-electric-lime text-black px-14 py-5 rounded-2xl font-black text-xl uppercase tracking-widest hover:shadow-[0_0_30px_rgba(204,255,0,0.4)] hover:scale-105 active:scale-95 transition-all"
      >
        {t('activeWorkout.startButton')}
      </button>
    </div>
  )

  // ── Main workout screen ────────────────────────────────────────────────────
  return (
    <div className="bg-[#151C25] min-h-screen text-white font-space pb-32">

      {/* ── Video Modal ── */}
      {videoExercise && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto"
             onClick={() => setVideoExercise(null)}>
          <div className="w-full max-w-md my-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setVideoExercise(null)}
                      className="text-white bg-[#0E0E0E] rounded-full p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <ExerciseInfographic exerciseName={videoExercise} />
          </div>
        </div>
      )}

      {/* ── Alternatives Modal ── */}
      {showAlternatives && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center px-4 pb-8">
          <div className="bg-[#0E0E0E] rounded-3xl p-6 w-full max-w-lg space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-xl uppercase">{t('workouts.alternatives')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('workouts.equipment')}</p>
              </div>
              <button onClick={() => setShowAlternatives(false)} className="text-gray-500 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {loadingAlts && <p className="text-sm animate-pulse text-center text-electric-lime">{t('common.loading')}</p>}
            {!loadingAlts && alternatives.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">{t('workouts.noResults')}</p>
            )}
            <div className="space-y-3">
              {alternatives.map(alt => (
                <button
                  key={alt.id}
                  onClick={() => { setShowAlternatives(false); navigate(`/workout/${alt.id}`) }}
                  className="w-full bg-[#151C25] rounded-2xl p-4 flex justify-between items-center active:scale-[0.98] duration-200 text-left hover:bg-[#1e2a3a] transition-colors"
                >
                  <div>
                    <span className="font-bold text-base block">{alt.name}</span>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-500">{alt.duration} MIN</span>
                      <span className="text-xs text-electric-lime uppercase">{alt.level}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-electric-lime">arrow_forward</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Modal ── */}
      {summary && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-[#0E0E0E] rounded-3xl p-8 w-full max-w-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-electric-lime/20 mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(204,255,0,0.35)]">
              <span className="material-symbols-outlined text-electric-lime text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                emoji_events
              </span>
            </div>
            <div>
              <h2 className="font-black text-2xl uppercase">{t('activeWorkout.summary')}</h2>
              <p className="text-sm text-gray-400 mt-1">{t('activeWorkout.newPR')}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('activeWorkout.totalVolume'), value: `${summary.volume}kg` },
                { label: t('activeWorkout.totalTime'), value: `${Math.round(summary.duration / 60)}m` },
                { label: t('activeWorkout.totalSets'), value: summary.sets },
              ].map((s, i) => (
                <div key={i} className="bg-[#151C25] rounded-2xl py-3">
                  <span className="block font-black text-xl text-electric-lime">{s.value}</span>
                  <span className="text-[10px] text-gray-500 uppercase">{s.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/progress')}
              className="w-full bg-electric-lime text-black py-4 rounded-2xl font-black text-sm tracking-widest uppercase active:scale-95 duration-200"
            >
              {t('activeWorkout.close')}
            </button>
          </div>
        </div>
      )}

      {/* ── Rest Timer ── */}
      {restActive && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-[#0E0E0E] rounded-3xl p-10 text-center space-y-5 w-full max-w-xs">
            <span className="material-symbols-outlined text-electric-lime text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
            <div>
              <p className="text-xs text-gray-500 tracking-widest uppercase mb-2">{t('activeWorkout.restTimer')}</p>
              <div className="text-8xl font-black text-electric-lime text-glow-lime">
                {fmt(restSeconds)}
              </div>
            </div>
            <button
              onClick={() => setRestActive(false)}
              className="w-full bg-[#151C25] py-3 rounded-2xl font-black text-sm tracking-widest uppercase active:scale-95 duration-200 hover:bg-[#1e2a3a] transition-colors"
            >
              {t('activeWorkout.skipRest')}
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="px-6 pt-8 pb-6 flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-4">
          <span className="text-xs text-gray-500 uppercase tracking-[0.2em] font-bold block">
            {LEVEL_LABELS[workout.level] || workout.level} · {CATEGORY_LABELS[workout.category] || workout.category}
          </span>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-electric-lime leading-tight truncate">
            {workout.name}
          </h1>
          <p className="text-gray-500 font-medium text-sm mt-0.5">Focus. Execute.</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-gray-500 block uppercase tracking-widest">{t('activeWorkout.elapsed')}</span>
          <span className="text-3xl font-black text-electric-lime">{fmt(elapsed)}</span>
        </div>
      </header>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-3 px-6 mb-6">
        {[
          { label: t('activeWorkout.volume'), value: `${Math.round(totalVolume)}`, unit: 'kg' },
          { label: t('activeWorkout.setsDone'), value: completedSets.length, unit: '' },
          { label: t('activeWorkout.calories'), value: calories > 0 ? `~${calories}` : '0', unit: 'kcal' },
        ].map((m, i) => (
          <div key={i} className="bg-[#0E0E0E] rounded-2xl p-4 text-center">
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="font-black text-2xl text-white">{m.value}</span>
              {m.unit && <span className="text-xs text-gray-500 ml-0.5">{m.unit}</span>}
            </div>
            <span className="block text-[10px] text-gray-500 uppercase mt-0.5 tracking-wider">{m.label}</span>
          </div>
        ))}
      </div>

      {/* ── Exercise Cards ── */}
      <div className="px-6 space-y-4">
        {exercises.map(ex => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            sets={setData[ex.name] || []}
            onUpdateSet={(setIdx, field, value) => updateSet(ex.name, setIdx, field, value)}
            onCompleteSet={setIdx => completeSet(ex.name, setIdx)}
            onAddSet={() => addSet(ex.name)}
            onWatchVideo={() => setVideoExercise(ex.name)}
            t={t}
          />
        ))}
      </div>

      {/* ── Switch Workout ── */}
      <div className="flex justify-center pt-6 px-6">
        <button
          onClick={fetchAlternatives}
          className="flex items-center gap-2 text-gray-500 hover:text-white font-medium text-sm active:scale-95 duration-200 transition-colors"
        >
          <span className="material-symbols-outlined text-base">sync</span>
          {t('workouts.equipment')}
        </button>
      </div>

      {/* ── Finish Button ── */}
      <div className="px-6 pt-6">
        <button
          onClick={finishWorkout}
          disabled={completedSets.length === 0}
          className="w-full bg-electric-lime text-black py-5 rounded-2xl font-black text-base tracking-widest uppercase hover:shadow-[0_0_30px_rgba(204,255,0,0.4)] hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          {t('activeWorkout.finishWorkout')}
        </button>
      </div>

      {pendingPR && <PRCelebration pr={pendingPR} onClose={() => setPendingPR(null)} />}

      {/* ── TOM Input Bar ── */}
      <div className="fixed bottom-6 left-4 right-4 z-30">
        <div className="bg-[#0E0E0E] rounded-full px-4 py-3 flex items-center gap-3 shadow-2xl border border-gray-800">
          <span className="material-symbols-outlined text-electric-lime text-xl shrink-0">smart_toy</span>
          <input
            type="text"
            value={tomInput}
            onChange={e => setTomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendTomMessage()}
            placeholder="Tell TOM what you just lifted..."
            className="bg-transparent flex-1 text-white placeholder-gray-600 focus:outline-none text-sm font-medium"
          />
          <button
            onClick={sendTomMessage}
            disabled={!tomInput.trim() || tomLoading}
            className="bg-electric-lime text-black rounded-full p-1.5 hover:scale-110 active:scale-90 transition-all disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">{tomLoading ? 'hourglass_top' : 'send'}</span>
          </button>
        </div>
      </div>

    </div>
  )
}

// ── ExerciseCard ──────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, sets, onUpdateSet, onCompleteSet, onAddSet, onWatchVideo, t }) {
  const completedCount = sets.filter(s => s.completed).length
  const hasVideo = !!EXERCISE_VIDEOS[exercise.name]

  return (
    <div className="bg-[#0E0E0E] rounded-3xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/50">
        <div className="w-9 h-9 rounded-xl bg-electric-lime/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-electric-lime text-base">fitness_center</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base uppercase tracking-wider truncate">{exercise.name}</h3>
            {hasVideo && (
              <button
                onClick={onWatchVideo}
                className="shrink-0 text-electric-lime/60 hover:text-electric-lime transition-colors active:scale-90 duration-150"
              >
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
              </button>
            )}
          </div>
          {exercise.prevData ? (
            <p className="text-[10px] text-gray-600">
              {t('activeWorkout.lastTime')}: {exercise.prevData.weight}kg × {exercise.prevData.reps} @ RPE {exercise.prevData.rpe}
            </p>
          ) : (
            <p className="text-[10px] text-gray-600">{t('errors.noData')}</p>
          )}
        </div>
        <span className="font-black text-sm text-electric-lime shrink-0">
          {completedCount}/{sets.length}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[32px_1fr_1fr_88px_40px] gap-2 px-5 pt-3 pb-1">
        <span className="text-[9px] text-gray-600 uppercase text-center">{t('activeWorkout.sets')}</span>
        <span className="text-[9px] text-gray-600 uppercase text-center">{t('common.kg')}</span>
        <span className="text-[9px] text-gray-600 uppercase text-center">{t('activeWorkout.reps')}</span>
        <span className="text-[9px] text-gray-600 uppercase text-center">{t('activeWorkout.rpe')}</span>
        <span />
      </div>

      {/* Set Rows */}
      <div className="px-5 pb-4 space-y-2">
        {sets.map((set, idx) => (
          <SetRow
            key={idx}
            setNumber={idx + 1}
            set={set}
            onUpdate={(field, value) => onUpdateSet(idx, field, value)}
            onComplete={() => onCompleteSet(idx)}
          />
        ))}
        <button
          onClick={onAddSet}
          className="w-full py-2 mt-1 rounded-xl border border-dashed border-gray-800 text-gray-600 text-xs hover:border-electric-lime/50 hover:text-electric-lime transition-colors active:scale-[0.98] duration-150"
        >
          + {t('activeWorkout.addSet')}
        </button>
      </div>
    </div>
  )
}

// ── SetRow ────────────────────────────────────────────────────────────────────
function SetRow({ setNumber, set, onUpdate, onComplete }) {
  const canComplete = !set.completed && set.weight !== '' && set.reps !== ''

  return (
    <div className={`grid grid-cols-[32px_1fr_1fr_88px_40px] gap-2 items-center transition-opacity duration-300 ${set.completed ? 'opacity-50' : ''}`}>
      {/* Set number */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
        set.completed ? 'bg-electric-lime/15 text-electric-lime' : 'bg-gray-800 text-gray-400'
      }`}>
        {set.completed
          ? <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
          : setNumber
        }
      </div>

      {/* Weight */}
      <input
        type="number"
        value={set.weight}
        onChange={e => onUpdate('weight', e.target.value)}
        disabled={set.completed}
        placeholder="kg"
        min="0"
        step="0.5"
        className="bg-gray-800 rounded-xl px-2 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-electric-lime/50 text-center w-full disabled:opacity-60 placeholder-gray-600"
      />

      {/* Reps */}
      <input
        type="number"
        value={set.reps}
        onChange={e => onUpdate('reps', e.target.value)}
        disabled={set.completed}
        placeholder="reps"
        min="0"
        className="bg-gray-800 rounded-xl px-2 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-electric-lime/50 text-center w-full disabled:opacity-60 placeholder-gray-600"
      />

      {/* RPE stepper */}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => onUpdate('rpe', Math.max(1, set.rpe - 1))}
          disabled={set.completed}
          className="w-7 h-8 font-bold text-gray-300 hover:bg-gray-700 disabled:opacity-60 flex items-center justify-center"
        >
          −
        </button>
        <span className="font-black text-sm w-6 text-center text-white">{set.rpe}</span>
        <button
          onClick={() => onUpdate('rpe', Math.min(10, set.rpe + 1))}
          disabled={set.completed}
          className="w-7 h-8 font-bold text-gray-300 hover:bg-gray-700 disabled:opacity-60 flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* Complete button */}
      <button
        onClick={onComplete}
        disabled={!canComplete}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 duration-200 ${
          set.completed
            ? 'bg-electric-lime/15 text-electric-lime cursor-default'
            : canComplete
              ? 'bg-electric-lime text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
              : 'bg-gray-800 text-gray-600 opacity-30'
        }`}
      >
        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
          {set.completed ? 'check_circle' : 'check'}
        </span>
      </button>
    </div>
  )
}
