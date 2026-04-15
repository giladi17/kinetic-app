import { useState, useEffect } from 'react'
import { authFetch } from '../api'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const PRO_FEATURES = [
  { icon: 'smart_toy',       label: 'AI Coach אישי 24/7' },
  { icon: 'analytics',       label: 'Analytics מתקדם + Plateau Detection' },
  { icon: 'auto_fix_high',   label: 'Gap Filler תזונתי' },
  { icon: 'insights',        label: 'מעקב התקדמות מלא + היסטוריה' },
  { icon: 'military_tech',   label: 'War Room — דאשבורד עילית' },
  { icon: 'fitness_center',  label: 'תוכניות אימון בלתי מוגבלות' },
]

const FEATURE_LABELS = {
  progress:          { icon: 'insights',        title: 'מעקב התקדמות', desc: 'צפה בהיסטוריה המלאה, גרפים ועוד' },
  exercise_history:  { icon: 'history',         title: 'היסטוריית תרגילים', desc: 'נתח את הביצועים שלך לאורך זמן' },
  prs:               { icon: 'emoji_events',    title: 'שיאים אישיים', desc: 'עקוב אחר כל ה-PRs שלך' },
  nutrition_history: { icon: 'calendar_month',  title: 'היסטוריית תזונה', desc: 'גישה לתיעוד תזונה מימים קודמים' },
  plans_limit:       { icon: 'fitness_center',  title: 'תוכניות אימון', desc: 'עברת את מגבלת 3 התוכניות החינמיות' },
  ai_coach:          { icon: 'smart_toy',       title: 'AI Coach', desc: 'קבל אימון אישי מבינה מלאכותית' },
  analytics:         { icon: 'analytics',       title: 'Analytics מתקדם', desc: 'נתח את האימונים שלך לעומק' },
  gap_filler:        { icon: 'auto_fix_high',   title: 'Gap Filler', desc: 'קבל המלצות תזונה חכמות' },
  war_room:          { icon: 'military_tech',   title: 'War Room', desc: 'הדאשבורד העילי של KINETIC' },
}

export default function PaywallModal() {
  const [open, setOpen] = useState(false)
  const [featureKey, setFeatureKey] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function handlePaywall(e) {
      setFeatureKey(e.detail?.feature || null)
      setOpen(true)
    }
    window.addEventListener('kinetic:paywall', handlePaywall)
    return () => window.removeEventListener('kinetic:paywall', handlePaywall)
  }, [])

  async function handleUpgrade() {
    setLoading(true)
    setOpen(false)
    try {
      const res = await authFetch(`${API}/api/payments/create-checkout-session`, { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error('Checkout error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const feature = featureKey ? FEATURE_LABELS[featureKey] : null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center px-6"
      dir="rtl"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="bg-[#1a1a1a] border border-[#CCFF00]/30 rounded-2xl p-8 w-full max-w-sm space-y-6 shadow-[0_0_40px_rgba(204,255,0,0.1)]">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-xl bg-[#CCFF00]/10 mx-auto flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[#CCFF00] text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {feature?.icon || 'workspace_premium'}
            </span>
          </div>

          {feature ? (
            <>
              <h2 className="font-headline text-xl font-black uppercase text-white tracking-widest">
                {feature.title}
              </h2>
              <p className="text-[#adaaaa] text-sm leading-relaxed">{feature.desc}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#CCFF00]/10 rounded-full">
                <span className="material-symbols-outlined text-[#CCFF00] text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                <span className="text-[#CCFF00] text-xs font-bold tracking-widest uppercase">פיצ'ר Pro בלבד</span>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-headline text-2xl font-black uppercase text-white tracking-widest">פיצ'ר Pro</h2>
              <p className="text-[#adaaaa] text-sm leading-relaxed">
                שדרג ל-Pro וקבל גישה לכל הכלים של KINETIC
              </p>
            </>
          )}
        </div>

        {/* Feature list */}
        <div className="space-y-2">
          {PRO_FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-lg">
              <span
                className="material-symbols-outlined text-[#CCFF00] text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {f.icon}
              </span>
              <span className="text-sm text-[#e0e0e0]">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Price hint */}
        <p className="text-center text-[#666] text-xs">
          ₪49 / חודש · ביטול בכל עת · 14 יום ניסיון חינם
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-[#CCFF00] text-[#0e0e0e] py-4 rounded-xl font-headline font-black text-sm tracking-widest uppercase hover:brightness-110 transition-all active:scale-95 shadow-[0_0_20px_rgba(204,255,0,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'שדרג ל-Pro ✦'}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-full py-3 text-[#adaaaa] text-sm hover:text-white transition-all active:scale-95"
          >
            אולי אחר כך
          </button>
        </div>
      </div>
    </div>
  )
}
