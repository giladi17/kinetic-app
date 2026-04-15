import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../api'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const FREE_FEATURES = [
  '3 תוכניות אימון',
  'מחשבון קלוריות בסיסי',
  'מעקב אימונים בסיסי',
  'פרופיל אישי בסיסי',
]

const PRO_FEATURES = [
  'תוכניות אימון ללא הגבלה',
  'AI Coach אישי 24/7',
  'תוכנית תזונה אישית',
  'מעקב התקדמות מתקדם',
  'אנליטיקות מפורטות',
  'מעקב תוספי תזונה',
  'War Room — דאשבורד עילית',
  'תמיכה מועדפת',
]

export default function Pricing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleProClick() {
    setLoading(true)
    try {
      const res = await authFetch(`${API}/api/payments/create-checkout-session`, { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white px-4 py-10 flex flex-col items-center" dir="rtl">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-headline font-black text-4xl md:text-5xl tracking-widest text-[#CCFF00] uppercase mb-2">
          KINETIC
        </h1>
        <p className="text-[#adaaaa] text-sm tracking-widest uppercase">בחר את התוכנית שלך</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl">

        {/* Free */}
        <div className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 flex flex-col">
          <div className="mb-4">
            <span className="text-xs font-headline font-bold tracking-widest text-[#adaaaa] uppercase">חינמי</span>
            <h2 className="font-headline font-black text-3xl text-white mt-1">Free</h2>
            <p className="text-[#adaaaa] text-sm mt-1">כל מה שצריך להתחיל</p>
          </div>

          <div className="text-3xl font-black font-headline text-white mb-6">
            ₪0
            <span className="text-sm font-normal text-[#adaaaa]"> / חודש</span>
          </div>

          <ul className="flex flex-col gap-3 mb-8 flex-1">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-[#e0e0e0]">
                <span className="material-symbols-outlined text-base text-[#adaaaa]">check_circle</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-xl border border-white/20 text-white font-headline font-bold text-sm tracking-widest uppercase hover:bg-white/5 transition-all active:scale-95"
          >
            המשך חינם
          </button>
        </div>

        {/* Pro */}
        <div className="flex-1 bg-[#1a1a1a] border-2 border-[#CCFF00] rounded-2xl p-6 flex flex-col relative overflow-hidden">
          {/* Badge */}
          <div className="absolute top-4 left-4 bg-[#CCFF00] text-[#0e0e0e] text-[10px] font-headline font-black px-2 py-0.5 rounded-full tracking-widest uppercase">
            מומלץ
          </div>

          <div className="mb-4 mt-2">
            <span className="text-xs font-headline font-bold tracking-widest text-[#CCFF00] uppercase">פרימיום</span>
            <h2 className="font-headline font-black text-3xl text-white mt-1">Pro</h2>
            <p className="text-[#adaaaa] text-sm mt-1">חוויה מלאה ללא פשרות</p>
          </div>

          <div className="text-3xl font-black font-headline text-white mb-6">
            ₪49
            <span className="text-sm font-normal text-[#adaaaa]"> / חודש</span>
          </div>

          <ul className="flex flex-col gap-3 mb-8 flex-1">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-[#e0e0e0]">
                <span className="material-symbols-outlined text-base text-[#CCFF00]">check_circle</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={handleProClick}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#CCFF00] text-[#0e0e0e] font-headline font-black text-sm tracking-widest uppercase hover:brightness-110 transition-all active:scale-95 shadow-[0_0_20px_rgba(204,255,0,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'התחל Trial חינם 14 ימים'}
          </button>
          <p className="text-center text-[#adaaaa] text-xs mt-3">ללא חיוב. ביטול בכל עת.</p>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[#adaaaa] text-xs mt-10 text-center max-w-sm">
        כל התוכניות כוללות גישה מלאה לאפליקציה. Pro מוסיף AI ואנליטיקות מתקדמות.
      </p>
    </div>
  )
}
