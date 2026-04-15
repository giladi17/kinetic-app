import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PRCelebration from '../components/PRCelebration'
import { useLang } from '../context/LanguageContext'
import { EXERCISE_VIDEOS } from '../data/exerciseVideos'
import ExerciseInfographic from '../components/ExerciseInfographic'

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
  const [exercises, setExercises] = useState([]) // [{ name, prevData }]
  const [setData, setSetData] = useState({})     // { exName: [{ weight, reps, rpe, completed }] }
  const [sessionId, setSessionId] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [restActive, setRestActive] = useState(false)
  const [restSeconds, setRestSeconds] = useState(90)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [alternatives, setAlternatives] = useState([])
  const [loadingAlts, setLoadingAlts] = useState(false)
  const [summary, setSummary] = useState(null) // { volume, duration, sets }
  const [pendingPR, setPendingPR] = useState(null)
  const [isStarted, setIsStarted] = useState(false)
  const [videoExercise, setVideoExercise] = useState(null)

  const elapsedRef = useRef(null)
  const restRef = useRef(null)

  // Running elapsed timer — only after user starts
  useEffect(() => {
    if (!isStarted) return
    elapsedRef.current = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(elapsedRef.current)
  }, [isStarted])

  // Init: create session + fetch workout + previous sets
  useEffect(() => {
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

      // Fetch prev data for all exercises in parallel
      const prevResults = await Promise.all(
        exNames.map(name =>
          fetch(`${API}/sets/last?exercise=${encodeURIComponent(name)}`).then(r => r.json())
        )
      )

      const initSets = {}
      const exList = exNames.map((name, i) => {
        const prev = prevResults[i]
        const defaultSet = {
          weight: prev?.weight ?? '',
          reps: prev?.reps ?? '',
          rpe: prev?.rpe ?? 7,
          completed: false,
        }
        initSets[name] = [{ ...defaultSet }, { ...defaultSet }, { ...defaultSet }]
        return { name, prevData: prev }
      })

      setWorkout(workoutData)
      setExercises(exList)
      setSetData(initSets)
    }
    init().catch(console.error)
  }, [id])

  // Rest timer countdown
  useEffect(() => {
    if (restActive) {
      setRestSeconds(90)
      restRef.current = setInterval(() => {
        setRestSeconds(s => {
          if (s <= 1) {
            clearInterval(restRef.current)
            setRestActive(false)
            return 90
          }
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
  const totalVolume = completedSets.reduce(
    (sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0),
    0
  )
  const calories = completedSets.reduce(
    (sum, s) => sum + Math.round((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) * 0.05),
    0
  )

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

  if (!workout) return (
    <main className="pt-24 pb-32 px-6 min-h-screen flex items-center justify-center">
      <span className="font-headline text-2xl font-bold animate-pulse text-primary-fixed-dim">LOADING...</span>
    </main>
  )

  if (!isStarted) return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 bg-background">
      <div className="text-center space-y-2">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">{LEVEL_LABELS[workout.level] || workout.level} • {CATEGORY_LABELS[workout.category] || workout.category}</span>
        <h1 className="font-headline text-4xl font-black uppercase">{workout.name}</h1>
        <p className="text-on-surface-variant font-body">{exercises.length} {t('activeWorkout.exercises')} · {workout.duration} {t('common.minutes')}</p>
      </div>
      <button
        onClick={() => setIsStarted(true)}
        className="bg-primary-container text-on-primary-fixed px-12 py-6 rounded-xl font-headline font-black text-xl uppercase shadow-[0_0_30px_rgba(202,253,0,0.25)] active:scale-95 duration-200"
      >
        {t('activeWorkout.startButton')}
      </button>
    </main>
  )

  return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-5">

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

      {/* Alternatives Modal */}
      {showAlternatives && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center px-4 pb-8">
          <div className="bg-surface-container-low rounded-xl p-6 w-full max-w-lg space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-headline font-bold text-xl uppercase">{t('workouts.alternatives')}</h3>
                <p className="font-body text-xs text-on-surface-variant mt-0.5">{t('workouts.equipment')}</p>
              </div>
              <button onClick={() => setShowAlternatives(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {loadingAlts && (
              <p className="font-headline text-sm animate-pulse text-center text-primary-fixed-dim">{t('common.loading')}</p>
            )}
            {!loadingAlts && alternatives.length === 0 && (
              <p className="font-body text-sm text-on-surface-variant text-center py-4">{t('workouts.noResults')}</p>
            )}
            <div className="space-y-3">
              {alternatives.map(alt => (
                <button
                  key={alt.id}
                  onClick={() => { setShowAlternatives(false); navigate(`/workout/${alt.id}`) }}
                  className="w-full bg-surface-container rounded-xl p-4 flex justify-between items-center active:scale-[0.98] duration-200 text-left"
                >
                  <div>
                    <span className="font-headline font-bold text-base block">{alt.name}</span>
                    <div className="flex gap-3 mt-1">
                      <span className="font-label text-xs text-on-surface-variant">{alt.duration} MIN</span>
                      <span className="font-label text-xs text-primary-fixed-dim uppercase">{alt.level}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary-fixed-dim">
                    <span className="font-headline font-bold text-sm">{t('workouts.switchWorkout')}</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workout Summary Modal */}
      {summary && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-surface-container-low rounded-2xl p-8 w-full max-w-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-container mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(202,253,0,0.35)]">
              <span className="material-symbols-outlined text-on-primary-fixed text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                emoji_events
              </span>
            </div>
            <div>
              <h2 className="font-headline text-2xl font-bold uppercase">{t('activeWorkout.summary')}</h2>
              <p className="font-body text-sm text-on-surface-variant mt-1">{t('activeWorkout.newPR')}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('activeWorkout.totalVolume'), value: `${summary.volume}kg` },
                { label: t('activeWorkout.totalTime'), value: `${Math.round(summary.duration / 60)}m` },
                { label: t('activeWorkout.totalSets'), value: summary.sets },
              ].map((s, i) => (
                <div key={i} className="bg-surface-container rounded-xl py-3">
                  <span className="block font-headline font-bold text-xl text-primary-container">{s.value}</span>
                  <span className="font-label text-[10px] text-on-surface-variant uppercase">{s.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/progress')}
              className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-headline font-bold text-sm tracking-widest active:scale-95 duration-200"
            >
              {t('activeWorkout.close')}
            </button>
          </div>
        </div>
      )}

      {/* Rest Timer Overlay */}
      {restActive && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-surface-container-low rounded-2xl p-10 text-center space-y-5 w-full max-w-xs">
            <span className="material-symbols-outlined text-primary-fixed-dim text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              timer
            </span>
            <div>
              <p className="font-label text-xs tracking-widest text-on-surface-variant uppercase mb-2">{t('activeWorkout.restTimer')}</p>
              <div className="font-headline text-8xl font-extrabold text-primary-container text-glow-lime">
                {fmt(restSeconds)}
              </div>
            </div>
            <button
              onClick={() => setRestActive(false)}
              className="w-full bg-surface-container-highest py-3 rounded-xl font-headline font-bold text-sm tracking-widest active:scale-95 duration-200"
            >
              {t('activeWorkout.skipRest')}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start pt-4">
        <div className="flex-1 min-w-0 pr-4">
          <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">
            {LEVEL_LABELS[workout.level] || workout.level} • {CATEGORY_LABELS[workout.category] || workout.category}
          </span>
          <h1 className="font-headline text-2xl font-bold tracking-tight uppercase leading-tight truncate">
            {workout.name}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <span className="font-label text-[10px] text-on-surface-variant block uppercase tracking-widest">{t('activeWorkout.elapsed')}</span>
          <span className="font-headline text-3xl font-bold text-primary-container">{fmt(elapsed)}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('activeWorkout.volume'), value: `${Math.round(totalVolume)}`, unit: t('common.kg') },
          { label: t('activeWorkout.setsDone'), value: completedSets.length, unit: '' },
          { label: t('activeWorkout.calories'), value: calories > 0 ? `~${calories}` : '0', unit: t('common.kcal') },
        ].map((m, i) => (
          <div key={i} className="bg-surface-container-low rounded-xl p-4 text-center">
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="font-headline font-bold text-2xl">{m.value}</span>
              {m.unit && <span className="font-label text-xs text-on-surface-variant">{m.unit}</span>}
            </div>
            <span className="block font-label text-[10px] text-on-surface-variant uppercase mt-0.5">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Exercise Cards */}
      <div className="space-y-4">
        {exercises.map(ex => (
          <ExerciseCard
            key={ex.name}
            exercise={ex}
            sets={setData[ex.name] || []}
            onUpdateSet={(setIdx, field, value) => updateSet(ex.name, setIdx, field, value)}
            onCompleteSet={setIdx => completeSet(ex.name, setIdx)}
            onAddSet={() => addSet(ex.name)}
            onWatchVideo={() => setVideoExercise(ex.name)}
          />
        ))}
      </div>

      {/* Switch Workout */}
      <div className="flex justify-center pt-2">
        <button
          onClick={fetchAlternatives}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-label text-sm active:scale-95 duration-200"
        >
          <span className="material-symbols-outlined text-base">sync</span>
          {t('workouts.equipment')}
        </button>
      </div>

      {/* Finish Button */}
      <button
        onClick={finishWorkout}
        disabled={completedSets.length === 0}
        className="w-full bg-primary-container text-on-primary-fixed py-5 rounded-xl font-headline font-bold text-base tracking-widest shadow-[0_10px_20px_rgba(202,253,0,0.15)] hover:opacity-90 transition-opacity disabled:opacity-25 active:scale-95 duration-200"
      >
        {t('activeWorkout.finishWorkout')}
      </button>

      {pendingPR && (
        <PRCelebration pr={pendingPR} onClose={() => setPendingPR(null)} />
      )}

    </main>
  )
}

function ExerciseCard({ exercise, sets, onUpdateSet, onCompleteSet, onAddSet, onWatchVideo }) {
  const { t } = useLang()
  const completedCount = sets.filter(s => s.completed).length
  const hasVideo = !!EXERCISE_VIDEOS[exercise.name]

  return (
    <div className="bg-surface-container-low rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-container">
        <div className="w-9 h-9 rounded-lg bg-primary-container/15 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary-fixed-dim text-base">fitness_center</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-headline font-bold text-base truncate">{exercise.name}</h3>
            {hasVideo && (
              <button
                onClick={onWatchVideo}
                className="shrink-0 flex items-center gap-0.5 text-primary-fixed-dim hover:text-primary-container transition-colors active:scale-90 duration-150"
              >
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
              </button>
            )}
          </div>
          {exercise.prevData ? (
            <p className="font-label text-[10px] text-on-surface-variant">
              {t('activeWorkout.lastTime')}: {exercise.prevData.weight}kg × {exercise.prevData.reps} @ RPE {exercise.prevData.rpe}
            </p>
          ) : (
            <p className="font-label text-[10px] text-on-surface-variant">{t('errors.noData')}</p>
          )}
        </div>
        <span className="font-label text-xs font-bold text-primary-fixed-dim shrink-0">
          {completedCount}/{sets.length}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[32px_1fr_1fr_88px_40px] gap-2 px-5 pt-3 pb-1">
        <span className="font-label text-[9px] text-on-surface-variant uppercase text-center">{t('activeWorkout.sets')}</span>
        <span className="font-label text-[9px] text-on-surface-variant uppercase text-center">{t('common.kg')}</span>
        <span className="font-label text-[9px] text-on-surface-variant uppercase text-center">{t('activeWorkout.reps')}</span>
        <span className="font-label text-[9px] text-on-surface-variant uppercase text-center">{t('activeWorkout.rpe')}</span>
        <span></span>
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
          className="w-full py-2 mt-1 rounded-lg border border-dashed border-surface-container-highest text-on-surface-variant font-label text-xs hover:border-primary-container hover:text-primary-fixed-dim transition-colors active:scale-[0.98] duration-150"
        >
          {t('activeWorkout.addSet')}
        </button>
      </div>
    </div>
  )
}

function SetRow({ setNumber, set, onUpdate, onComplete }) {
  const canComplete = !set.completed && set.weight !== '' && set.reps !== ''

  return (
    <div className={`grid grid-cols-[32px_1fr_1fr_88px_40px] gap-2 items-center transition-opacity duration-300 ${set.completed ? 'opacity-50' : ''}`}>
      {/* Set number / checkmark */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-headline font-bold text-sm ${
        set.completed ? 'bg-primary-container/20 text-primary-fixed-dim' : 'bg-surface-container text-on-surface-variant'
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
        placeholder="ק״ג"
        min="0"
        step="0.5"
        className="bg-surface-container-high rounded-lg px-2 py-2 font-body text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary-container text-center w-full disabled:opacity-60"
      />

      {/* Reps */}
      <input
        type="number"
        value={set.reps}
        onChange={e => onUpdate('reps', e.target.value)}
        disabled={set.completed}
        placeholder="חזרות"
        min="0"
        className="bg-surface-container-high rounded-lg px-2 py-2 font-body text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary-container text-center w-full disabled:opacity-60"
      />

      {/* RPE stepper */}
      <div className="flex items-center justify-between bg-surface-container-high rounded-lg overflow-hidden">
        <button
          onClick={() => onUpdate('rpe', Math.max(1, set.rpe - 1))}
          disabled={set.completed}
          className="w-7 h-8 font-bold text-on-surface hover:bg-surface-container-highest disabled:opacity-60 flex items-center justify-center"
        >
          −
        </button>
        <span className="font-headline font-bold text-sm w-6 text-center">{set.rpe}</span>
        <button
          onClick={() => onUpdate('rpe', Math.min(10, set.rpe + 1))}
          disabled={set.completed}
          className="w-7 h-8 font-bold text-on-surface hover:bg-surface-container-highest disabled:opacity-60 flex items-center justify-center"
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
            ? 'bg-primary-container/20 text-primary-fixed-dim cursor-default'
            : canComplete
              ? 'bg-primary-container text-on-primary-fixed shadow-[0_0_12px_rgba(202,253,0,0.25)]'
              : 'bg-surface-container-highest text-on-surface-variant opacity-30'
        }`}
      >
        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
          {set.completed ? 'check_circle' : 'check'}
        </span>
      </button>
    </div>
  )
}
