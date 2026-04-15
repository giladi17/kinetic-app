import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { useLang } from '../context/LanguageContext'
import { authFetch } from '../api'
import { registerPushNotifications, unregisterPushNotifications, isPushSupported } from '../utils/pushNotifications'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

export default function Settings() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { refreshUser } = useUser()
  const { lang, changeLang } = useLang()

  const [fontSize, setFontSize] = useState(() => localStorage.getItem('kinetic_font_size') || 'normal')
  const [highContrast, setHighContrast] = useState(() => document.body.classList.contains('high-contrast'))
  const [reduceMotion, setReduceMotion] = useState(() => document.body.classList.contains('reduce-motion'))
  const [notifEnabled, setNotifEnabled] = useState(() => Notification.permission === 'granted')
  const [notifLoading, setNotifLoading] = useState(false)

  async function togglePush() {
    if (notifLoading) return
    setNotifLoading(true)
    try {
      if (notifEnabled) {
        await unregisterPushNotifications()
        setNotifEnabled(false)
      } else {
        const sub = await registerPushNotifications()
        setNotifEnabled(!!sub)
      }
    } finally {
      setNotifLoading(false)
    }
  }

  async function sendTestNotification() {
    await authFetch(`${API}/push/test`, { method: 'POST' })
  }

  function applyFontSize(size) {
    setFontSize(size)
    localStorage.setItem('kinetic_font_size', size)
    document.body.classList.remove('font-small', 'font-large')
    if (size !== 'normal') document.body.classList.add(`font-${size}`)
  }

  function toggleHighContrast() {
    const next = !highContrast
    setHighContrast(next)
    document.body.classList.toggle('high-contrast', next)
  }

  function toggleReduceMotion() {
    const next = !reduceMotion
    setReduceMotion(next)
    document.body.classList.toggle('reduce-motion', next)
  }

  return (
    <main className="pt-24 pb-32 px-6 min-h-screen max-w-lg mx-auto space-y-6" dir="rtl">
      <div className="flex flex-col gap-2 pt-4">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold">הגדרות</span>
        <h1 className="font-headline text-4xl font-bold tracking-tight uppercase">SETTINGS</h1>
      </div>

      {/* נגישות */}
      <section id="accessibility" className="space-y-3">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">נגישות</span>
        <div className="bg-surface-container-low rounded-xl p-5 space-y-4">
          {/* גודל טקסט */}
          <div className="space-y-2">
            <span className="font-label text-xs text-on-surface-variant uppercase">גודל טקסט</span>
            <div className="grid grid-cols-3 gap-2">
              {[{ key: 'small', label: 'קטן' }, { key: 'normal', label: 'רגיל' }, { key: 'large', label: 'גדול' }].map(f => (
                <button
                  key={f.key}
                  onClick={() => applyFontSize(f.key)}
                  className={`py-2.5 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 ${
                    fontSize === f.key ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-highest'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ניגודיות גבוהה */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-headline font-bold text-sm block">ניגודיות גבוהה</span>
              <span className="font-label text-xs text-on-surface-variant">שיפור קריאות</span>
            </div>
            <button
              onClick={toggleHighContrast}
              className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${highContrast ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${highContrast ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          {/* הפחתת אנימציות */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-headline font-bold text-sm block">הפחתת אנימציות</span>
              <span className="font-label text-xs text-on-surface-variant">למי שרגיש לתנועה</span>
            </div>
            <button
              onClick={toggleReduceMotion}
              className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${reduceMotion ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${reduceMotion ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* שפה */}
      <section className="space-y-3">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">שפה</span>
        <div className="grid grid-cols-2 gap-2">
          {[{ key: 'he', label: 'עברית' }, { key: 'en', label: 'English' }].map(l => (
            <button
              key={l.key}
              onClick={() => changeLang(l.key)}
              className={`py-3 rounded-xl font-headline font-bold text-sm transition-all active:scale-95 ${
                lang === l.key ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      {/* התראות Push */}
      {isPushSupported() && (
        <section className="space-y-3">
          <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">התראות</span>
          <div className="bg-surface-container-low rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-headline font-bold text-sm block">התראות Push</span>
                <span className="font-label text-xs text-on-surface-variant">מים, תוספים, streak ותזונה</span>
              </div>
              <button
                onClick={togglePush}
                disabled={notifLoading}
                className={`w-12 h-6 rounded-full transition-colors duration-200 relative disabled:opacity-50 ${notifEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${notifEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            {notifEnabled && (
              <button
                onClick={sendTestNotification}
                className="w-full bg-surface-container-highest rounded-xl py-2.5 font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant active:scale-95 transition-transform"
              >
                שלח התראת בדיקה
              </button>
            )}
          </div>
        </section>
      )}

      {/* חשבון */}
      <section className="space-y-3">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">חשבון</span>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/profile')}
            className="w-full bg-surface-container-high rounded-xl p-4 flex items-center gap-4 active:scale-[0.98] duration-200"
          >
            <span className="material-symbols-outlined text-on-surface-variant">lock</span>
            <span className="font-headline font-bold text-sm flex-1 text-right">שינוי סיסמה</span>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
          </button>

          <button
            onClick={async () => {
              await authFetch(`${API}/users/reset-tour`, { method: 'PATCH' })
              await refreshUser()
              navigate('/dashboard')
            }}
            className="w-full bg-surface-container-high rounded-xl p-4 flex items-center gap-4 active:scale-[0.98] duration-200"
          >
            <span className="material-symbols-outlined text-on-surface-variant">help</span>
            <span className="font-headline font-bold text-sm flex-1 text-right">צפה בהדרכה מחדש</span>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
          </button>

          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full bg-red-900/30 border border-red-500 text-red-400 py-4 rounded-xl font-headline font-bold uppercase tracking-widest"
          >
            🚪 התנתק
          </button>
        </div>
      </section>
    </main>
  )
}
