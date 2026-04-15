import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { authFetch } from '../api'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`
const TOTAL_STEPS = 4

const GOALS = [
  { key: 'lose_weight',     label: 'ירידה במשקל',  icon: 'trending_down'   },
  { key: 'gain_muscle',     label: 'עלייה במסה',   icon: 'fitness_center'  },
  { key: 'general_fitness', label: 'כושר כללי',    icon: 'directions_run'  },
  { key: 'health',          label: 'בריאות',        icon: 'favorite'        },
]

const FITNESS_LEVELS = [
  { key: 'beginner',     label: 'מתחיל',  sub: 'פחות משנה של אימונים', icon: 'emoji_nature'   },
  { key: 'intermediate', label: 'בינוני', sub: '1–3 שנים של אימונים',  icon: 'bolt'           },
  { key: 'advanced',     label: 'מתקדם',  sub: '3+ שנים של אימונים',   icon: 'military_tech'  },
]

const DAYS_OPTIONS = ['2', '3', '4', '5+']

export default function Onboarding() {
  const navigate = useNavigate()
  const { refreshUser } = useUser()

  const [step, setStep]               = useState(1)
  const [goal, setGoal]               = useState('')
  const [fitnessLevel, setFitnessLevel] = useState('')
  const [days, setDays]               = useState('')
  const [age, setAge]                 = useState('')
  const [saving, setSaving]           = useState(false)

  const canProceed = (
    (step === 1 && !!goal) ||
    (step === 2 && !!fitnessLevel) ||
    (step === 3 && !!days) ||
    (step === 4 && !!age && parseInt(age) >= 10 && parseInt(age) <= 100)
  )

  async function finish() {
    setSaving(true)
    try {
      await authFetch(`${API}/users/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          fitnessLevel,
          daysPerWeek: days === '5+' ? 5 : parseInt(days),
          age: parseInt(age) || 25,
        }),
      })
      await refreshUser()
      navigate('/dashboard', { replace: true })
    } catch {
      setSaving(false)
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else finish()
  }

  function handleBack() {
    if (step > 1) setStep(s => s - 1)
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white flex flex-col" dir="rtl">

      {/* ── Progress bar ── */}
      <div className="w-full h-1 bg-white/10">
        <div
          className="h-full bg-[#CCFF00] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        {step > 1 ? (
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 transition active:scale-90"
          >
            <span className="material-symbols-outlined text-white text-xl">arrow_forward</span>
          </button>
        ) : (
          <div className="w-10" />
        )}
        <span className="text-white/30 text-sm tabular-nums">{step} / {TOTAL_STEPS}</span>
        <div className="w-10" />
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-36">

        {/* STEP 1 — Goal */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-[#CCFF00] text-xs font-bold uppercase tracking-widest">שלב 1</p>
              <h1 className="font-headline text-3xl font-black uppercase tracking-tight">
                מה המטרה שלך?
              </h1>
              <p className="text-white/40 text-sm">בחר את היעד שתרצה להשיג</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map(g => (
                <button
                  key={g.key}
                  onClick={() => setGoal(g.key)}
                  className={`relative p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-200 active:scale-95 border ${
                    goal === g.key
                      ? 'bg-[#CCFF00] text-[#0e0e0e] border-[#CCFF00] shadow-[0_0_25px_rgba(204,255,0,0.25)]'
                      : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {g.icon}
                  </span>
                  <span className="font-headline font-bold text-sm text-center leading-tight">{g.label}</span>
                  {goal === g.key && (
                    <span
                      className="absolute top-2.5 left-2.5 material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Fitness Level */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-[#CCFF00] text-xs font-bold uppercase tracking-widest">שלב 2</p>
              <h1 className="font-headline text-3xl font-black uppercase tracking-tight">
                רמת הכושר שלך?
              </h1>
              <p className="text-white/40 text-sm">עוזר לנו להתאים את עצימות האימונים</p>
            </div>
            <div className="space-y-3">
              {FITNESS_LEVELS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFitnessLevel(f.key)}
                  className={`w-full px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-200 active:scale-[0.98] border ${
                    fitnessLevel === f.key
                      ? 'bg-[#CCFF00] text-[#0e0e0e] border-[#CCFF00] shadow-[0_0_25px_rgba(204,255,0,0.25)]'
                      : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                  <div className="text-right flex-1">
                    <span className="font-headline font-bold text-base block">{f.label}</span>
                    <span className={`text-xs ${fitnessLevel === f.key ? 'text-[#0e0e0e]/60' : 'text-white/35'}`}>
                      {f.sub}
                    </span>
                  </div>
                  {fitnessLevel === f.key && (
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 — Days per week */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-[#CCFF00] text-xs font-bold uppercase tracking-widest">שלב 3</p>
              <h1 className="font-headline text-3xl font-black uppercase tracking-tight">
                כמה ימים בשבוע<br />אתה מתאמן?
              </h1>
              <p className="text-white/40 text-sm">בחר את המספר הממוצע בשבוע</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {DAYS_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 font-headline font-black text-2xl transition-all duration-200 active:scale-95 border ${
                    days === d
                      ? 'bg-[#CCFF00] text-[#0e0e0e] border-[#CCFF00] shadow-[0_0_25px_rgba(204,255,0,0.25)]'
                      : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-white/25 text-xs text-center tracking-wider uppercase">ימים לשבוע</p>
          </div>
        )}

        {/* STEP 4 — Age */}
        {step === 4 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-[#CCFF00] text-xs font-bold uppercase tracking-widest">שלב 4</p>
              <h1 className="font-headline text-3xl font-black uppercase tracking-tight">מה גילך?</h1>
              <p className="text-white/40 text-sm">לחישוב יעדי הקלוריות שלך</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <input
                type="number"
                min="10"
                max="100"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="25"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-6 text-center text-6xl font-headline font-black text-white outline-none focus:border-[#CCFF00]/40 focus:bg-white/8 transition-all placeholder:text-white/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-white/25 text-sm tracking-wider uppercase">שנים</p>
            </div>

            {/* Summary recap */}
            {goal && fitnessLevel && days && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <p className="text-white/40 text-xs uppercase tracking-widest text-center">הסיכום שלך</p>
                {[
                  { label: 'מטרה',         value: GOALS.find(g => g.key === goal)?.label },
                  { label: 'רמת כושר',     value: FITNESS_LEVELS.find(f => f.key === fitnessLevel)?.label },
                  { label: 'ימים בשבוע',   value: days },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-white/40 text-sm">{row.label}</span>
                    <span className="font-headline font-bold text-sm text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Fixed bottom button ── */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/95 to-transparent">
        <button
          onClick={handleNext}
          disabled={!canProceed || saving}
          className="w-full bg-[#CCFF00] text-[#0e0e0e] py-5 rounded-2xl font-headline font-black text-base tracking-widest uppercase transition-all active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(204,255,0,0.15)]"
        >
          {saving ? 'שומר...' : step === TOTAL_STEPS ? 'בואו נתחיל ✦' : 'הבא →'}
        </button>
      </div>

    </div>
  )
}
