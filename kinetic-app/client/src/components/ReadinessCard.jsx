import { useState, useEffect } from 'react'
import { authFetch } from '../api'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function ReadinessCard() {
  const [readiness, setReadiness] = useState(null)
  const [showSleepInput, setShowSleepInput] = useState(false)
  const [sleepHours, setSleepHours] = useState(7)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    authFetch(`${API}/api/readiness`)
      .then(r => r.json())
      .then(setReadiness)
      .catch(() => {})
  }, [])

  async function saveSleep() {
    setSaving(true)
    try {
      const data = await authFetch(`${API}/api/readiness/sleep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: sleepHours }),
      }).then(r => r.json())
      setReadiness(data)
      setShowSleepInput(false)
    } finally {
      setSaving(false)
    }
  }

  function openAI() {
    window.dispatchEvent(new CustomEvent('kinetic:ai-open', {
      detail: { message: 'מה אתה ממליץ היום לפי ציון המוכנות שלי?' }
    }))
  }

  if (!readiness) return (
    <div className="animate-pulse h-48 bg-surface-container-low rounded-xl" />
  )

  const { score, recommendation, breakdown } = readiness
  const scoreColor = score >= 80 ? '#CCFF00' : score >= 60 ? '#FFB800' : '#FF6B6B'
  const circumference = 2 * Math.PI * 32  // r=32 → ≈201

  return (
    <div className="bg-surface-container-low rounded-xl p-5 space-y-4">

      {/* ציון ראשי */}
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1">
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-[0.2em]">ציון מוכנות</p>
          <p className="font-headline font-bold text-sm">{recommendation}</p>
          <button
            onClick={openAI}
            className="font-label text-xs underline"
            style={{ color: scoreColor }}
          >
            שאל את המאמן
          </button>
        </div>
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#2a2a2a" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="32" fill="none"
              stroke={scoreColor} strokeWidth="8"
              strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.7s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-headline font-black text-xl" style={{ color: scoreColor }}>
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* פירוט 4 גורמים */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(breakdown).map(([key, item]) => {
          const color = item.score >= 80 ? '#CCFF00' : item.score >= 60 ? '#FFB800' : '#FF6B6B'
          return (
            <div
              key={key}
              className={`bg-surface-container rounded-xl p-3 space-y-1.5 ${key === 'sleep' ? 'cursor-pointer active:scale-[0.97] transition-transform' : ''}`}
              onClick={() => key === 'sleep' && setShowSleepInput(true)}
            >
              <div className="flex justify-between items-center">
                <span className="font-label text-xs text-on-surface-variant">{item.label}</span>
                <span className="font-label text-xs font-bold" style={{ color }}>{item.score}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${item.score}%`, backgroundColor: color }}
                />
              </div>
              <p className="font-label text-xs text-on-surface-variant">
                {key === 'sleep' && `${item.hours}h ● לחץ לעדכון`}
                {key === 'hydration' && `${(item.ml / 1000).toFixed(1)}L מים`}
                {key === 'load' && `${item.sessions} אימונים / 3 ימים`}
                {key === 'nutrition' && `${item.pct}% יעד אתמול`}
              </p>
            </div>
          )
        })}
      </div>

      {/* הזנת שינה */}
      {showSleepInput && (
        <div className="bg-surface-container rounded-xl p-3 flex items-center gap-3" dir="rtl">
          <span className="font-label text-sm text-on-surface-variant">שעות שינה:</span>
          <input
            type="number"
            min="0" max="12" step="0.5"
            value={sleepHours}
            onChange={e => setSleepHours(parseFloat(e.target.value))}
            className="w-16 bg-surface-container-highest rounded-lg px-2 py-1 text-center font-bold text-sm outline-none"
            dir="ltr"
          />
          <button
            onClick={saveSleep}
            disabled={saving}
            className="bg-primary-container text-on-primary-fixed px-3 py-1 rounded-lg font-headline font-bold text-xs uppercase disabled:opacity-50"
          >
            {saving ? '...' : 'שמור'}
          </button>
          <button onClick={() => setShowSleepInput(false)} className="font-label text-xs text-on-surface-variant underline">
            ביטול
          </button>
        </div>
      )}
    </div>
  )
}
