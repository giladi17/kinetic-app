import { useState } from 'react'
import { useUser } from '../context/UserContext'
import { getPersona } from '../data/personas'

const BRIEFING_KEY = 'hasSeenBriefing'

const SLIDES = [
  {
    icon: null, // uses TOM avatar
    title: 'ברוך הבא ללוח הבקרה שלך',
    text: 'כאן תראה את כל מדדי הביצועים, העקביות השבועית שלך, ומצב ההתאוששות.',
    accent: '📊',
  },
  {
    icon: 'nutrition',
    title: 'הזנת תזונה ב-AI',
    text: 'בעמוד התזונה תוכל לכתוב בטקסט חופשי מה אכלת, וה-AI יחשב עבורך קלוריות וחלבון בשניות.',
    accent: '✨',
  },
  {
    icon: 'fitness_center',
    title: 'פרוטוקולי אימון',
    text: 'בעמוד האימונים תוכל לבחור את הפיצול שלך (PPL / Upper Lower) ולעקוב אחרי ההתקדמות.',
    accent: '💪',
  },
]

export default function WelcomeBriefing({ onDone }) {
  const { user } = useUser()
  const persona = getPersona(user?.gender, user?.aiPersona)
  const [slide, setSlide] = useState(0)

  const isLast = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  function advance() {
    if (isLast) {
      localStorage.setItem(BRIEFING_KEY, 'true')
      onDone?.()
    } else {
      setSlide(s => s + 1)
    }
  }

  function skip() {
    localStorage.setItem(BRIEFING_KEY, 'true')
    onDone?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#050505' }}
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 px-6 pt-5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full flex-1 transition-all duration-300"
              style={{ backgroundColor: i <= slide ? '#00BFFF' : 'rgba(255,255,255,0.1)' }}
            />
          ))}
        </div>

        {/* Slide body */}
        <div className="px-6 pt-6 pb-8 space-y-5">

          {/* Visual */}
          <div className="flex justify-center">
            {slide === 0 ? (
              <div
                className="w-20 h-20 rounded-full overflow-hidden border-2"
                style={{ borderColor: '#00BFFF' }}
              >
                {persona.avatarImg
                  ? <img src={persona.avatarImg} alt={persona.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl">{current.accent}</div>
                }
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,191,255,0.12)', border: '2px solid rgba(0,191,255,0.3)' }}
              >
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{ color: '#00BFFF', fontVariationSettings: "'FILL' 1" }}
                >
                  {current.icon}
                </span>
              </div>
            )}
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <h2
              className="font-black text-xl leading-tight"
              style={{ color: '#00BFFF', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {current.title}
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {current.text}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={advance}
              className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wide transition-all duration-200 active:scale-95"
              style={{
                backgroundColor: '#00BFFF',
                color: '#000',
                boxShadow: '0 4px 20px rgba(0,191,255,0.4)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {isLast ? "Let's Go! 🚀" : 'הבא'}
            </button>
            {!isLast && (
              <button
                onClick={skip}
                className="w-full py-2 text-xs font-bold transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                דלג
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
