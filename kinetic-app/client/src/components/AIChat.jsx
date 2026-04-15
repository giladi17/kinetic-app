import { useState, useRef, useEffect } from 'react'
import { premiumFetch } from '../api'
import { useUser } from '../context/UserContext'
import { useAppData } from '../context/AppDataContext'
import { getPersona } from '../data/personas'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

export default function AIChat() {
  const { user } = useUser()
  const { todayNutrition, lastSession, readiness } = useAppData() || {}
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const messageTimestamps = useRef([])

  function canSendMessage() {
    const now = Date.now()
    messageTimestamps.current = messageTimestamps.current.filter(t => t > now - 10000)
    if (messageTimestamps.current.length >= 3) return false
    messageTimestamps.current.push(now)
    return true
  }

  const persona = getPersona(user?.gender, user?.aiPersona)

  const [messages, setMessages] = useState(() => [
    { role: 'ai', text: persona.greeting }
  ])

  // Update greeting when persona changes
  useEffect(() => {
    setMessages([{ role: 'ai', text: getPersona(user?.gender, user?.aiPersona).greeting }])
  }, [user?.gender, user?.aiPersona])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    function handleOpen(e) {
      setOpen(true)
      if (e.detail?.message) setInput(e.detail.message)
    }
    window.addEventListener('kinetic:ai-open', handleOpen)
    return () => window.removeEventListener('kinetic:ai-open', handleOpen)
  }, [])

  async function send() {
    if (!input.trim() || loading) return
    if (!canSendMessage()) {
      setMessages(m => [...m, { role: 'ai', text: 'שלחת הרבה הודעות בזמן קצר. המתן מספר שניות ונסה שוב 😊' }])
      return
    }
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const res = await premiumFetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          systemPrompt: persona.systemPrompt,
          clientContext: {
            personaName: persona.name,
            personaRole: persona.role,
            waterToday: user?.waterToday,
            readinessScore: readiness,
            lastSession: lastSession?.title || null,
            todayCalories: todayNutrition?.calories?.consumed,
            calorieTarget: todayNutrition?.calories?.target,
            todayProtein: todayNutrition?.protein?.consumed,
            proteinTarget: todayNutrition?.protein?.target,
          },
        }),
      })
      if (!res) { setLoading(false); return }
      const data = await res.json()
      setMessages(m => [...m, { role: 'ai', text: data.reply }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'שגיאה בחיבור. נסה שוב.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating bubble — shows persona avatar */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`${open ? 'סגור' : 'פתח'} צ'אט עם ${persona.name}`}
        className="fixed bottom-28 right-4 z-40 w-14 h-14 rounded-full shadow-[0_0_20px_rgba(202,253,0,0.4)] flex items-center justify-center active:scale-90 duration-200 hover:scale-105 overflow-hidden"
        style={{ backgroundColor: open ? '#1a1a1a' : '#1a1a1a', border: `2px solid ${persona.color}` }}
      >
        {open
          ? <span className="material-symbols-outlined text-2xl" style={{ color: persona.color, fontVariationSettings: "'FILL' 1" }}>close</span>
          : persona.avatarImg
            ? <img src={persona.avatarImg} alt={persona.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            : <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" dangerouslySetInnerHTML={{ __html: persona.avatar }} />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-44 right-4 z-40 w-80 bg-surface-container-low rounded-xl shadow-2xl border border-outline-variant/20 flex flex-col overflow-hidden" style={{ height: 420 }}>
          {/* Header with persona */}
          <div className="p-4 border-b border-outline-variant/20 flex items-center gap-3">
            {persona.avatarImg
              ? <img src={persona.avatarImg} alt={persona.name} className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: `1.5px solid ${persona.color}` }} />
              : <div className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ border: `1.5px solid ${persona.color}` }} dangerouslySetInnerHTML={{ __html: persona.avatar }} />
            }
            <div>
              <span className="font-headline font-bold text-sm block" style={{ color: persona.color }}>{persona.name}</span>
              <span className="font-label text-[10px] text-on-surface-variant">{persona.role}</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse ml-auto" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'ai' && (
                  persona.avatarImg
                    ? <img src={persona.avatarImg} alt={persona.name} className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" style={{ border: `1px solid ${persona.color}` }} />
                    : <div className="w-6 h-6 rounded-full shrink-0 mt-0.5 overflow-hidden" style={{ border: `1px solid ${persona.color}` }} dangerouslySetInnerHTML={{ __html: persona.avatar }} />
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm font-body ${
                  m.role === 'user'
                    ? 'bg-primary-container text-on-primary-fixed'
                    : 'bg-surface-container text-on-surface'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                {persona.avatarImg
                  ? <img src={persona.avatarImg} alt={persona.name} className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" style={{ border: `1px solid ${persona.color}` }} />
                  : <span className="w-6 h-6 rounded-full shrink-0 mt-0.5 overflow-hidden" style={{ border: `1px solid ${persona.color}` }} dangerouslySetInnerHTML={{ __html: persona.avatar }} />
                }
                <div className="bg-surface-container px-4 py-2 rounded-xl text-sm text-on-surface-variant animate-pulse">...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-outline-variant/20 flex gap-2">
            <input
              className="flex-1 bg-surface-container-highest rounded-lg px-3 py-2 text-sm font-body text-on-surface placeholder:text-on-surface-variant/40 outline-none"
              placeholder={`שאל את ${persona.name}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              dir="rtl"
            />
            <button
              onClick={send}
              disabled={loading}
              className="w-10 h-10 rounded-lg flex items-center justify-center active:scale-90 duration-200 disabled:opacity-50"
              style={{ backgroundColor: persona.color, color: '#0e0e0e' }}
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
