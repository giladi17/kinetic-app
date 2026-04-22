import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../api'
import Navbar from '../components/Navbar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const PLANS = [
  {
    name: 'Free',
    price: '₪0',
    period: 'לתמיד',
    label: 'חינמי',
    desc: 'כל מה שצריך להתחיל',
    features: [
      'מעקב אימונים בסיסי',
      'מעקב תזונה',
      'תוספי תזונה',
      'Progress גרפים (7 ימים)',
      '3 תוכניות אימון',
    ],
    cta: 'המשך חינם',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₪49',
    period: 'לחודש',
    label: 'פרימיום',
    note: '14 ימי Trial חינם · ללא כרטיס אשראי',
    features: [
      'כל מה שב-Free',
      'AI Coach אישי 24/7',
      'Plateau Detection',
      'Gap Filler תזונתי',
      'War Room שבועי',
      'היסטוריה מלאה',
      'Analytics מתקדם',
      'תמיכה מועדפת',
    ],
    cta: 'התחל Trial חינם',
    highlight: true,
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleProClick() {
    setLoading(true)
    try {
      const res = await authFetch(`${API}/api/payments/create-checkout-session`, { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-landing-surface dark:bg-[#0E0E0E] text-landing-on-surface dark:text-white font-space" dir="rtl">
      <Navbar />

      <main className="pt-32 pb-24 px-8">
        <div className="max-w-5xl mx-auto text-center">

          {/* Label */}
          <p className="text-electric-lime font-black tracking-[0.2em] uppercase text-sm mb-4">
            The Membership
          </p>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black italic uppercase leading-none tracking-tighter mb-4">
            Pricing Tiers For
            <br />
            <span className="text-landing-muted dark:text-gray-500">Peak Velocity.</span>
          </h1>
          <p className="text-landing-muted dark:text-gray-400 text-sm mb-16">
            14 ימי Trial חינם על Pro — ביטול בכל עת
          </p>

          {/* Cards */}
          <div className="flex flex-col md:flex-row justify-center items-stretch gap-8 mt-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col flex-1 p-10 rounded-[2.5rem] transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-landing-on-surface text-white scale-105 shadow-2xl z-10 border-4 border-electric-lime'
                    : 'bg-white dark:bg-[#151C25] border border-gray-100 dark:border-transparent shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-electric-lime text-black font-black px-6 py-2 rounded-full text-sm tracking-widest uppercase shadow-lg whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-8 text-right">
                  <span className={`text-xs font-black tracking-widest uppercase ${plan.highlight ? 'text-electric-lime' : 'text-landing-muted dark:text-gray-400'}`}>
                    {plan.label}
                  </span>
                  <h2 className={`text-3xl font-black italic uppercase mt-1 ${plan.highlight ? 'text-electric-lime' : ''}`}>
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline mt-4 gap-1.5 justify-end">
                    <span className="text-5xl font-black">{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? 'text-gray-400' : 'text-landing-muted dark:text-gray-500'}`}>
                      /{plan.period}
                    </span>
                  </div>
                  {plan.note && (
                    <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? 'text-gray-300' : 'text-landing-muted dark:text-gray-500'}`}>
                      {plan.note}
                    </p>
                  )}
                  {plan.desc && !plan.note && (
                    <p className={`mt-3 text-sm ${plan.highlight ? 'text-gray-300' : 'text-landing-muted dark:text-gray-500'}`}>
                      {plan.desc}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-10 flex-1 text-right">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center justify-end gap-3">
                      <span className={`font-medium text-sm ${plan.highlight ? 'text-white/80' : 'text-landing-muted dark:text-gray-300'}`}>
                        {f}
                      </span>
                      <span className={`text-lg font-black flex-shrink-0 ${plan.highlight ? 'text-electric-lime' : 'text-green-500'}`}>
                        ✓
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={plan.highlight ? handleProClick : () => navigate('/dashboard')}
                  disabled={plan.highlight && loading}
                  className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                    plan.highlight
                      ? 'bg-electric-lime text-black hover:shadow-[0_0_20px_rgba(204,255,0,0.6)] hover:scale-105'
                      : 'bg-landing-on-surface text-white hover:bg-black dark:hover:bg-[#222]'
                  }`}
                >
                  {plan.highlight && loading ? '...' : plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Trust line */}
          <p className="text-landing-muted dark:text-gray-500 text-xs mt-16">
            ללא חיוב אוטומטי · ביטול בכל עת · מאובטח ב-SSL
          </p>
        </div>
      </main>
    </div>
  )
}
