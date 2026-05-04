import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../api'
import Navbar from '../components/Navbar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'לתמיד',
    label: 'STARTER',
    desc: 'כל מה שצריך להתחיל',
    features: ['מעקב אימונים בסיסי', 'מעקב תזונה', 'תוספי תזונה', 'Progress גרפים (7 ימים)', '3 תוכניות אימון'],
    cta: 'המשך חינם',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: 'לחודש',
    label: 'PERFORMANCE',
    note: '14 ימי Trial חינם · ללא כרטיס אשראי',
    features: ['כל מה שב-Free', 'AI Coach אישי 24/7', 'Plateau Detection', 'Gap Filler תזונתי', 'War Room שבועי', 'היסטוריה מלאה', 'Analytics מתקדם', 'תמיכה מועדפת'],
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
    } catch { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#151C25] font-space" dir="rtl">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-3xl overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.06)]">
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
              alt="training"
              className="w-full h-64 md:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#151C25]/80 to-transparent" />
            <div className="absolute bottom-6 right-6">
              <span className="text-[#CCFF00] font-black text-4xl block">4.01%</span>
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">שיפור ממוצע</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#CCFF00] mb-4">THE MEMBERSHIP</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none tracking-tight mb-4 italic text-[#151C25]">
              השקעה בעצמך היא<br /><span className="text-[#CCFF00]">השקעה הטובה ביותר</span>
            </h1>
            <p className="text-[#656464] text-sm leading-relaxed max-w-sm">
              בחר את התוכנית המתאימה לך ותתחיל לאמן בצורה חכמה יותר.
            </p>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="py-16 px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-center items-stretch gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col flex-1 p-8 rounded-3xl transition-all duration-300 ${
                plan.highlight
                  ? 'bg-[#EEF4FF] border-2 border-[#CCFF00] scale-[1.02] shadow-[0_24px_48px_rgba(204,255,0,0.12)]'
                  : 'bg-white shadow-[0_24px_48px_rgba(0,0,0,0.06)]'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#121212] text-[#CCFF00] font-black px-6 py-1.5 rounded-full text-xs tracking-widest uppercase whitespace-nowrap">
                  Most Popular
                </div>
              )}
              <div className="mb-8 text-right">
                <span className="text-xs font-black tracking-widest uppercase block mb-1 text-[#656464]">{plan.label}</span>
                <h2 className="text-4xl font-black uppercase tracking-tight italic text-[#CCFF00]">{plan.name}</h2>
                <div className="flex items-baseline mt-4 gap-1 justify-end">
                  <span className="text-5xl font-black text-[#151C25]">{plan.price}</span>
                  <span className="text-sm text-[#656464]">/{plan.period}</span>
                </div>
                {plan.note && <p className="mt-3 text-xs leading-relaxed text-[#656464]">{plan.note}</p>}
                {plan.desc && !plan.note && <p className="mt-3 text-xs text-[#656464]">{plan.desc}</p>}
              </div>
              <ul className="space-y-3 mb-8 flex-1 text-right">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center justify-end gap-3">
                    <span className="text-sm font-medium text-[#151C25]">{f}</span>
                    <span className="font-black flex-shrink-0 text-base text-[#CCFF00]">✓</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.highlight ? handleProClick : () => navigate('/dashboard')}
                disabled={plan.highlight && loading}
                className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 disabled:opacity-60 bg-[#CCFF00] text-[#121212] hover:bg-[#d4ff00]"
              >
                {plan.highlight && loading ? '...' : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-black text-[#151C25] text-center uppercase tracking-tight mb-10 italic">השוואה מלאה</h3>
          <div className="bg-white rounded-3xl overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.06)]">
            <div className="grid grid-cols-3 px-6 py-4 border-b border-[#EEF4FF]">
              <span className="text-[#656464] text-xs font-black uppercase text-right">פיצ׳ר</span>
              <span className="text-[#656464] text-xs font-black uppercase text-center">Free</span>
              <span className="text-[#CCFF00] text-xs font-black uppercase text-center">Pro</span>
            </div>
            {[
              { name: 'מעקב אימונים',   free: true,  pro: true },
              { name: 'מעקב תזונה',     free: true,  pro: true },
              { name: 'AI Coach',        free: false, pro: true },
              { name: 'Plateau Detection', free: false, pro: true },
              { name: 'War Room שבועי', free: false, pro: true },
              { name: 'Analytics מתקדם', free: false, pro: true },
              { name: 'Gap Filler',      free: false, pro: true },
              { name: 'היסטוריה מלאה', free: false, pro: true },
            ].map((row, i) => (
              <div key={i} className={`grid grid-cols-3 px-6 py-4 ${i % 2 === 0 ? 'bg-[#F8F9FF]' : ''}`}>
                <span className="text-[#151C25]/70 text-sm text-right">{row.name}</span>
                <span className="text-center text-sm">
                  {row.free ? <span className="text-[#CCFF00]">✓</span> : <span className="text-[#DCE3F0]">—</span>}
                </span>
                <span className="text-center text-sm">
                  {row.pro ? <span className="text-[#CCFF00]">✓</span> : <span className="text-[#DCE3F0]">—</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-12 text-center relative overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.06)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#CCFF00]/5 to-transparent" />
          <div className="relative z-10">
            <p className="text-[#CCFF00] text-xs font-black uppercase tracking-[0.3em] mb-4">הגיע הזמן</p>
            <h2 className="text-4xl font-black text-[#151C25] mb-4 italic">הגיע הזמן<br />לגדול אל המשוכה</h2>
            <p className="text-[#656464] text-sm mb-8">14 ימי Trial חינם — ללא כרטיס אשראי</p>
            <button
              onClick={handleProClick}
              className="bg-[#CCFF00] text-[#121212] font-black px-12 py-4 rounded-xl text-base hover:scale-105 hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] active:scale-95 transition-all"
            >
              התחל עכשיו
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#DCE3F0] py-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#656464]">
          <span className="font-black text-base text-[#CCFF00] uppercase tracking-tighter">KINETIC.</span>
          <span>© 2026 KINETIC Performance · כל הזכויות שמורות</span>
          <div className="flex gap-6">
            <button onClick={() => navigate('/login')} className="hover:text-[#151C25]">Sign In</button>
            <button onClick={() => navigate('/login?mode=register')} className="hover:text-[#151C25]">הרשמה</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
