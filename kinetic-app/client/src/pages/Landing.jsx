import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Data ───────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: 'smart_toy',            title: 'AI Coach בעברית',       desc: 'מאמן שמנתח את הנתונים שלך ונותן עצות ספציפיות — לא תשובות גנריות.' },
  { icon: 'fitness_center',       title: 'מעקב אימונים חכם',       desc: 'רשום סטים ומשקלים בשנייה. Plateau Detection מזהה כשאתה תקוע.' },
  { icon: 'restaurant',           title: 'Gap Filler תזונתי',       desc: 'AI מציע מה לאכול לסוף היום כדי לסגור יעד קלוריות וחלבון.' },
  { icon: 'analytics',            title: 'War Room שבועי',          desc: 'ציון ביצועים, מגמות נפח, השוואה שבוע-על-שבוע — הכל בדשבורד אחד.' },
  { icon: 'science',              title: 'מעקב תוספי תזונה',        desc: 'תזכורות חכמות, streak יומי, ואזהרת מלאי נמוך.' },
  { icon: 'local_fire_department',title: 'Streak & מוטיבציה',       desc: 'סטריק יומי, XP על כל פעולה, ואזהרה כשהרצף בסכנה.' },
]

const STEPS = [
  { n: '01', icon: 'person_add',       title: 'נרשם ב-30 שניות',         desc: 'אין צורך בכרטיס אשראי. רק אימייל וסיסמה ואתה בפנים.' },
  { n: '02', icon: 'tune',             title: 'מגדיר יעד',               desc: 'הAI לומד את הגוף, המטרה והלוח זמנים שלך.' },
  { n: '03', icon: 'trending_up',      title: 'מתאמן ומגיע לתוצאות',     desc: 'מעקב, ניתוח ועצות — כל שלב מהיר יותר מהקודם.' },
]

const PRICING = [
  {
    name: 'Free', price: '₪0', period: 'לתמיד', highlight: false,
    features: ['מעקב אימונים בסיסי', 'מעקב תזונה', 'תוספי תזונה', 'Progress גרפים (7 ימים)'],
    cta: 'התחל חינם',
  },
  {
    name: 'Pro', price: '₪49', period: 'לחודש', highlight: true,
    annual: '₪399 לשנה — חסוך 33%',
    features: ['כל מה שב-Free', 'AI Coach אישי', 'Analytics מלא', 'Plateau Detection', 'Gap Filler', 'War Room שבועי', 'היסטוריה מלאה'],
    cta: 'נסה 14 יום חינם',
  },
]

const TESTIMONIALS = [
  { name: 'רון ב.', role: 'כוח + היפרטרופיה', text: 'ה-AI Coach שינה לי את הגישה לאימונים. מעולם לא הייתי עקבי כל כך.' },
  { name: 'מיה ג.', role: 'ריצה + כוח',         text: 'ה-Gap Filler הוא המשחק שינוי — כבר לא פוספס יעד חלבון יומי.' },
  { name: 'אמיר ל.', role: 'Crossfit',           text: 'War Room גרם לי להתייחס לאימונים כמו ניהול פרויקט. מדהים.' },
]

const COMPARE = [
  { feature: 'מעקב אימונים',        kinetic: true,  notebook: true,  generic: true  },
  { feature: 'מעקב תזונה',          kinetic: true,  notebook: false, generic: true  },
  { feature: 'AI Coach אישי',        kinetic: true,  notebook: false, generic: false },
  { feature: 'Plateau Detection',    kinetic: true,  notebook: false, generic: false },
  { feature: 'Gap Filler תזונתי',   kinetic: true,  notebook: false, generic: false },
  { feature: 'War Room שבועי',       kinetic: true,  notebook: false, generic: false },
  { feature: 'עברית מלאה',           kinetic: true,  notebook: true,  generic: false },
]

