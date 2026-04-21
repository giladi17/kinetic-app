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

// ─── Phone Mockup ─────────────────────────────────────────────────────────
function AppMockup() {
  const bars = [55, 70, 45, 85, 60, 95, 75];
  const max = 95;

  return (
    <div className="relative select-none w-56" aria-hidden>
      <svg viewBox="0 0 176 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl relative">
        <rect x="1" y="1" width="174" height="338" rx="28" fill="#111" stroke="#222" strokeWidth="2" />
        <rect x="60" y="10" width="56" height="10" rx="5" fill="#1e1e1e" />
        <rect x="10" y="30" width="156" height="280" rx="16" fill="#0e0e0e" />

        <text x="88" y="54" textAnchor="middle" fill="#CCFF00" fontSize="8" fontWeight="900" fontFamily="Arial Black, Arial" letterSpacing="2">KINETIC</text>
        <text x="88" y="66" textAnchor="middle" fill="#555" fontSize="6" fontFamily="Arial">שבוע נוכחי</text>

        {[{ x: 18, label: 'רצף', val: '12' }, { x: 76, label: 'אימונים', val: '4' }, { x: 116, label: 'נפח', val: '2.4' }].map(chip => (
          <g key={chip.x}>
            <rect x={chip.x} y="74" width={chip.x === 18 ? 50 : 36} height="28" rx="6" fill="#1a1a1a" />
            <text x={chip.x + (chip.x === 18 ? 25 : 18)} y="85" textAnchor="middle" fill="#CCFF00" fontSize="8" fontWeight="900" fontFamily="Arial Black">{chip.val}</text>
            <text x={chip.x + (chip.x === 18 ? 25 : 18)} y="96" textAnchor="middle" fill="#555" fontSize="5.5" fontFamily="Arial">{chip.label}</text>
          </g>
        ))}

        <rect x="18" y="112" width="140" height="100" rx="10" fill="#141414" />
        <text x="26" y="125" fill="#444" fontSize="5.5" fontFamily="Arial">נפח שבועי (kg)</text>
        {bars.map((v, i) => (
          <rect key={i} x={28 + i * 18} y={190 - (v / max) * 60} width="10" height={(v / max) * 60} rx="3"
            fill={i === 5 ? '#CCFF00' : '#2a2a2a'} />
        ))}
        <polyline
          points={bars.map((v, i) => `${33 + i * 18},${190 - (v / max) * 60}`).join(' ')}
          fill="none" stroke="#CCFF00" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round"
        />

        <text x="26" y="228" fill="#555" fontSize="5.5" fontFamily="Arial">חלבון יומי</text>
        <text x="150" y="228" textAnchor="end" fill="#CCFF00" fontSize="5.5" fontFamily="Arial">128/160g</text>
        <rect x="26" y="231" width="130" height="5" rx="2.5" fill="#222" />
        <rect x="26" y="231" width="104" height="5" rx="2.5" fill="#CCFF00" />

        <rect x="18" y="245" width="140" height="36" rx="8" fill="#1a200a" stroke="#CCFF00" strokeWidth="0.5" strokeOpacity="0.3" />
        <circle cx="29" cy="256" r="6" fill="#CCFF00" fillOpacity="0.15" />
        <text x="29" y="259" textAnchor="middle" fill="#CCFF00" fontSize="7">🤖</text>
        <text x="40" y="255" fill="#999" fontSize="5.5" fontFamily="Arial">AI Coach</text>
        <text x="40" y="265" fill="#777" fontSize="5" fontFamily="Arial">העלת 5kg בסקוואט!</text>
        <text x="40" y="274" fill="#777" fontSize="5" fontFamily="Arial">חסר 32g חלבון לסגירת יעד.</text>

        <rect x="10" y="295" width="156" height="14" rx="0" fill="#0a0a0a" />
        {['🏠','💪','🍽️','📊'].map((icon, i) => (
          <text key={i} x={35 + i * 36} y="305" textAnchor="middle" fontSize="8" fill={i === 0 ? '#CCFF00' : '#444'}>{icon}</text>
        ))}
        <rect x="68" y="320" width="40" height="3" rx="1.5" fill="#333" />
      </svg>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { emoji: '🥩', title: 'מעקב תזונה חכם',        desc: 'חישוב אוטומטי של קלוריות וחלבונים עם תום ה-AI שלנו.' },
  { emoji: '🏋️‍♂️', title: 'תכנון אימונים דינמי', desc: 'ניהול סטים, חזרות ומשקלים. שבירת PRs מעולם לא הייתה קלה יותר.' },
  { emoji: '🔋', title: 'אנליטיקת התאוששות',      desc: 'מעקב אחרי מדדי התאוששות כדי להבטיח שאתה מגיע לאימון ב-100%.' },
  { emoji: '🤖', title: "צ'אט AI צמוד",           desc: 'המאמן האישי שלך זמין 24/7 לכל שאלה, שינוי או התייעצות.' },
  { emoji: '📈', title: 'Plateau Detection',       desc: 'זיהוי אוטומטי כשאתה תקוע — ועצות מבוססות נתונים לפריצה קדימה.' },
  { emoji: '🔥', title: 'War Room שבועי',          desc: 'ציון ביצועים, מגמות נפח והשוואה שבוע-על-שבוע בדשבורד אחד.' },
];

const TESTIMONIALS = [
  { name: 'רועי', age: 28, text: '"תוך 3 חודשים שברתי את כל השיאים שלי. ה-Plateau Detection אמר לי בדיוק מתי לשנות תוכנית."' },
  { name: 'מיכל', age: 34, text: '"ה-AI Coach הציל לי את הדיאטה. במקום לנחש מה לאכול, יש לי תשובה מדויקת כל יום."' },
  { name: 'דניאל', age: 31, text: '"אחרי 5 שנים בחדר כושר, סוף סוף יש לי נתונים אמיתיים. ה-War Room השבועי שינה את הגישה שלי."' },
];

const PRICING = [
  {
    name: 'Free', price: '₪0', period: 'לתמיד',
    features: ['מעקב אימונים בסיסי', 'מעקב תזונה', 'תוספי תזונה', 'Progress גרפים (7 ימים)'],
    cta: 'התחל חינם', highlight: false,
  },
  {
    name: 'Pro', price: '₪49', period: 'לחודש',
    note: '14 ימי Trial חינם · ללא כרטיס אשראי',
    features: ['כל מה שב-Free', 'AI Coach אישי', 'Plateau Detection', 'Gap Filler תזונתי', 'War Room שבועי', 'היסטוריה מלאה', 'Analytics מתקדם'],
    cta: 'התחל Trial חינם', highlight: true,
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
    <div className="min-h-screen bg-landing-surface text-landing-on-surface font-space" dir="rtl">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-landing-surface/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}>
        <div className="flex justify-between items-center px-8 py-5 max-w-7xl mx-auto">
          <div className="text-xl font-black tracking-tighter text-landing-on-surface">
            KINETIC<span className="text-electric-lime" style={{ textShadow: '0 0 12px rgba(204,255,0,0.6)' }}>.</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={goLogin}
              className="text-sm text-landing-muted hover:text-landing-on-surface transition-colors px-3 py-2 font-medium">
              התחברות
            </button>
            <button onClick={goRegister}
              className="text-sm font-bold bg-electric-lime text-black px-5 py-2.5 rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] active:scale-95 transition-all">
              התחל חינם
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-landing-surface min-h-screen flex items-center pt-20 pb-16">
        <div className="container mx-auto px-8 grid md:grid-cols-2 gap-12 items-center max-w-7xl">

          {/* Right — text */}
          <div className="flex flex-col items-end space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-electric-lime/20 text-[#4a6600] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-electric-lime animate-pulse" />
              הדור הבא של אפליקציות הכושר
            </div>

            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-none text-right">
              מהירות <br />
              <span className="text-electric-lime drop-shadow-md">= כוח.</span>
            </h1>

            <p className="text-lg md:text-xl text-landing-muted max-w-md font-medium text-right leading-relaxed">
              מערכת ניהול האימונים והתזונה החכמה ביותר.<br />
              בלי בולשיט, רק תוצאות.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button onClick={goRegister}
                className="bg-electric-lime text-black font-bold text-lg px-10 py-4 rounded-full transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] active:scale-95">
                התחל 14 יום חינם ✦
              </button>
              <button onClick={goLogin}
                className="bg-white text-landing-muted font-medium text-base px-8 py-4 rounded-full hover:text-landing-on-surface transition-all active:scale-95 shadow-sm">
                יש לי חשבון
              </button>
            </div>

            <p className="text-xs text-[#9ea8b3] flex flex-wrap gap-x-3 gap-y-1 justify-end">
              <span>✦ 500+ מתאמנים פעילים</span>
              <span>·</span><span>⭐ 4.9/5</span>
              <span>·</span><span>🔒 ללא כרטיס אשראי</span>
            </p>
          </div>

          {/* Left — App Mockup with lime depth */}
          <div className="relative flex justify-center order-first md:order-last">
            <div className="absolute inset-0 bg-electric-lime rounded-3xl transform translate-x-4 translate-y-4 opacity-30 blur-sm" />
            <div className="relative z-10"><AppMockup /></div>
          </div>

        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-white text-landing-on-surface font-space py-24">
        <div className="container mx-auto px-8 max-w-7xl">
          <AnimSection className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight">
              Precise Tools For <br />
              <span className="text-landing-muted">Peak Velocity</span>
            </h2>
          </AnimSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <AnimSection key={i} delay={i * 60}>
                <div className="bg-landing-surface p-8 rounded-3xl border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_-10px_rgba(204,255,0,0.5)] cursor-pointer group h-full">
                  <div className="text-4xl mb-4 bg-white w-16 h-16 rounded-full flex items-center justify-center shadow-sm group-hover:bg-electric-lime transition-colors duration-300">
                    {f.emoji}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-landing-on-surface">{f.title}</h3>
                  <p className="text-landing-muted font-medium leading-relaxed">{f.desc}</p>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-28 px-8 bg-landing-surface">
        <div className="max-w-7xl mx-auto">
          <AnimSection className="text-center mb-16">
            <p className="text-xs text-[#4a6600] uppercase tracking-widest font-bold mb-3">ביקורות</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-landing-on-surface">
              מה אומרים המשתמשים
            </h2>
          </AnimSection>

          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <AnimSection key={i} delay={i * 80}>
                <div className="bg-white rounded-2xl p-8 flex flex-col gap-5 h-full">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, k) => <span key={k} className="text-base" style={{ color: '#7cbf00' }}>★</span>)}
                  </div>
                  <p className="text-sm text-landing-muted leading-relaxed flex-1">{t.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-electric-lime flex items-center justify-center text-black font-black text-sm">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-landing-on-surface">{t.name}</div>
                      <div className="text-xs text-[#9ea8b3]">גיל {t.age}</div>
                    </div>
                  </div>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-landing-surface text-landing-on-surface font-space py-24">
        <div className="container mx-auto px-8 max-w-5xl">
          <AnimSection className="text-center mb-16">
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter">
              Choose Your <br />
              <span className="text-electric-lime">Velocity</span>
            </h2>
            <p className="text-landing-muted mt-4 text-sm">14 ימי Trial חינם על Pro — ביטול בכל עת</p>
          </AnimSection>

          <div className="flex flex-col md:flex-row justify-center items-stretch gap-8">
            {PRICING.map((plan, i) => (
              <AnimSection key={i} delay={i * 80} className="flex-1">
                <div className={`relative flex flex-col p-10 rounded-[2.5rem] h-full transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-landing-on-surface text-white scale-105 shadow-2xl z-10 border-4 border-electric-lime'
                    : 'bg-white border border-gray-100'
                }`}>
                  {plan.highlight && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-electric-lime text-black font-black px-6 py-2 rounded-full text-sm tracking-widest uppercase shadow-lg whitespace-nowrap">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className={`text-2xl font-black italic uppercase ${plan.highlight ? 'text-electric-lime' : ''}`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline mt-4 gap-1.5">
                      <span className="text-5xl font-black">{plan.price}</span>
                      <span className={`text-sm ${plan.highlight ? 'text-gray-400' : 'text-landing-muted'}`}>/{plan.period}</span>
                    </div>
                    {plan.note && (
                      <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? 'text-gray-300' : 'text-landing-muted'}`}>
                        {plan.note}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-10 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 rtl:space-x-reverse">
                        <span className={`text-lg font-bold flex-shrink-0 ${plan.highlight ? 'text-electric-lime' : 'text-green-500'}`}>✓</span>
                        <span className={`font-medium text-sm ${plan.highlight ? 'text-white/80' : 'text-landing-muted'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => navigate('/pricing')}
                    className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 ${
                      plan.highlight
                        ? 'bg-electric-lime text-black hover:shadow-[0_0_20px_rgba(204,255,0,0.6)] hover:scale-105'
                        : 'bg-landing-on-surface text-white hover:bg-black'
                    }`}
                  >
                    {plan.highlight ? 'UPGRADE NOW' : 'GET STARTED'}
                  </button>
                </div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <AnimSection>
        <section className="py-28 px-8 bg-landing-on-surface text-center">
          <div className="max-w-lg mx-auto space-y-8">
            <h2 className="text-5xl sm:text-6xl font-black italic tracking-tighter uppercase leading-tight text-white">
              מוכן להפוך<br />כל אימון לנתון?
            </h2>
            <p className="text-white/50 text-base leading-relaxed">
              הצטרף ל-500+ מתאמנים שמגיעים לתוצאות עם KINETIC.<br />
              14 ימי Trial חינם, ביטול בכל עת.
            </p>
            <button
              onClick={goRegister}
              className="bg-electric-lime text-black font-black text-lg px-12 py-5 rounded-full inline-block hover:scale-105 hover:shadow-[0_0_50px_rgba(204,255,0,0.25)] active:scale-95 transition-all"
            >
              התחל 14 יום חינם ✦
            </button>
            <p className="text-xs text-white/25">ללא כרטיס אשראי · ביטול בכל עת · מאובטח ב-SSL</p>
          </div>
        </section>
      </AnimSection>

      {/* ── Footer ── */}
      <footer className="bg-landing-on-surface py-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <span className="font-black text-base text-electric-lime/60 uppercase tracking-tighter">KINETIC</span>
          <span>© 2026 KINETIC Performance · כל הזכויות שמורות</span>
          <div className="flex gap-5">
            <button onClick={goLogin}                    className="hover:text-white/60 transition-colors">כניסה</button>
            <button onClick={goRegister}                 className="hover:text-white/60 transition-colors">הרשמה</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-white/60 transition-colors">מחיר</button>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
