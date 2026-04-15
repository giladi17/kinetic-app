import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import PremiumBadge from '../components/PremiumBadge'
import { useLang } from '../context/LanguageContext'
import { requestPermission } from '../utils/notifications'
import { PERSONAS, getPersona } from '../data/personas'
import { authFetch } from '../api'

const REMINDER_LABELS = {
  workout: { label: 'אימון יומי', icon: 'fitness_center' },
  supplements: { label: 'תוספי תזונה', icon: 'science' },
  streak_protection: { label: 'הגנת סטריק', icon: 'local_fire_department' },
  hydration: { label: 'שתיית מים', icon: 'water_drop' },
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, refreshUser } = useUser()
  const { logout } = useAuth()
  const { t, lang, changeLang } = useLang()
  const [permission, setPermission] = useState(Notification.permission)
  const [reminders, setReminders] = useState([])
  const [gender, setGender] = useState(user?.gender || 'male')
  const [aiPersona, setAiPersona] = useState(user?.aiPersona || 'auto')

  useEffect(() => {
    if (user) { setGender(user.gender || 'male'); setAiPersona(user.aiPersona || 'auto') }
  }, [user])

  async function savePersona(g, p) {
    await authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/stats`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender: g, ai_persona: p }),
    })
    refreshUser()
  }

  useEffect(() => {
    if (permission === 'granted') {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reminders`)
        .then(r => r.json())
        .then(setReminders)
    }
  }, [permission])

  async function handleRequestPermission() {
    const granted = await requestPermission()
    setPermission(granted ? 'granted' : 'denied')
  }

  async function patchReminder(id, patch) {
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setReminders(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function handleTimeChange(id, timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number)
    patchReminder(id, { hour, minute })
  }

  return (
    <main className="pt-24 pb-32 px-6 min-h-screen max-w-lg mx-auto space-y-6">
      <div className="flex flex-col gap-2 pt-4">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold">{t('profile.title').toUpperCase()}</span>
        <h1 className="font-headline text-4xl font-bold tracking-tight uppercase">{t('profile.title')}</h1>
      </div>

      <div className="bg-surface-container-low rounded-xl p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center overflow-hidden">
          <span className="material-symbols-outlined text-primary-fixed-dim text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
        </div>
        <div className="space-y-1 flex-1">
          <h2 className="font-headline font-bold text-xl">{user?.name || 'Alex'}</h2>
          <p className="font-label text-xs text-on-surface-variant">{user?.email || ''}</p>
          <PremiumBadge />
        </div>
      </div>

      <div className="space-y-3">
        {[
          { icon: 'science', label: 'תוספי תזונה', sub: 'ניהול מלאי ורצפים', to: '/supplements' },
          { icon: 'restaurant', label: 'תזונה', sub: 'מעקב ארוחות יומי', to: '/nutrition' },
          { icon: 'insights', label: 'התקדמות', sub: 'גרפים וסטטיסטיקות', to: '/progress' },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => navigate(item.to)}
            className="w-full bg-surface-container-high rounded-xl p-4 flex items-center gap-4 active:scale-[0.98] duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary-fixed-dim">{item.icon}</span>
            </div>
            <div className="text-left">
              <span className="font-headline font-bold text-sm block">{item.label}</span>
              <span className="font-label text-xs text-on-surface-variant">{item.sub}</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant ml-auto">chevron_right</span>
          </button>
        ))}
      </div>

      {/* AI Coach Persona */}
      <div className="space-y-3">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">{t('profile.persona').toUpperCase()}</span>
        <div className="bg-surface-container-low rounded-xl p-5 space-y-4">
          {/* Gender selector */}
          <div className="space-y-2">
            <span className="font-label text-xs text-on-surface-variant uppercase">מגדר (לחישוב BMR)</span>
            <div className="grid grid-cols-2 gap-2">
              {[{ key: 'male', label: 'גבר' }, { key: 'female', label: 'אישה' }].map(g => (
                <button
                  key={g.key}
                  onClick={() => { setGender(g.key); savePersona(g.key, aiPersona) }}
                  className={`py-2.5 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 duration-200 ${
                    gender === g.key ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-highest'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          {/* Persona selector */}
          <div className="space-y-2">
            <span className="font-label text-xs text-on-surface-variant uppercase">בחר מאמן</span>
            <div className="grid grid-cols-2 gap-2">
              {[{ key: 'auto', label: 'אוטומטי' }, ...Object.entries(PERSONAS).map(([k, v]) => ({ key: k, label: v.name }))].map(p => {
                const isActive = aiPersona === p.key || (p.key === 'auto' && aiPersona === 'auto')
                return (
                  <button
                    key={p.key}
                    onClick={() => { setAiPersona(p.key); savePersona(gender, p.key) }}
                    className={`py-2.5 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 duration-200 ${
                      isActive ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-highest'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
          {/* Preview current persona */}
          {(() => {
            const p = getPersona(gender, aiPersona)
            return (
              <div className="flex items-center gap-3 bg-surface-container rounded-xl p-3">
                <span
                  className="w-10 h-10 rounded-full overflow-hidden shrink-0"
                  style={{ border: `2px solid ${p.color}` }}
                  dangerouslySetInnerHTML={{ __html: p.avatar }}
                />
                <div>
                  <span className="font-headline font-bold text-sm block" style={{ color: p.color }}>{p.name}</span>
                  <span className="font-label text-xs text-on-surface-variant">{p.role} · {p.personality}</span>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Language Toggle */}
      <div className="space-y-3">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">{t('profile.language').toUpperCase()}</span>
        <div className="grid grid-cols-2 gap-2">
          {[{ key: 'he', label: t('profile.hebrew') }, { key: 'en', label: t('profile.english') }].map(l => (
            <button
              key={l.key}
              onClick={() => changeLang(l.key)}
              className={`py-3 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 duration-200 ${
                lang === l.key ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={() => { logout(); navigate('/login') }}
        className="w-full mt-8 bg-secondary/20 border border-secondary text-secondary py-4 rounded-xl font-headline font-bold uppercase tracking-widest hover:bg-secondary/30 active:scale-95 transition-all"
      >
        התנתק
      </button>

      {/* Notifications section */}
      <div className="space-y-3">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">{t('profile.notifications').toUpperCase()}</span>

        {permission !== 'granted' ? (
          <button
            onClick={handleRequestPermission}
            className="w-full bg-primary text-on-primary rounded-xl p-4 flex items-center gap-4 active:scale-[0.98] duration-200"
          >
            <span className="material-symbols-outlined">notifications</span>
            <div className="text-left flex-1">
              <span className="font-headline font-bold text-sm block">הפעל התראות</span>
              <span className="font-label text-xs opacity-80">
                {permission === 'denied' ? '✗ לא מאושר — שנה בהגדרות הדפדפן' : 'קבל תזכורות יומיות'}
              </span>
            </div>
          </button>
        ) : (
          <div className="space-y-2">
            <p className="font-label text-xs text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-base">check_circle</span>
              התראות פעילות
            </p>
            {reminders.map(r => {
              const meta = REMINDER_LABELS[r.type] || { label: r.type, icon: 'notifications' }
              const timeStr = `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`
              return (
                <div key={r.id} className="bg-surface-container-high rounded-xl p-4 flex items-center gap-4">
                  <span
                    className="material-symbols-outlined text-primary-fixed-dim"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {meta.icon}
                  </span>
                  <span className="font-headline font-bold text-sm flex-1">{meta.label}</span>
                  <input
                    type="time"
                    value={timeStr}
                    onChange={e => handleTimeChange(r.id, e.target.value)}
                    className="bg-surface-container text-on-surface rounded-lg px-2 py-1 font-label text-sm border-0 outline-none"
                  />
                  <button
                    onClick={() => patchReminder(r.id, { enabled: !r.enabled })}
                    className={`w-10 h-6 rounded-full transition-colors duration-200 relative ${r.enabled ? 'bg-primary' : 'bg-surface-container'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${r.enabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-6 pb-8 mt-4">
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="w-full bg-red-900/30 border border-red-500 text-red-400 py-4 rounded-xl font-headline font-bold uppercase tracking-widest"
        >
          🚪 התנתק
        </button>
      </div>
    </main>
  )
}
