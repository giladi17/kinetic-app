import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { getPersona } from '../data/personas'
import { authFetch } from '../api'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

const STEPS = [
  { id: 'welcome' },
  { id: 'dashboard' },
  { id: 'workouts' },
  { id: 'nutrition' },
  { id: 'ai' },
  { id: 'choice' },
  { id: 'plan' },   // 7a or 7b depending on choice
  { id: 'done' },
]

export default function OnboardingTour({ onDone }) {
  const navigate = useNavigate()
  const { user, refreshUser } = useUser()
  const persona = getPersona(user?.gender, user?.aiPersona)
  const name = user?.name || 'חבר'
  const isFemale = user?.gender === 'female'

  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState(null) // 'manual' | 'ai'

  // 7a state
  const [trainDays, setTrainDays] = useState('3')
  const [trainType, setTrainType] = useState('strength')
  const [exercises, setExercises] = useState('')

  // 7b state
  const [aiGoal, setAiGoal] = useState('maintain')
  const [aiDays, setAiDays] = useState('3')
  const [aiEquipment, setAiEquipment] = useState('gym')
  const [aiLimitations, setAiLimitations] = useState('')
  const [aiLevel, setAiLevel] = useState('intermediate')
  const [generating, setGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState(null)

  async function finish() {
    await authFetch(`${API}/users/tour-done`, { method: 'PATCH' })
    await refreshUser()
    onDone?.()
    navigate('/dashboard')
  }

  async function handleGeneratePlan() {
    setGenerating(true)
    try {
      const res = await authFetch(`${API}/ai/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: aiGoal,
          daysPerWeek: aiDays,
          equipment: aiEquipment,
          limitations: aiLimitations,
          level: aiLevel,
          gender: user?.gender,
        }),
      })
      const data = await res.json()
      setGeneratedPlan(data.plan)
    } catch {
      setGeneratedPlan({ name: 'תוכנית אישית', days: [] })
    } finally {
      setGenerating(false)
    }
  }

  const Avatar = () => (
    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2" style={{ borderColor: persona.color }}>
      {persona.avatarImg
        ? <img src={persona.avatarImg} alt={persona.name} className="w-full h-full object-cover" />
        : <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: persona.avatar }} />
      }
    </div>
  )

  const Card = ({ children, showBack = true }) => (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111] rounded-2xl p-6 space-y-5 border border-outline-variant/20 shadow-2xl" dir="rtl">
        {children}
        {showBack && step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="text-xs text-on-surface-variant underline w-full text-center">
            חזור
          </button>
        )}
      </div>
    </div>
  )

  const Bubble = ({ text }) => (
    <div className="flex items-start gap-3">
      <Avatar />
      <div className="bg-surface-container rounded-2xl rounded-tl-none px-4 py-3 text-sm text-on-surface leading-relaxed flex-1">
        {text}
      </div>
    </div>
  )

  // Step 0 — Welcome
  if (step === 0) return (
    <Card showBack={false}>
      <Bubble text={`היי ${name}! אני ${persona.name}, ${isFemale ? 'המאמנת' : 'המאמן'} האישי${isFemale ? 'ת' : ''} שלך ב-KINETIC.\nבוא${isFemale ? 'י' : ''} אראה לך את כל מה שיש כאן — 2 דקות וסיימנו! 🚀`} />
      <button
        onClick={() => setStep(1)}
        className="w-full py-4 rounded-xl font-headline font-bold text-lg uppercase tracking-wide"
        style={{ backgroundColor: persona.color, color: '#0e0e0e' }}
      >
        בואו נתחיל!
      </button>
    </Card>
  )

  // Step 1 — Dashboard
  if (step === 1) return (
    <Card>
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl" style={{ color: persona.color, fontVariationSettings: "'FILL' 1" }}>dashboard</span>
        <h2 className="font-headline font-bold text-xl mt-2">Dashboard</h2>
      </div>
      <Bubble text="זה ה-Dashboard שלך — כאן תראה הכל: צעדים יומיים, קלוריות, Readiness Score, ואתגר יומי קטן שאני בוחר לך כל בוקר 💪" />
      <button onClick={() => setStep(2)} className="w-full py-3 rounded-xl font-headline font-bold" style={{ backgroundColor: persona.color, color: '#0e0e0e' }}>
        הבא
      </button>
    </Card>
  )

  // Step 2 — Workouts
  if (step === 2) return (
    <Card>
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl" style={{ color: persona.color, fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
        <h2 className="font-headline font-bold text-xl mt-2">אימונים</h2>
      </div>
      <Bubble text="כאן ספריית האימונים — יש PPL, Upper/Lower, ותוכניות מובנות. אפשר גם לבנות תוכנית אישית לגמרי!" />
      <button onClick={() => setStep(3)} className="w-full py-3 rounded-xl font-headline font-bold" style={{ backgroundColor: persona.color, color: '#0e0e0e' }}>
        הבא
      </button>
    </Card>
  )

  // Step 3 — Nutrition
  if (step === 3) return (
    <Card>
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl" style={{ color: persona.color, fontVariationSettings: "'FILL' 1" }}>restaurant</span>
        <h2 className="font-headline font-bold text-xl mt-2">תזונה</h2>
      </div>
      <Bubble text="מעקב תזונה חכם — הזנה מהירה, וGap Filler שאומר לך בדיוק מה חסר לך בסוף היום 🥗" />
      <button onClick={() => setStep(4)} className="w-full py-3 rounded-xl font-headline font-bold" style={{ backgroundColor: persona.color, color: '#0e0e0e' }}>
        הבא
      </button>
    </Card>
  )

  // Step 4 — AI Chat
  if (step === 4) return (
    <Card>
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl" style={{ color: persona.color, fontVariationSettings: "'FILL' 1" }}>chat</span>
        <h2 className="font-headline font-bold text-xl mt-2">AI Chat</h2>
      </div>
      <Bubble text={`וכמובן — אני כאן תמיד! שאל${isFemale ? 'י' : ''} אותי כל דבר — תוכניות אימון, מה לאכול, שאלות על תרגילים. אני לא בוט — אני חבר שמכיר את הנתונים שלך 😊`} />
      <button onClick={() => setStep(5)} className="w-full py-3 rounded-xl font-headline font-bold" style={{ backgroundColor: persona.color, color: '#0e0e0e' }}>
        הבא
      </button>
    </Card>
  )

  // Step 5 — Choice
  if (step === 5) return (
    <Card>
      <Bubble text="עכשיו — נתחיל? יש לך שתי אפשרויות:" />
      <div className="space-y-3">
        <button
          onClick={() => { setChoice('manual'); setStep(6) }}
          className="w-full p-4 rounded-xl border border-outline-variant/30 bg-surface-container text-right space-y-1 active:scale-[0.98] transition-transform"
        >
          <div className="font-headline font-bold text-sm">יש לי תוכנית — אכניס ידנית</div>
          <div className="font-label text-xs text-on-surface-variant">מלא תרגילים ולוח אימונים קיים</div>
        </button>
        <button
          onClick={() => { setChoice('ai'); setStep(6) }}
          className="w-full p-4 rounded-xl text-right space-y-1 active:scale-[0.98] transition-transform"
          style={{ backgroundColor: `${persona.color}20`, border: `1px solid ${persona.color}50` }}
        >
          <div className="font-headline font-bold text-sm" style={{ color: persona.color }}>בנה לי תוכנית מותאמת אישית ✨</div>
          <div className="font-label text-xs text-on-surface-variant">Claude יבנה תוכנית לפי המטרות שלך</div>
        </button>
      </div>
    </Card>
  )

  // Step 6a — Manual plan
  if (step === 6 && choice === 'manual') return (
    <Card>
      <h2 className="font-headline font-bold text-lg">התוכנית שלך</h2>
      <div className="space-y-4">
        <div>
          <label className="font-label text-xs text-on-surface-variant uppercase block mb-1">כמה ימים בשבוע?</label>
          <div className="flex gap-2">
            {['1','2','3','4','5','6'].map(d => (
              <button key={d} onClick={() => setTrainDays(d)}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${trainDays === d ? 'text-[#0e0e0e]' : 'bg-surface-container-highest'}`}
                style={trainDays === d ? { backgroundColor: persona.color } : {}}
              >{d}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="font-label text-xs text-on-surface-variant uppercase block mb-1">סוג אימון</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ key: 'strength', label: 'כוח' }, { key: 'cardio', label: 'קרדיו' }, { key: 'both', label: 'שניהם' }].map(t => (
              <button key={t.key} onClick={() => setTrainType(t.key)}
                className={`py-2 rounded-lg font-bold text-sm ${trainType === t.key ? 'text-[#0e0e0e]' : 'bg-surface-container-highest'}`}
                style={trainType === t.key ? { backgroundColor: persona.color } : {}}
              >{t.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="font-label text-xs text-on-surface-variant uppercase block mb-1">תרגילים קבועים (אופציונלי)</label>
          <textarea
            value={exercises}
            onChange={e => setExercises(e.target.value)}
            placeholder="לחיצת חזה, סקוואט, מתח..."
            className="w-full bg-surface-container-highest rounded-xl px-3 py-2 text-sm outline-none resize-none h-20"
            dir="rtl"
          />
        </div>
      </div>
      <button onClick={() => setStep(7)} className="w-full py-3 rounded-xl font-headline font-bold" style={{ backgroundColor: persona.color, color: '#0e0e0e' }}>
        שמור תוכנית
      </button>
    </Card>
  )

  // Step 6b — AI plan builder
  if (step === 6 && choice === 'ai') {
    if (generatedPlan) return (
      <Card>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ color: persona.color, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <h2 className="font-headline font-bold text-lg">{generatedPlan.name}</h2>
        </div>
        <p className="text-sm text-on-surface-variant">{generatedPlan.description}</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(generatedPlan.days || []).map(day => (
            <div key={day.dayNumber} className="bg-surface-container rounded-xl p-3">
              <div className="font-headline font-bold text-sm">{day.name}</div>
              <div className="font-label text-xs text-on-surface-variant">{day.muscleGroups}</div>
              <div className="font-label text-xs mt-1 text-on-surface-variant">
                {(day.exercises || []).map(e => e.name).join(' · ')}
              </div>
            </div>
          ))}
        </div>
        <Bubble text="מעולה! שמרתי את התוכנית. תמצא אותה בטאב האימונים 💪" />
        <button onClick={() => setStep(7)} className="w-full py-3 rounded-xl font-headline font-bold" style={{ backgroundColor: persona.color, color: '#0e0e0e' }}>
          מאשר!
        </button>
      </Card>
    )

    return (
      <Card>
        <Bubble text="כמה שאלות קצרות ואבנה לך תוכנית מושלמת 🎯" />
        <div className="space-y-3">
          <div>
            <label className="font-label text-xs text-on-surface-variant uppercase block mb-1">מה המטרה?</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[{ key: 'cut', label: 'ירידה' }, { key: 'maintain', label: 'שמירה' }, { key: 'bulk', label: 'מסה' }].map(g => (
                <button key={g.key} onClick={() => setAiGoal(g.key)}
                  className={`py-2 rounded-lg font-bold text-xs ${aiGoal === g.key ? 'text-[#0e0e0e]' : 'bg-surface-container-highest'}`}
                  style={aiGoal === g.key ? { backgroundColor: persona.color } : {}}
                >{g.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-label text-xs text-on-surface-variant uppercase block mb-1">ימים בשבוע</label>
            <div className="flex gap-1.5">
              {['2','3','4','5','6'].map(d => (
                <button key={d} onClick={() => setAiDays(d)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm ${aiDays === d ? 'text-[#0e0e0e]' : 'bg-surface-container-highest'}`}
                  style={aiDays === d ? { backgroundColor: persona.color } : {}}
                >{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-label text-xs text-on-surface-variant uppercase block mb-1">ציוד</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[{ key: 'gym', label: 'מכון' }, { key: 'home', label: 'בית' }, { key: 'none', label: 'ללא' }].map(e => (
                <button key={e.key} onClick={() => setAiEquipment(e.key)}
                  className={`py-2 rounded-lg font-bold text-xs ${aiEquipment === e.key ? 'text-[#0e0e0e]' : 'bg-surface-container-highest'}`}
                  style={aiEquipment === e.key ? { backgroundColor: persona.color } : {}}
                >{e.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-label text-xs text-on-surface-variant uppercase block mb-1">רמה</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[{ key: 'beginner', label: 'מתחיל' }, { key: 'intermediate', label: 'בינוני' }, { key: 'advanced', label: 'מתקדם' }].map(l => (
                <button key={l.key} onClick={() => setAiLevel(l.key)}
                  className={`py-2 rounded-lg font-bold text-xs ${aiLevel === l.key ? 'text-[#0e0e0e]' : 'bg-surface-container-highest'}`}
                  style={aiLevel === l.key ? { backgroundColor: persona.color } : {}}
                >{l.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-label text-xs text-on-surface-variant uppercase block mb-1">מגבלות פציעות (אופציונלי)</label>
            <input
              value={aiLimitations}
              onChange={e => setAiLimitations(e.target.value)}
              placeholder="כתף, ברך..."
              className="w-full bg-surface-container-highest rounded-xl px-3 py-2 text-sm outline-none"
              dir="rtl"
            />
          </div>
        </div>
        <button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="w-full py-3 rounded-xl font-headline font-bold disabled:opacity-60"
          style={{ backgroundColor: persona.color, color: '#0e0e0e' }}
        >
          {generating ? 'בונה תוכנית...' : 'בנה תוכנית! ✨'}
        </button>
      </Card>
    )
  }

  // Step 7 — Done
  return (
    <Card showBack={false}>
      <div className="text-center space-y-2">
        <div className="text-5xl">🎉</div>
        <h2 className="font-headline font-bold text-2xl">מעולה!</h2>
      </div>
      <Bubble text={`הכל מוכן! אני כאן אם תצטרך${isFemale ? 'י' : ''} משהו. בוא${isFemale ? 'י' : ''} נתחיל!`} />
      <button
        onClick={finish}
        className="w-full py-4 rounded-xl font-headline font-bold text-lg uppercase"
        style={{ backgroundColor: persona.color, color: '#0e0e0e' }}
      >
        לדשבורד!
      </button>
    </Card>
  )
}

