import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function StreakProtectionBanner() {
  const [status, setStatus] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reminders/streak-check`, { signal: controller.signal })
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
      .finally(() => clearTimeout(timer))
  }, [])

  if (!status?.streakAtRisk) return null

  return (
    <div className="fixed top-20 left-4 right-4 z-40 bg-secondary text-on-secondary
                    rounded-xl p-4 flex items-center gap-4 shadow-lg animate-fade-up">
      <span
        className="material-symbols-outlined text-3xl"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        local_fire_department
      </span>
      <div className="flex-1">
        <p className="font-headline font-bold text-sm uppercase">
          הסטריק שלך בסכנה!
        </p>
        <p className="font-label text-xs opacity-80">
          נשארו {status.hoursLeftToSave} שעות —
          האימון הקצר ביותר: {status.quickWorkout?.duration} דק׳
        </p>
      </div>
      <button
        onClick={() => navigate(`/workout/${status.quickWorkout?.id}`)}
        className="bg-on-secondary text-secondary px-4 py-2 rounded-lg
                   font-headline font-bold text-xs uppercase active:scale-95"
      >
        עשה עכשיו
      </button>
      <button
        onClick={() => setStatus(null)}
        className="opacity-60 hover:opacity-100"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  )
}
