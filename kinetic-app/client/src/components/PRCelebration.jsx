import { useEffect, useState } from 'react'

export default function PRCelebration({ pr, onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/60 backdrop-blur-sm animate-fade-up">
      <div className="bg-surface-container-low rounded-2xl p-8 mx-6 text-center
                      border-2 border-primary-container">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="font-headline text-3xl font-black text-primary-fixed-dim
                       uppercase tracking-tight mb-2">
          שיא אישי!
        </h2>
        <p className="font-headline text-xl font-bold mb-1">{pr.exercise}</p>
        <p className="font-label text-on-surface-variant mb-4">
          {pr.previous
            ? `${pr.previous.weight}kg → ${pr.weight}kg × ${pr.reps}`
            : `${pr.weight}kg × ${pr.reps} — הסט הראשון שלך!`
          }
        </p>
        <div className="flex gap-2 justify-center">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary-container"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 font-headline font-bold text-xs uppercase
                     text-on-surface-variant"
        >
          המשך
        </button>
      </div>
    </div>
  )
}
