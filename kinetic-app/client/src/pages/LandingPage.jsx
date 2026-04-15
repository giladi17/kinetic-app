import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Scroll-in animation hook ──────────────────────────────────────────────
function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.12 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

function AnimSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Phone + Chart SVG Mockup ──────────────────────────────────────────────
function AppMockup() {
  const bars = [55, 70, 45, 85, 60, 95, 75];
  const max = 95;
  const H = 80;

  // Build SVG polyline for trend line
  const points = bars.map((v, i) => `${14 + i * 20},${H - (v / max) * H}`).join(' ');

  return (
    <div className="relative mx-auto w-44 select-none" aria-hidden>
      {/* Glow */}
      <div className="absolute inset-0 bg-[#CCFF00]/10 rounded-[2rem] blur-2xl scale-110 pointer-events-none" />

      {/* Phone frame */}
      <svg
        viewBox="0 0 176 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full drop-shadow-2xl"
      >
        {/* Body */}
        <rect x="1" y="1" width="174" height="338" rx="28" fill="#111" stroke="#2a2a2a" strokeWidth="2" />
        {/* Status bar notch */}
        <rect x="60" y="10" width="56" height="10" rx="5" fill="#1e1e1e" />
        {/* Screen */}
        <rect x="10" y="30" width="156" height="280" rx="16" fill="#0e0e0e" />

        {/* ── Screen content ── */}

        {/* App header */}
        <text x="88" y="54" textAnchor="middle" fill="#CCFF00" fontSize="8" fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" letterSpacing="2">KINETIC</text>
        <text x="88" y="66" textAnchor="middle" fill="#666" fontSize="6" fontFamily="Arial, sans-serif">שבוע נוכחי</text>

        {/* Stat chips */}
        {[
          { x: 18, label: 'רצף', val: '12', unit: 'ימים' },
          { x: 76, label: 'אימונים', val: '4', unit: 'השבוע' },
          { x: 116, label: 'נפח', val: '2.4', unit: 'טון' },
        ].map(chip => (
          <g key={chip.x}>
            <rect x={chip.x} y="74" width={chip.x === 18 ? 50 : 36} height="28" rx="6" fill="#1a1a1a" />
            <text x={chip.x + (chip.x === 18 ? 25 : 18)} y="85" textAnchor="middle" fill="#CCFF00" fontSize="8" fontWeight="900" fontFamily="Arial Black, Arial">{chip.val}</text>
            <text x={chip.x + (chip.x === 18 ? 25 : 18)} y="96" textAnchor="middle" fill="#555" fontSize="5.5" fontFamily="Arial">{chip.label}</text>
          </g>
        ))}

        {/* Chart area */}
        <rect x="18" y="112" width="140" height="100" rx="10" fill="#141414" />
        <text x="26" y="125" fill="#444" fontSize="5.5" fontFamily="Arial">נפח שבועי (kg)</text>

        {/* Bar chart */}
        {bars.map((v, i) => (
          <rect
            key={i}
            x={28 + i * 18}
            y={190 - (v / max) * 60}
            width="10"
            height={(v / max) * 60}
            rx="3"
            fill={i === 5 ? '#CCFF00' : '#2a2a2a'}
          />
        ))}

        {/* Trend line */}
        <polyline
          points={bars.map((v, i) => `${33 + i * 18},${190 - (v / max) * 60}`).join(' ')}
          fill="none"
          stroke="#CCFF00"
          strokeWidth="1.5"
          strokeOpacity="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Protein progress */}
        <text x="26" y="228" fill="#555" fontSize="5.5" fontFamily="Arial">חלבון יומי</text>
        <text x="150" y="228" textAnchor="end" fill="#CCFF00" fontSize="5.5" fontFamily="Arial">128/160g</text>
        <rect x="26" y="231" width="130" height="5" rx="2.5" fill="#222" />
        <rect x="26" y="231" width="104" height="5" rx="2.5" fill="#CCFF00" />

        {/* AI message bubble */}
        <rect x="18" y="245" width="140" height="36" rx="8" fill="#1a200a" stroke="#CCFF00" strokeWidth="0.5" strokeOpacity="0.3" />
        <circle cx="29" cy="256" r="6" fill="#CCFF00" fillOpacity="0.15" />
        <text x="29" y="259" textAnchor="middle" fill="#CCFF00" fontSize="7">🤖</text>
        <text x="40" y="255" fill="#999" fontSize="5.5" fontFamily="Arial">AI Coach</text>
        <text x="40" y="265" fill="#777" fontSize="5" fontFamily="Arial">העלת 5kg בסקוואט!</text>
        <text x="40" y="274" fill="#777" fontSize="5" fontFamily="Arial">חסר 32g חלבון לסגירת יעד.</text>

        {/* Bottom nav */}
        <rect x="10" y="295" width="156" height="14" rx="0" fill="#0a0a0a" />
        {['🏠','💪','🍽️','📊'].map((icon, i) => (
          <text key={i} x={35 + i * 36} y="305" textAnchor="middle" fontSize="8" fill={i === 0 ? '#CCFF00' : '#444'}>{icon}</text>
        ))}

        {/* Home indicator */}
        <rect x="68" y="320" width="40" height="3" rx="1.5" fill="#333" />
      </svg>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { emoji: '🧠', title: 'AI Coach צמוד',        desc: 'מנתח את האימונים, התזונה והתוצאות שלך ונותן עצות ספציפיות — לא תשובות גנריות.' },
  { emoji: '⚡', title: 'Gap Filler תזונתי',     desc: 'חסר לך חלבון? המערכת מחשבת בדיוק מה לאכול עד סוף היום כדי לסגור את הגירעון.' },
  { emoji: '📈', title: 'Plateau Detection',      desc: 'זיהוי אוטומטי כשאתה תקוע — ועצות מבוססות נתונים לפריצה קדימה.' },
  { emoji: '⏱️', title: 'מעקב אימונים מדויק',   desc: 'רשום סטים, משקלים וחזרות בשנייה. שיאים אישיים מזוהים אוטומטית.' },
  { emoji: '💊', title: 'תוספי תזונה חכמים',     desc: 'תזכורות, streak יומי ואזהרת מלאי נמוך — הכל בלי לחשוב על זה.' },
  { emoji: '🔥', title: 'War Room שבועי',        desc: 'ציון ביצועים, מגמות נפח והשוואה שבוע-על-שבוע בדשבורד אחד.' },
];

const TESTIMONIALS = [
  { name: 'רועי', age: 28, text: '"תוך 3 חודשים שברתי את כל השיאים שלי. ה-Plateau Detection אמר לי בדיוק מתי לשנות תוכנית."' },
  { name: 'מיכל', age: 34, text: '"ה-AI Coach הציל לי את הדיאטה. במקום לנחש מה לאכול, יש לי תשובה מדויקת כל יום."' },
  { name: 'דניאל', age: 31, text: '"אחרי 5 שנים בחדר כושר, סוף סוף יש לי נתונים אמיתיים. ה-War Room השבועי שינה את הגישה שלי."' },
];

const PRICING = [
  {
    name: 'Free',
    price: '₪0',
    period: 'לתמיד',
    features: ['מעקב אימונים בסיסי', 'מעקב תזונה', 'תוספי תזונה', 'Progress גרפים (7 ימים)'],
    cta: 'התחל חינם',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₪49',
    period: 'לחודש',
    note: '14 ימי Trial חינם · ללא כרטיס אשראי',
    features: ['כל מה שב-Free', 'AI Coach אישי', 'Plateau Detection', 'Gap Filler תזונתי', 'War Room שבועי', 'היסטוריה מלאה', 'Analytics מתקדם'],
    cta: 'התחל Trial חינם',
    highlight: true,
  },
];

// ─── Main Component ────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function goRegister() { navigate('/login?mode=register'); }
  function goLogin()    { navigate('/login'); }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white font-sans" dir="rtl">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0e0e0e]/95 backdrop-blur-md border-b border-white/8 shadow-xl' : ''}`}>
        <div className="flex justify-between items-center p-5 max-w-6xl mx-auto">
          <div className="text-xl font-black tracking-tighter">
            KINETIC<span className="text-[#CCFF00]">.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={goLogin}
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2"
            >
              התחברות
            </button>
            <button
              onClick={goRegister}
              className="text-sm font-bold bg-[#CCFF00] text-black px-4 py-2 rounded-xl hover:bg-[#b3e600] active:scale-95 transition-all"
            >
              התחל חינם
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#CCFF00]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="grid lg:grid-cols-2 gap-14 items-center relative">

          {/* Left — text */}
          <div className="space-y-7 text-right order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#CCFF00]/30 bg-[#CCFF00]/8 text-[#CCFF00] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
              הדור הבא של אפליקציות הכושר
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
              הפלטפורמה שהופכת<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#CCFF00] to-green-400">
                כל אימון לנתון
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base text-gray-400 leading-relaxed max-w-lg">
              KINETIC משלבת מעקב טכני מדויק עם AI Coach אישי —
              כי נתונים בלי פעולה הם רק מספרים.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={goRegister}
                className="px-8 py-4 bg-[#CCFF00] text-black font-bold rounded-xl text-base hover:bg-[#b3e600] transition-all active:scale-95 shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:shadow-[0_0_45px_rgba(204,255,0,0.45)]"
              >
                התחל 14 ימי Trial חינם ✦
              </button>
              <button
                onClick={goLogin}
                className="px-8 py-4 bg-transparent border border-white/15 text-white/70 font-medium rounded-xl text-base hover:border-white/30 hover:text-white transition-all active:scale-95"
              >
                יש לי חשבון
              </button>
            </div>

            {/* Social proof line */}
            <p className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1 justify-end sm:justify-start">
              <span>✦ 500+ מתאמנים פעילים</span>
              <span className="text-gray-700">·</span>
              <span>⭐ 4.9/5</span>
              <span className="text-gray-700">·</span>
              <span>🔒 ללא כרטיס אשראי</span>
            </p>
          </div>

          {/* Right — App Mockup */}
          <div className="flex justify-center order-1 lg:order-2">
            <AppMockup />
          </div>
        </div>
      </main>

      {/* ── Features ── */}
      <section id="features" className="bg-[#111] py-24 border-y border-white/6">
        <div className="max-w-6xl mx-auto px-6">
          <AnimSection className="text-center mb-14">
            <p className="text-xs text-[#CCFF00] uppercase tracking-widest font-semibold mb-3">פיצ'רים</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              היתרון הלא הוגן שלך<br />
              <span className="text-[#CCFF00]">בחדר הכושר</span>
            </h2>
          </AnimSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <AnimSection key={i} delay={i * 60}>
                <div className="bg-[#0e0e0e] p-7 rounded-2xl border border-white/7 hover:border-[#CCFF00]/35 hover:-translate-y-1 hover:bg-[#141414] transition-all duration-300 h-full group cursor-default">
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">{f.emoji}</div>
                  <h3 className="text-base font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <AnimSection className="text-center mb-14">
          <p className="text-xs text-[#CCFF00] uppercase tracking-widest font-semibold mb-3">ביקורות</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            מה אומרים <span className="text-[#CCFF00]">המשתמשים</span>
          </h2>
        </AnimSection>

        <div className="grid sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <AnimSection key={i} delay={i * 80}>
              <div className="bg-[#111] border border-white/7 rounded-2xl p-7 flex flex-col gap-5 h-full hover:border-[#CCFF00]/20 transition-colors duration-300">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, k) => (
                    <span key={k} className="text-[#CCFF00] text-sm">★</span>
                  ))}
                </div>
                {/* Quote */}
                <p className="text-sm text-gray-400 leading-relaxed flex-1">{t.text}</p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#CCFF00]/15 border border-[#CCFF00]/25 flex items-center justify-center text-[#CCFF00] font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-gray-600">גיל {t.age}</div>
                  </div>
                </div>
              </div>
            </AnimSection>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 px-6 bg-[#111] border-t border-white/6">
        <div className="max-w-3xl mx-auto">
          <AnimSection className="text-center mb-12">
            <p className="text-xs text-[#CCFF00] uppercase tracking-widest font-semibold mb-3">מחיר</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              פשוט, שקוף,{' '}
              <span className="text-[#CCFF00]">הוגן</span>
            </h2>
            <p className="text-gray-500 mt-3 text-sm">14 ימי Trial חינם על Pro — ביטול בכל עת</p>
          </AnimSection>

          <div className="grid sm:grid-cols-2 gap-5">
            {PRICING.map((plan, i) => (
              <AnimSection key={i} delay={i * 80}>
                <div className={`rounded-2xl p-8 h-full flex flex-col gap-6 border transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-[#CCFF00]/10 to-[#CCFF00]/3 border-[#CCFF00]/30 shadow-[0_0_40px_rgba(204,255,0,0.07)]'
                    : 'bg-[#0e0e0e] border-white/8'
                }`}>
                  {plan.highlight && (
                    <span className="self-start text-[10px] font-black uppercase tracking-widest bg-[#CCFF00] text-black px-3 py-1 rounded-full">
                      הכי פופולרי
                    </span>
                  )}

                  <div>
                    <div className="font-black text-xl uppercase tracking-wider">{plan.name}</div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className={`font-black text-5xl ${plan.highlight ? 'text-[#CCFF00]' : ''}`}>{plan.price}</span>
                      <span className="text-gray-500 text-sm">/{plan.period}</span>
                    </div>
                    {plan.note && <p className="text-xs text-[#CCFF00]/60 mt-1">{plan.note}</p>}
                  </div>

                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm text-gray-400">
                        <span className="text-[#CCFF00] text-base flex-shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/pricing')}
                    className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider active:scale-95 transition-all duration-200 ${
                      plan.highlight
                        ? 'bg-[#CCFF00] text-black hover:bg-[#b3e600] shadow-[0_0_24px_rgba(204,255,0,0.25)]'
                        : 'border border-white/12 text-white/60 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <AnimSection>
        <section className="py-24 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#CCFF00]/4 to-transparent pointer-events-none" />
          <div className="max-w-lg mx-auto space-y-6 relative">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              מוכן<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#CCFF00] to-green-400">
                להפוך כל אימון לנתון?
              </span>
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              הצטרף ל-500+ מתאמנים שמגיעים לתוצאות עם KINETIC.<br />
              14 ימי Trial חינם, ביטול בכל עת.
            </p>
            <button
              onClick={goRegister}
              className="px-10 py-5 bg-[#CCFF00] text-black font-bold rounded-xl text-base shadow-[0_0_50px_rgba(204,255,0,0.3)] hover:shadow-[0_0_70px_rgba(204,255,0,0.45)] hover:bg-[#b3e600] active:scale-95 transition-all duration-200 w-full sm:w-auto"
            >
              התחל 14 יום חינם ✦
            </button>
            <p className="text-xs text-gray-700">ללא כרטיס אשראי · ביטול בכל עת · מאובטח ב-SSL</p>
          </div>
        </section>
      </AnimSection>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <span className="font-black text-base text-[#CCFF00]/50 uppercase tracking-tighter">KINETIC</span>
          <span>© 2026 KINETIC Performance · כל הזכויות שמורות</span>
          <div className="flex gap-5">
            <button onClick={goLogin}            className="hover:text-gray-400 transition-colors">כניסה</button>
            <button onClick={goRegister}         className="hover:text-gray-400 transition-colors">הרשמה</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-gray-400 transition-colors">מחיר</button>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
