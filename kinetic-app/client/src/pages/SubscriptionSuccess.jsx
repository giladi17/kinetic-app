import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '../context/UserContext'

export default function SubscriptionSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useUser()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Give Stripe webhook a moment to process, then refresh user
    const timer = setTimeout(async () => {
      await refreshUser()
      setReady(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [refreshUser])

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <div className="space-y-6 max-w-sm">

        {/* Animated checkmark */}
        <div className="w-24 h-24 rounded-full bg-primary-container/30 mx-auto flex items-center justify-center animate-pulse">
          <span
            className="material-symbols-outlined text-primary-fixed-dim"
            style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}
          >
            workspace_premium
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-bold uppercase">ברוך הבא Premium\!</h1>
          <p className="font-body text-on-surface-variant leading-relaxed">
            המנוי שלך פעיל. כל הפיצ'רים של KINETIC פתוחים בפניך עכשיו.
          </p>
        </div>

        <div className="space-y-2">
          {[
            { icon: 'smart_toy',     label: 'AI Coach אישי פעיל' },
            { icon: 'analytics',     label: 'Analytics מלא + Plateaus' },
            { icon: 'auto_fix_high', label: 'Gap Filler תזונתי' },
            { icon: 'trending_up',   label: 'War Room שבועי' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-surface-container rounded-xl">
              <span className="material-symbols-outlined text-primary-fixed-dim text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
              <span className="font-body text-sm">{f.label}</span>
              <span className="material-symbols-outlined text-primary-fixed-dim text-sm ms-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          disabled={\!ready}
          className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-headline font-bold text-sm tracking-widest shadow-[0_0_20px_rgba(202,253,0,0.3)] disabled:opacity-50 active:scale-95 duration-200"
        >
          {ready ? 'בוא נתחיל ✦' : 'מפעיל...'}
        </button>
      </div>
    </div>
  )
}
