import { useState, useEffect } from 'react'
import { authFetch } from '../api'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

export default function MorningCheckin({ onComplete }) {
  const [show, setShow] = useState(false)
  const [sleepHours, setSleepHours] = useState(7)
  const [subjectiveScore, setSubjectiveScore] = useState(7)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Show if not checked in today
    authFetch(`${API}/readiness/today`)
      .then(r => r.json())
      .then(data => { if (!data) setShow(true) })
      .catch(() => {})
  }, [])

  async function submit() {
    setSubmitting(true)
    await fetch(`${API}/readiness/morning-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sleep_hours: sleepHours, subjective_score: subjectiveScore }),
    })
    setShow(false)
    onComplete?.()
  }

  if (!show) return null

  const readinessScore = Math.round((sleepHours / 9) * 50 + (subjectiveScore / 10) * 50)
  const scoreColor = readinessScore >= 70 ? '#CCFF00' : readinessScore >= 50 ? '#ffa500' : '#ff734a'

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="bg-surface-container-low rounded-xl p-8 w-full max-w-sm space-y-6">
        <div>
          <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block mb-1">MORNING CHECK-IN</span>
          <h2 className="font-headline text-2xl font-bold uppercase">בוקר טוב!</h2>
          <p className="font-body text-sm text-on-surface-variant mt-1">נתח את המוכנות שלך לאימון</p>
        </div>

        <div className="space-y-2">
          <label className="font-label text-xs text-on-surface-variant uppercase">שעות שינה: <strong className="text-on-surface">{sleepHours}h</strong></label>
          <input type="range" min="4" max="10" step="0.5" value={sleepHours}
            onChange={e => setSleepHours(parseFloat(e.target.value))}
            className="w-full accent-[#CCFF00]" />
          <div className="flex justify-between font-label text-[10px] text-on-surface-variant">
            <span>4h</span><span>10h</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-label text-xs text-on-surface-variant uppercase">תחושה כללית: <strong className="text-on-surface">{subjectiveScore}/10</strong></label>
          <input type="range" min="1" max="10" step="1" value={subjectiveScore}
            onChange={e => setSubjectiveScore(parseInt(e.target.value))}
            className="w-full accent-[#CCFF00]" />
          <div className="flex justify-between font-label text-[10px] text-on-surface-variant">
            <span>עייף 😴</span><span>מוכן 💪</span>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-4 flex items-center justify-between">
          <span className="font-label text-sm text-on-surface-variant">Readiness Score</span>
          <span className="font-headline text-3xl font-black" style={{ color: scoreColor }}>{readinessScore}</span>
        </div>

        <button onClick={submit} disabled={submitting}
          className="w-full bg-primary-container text-on-primary-fixed py-4 rounded-xl font-headline font-bold tracking-widest uppercase active:scale-95 duration-200 disabled:opacity-50">
          {submitting ? 'שומר...' : 'התחל את היום'}
        </button>

        <button onClick={() => setShow(false)} className="w-full text-on-surface-variant text-sm font-label hover:underline">
          דלג
        </button>
      </div>
    </div>
  )
}
