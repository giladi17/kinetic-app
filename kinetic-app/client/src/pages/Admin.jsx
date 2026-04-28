import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function StatCard({ label, value, sub, color = 'text-primary-fixed-dim' }) {
  return (
    <div className="bg-surface-container rounded-2xl p-5 space-y-1">
      <p className="text-xs text-on-surface-variant font-label uppercase tracking-widest">{label}</p>
      <p className={`font-headline font-black text-3xl ${color}`}>{value}</p>
      {sub && <p className="text-xs text-on-surface-variant">{sub}</p>}
    </div>
  )
}

export default function Admin() {
  const [secret, setSecret] = useState(() => localStorage.getItem('admin_secret') || '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [setTierEmail, setSetTierEmail] = useState('')
  const [setTierValue, setSetTierValue] = useState('premium')
  const [setTierMsg, setSetTierMsg] = useState(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API}/api/admin/stats`, { headers: { 'x-admin-secret': secret } })
      if (!res.ok) { setError('סיסמה שגויה או שגיאת שרת'); return }
      setData(await res.json())
      localStorage.setItem('admin_secret', secret)
    } catch { setError('שגיאת רשת') } finally { setLoading(false) }
  }

  async function handleSetTier(e) {
    e.preventDefault()
    setSetTierMsg(null)
    const res = await fetch(`${API}/api/admin/set-tier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ email: setTierEmail, tier: setTierValue }),
    })
    const d = await res.json()
    setSetTierMsg(d.ok ? `✅ עודכן — user #${d.userId} → ${d.tier}` : `❌ ${d.error}`)
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="font-headline font-black text-3xl uppercase text-center text-primary-fixed-dim">Admin</h1>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-fixed-dim"
            dir="ltr"
            onKeyDown={e => e.key === 'Enter' && load()}
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={load}
            disabled={loading}
            className="w-full bg-primary-container text-on-primary-fixed py-3 rounded-xl font-headline font-bold text-sm disabled:opacity-50"
          >
            {loading ? 'טוען...' : 'כניסה'}
          </button>
        </div>
      </div>
    )
  }

  const { users, growth, revenue, featureHits, recentSignups } = data

  return (
    <div className="min-h-screen bg-surface text-on-surface pb-16" dir="rtl">
      <div className="max-w-4xl mx-auto px-6 pt-10 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-headline font-black text-3xl uppercase text-primary-fixed-dim">Admin Stats</h1>
          <button onClick={load} className="text-xs text-on-surface-variant hover:text-on-surface border border-outline-variant rounded-lg px-3 py-1.5">
            רענן
          </button>
        </div>

        {/* Revenue */}
        <section className="space-y-3">
          <h2 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">הכנסות</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="MRR" value={`₪${revenue.mrr}`} sub="לפי מנויים פעילים" color="text-primary-fixed-dim" />
            <StatCard label="ARR (צפוי)" value={`₪${revenue.mrr * 12}`} sub="הכנסה שנתית" />
            <StatCard label="שדרוגים 30 יום" value={growth.upgrades30} />
            <StatCard label="מנויים פרמיום" value={users.premium} />
          </div>
        </section>

        {/* Users */}
        <section className="space-y-3">
          <h2 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">משתמשים</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="סה״כ משתמשים" value={users.total} />
            <StatCard label="ניסיון פעיל" value={users.trial} color="text-[#ffa500]" />
            <StatCard label="חינמי" value={users.free} color="text-on-surface-variant" />
            <StatCard label="חדשים 7 ימים" value={growth.newLast7} />
          </div>
          <div className="bg-surface-container rounded-xl px-4 py-2 text-xs text-on-surface-variant">
            הצטרפו ב-30 יום: <span className="text-on-surface font-bold">{growth.newLast30}</span>
          </div>
        </section>

        {/* Feature hits */}
        {featureHits.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">פיצ'רים פופולריים (30 יום)</h2>
            <div className="bg-surface-container rounded-2xl divide-y divide-outline-variant/30">
              {featureHits.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-mono text-on-surface-variant">{f.event.replace('feature_', '')}</span>
                  <span className="font-headline font-bold text-primary-fixed-dim">{f.c}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Set tier */}
        <section className="space-y-3">
          <h2 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">שינוי Tier ידני</h2>
          <form onSubmit={handleSetTier} className="bg-surface-container rounded-2xl p-5 flex flex-col sm:flex-row gap-3">
            <input
              value={setTierEmail}
              onChange={e => setSetTierEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 bg-surface-container-high rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-fixed-dim"
              dir="ltr"
            />
            <select
              value={setTierValue}
              onChange={e => setSetTierValue(e.target.value)}
              className="bg-surface-container-high rounded-xl px-3 py-2 text-sm outline-none"
            >
              <option value="premium">premium</option>
              <option value="free">free</option>
            </select>
            <button type="submit" className="bg-primary-container text-on-primary-fixed px-4 py-2 rounded-xl text-sm font-bold">
              עדכן
            </button>
          </form>
          {setTierMsg && <p className="text-sm px-1">{setTierMsg}</p>}
        </section>

        {/* Recent signups */}
        <section className="space-y-3">
          <h2 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant">הרשמות אחרונות</h2>
          <div className="bg-surface-container rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="border-b border-outline-variant/30">
                <tr className="text-on-surface-variant">
                  <th className="text-right px-4 py-2 font-label">אימייל</th>
                  <th className="text-right px-4 py-2 font-label">שם</th>
                  <th className="text-right px-4 py-2 font-label">Tier</th>
                  <th className="text-right px-4 py-2 font-label">ניסיון</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {recentSignups.map((u, i) => {
                  const trial = u.trial_ends_at ? new Date(u.trial_ends_at) : null
                  const daysLeft = trial ? Math.max(0, Math.ceil((trial - Date.now()) / 86400000)) : 0
                  return (
                    <tr key={i} className="hover:bg-surface-container-high transition-colors">
                      <td className="px-4 py-2.5 font-mono text-on-surface-variant" dir="ltr">{u.email}</td>
                      <td className="px-4 py-2.5">{u.name || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-bold ${u.tier === 'premium' ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>
                          {u.tier || 'free'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {daysLeft > 0 ? <span className="text-[#ffa500]">{daysLeft} ימים</span> : <span className="text-on-surface-variant/50">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
