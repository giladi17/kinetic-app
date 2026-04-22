import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const THEMES = [
  { key: 'theme-lime', label: 'Lime', color: '#CCFF00', remove: ['theme-blue', 'theme-orange'] },
  { key: 'theme-blue', label: 'Blue', color: '#00E5FF', remove: ['theme-blue', 'theme-orange'] },
  { key: 'theme-orange', label: 'Orange', color: '#FFA500', remove: ['theme-blue', 'theme-orange'] },
]

export default function TopAppBar() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [showTheme, setShowTheme] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifStatus, setNotifStatus] = useState(null)
  const themeRef = useRef(null)
  const notifRef = useRef(null)
  const menuRef = useRef(null)

  function applyTheme(theme) {
    document.body.classList.remove('theme-blue', 'theme-orange')
    if (theme.key !== 'theme-lime') {
      document.body.classList.add(theme.key)
    }
    setShowTheme(false)
  }

  function toggleNotifs() {
    if (!showNotifs) {
      authFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reminders/status`)
        .then(r => r.json())
        .then(setNotifStatus)
        .catch(() => {})
    }
    setShowNotifs(p => !p)
  }

  // Click outside to close dropdowns
  useEffect(() => {
    function onMouseDown(e) {
      if (themeRef.current && !themeRef.current.contains(e.target)) setShowTheme(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  return (
    <header className="fixed top-0 w-full z-50 kinetic-nav-bg bg-[#0e0e0e]/60 backdrop-blur-xl shadow-[0_20px_40px_rgba(204,255,0,0.05)]">
      <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(p => !p)}
              className="w-9 h-9 rounded-full bg-primary-container/20 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>person</span>
            </button>
            {menuOpen && (
              <div className="absolute top-12 left-0 bg-surface-container-low rounded-xl shadow-lg z-50 overflow-hidden min-w-48">
                <button onClick={() => { navigate('/profile'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-right">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                  <span className="text-sm">פרופיל</span>
                </button>
                <button onClick={() => { navigate('/settings'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-right">
                  <span className="material-symbols-outlined text-on-surface-variant">settings</span>
                  <span className="text-sm">הגדרות</span>
                </button>
                <button onClick={() => { navigate('/settings#accessibility'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-right">
                  <span className="material-symbols-outlined text-on-surface-variant">accessibility</span>
                  <span className="text-sm">נגישות</span>
                </button>
                <div className="border-t border-surface-container-highest" />
                <button onClick={() => { logout(); navigate('/login') }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-900/20 transition-colors text-right text-red-400">
                  <span className="material-symbols-outlined">logout</span>
                  <span className="text-sm">התנתק</span>
                </button>
              </div>
            )}
          </div>
          <span className="font-headline font-black text-2xl italic tracking-tighter text-[#CCFF00]">KINETIC</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-gray-100 dark:bg-[#151C25] transition-all duration-300 hover:scale-110 active:scale-90"
            aria-label={isDark ? 'עבור למצב בהיר' : 'עבור למצב כהה'}
          >
            {isDark
              ? <span className="material-symbols-outlined text-electric-lime" style={{ fontVariationSettings: "'FILL' 1" }}>light_mode</span>
              : <span className="material-symbols-outlined text-[#151C25]" style={{ fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
            }
          </button>
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setShowTheme(p => !p)}
              className="text-on-surface-variant hover:opacity-80 transition-opacity active:scale-95 duration-200"
              title="Theme"
            >
              <span className="material-symbols-outlined">palette</span>
            </button>
            {showTheme && (
              <div className="absolute right-0 top-10 bg-surface-container-highest rounded-xl p-3 flex gap-2 shadow-xl z-50">
                {THEMES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => applyTheme(t)}
                    className="w-7 h-7 rounded-full border-2 border-outline-variant hover:scale-110 transition-transform"
                    style={{ backgroundColor: t.color }}
                    title={t.label}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="relative" ref={notifRef}>
            <button
              onClick={toggleNotifs}
              className="text-on-surface-variant hover:opacity-80 transition-opacity active:scale-95 duration-200"
              title="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-10 bg-surface-container-highest rounded-xl p-4 shadow-xl z-50 w-64 space-y-3">
                <p className="font-headline font-bold text-sm uppercase tracking-wide">תזכורות</p>
                {!notifStatus ? (
                  <p className="font-label text-xs text-on-surface-variant">טוען...</p>
                ) : notifStatus.permission !== 'granted' ? (
                  <p className="font-label text-xs text-on-surface-variant">נדרשת הרשאה להתראות</p>
                ) : (
                  <ul className="space-y-2">
                    {(notifStatus.reminders || []).map(r => (
                      <li key={r.id} className="flex items-center justify-between gap-2">
                        <span className="font-label text-xs">{r.label || r.type}</span>
                        <span className={`font-label text-[10px] font-bold px-2 py-0.5 rounded-full ${r.enabled ? 'bg-primary-container text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'}`}>
                          {r.enabled ? 'פעיל' : 'כבוי'}
                        </span>
                      </li>
                    ))}
                    {(!notifStatus.reminders || notifStatus.reminders.length === 0) && (
                      <p className="font-label text-xs text-on-surface-variant">אין תזכורות מוגדרות</p>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
