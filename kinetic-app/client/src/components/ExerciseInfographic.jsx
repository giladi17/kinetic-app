import { EXERCISE_INFO } from '../data/exerciseInfographics'
import { getExerciseIllustration } from '../data/exerciseIllustrations'

export default function ExerciseInfographic({ exerciseName }) {
  const info = EXERCISE_INFO[exerciseName]
  if (!info) return null

  const illustration = getExerciseIllustration(exerciseName)

  return (
    <div className="bg-[#0e0e0e] rounded-xl overflow-hidden" dir="rtl">

      {illustration ? (
        <div
          dangerouslySetInnerHTML={{ __html: illustration }}
          className="w-full"
        />
      ) : (
        <>
          {/* כותרת */}
          <div className="bg-primary-container p-4 text-center">
            <h2 className="font-headline font-black text-2xl uppercase text-on-primary-fixed">
              {info.hebrewName}
            </h2>
            <p className="text-xs text-on-primary-fixed/70 mt-1">{info.category}</p>
          </div>

          {/* fallback icon */}
          <div className="bg-surface-container flex items-center justify-center"
               style={{ height: '120px' }}>
            <span className="material-symbols-outlined text-primary-fixed-dim"
                  style={{ fontSize: '60px', fontVariationSettings: "'FILL' 1" }}>
              fitness_center
            </span>
          </div>

          {/* שרירים עיקריים */}
          <div className="p-4 border-b border-surface-container-highest">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-2">
              שרירים עיקריים
            </p>
            <div className="flex gap-2 flex-wrap">
              {info.muscles.map((m, i) => (
                <span key={i} className="bg-surface-container px-3 py-1 rounded-full text-xs font-bold text-primary-fixed-dim">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* שלבי ביצוע */}
          <div className="p-4 border-b border-surface-container-highest">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-3">
              שלבי ביצוע
            </p>
            <div className="space-y-3">
              {info.steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary-fixed text-sm font-black flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-sm">{step.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* טיפים ושגיאות */}
          <div className="grid grid-cols-2 gap-0">
            <div className="p-4 border-l border-surface-container-highest">
              <p className="text-xs text-green-400 uppercase tracking-widest mb-2">✓ נכון</p>
              <div className="space-y-1">
                {info.tips.map((tip, i) => (
                  <p key={i} className="text-xs text-on-surface-variant">• {tip}</p>
                ))}
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-red-400 uppercase tracking-widest mb-2">✗ שגיאות נפוצות</p>
              <div className="space-y-1">
                {info.mistakes.map((m, i) => (
                  <p key={i} className="text-xs text-on-surface-variant">• {m}</p>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