const FAQ = [
  { q: 'האם הניסיון חינמי לגמרי?',      a: 'כן. 14 ימים ב-Pro ללא כרטיס אשראי. לאחר מכן ₪49/חודש — ביטול בכל עת.' },
  { q: 'האם ה-AI מדבר עברית?',          a: 'ה-AI Coach מדבר עברית טבעית ומבין הקשר ישראלי — מזון, שגרה ותרבות.' },
  { q: 'מה ההבדל בין Free ל-Pro?',      a: 'Free מכסה את הבסיס. Pro פותח AI Coach, Analytics מלא, War Room ו-Gap Filler.' },
  { q: 'האם הנתונים שלי שמורים?',       a: 'כן. הנתונים מוצפנים ומגובים. לא מוכרים לצד שלישי.' },
]

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useInView(ref, threshold = 0.12) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref, threshold])
  return inView
}

function useCountUp(target, active, duration = 1400) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [active, target, duration])
  return val
}

// ─── Components ─────────────────────────────────────────────────────────────

function AnimSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref)
  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  )
}

function StatCounter({ value, suffix = '', label, active }) {
  const num = useCountUp(value, active)
  return (
    <div className="text-center py-6 px-4">
      <div className="font-headline font-black text-4xl sm:text-5xl text-[#cafd00]">{num}{suffix}</div>
      <div className="text-xs text-white/50 font-label mt-1.5 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function Tick() {
  return <span className="material-symbols-outlined text-[#cafd00] text-base flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
}

function Cross() {
  return <span className="material-symbols-outlined text-white/20 text-base flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
}

// ─── Dashboard Mockup ────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="w-full max-w-sm mx-auto bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)] select-none">
      {/* Top bar */}
      <div className="bg-[#0a0a0a] px-4 py-3 flex items-center gap-2 border-b border-white/8">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
        </div>
        <div className="mx-auto text-[10px] text-white/30 font-label">KINETIC · Dashboard</div>
      </div>

      <div className="p-4 space-y-3">
        {/* Greeting */}
        <div>
          <div className="text-[10px] text-white/40 font-label">שלום, אמיר 👋</div>
          <div className="text-sm font-bold">יום שלישי · אימון כוח</div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'רצף', val: '12', unit: 'ימים', color: 'text-[#cafd00]' },
            { label: 'קלוריות', val: '1,840', unit: 'מתוך 2,500', color: 'text-white' },
            { label: 'מוכנות', val: '87%', unit: 'גבוהה', color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-2.5 text-center">
              <div className={`text-base font-black ${s.color}`}>{s.val}</div>
              <div className="text-[9px] text-white/40 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar - protein */}
        <div className="bg-white/5 rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between text-[10px] text-white/50">
            <span>חלבון</span><span className="text-[#cafd00]">112 / 160g</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#cafd00] rounded-full" style={{ width: '70%' }} />
          </div>
        </div>

        {/* AI message */}
        <div className="bg-[#cafd00]/8 border border-[#cafd00]/20 rounded-xl p-3 flex gap-2">
          <span className="material-symbols-outlined text-[#cafd00] text-sm flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          <p className="text-[10px] text-white/70 leading-relaxed">
            חסר לך 48g חלבון. קוטג׳ 250g + ביצה יסגרו לך את זה לפני שינה 💪
          </p>
        </div>

        {/* Workout bar chart */}
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-[10px] text-white/40 mb-2">נפח שבועי (kg)</div>
          <div className="flex items-end gap-1.5 h-10">
            {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${i === 5 ? 'bg-[#cafd00]' : 'bg-white/15'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[8px] text-white/25 mt-1">
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <span key={d}>{d}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled]   = useState(false)
  const [openFaq, setOpenFaq]     = useState(null)
  const statsRef  = useRef(null)
  const statsInView = useInView(statsRef, 0.3)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 50) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function goRegister() { navigate('/login?mode=register') }
  function goLogin()    { navigate('/login') }
  function scrollTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden" dir="rtl">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/6 shadow-xl' : ''}`}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-headline font-black text-xl uppercase tracking-tighter text-[#cafd00]">KINETIC</span>
          <div className="hidden sm:flex items-center gap-6 text-xs text-white/50">
            <button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">פיצ'רים</button>
            <button onClick={() => scrollTo('how')}      className="hover:text-white transition-colors">איך זה עובד</button>
            <button onClick={() => scrollTo('pricing')}  className="hover:text-white transition-colors">מחיר</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goLogin} className="text-xs text-white/50 hover:text-white transition-colors px-3 py-2">
              כניסה
            </button>
            <button
              onClick={goRegister}
              className="text-xs font-bold bg-[#cafd00] text-[#3a4a00] px-4 py-2 rounded-xl hover:bg-[#beee00] active:scale-95 duration-150"
            >
              התחל חינם
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-28 pb-16 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#cafd00]/4 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-[#cafd00]/3 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Text */}
            <div className="space-y-6 text-right lg:order-1">
              {/* Social proof pill */}
              <div className="inline-flex items-center gap-2 bg-white/6 border border-white/10 rounded-full px-4 py-2 text-xs text-white/60">
                <div className="flex -space-x-1 rtl:space-x-reverse">
                  {['#cafd00','#beee00','#a8d400'].map((c,i) => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-[#0a0a0a]" style={{ background: c }} />
                  ))}
                </div>
                <span>+2,000 מתאמנים כבר בפנים</span>
              </div>

              <h1 className="font-headline font-black text-5xl sm:text-6xl uppercase leading-none tracking-tighter">
                האפליקציה<br />
                שתוביל אותך<br />
                <span className="text-[#cafd00]">לתוצאות</span>
              </h1>

              <p className="text-base text-white/55 leading-relaxed max-w-md">
                מעקב אימונים, תזונה ותוספים — עם AI Coach שמבין אותך.
                לא עוד אפליקציות מסובכות. רק תוצאות.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  onClick={goRegister}
                  className="font-headline font-bold text-sm uppercase bg-[#cafd00] text-[#3a4a00] px-7 py-4 rounded-xl shadow-[0_0_40px_rgba(202,253,0,0.3)] hover:shadow-[0_0_60px_rgba(202,253,0,0.4)] hover:bg-[#beee00] active:scale-95 duration-200"
                >
                  התחל 14 יום חינם ✦
                </button>
                <button
                  onClick={() => scrollTo('how')}
                  className="font-headline font-bold text-sm uppercase border border-white/12 text-white/60 px-7 py-4 rounded-xl hover:border-white/25 hover:text-white active:scale-95 duration-200"
                >
                  איך זה עובד?
                </button>
              </div>

              <p className="text-xs text-white/25">ללא כרטיס אשראי · ביטול בכל עת</p>
            </div>

            {/* Dashboard Mockup */}
            <div className="relative lg:order-2">
              {/* Glow behind mockup */}
              <div className="absolute inset-0 bg-[#cafd00]/6 rounded-3xl blur-3xl scale-90 pointer-events-none" />
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div ref={statsRef} className="py-4 px-6">
        <AnimSection>
          <div className="max-w-4xl mx-auto border border-white/8 rounded-2xl bg-white/3 backdrop-blur divide-x divide-x-reverse divide-white/8 grid grid-cols-3">
            <StatCounter value={14}   suffix=""   label="ימי ניסיון חינם" active={statsInView} />
            <StatCounter value={2000} suffix="+"  label="מתאמנים פעילים"  active={statsInView} />
            <StatCounter value={49}   suffix="₪"  label="לחודש בלבד"     active={statsInView} />
          </div>
        </AnimSection>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-6 max-w-5xl mx-auto">
        <AnimSection className="text-center mb-14">
          <p className="text-xs text-[#cafd00] font-label uppercase tracking-widest mb-3">פיצ'רים</p>
          <h2 className="font-headline font-black text-4xl sm:text-5xl uppercase tracking-tighter">
            כל מה שצריך,<br /><span className="text-[#cafd00]">במקום אחד</span>
          </h2>
          <p className="text-white/45 mt-4 max-w-sm mx-auto text-sm">מהמעקב הבסיסי ועד ניתוח מתקדם — KINETIC מכסה את הכל</p>
        </AnimSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <AnimSection key={i} delay={i * 60}>
              <div className="group bg-[#111] border border-white/7 rounded-2xl p-6 space-y-3 hover:border-[#cafd00]/35 hover:bg-[#151515] hover:-translate-y-1 transition-all duration-300 h-full cursor-default">
                <div className="w-10 h-10 rounded-xl bg-[#cafd00]/8 flex items-center justify-center group-hover:bg-[#cafd00]/18 transition-colors">
                  <span className="material-symbols-outlined text-[#cafd00] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                </div>
                <h3 className="font-headline font-bold text-base">{f.title}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{f.desc}</p>
              </div>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 px-6 bg-[#0d0d0d] border-y border-white/6">
        <div className="max-w-4xl mx-auto">
          <AnimSection className="text-center mb-14">
            <p className="text-xs text-[#cafd00] font-label uppercase tracking-widest mb-3">תהליך</p>
            <h2 className="font-headline font-black text-4xl sm:text-5xl uppercase tracking-tighter">
              3 צעדים<br /><span className="text-[#cafd00]">לתוצאות</span>
            </h2>
          </AnimSection>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-10 right-[16.6%] left-[16.6%] h-px bg-gradient-to-l from-[#cafd00]/30 via-[#cafd00]/10 to-[#cafd00]/30" />

            {STEPS.map((s, i) => (
              <AnimSection key={i} delay={i * 100}>
                <div className="text-center space-y-4 relative">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-[#cafd00]/8 border border-[#cafd00]/20 flex items-center justify-center relative">
                    <span className="material-symbols-outlined text-[#cafd00] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#cafd00] flex items-center justify-center">
                      <span className="text-[9px] font-black text-[#3a4a00]">{i + 1}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-base mb-1.5">{s.title}</h3>
                    <p className="text-xs text-white/45 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI COACH HIGHLIGHT ── */}
      <AnimSection>
        <section className="py-20 px-6 max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-[#cafd00]/8 to-transparent border border-[#cafd00]/18 rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-10">
            {/* Text */}
            <div className="flex-1 space-y-5 text-right">
              <div className="inline-flex items-center gap-2 bg-[#cafd00]/12 rounded-full px-3 py-1.5 text-xs text-[#cafd00] font-bold">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                AI Coach — בעברית
              </div>
              <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase tracking-tighter leading-tight">
                המאמן שמכיר<br />אותך לעומק
              </h2>
              <p className="text-white/55 leading-relaxed text-sm">
                ה-AI Coach מנתח אימונים, תזונה ותוצאות ונותן עצות ספציפיות לנתונים שלך —
                לא לתוצאות גוגל. מדבר עברית טבעית ומבין הקשר ישראלי.
              </p>
              <button
                onClick={goRegister}
                className="inline-flex items-center gap-2 font-headline font-bold text-sm uppercase bg-[#cafd00] text-[#3a4a00] px-6 py-3 rounded-xl hover:bg-[#beee00] active:scale-95 duration-200"
              >
                נסה את ה-AI Coach
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
            </div>

            {/* Chat mockup */}
            <div className="w-full sm:w-72 bg-[#0e0e0e] rounded-2xl border border-white/10 p-4 space-y-3 flex-shrink-0">
              <div className="flex items-center gap-2 pb-3 border-b border-white/8">
                <div className="w-7 h-7 rounded-full bg-[#cafd00]/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#cafd00] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                </div>
                <span className="text-xs font-bold text-white/80">KINETIC AI</span>
                <div className="mr-auto flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] text-white/30">פעיל</span>
                </div>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="bg-[#1a1a1a] rounded-xl rounded-tl-sm p-3 text-white/65 leading-relaxed">
                  האימון היה מעולה — העלת 5kg בסקוואט 🔥 שים לב שחלבון ב-60% מהיעד.
                </div>
                <div className="bg-[#cafd00]/10 border border-[#cafd00]/15 rounded-xl rounded-tr-sm p-3 text-white/75 leading-relaxed" dir="rtl">
                  מה מומלץ לאכול עכשיו?
                </div>
                <div className="bg-[#1a1a1a] rounded-xl rounded-tl-sm p-3 text-white/65 leading-relaxed">
                  קוטג 5% + 2 ביצים — 35g חלבון, יסגור לך את הגירעון בקלות.
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimSection>

      {/* ── COMPARISON ── */}
      <section className="py-16 px-6 bg-[#0d0d0d] border-y border-white/6">
        <div className="max-w-3xl mx-auto">
          <AnimSection className="text-center mb-10">
            <p className="text-xs text-[#cafd00] font-label uppercase tracking-widest mb-3">השוואה</p>
            <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase tracking-tighter">
              למה KINETIC<br /><span className="text-[#cafd00]">ולא אחרים?</span>
            </h2>
          </AnimSection>

          <AnimSection>
            <div className="rounded-2xl border border-white/8 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 bg-white/4 text-xs font-bold uppercase tracking-wider text-white/50">
                <div className="p-4">פיצ'ר</div>
                <div className="p-4 text-center text-[#cafd00]">KINETIC</div>
                <div className="p-4 text-center">מחברת</div>
                <div className="p-4 text-center">אפליקציה גנרית</div>
              </div>
              {COMPARE.map((row, i) => (
                <div key={i} className={`grid grid-cols-4 border-t border-white/5 text-sm ${i % 2 === 0 ? 'bg-white/2' : ''}`}>
                  <div className="p-4 text-white/70">{row.feature}</div>
                  <div className="p-4 flex justify-center">{row.kinetic  ? <Tick /> : <Cross />}</div>
                  <div className="p-4 flex justify-center">{row.notebook ? <Tick /> : <Cross />}</div>
                  <div className="p-4 flex justify-center">{row.generic  ? <Tick /> : <Cross />}</div>
                </div>
              ))}
            </div>
          </AnimSection>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <AnimSection className="text-center mb-10">
          <p className="text-xs text-[#cafd00] font-label uppercase tracking-widest mb-3">ביקורות</p>
          <h2 className="font-headline font-black text-3xl sm:text-4xl uppercase tracking-tighter">
            מה אומרים <span className="text-[#cafd00]">המשתמשים</span>
          </h2>
        </AnimSection>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <AnimSection key={i} delay={i * 80}>
              <div className="bg-[#111] border border-white/7 rounded-2xl p-6 space-y-4 h-full flex flex-col hover:border-[#cafd00]/20 transition-colors duration-300">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, k) => <span key={k} className="text-[#cafd00] text-sm">★</span>)}
                </div>
                <p className="text-sm text-white/60 leading-relaxed flex-1">"{t.text}"</p>
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-white/35">{t.role}</div>
                </div>
              </div>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-16 px-6 max-w-3xl mx-auto">
        <AnimSection className="text-center mb-10">
          <p className="text-xs text-[#cafd00] font-label uppercase tracking-widest mb-3">מחיר</p>
          <h2 className="font-headline font-black text-4xl sm:text-5xl uppercase tracking-tighter">
            פשוט,<br /><span className="text-[#cafd00]">שקוף, הוגן</span>
          </h2>
          <p className="text-white/45 mt-4 text-sm">14 ימי ניסיון חינם על Pro — ללא כרטיס אשראי</p>
        </AnimSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PRICING.map((p, i) => (
            <AnimSection key={i} delay={i * 80}>
              <div className={`rounded-2xl p-7 h-full flex flex-col gap-5 border transition-all duration-300 ${
                p.highlight
                  ? 'bg-gradient-to-b from-[#cafd00]/10 to-[#cafd00]/3 border-[#cafd00]/30 shadow-[0_0_50px_rgba(202,253,0,0.07)]'
                  : 'bg-[#111] border-white/7'
              }`}>
                {p.highlight && (
                  <div className="inline-flex self-start bg-[#cafd00] text-[#3a4a00] text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest">
                    הכי פופולרי
                  </div>
                )}
                <div>
                  <div className="font-headline font-black text-xl uppercase tracking-wider">{p.name}</div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className={`font-headline font-black text-5xl ${p.highlight ? 'text-[#cafd00]' : ''}`}>{p.price}</span>
                    <span className="text-white/35 text-sm">/{p.period}</span>
                  </div>
                  {p.annual && <div className="text-xs text-[#cafd00]/60 mt-1">{p.annual}</div>}
                </div>

                <ul className="space-y-2.5 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/65">
                      <Tick />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={goRegister}
                  className={`w-full py-4 rounded-xl font-headline font-bold text-sm uppercase tracking-wider active:scale-95 duration-200 transition-all ${
                    p.highlight
                      ? 'bg-[#cafd00] text-[#3a4a00] hover:bg-[#beee00] shadow-[0_0_28px_rgba(202,253,0,0.22)]'
                      : 'border border-white/12 text-white/60 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-6 max-w-2xl mx-auto">
        <AnimSection className="text-center mb-10">
          <p className="text-xs text-[#cafd00] font-label uppercase tracking-widest mb-3">שאלות</p>
          <h2 className="font-headline font-black text-3xl uppercase tracking-tighter">
            שאלות נפוצות
          </h2>
        </AnimSection>

        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <AnimSection key={i} delay={i * 50}>
              <div
                className="bg-[#111] border border-white/7 rounded-2xl overflow-hidden cursor-pointer hover:border-white/15 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="flex items-center justify-between p-5">
                  <span className="font-bold text-sm text-right flex-1">{item.q}</span>
                  <span className={`material-symbols-outlined text-white/40 text-lg flex-shrink-0 transition-transform duration-300 mr-3 ${openFaq === i ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40' : 'max-h-0'}`}>
                  <p className="px-5 pb-5 text-sm text-white/50 leading-relaxed">{item.a}</p>
                </div>
              </div>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <AnimSection>
        <section className="py-20 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#cafd00]/3 to-transparent pointer-events-none" />
          <div className="max-w-lg mx-auto space-y-6 relative">
            <div className="inline-flex items-center gap-2 bg-white/6 border border-white/10 rounded-full px-4 py-2 text-xs text-white/50">
              <span className="w-2 h-2 rounded-full bg-[#cafd00] animate-pulse" />
              14 ימי ניסיון חינם · ללא כרטיס אשראי
            </div>
            <h2 className="font-headline font-black text-4xl sm:text-5xl uppercase tracking-tighter">
              מוכן<br /><span className="text-[#cafd00]">להתחיל?</span>
            </h2>
            <p className="text-white/45 leading-relaxed text-sm">
              הצטרף לאלפי מתאמנים שמגיעים לתוצאות עם KINETIC. 14 יום חינם, ביטול בכל עת.
            </p>
            <button
              onClick={goRegister}
              className="font-headline font-bold text-base uppercase bg-[#cafd00] text-[#3a4a00] px-10 py-5 rounded-xl shadow-[0_0_50px_rgba(202,253,0,0.3)] hover:shadow-[0_0_70px_rgba(202,253,0,0.45)] hover:bg-[#beee00] active:scale-95 duration-200 w-full sm:w-auto"
            >
              התחל 14 יום חינם ✦
            </button>
            <p className="text-xs text-white/25">ללא כרטיס אשראי · ביטול בכל עת · מאובטח ב-SSL</p>
          </div>
        </section>
      </AnimSection>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/7 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/25">
          <span className="font-headline font-black text-base text-[#cafd00]/50 uppercase tracking-tighter">KINETIC</span>
          <span>© 2026 KINETIC Performance · כל הזכויות שמורות</span>
          <div className="flex gap-5">
            <button onClick={goLogin}    className="hover:text-white/60 transition-colors">כניסה</button>
            <button onClick={goRegister} className="hover:text-white/60 transition-colors">הרשמה</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-white/60 transition-colors">מחיר</button>
          </div>
        </div>
      </footer>

    </div>
  )
}
