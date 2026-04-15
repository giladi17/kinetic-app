import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const ERROR_MESSAGES = {
  invalid_credentials: 'אימייל או סיסמה שגויים',
  email_taken: 'האימייל כבר קיים במערכת',
  missing_fields: 'יש למלא את כל השדות',
}

export default function Login() {
  const navigate = useNavigate()
  const { login, register, loginWithGoogle } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = mode === 'login'
      ? await login(email, password)
      : await register(email, password, name)
    setLoading(false)
    if (result.success) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(ERROR_MESSAGES[result.error] || 'שגיאה, נסה שוב')
    }
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">

        {/* לוגו */}
        <div className="text-center">
          <h1 className="font-headline font-black text-5xl uppercase text-primary-fixed-dim tracking-tighter">
            KINETIC
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">
            {mode === 'login' ? 'התחבר לחשבון שלך' : 'צור חשבון חדש'}
          </p>
        </div>

        {/* טופס */}
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">

          {mode === 'register' && (
            <div>
              <label className="block text-xs text-on-surface-variant mb-1.5 font-bold uppercase tracking-widest">
                שם
              </label>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="הכנס שם"
                className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-fixed-dim text-on-surface"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5 font-bold uppercase tracking-widest">
              אימייל
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-fixed-dim text-on-surface"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5 font-bold uppercase tracking-widest">
              סיסמה
            </label>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
              required
              minLength={6}
              className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-fixed-dim text-on-surface"
              dir="ltr"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 rounded-xl py-2 px-4">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container text-on-primary-fixed font-headline font-black text-lg uppercase py-4 rounded-xl active:scale-95 duration-200 disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'כניסה' : 'הרשמה'}
          </button>
        </form>

        {/* Google Login */}
        {GOOGLE_CLIENT_ID && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-outline-variant/30" />
              <span className="text-xs text-on-surface-variant">או</span>
              <div className="flex-1 border-t border-outline-variant/30" />
            </div>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    setError(null)
                    setLoading(true)
                    const result = await loginWithGoogle(credentialResponse.credential)
                    setLoading(false)
                    if (result.success) navigate('/dashboard', { replace: true })
                    else setError('כניסה עם Google נכשלה')
                  }}
                  onError={() => setError('כניסה עם Google נכשלה')}
                  text="continue_with"
                  shape="rectangular"
                  theme="filled_black"
                  locale="he"
                />
              </div>
            </GoogleOAuthProvider>
          </div>
        )}

        {/* toggle */}
        <p className="text-center text-sm text-on-surface-variant">
          {mode === 'login' ? 'אין לך חשבון?' : 'כבר יש לך חשבון?'}
          {' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
            className="text-primary-fixed-dim font-bold underline"
          >
            {mode === 'login' ? 'הרשם' : 'התחבר'}
          </button>
        </p>

      </div>
    </div>
  )
}
