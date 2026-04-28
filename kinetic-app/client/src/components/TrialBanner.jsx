import { useState } from 'react'
import { useUser } from '../context/UserContext'

export default function TrialBanner() {
  const { user } = useUser()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('trial_banner_dismissed') === new Date().toDateString()
  )

  if (!user || dismissed) return null

  const daysLeft = user.daysLeft ?? 0
  const tier = user.tier || 'free'
  const isPremium = user.isPremium

  // Only show for trial users (premium tier + days left) or expired free users
  const isTrialActive = isPremium && daysLeft > 0 && daysLeft <= 7
  const isExpired = !isPremium && tier !== 'premium'

  if (!isTrialActive && !isExpired) return null

  function dismiss() {
    localStorage.setItem('trial_banner_dismissed', new Date().toDateString())
    setDismissed(true)
  }

  function openPaywall() {
    window.dispatchEvent(new Event('kinetic:paywall'))
  }

  if (isExpired) {
    return (
      <div className="bg-[#ffa500]/10 border-b border-[#ffa500]/20 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[#ffa500] text-base flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            lock
          </span>
          <p className="font-body text-xs text-[#ffa500] truncate">
            תקופת הניסיון הסתיימה — שדרג כדי להמשיך להשתמש בכל הפיצ'רים
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={openPaywall}
            className="text-xs font-bold bg-[#ffa500] text-black px-3 py-1.5 rounded-lg hover:bg-[#ff8c00] active:scale-95 duration-200 whitespace-nowrap"
          >
            שדרג ✦
          </button>
          <button onClick={dismiss} className="text-[#ffa500]/50 hover:text-[#ffa500] transition-colors">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>
    )
  }

  // Trial active but expiring soon
  const urgency = daysLeft <= 2 ? 'high' : daysLeft <= 5 ? 'medium' : 'low'
  const colors = {
    high:   { bg: 'bg-red-500/10',   border: 'border-red-500/20',   text: 'text-red-400',   btn: 'bg-red-500 hover:bg-red-600' },
    medium: { bg: 'bg-[#ffa500]/10', border: 'border-[#ffa500]/20', text: 'text-[#ffa500]', btn: 'bg-[#ffa500] hover:bg-[#ff8c00]' },
    low:    { bg: 'bg-primary-container/10', border: 'border-primary-container/20', text: 'text-primary-fixed-dim', btn: 'bg-primary-container hover:bg-primary-fixed-dim' },
  }
  const c = colors[urgency]

  return (
    <div className={`${c.bg} border-b ${c.border} px-4 py-3 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`material-symbols-outlined ${c.text} text-base flex-shrink-0`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {urgency === 'high' ? 'warning' : 'timer'}
        </span>
        <p className={`font-body text-xs ${c.text} truncate`}>
          {daysLeft === 1
            ? 'יום אחד נשאר לניסיון! שדרג כדי לא לאבד גישה'
            : `${daysLeft} ימים נשארו לניסיון Premium`}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={openPaywall}
          className={`text-xs font-bold ${c.btn} text-[#3a4a00] px-3 py-1.5 rounded-lg active:scale-95 duration-200 whitespace-nowrap`}
        >
          שדרג עכשיו
        </button>
        <button onClick={dismiss} className={`${c.text} opacity-50 hover:opacity-100 transition-opacity`}>
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  )
}
