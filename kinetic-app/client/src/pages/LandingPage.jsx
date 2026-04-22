import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Scroll-in animation hook ──────────────────────────────────────────────
function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.1 }
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

// ─── App Mockup SVG ────────────────────────────────────────────────────────
function AppMockup() {
  const bars = [55, 70, 45, 85, 60, 95, 75];
  const max = 95;
  return (
    <div className="relative select-none w-56" aria-hidden>
      <svg viewBox="0 0 176 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
        <rect x="1" y="1" width="174" height="338" rx="28" fill="#111" stroke="#222" strokeWidth="2" />
        <rect x="60" y="10" width="56" height="10" rx="5" fill="#1e1e1e" />
        <rect x="10" y="30" width="156" height="280" rx="16" fill="#0e0e0e" />
        <text x="88" y="54" textAnchor="middle" fill="#CCFF00" fontSize="8" fontWeight="900" fontFamily="Arial Black,Arial" letterSpacing="2">KINETIC</text>
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
        <polyline points={bars.map((v, i) => `${33 + i * 18},${190 - (v / max) * 60}`).join(' ')}
          fill="none" stroke="#CCFF00" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="26" y="228" fill="#555" fontSize="5.5" fontFamily="Arial">חלבון יומי</text>
        <text x="150" y="228" textAnchor="end" fill="#CCFF00" fontSize="5.5" fontFamily="Arial">128/160g</text>
        <rect x="26" y="231" width="130" height="5" rx="2.5" fill="#222" />
        <rect x="26" y="231" width="104" height="5" rx="2.5" fill="#CCFF00" />
        <rect x="18" y="245" width="140" height="36" rx="8" fill="#1a200a" />
        <circle cx="29" cy="256" r="6" fill="#CCFF00" fillOpacity="0.15" />
        <text x="29" y="259" textAnchor="middle" fill="#CCFF00" fontSize="7">🤖</text>
        <text x="40" y="255" fill="#999" fontSize="5.5" fontFamily="Arial">AI Coach</text>
        <text x="40" y="265" fill="#777" fontSize="5" fontFamily="Arial">העלת 5kg בסקוואט!</text>
        <rect x="10" y="295" width="156" height="14" rx="0" fill="#0a0a0a" />
        {['🏠','💪','🍽️','📊'].map((icon, i) => (
          <text key={i} x={35 + i * 36} y="305" textAnchor="middle" fontSize="8" fill={i === 0 ? '#CCFF00' : '#444'}>{icon}</text>
        ))}
        <rect x="68" y="320" width="40" height="3" rx="1.5" fill="#333" />
      </svg>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function goRegister() { navigate('/login?mode=register'); }
  function goLogin()    { navigate('/login'); }
  function goPricing()  { navigate('/pricing'); }

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#151C25] font-space" dir="rtl">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <span className="text-xl font-black tracking-tighter text-[#151C25]">
            KINETIC<span className="text-[#CCFF00]" style={{ textShadow: '0 0 12px rgba(204,255,0,0.6)' }}>.</span>
          </span>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-semibold text-[#656464] hover:text-[#151C25] transition-colors">
              פיצ׳רים
            </button>
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-semibold text-[#656464] hover:text-[#151C25] transition-colors">
              איך זה עובד
            </button>
            <button onClick={goPricing}
              className="text-sm font-semibold text-[#656464] hover:text-[#151C25] transition-colors">
              מחיר
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={goLogin}
              className="text-sm font-semibold text-[#656464] hover:text-[#151C25] transition-colors px-3 py-2">
              Sign In
            </button>
            <button onClick={goPricing}
              className="text-sm font-black bg-[#151C25] text-white px-5 py-2.5 rounded-xl hover:bg-[#CCFF00] hover:text-black transition-all active:scale-95">
              Go Pro
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-screen flex items-center pt-24 pb-16 px-8">
        <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-16 items-center">

          {/* Text — right side (RTL) */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 self-start bg-[#CCFF00]/15 text-[#4a6600] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
              הדור הבא של אפליקציות הכושר
            </div>

            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] text-[#151C25]">
              Train<br />
              <span className="text-[#151C25]">Smarter.</span><br />
              <span style={{ WebkitTextStroke: '2px #151C25', color: 'transparent' }}>Break PRs.</span>
            </h1>

            <p className="text-lg text-[#656464] max-w-md font-medium leading-relaxed">
              KINETIC מנהל את האימונים, התזונה והאנליטיקה שלך — כדי שתוכל להתמקד רק בביצועים.
            </p>

            <div className="flex flex-wrap gap-3">
              <button onClick={goRegister}
                className="bg-[#CCFF00] text-black font-black text-base px-8 py-4 rounded-xl hover:scale-105 hover:shadow-[0_0_24px_rgba(204,255,0,0.5)] active:scale-95 transition-all">
                START TRAINING →
              </button>
              <button onClick={goLogin}
                className="bg-white text-[#656464] font-semibold text-base px-8 py-4 rounded-xl hover:text-[#151C25] transition-all shadow-sm active:scale-95">
                Sign In
              </button>
            </div>

            <p className="text-xs text-[#9ea8b3] flex flex-wrap gap-x-4 gap-y-1">
              <span>✦ 500+ מתאמנים פעילים</span>
              <span>·</span>
              <span>⭐ 4.9/5</span>
              <span>·</span>
              <span>🔒 14 ימי ניסיון חינם</span>
            </p>
          </div>

          {/* Mockup — left side */}
          <div className="relative flex justify-center items-center order-first md:order-last">
            <div className="absolute w-64 h-64 rounded-full bg-[#CCFF00] opacity-20 blur-3xl" />
            <div className="relative z-10 rotate-3 hover:rotate-0 transition-transform duration-500">
              <AppMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ── */}
      <section id="features" className="py-24 px-8 bg-[#EEF4FF]">
        <div className="max-w-7xl mx-auto">
          <AnimSection className="mb-14">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CCFF00] mb-3"
               style={{ textShadow: '0 0 8px rgba(204,255,0,0.4)' }}>
              הכלים שלנו
            </p>
            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-[#151C25]">
              Precise Tools For<br />
              <span className="text-[#656464]">Peak Performance.</span>
            </h2>
          </AnimSection>

          {/* Bento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

            {/* Large card — AI Coach */}
            <AnimSection className="md:col-span-7" delay={0}>
              <div className="bg-[#151C25] text-white rounded-3xl p-8 h-full min-h-[260px] flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-2xl bg-[#CCFF00]/10 flex items-center justify-center text-2xl mb-4">🤖</div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2">AI Coach — TOM</h3>
                  <p className="text-gray-400 leading-relaxed">המאמן האישי שלך זמין 24/7. עדכן משקלים בשיחה טבעית, קבל ניתוח התאוששות ופצח Plateaus.</p>
                </div>
                <span className="text-[#CCFF00] text-xs font-black uppercase tracking-widest mt-4">זמין עכשיו →</span>
              </div>
            </AnimSection>

            {/* Small card — Plateau Detection */}
            <AnimSection className="md:col-span-5" delay={60}>
              <div className="bg-[#F8F9FF] rounded-3xl p-8 h-full min-h-[260px] flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-2xl bg-[#CCFF00]/20 flex items-center justify-center text-2xl mb-4">📈</div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-[#151C25]">Plateau Detection</h3>
                  <p className="text-[#656464] text-sm leading-relaxed">זיהוי אוטומטי כשאתה תקוע — ועצות מבוססות נתונים לפריצה.</p>
                </div>
              </div>
            </AnimSection>

            {/* Small card — Nutrition */}
            <AnimSection className="md:col-span-4" delay={120}>
              <div className="bg-[#F8F9FF] rounded-3xl p-8 h-full min-h-[200px] flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-2xl bg-[#CCFF00]/20 flex items-center justify-center text-2xl mb-4">🥩</div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-[#151C25]">מעקב תזונה חכם</h3>
                  <p className="text-[#656464] text-sm leading-relaxed">חלבון, קלוריות ומאקרו — הכל אוטומטי.</p>
                </div>
              </div>
            </AnimSection>

            {/* Small card — War Room */}
            <AnimSection className="md:col-span-4" delay={180}>
              <div className="bg-[#151C25] text-white rounded-3xl p-8 h-full min-h-[200px] flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-2xl bg-[#CCFF00]/10 flex items-center justify-center text-2xl mb-4">🔥</div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight mb-2">War Room</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">ציון ביצועים שבועי ומגמות נפח בדאשבורד אחד.</p>
                </div>
              </div>
            </AnimSection>

            {/* Small card — Recovery */}
            <AnimSection className="md:col-span-4" delay={240}>
              <div className="bg-[#F8F9FF] rounded-3xl p-8 h-full min-h-[200px] flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-2xl bg-[#CCFF00]/20 flex items-center justify-center text-2xl mb-4">🔋</div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-[#151C25]">ניתוח התאוששות</h3>
                  <p className="text-[#656464] text-sm leading-relaxed">הגיע לאימון ב-100% — בכל פעם.</p>
                </div>
              </div>
            </AnimSection>

          </div>
        </div>
      </section>

      {/* ── Blueprint / How it works ── */}
      <section id="how" className="py-24 px-8 bg-[#F8F9FF]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          {/* Mockup */}
          <AnimSection>
            <div className="relative flex justify-center">
              <div className="absolute w-72 h-72 rounded-full bg-[#CCFF00] opacity-10 blur-3xl" />
              <div className="relative z-10 -rotate-3 hover:rotate-0 transition-transform duration-500">
                <AppMockup />
              </div>
            </div>
          </AnimSection>

          {/* Steps */}
          <AnimSection delay={100}>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CCFF00] mb-3">
              איך זה עובד
            </p>
            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-[#151C25] mb-10">
              מה ש-KINETIC<br />עושה בשבילך.
            </h2>

            <div className="space-y-8">
              {[
                { num: '01', title: 'תתחבר ותגדיר יעדים', desc: 'הגדרת פרופיל, יעדי תזונה ואימונים תוך 2 דקות.' },
                { num: '02', title: 'עקוב אחרי כל אימון', desc: 'הוסף סטים, משקלים ותגלה PR חדש בכל שבוע.' },
                { num: '03', title: 'תן ל-AI לנתח', desc: 'TOM מזהה מגמות, ממלא פערי תזונה ומציע שינויים חכמים.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-5 items-start group">
                  <div className="w-12 h-12 rounded-2xl bg-[#151C25] text-[#CCFF00] font-black text-sm flex items-center justify-center shrink-0 group-hover:bg-[#CCFF00] group-hover:text-black transition-colors duration-300">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[#151C25] mb-1">{step.title}</h3>
                    <p className="text-[#656464] text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimSection>

        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-16 px-8 bg-[#EEF4FF]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#9ea8b3] mb-8">
            500+ מתאמנים משתמשים ב-KINETIC כל יום
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 opacity-40">
            {['MYPROTEIN', 'GOLD\'S GYM', 'DECATHLON', 'UNDER ARMOUR', 'NIKE TRAINING'].map(brand => (
              <span key={brand} className="font-black text-sm tracking-widest text-[#151C25] uppercase">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-28 px-8 bg-[#151C25]">
        <AnimSection>
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CCFF00]">התחל עכשיו</p>
            <h2 className="text-5xl sm:text-6xl font-black italic tracking-tighter uppercase leading-tight text-white">
              מוכן להפוך<br />כל אימון לנתון?
            </h2>
            <p className="text-white/50 text-base leading-relaxed">
              הצטרף ל-500+ מתאמנים שמגיעים לתוצאות עם KINETIC.<br />
              14 ימי ניסיון חינם, ביטול בכל עת.
            </p>
            <button
              onClick={goRegister}
              className="bg-[#CCFF00] text-black font-black text-lg px-14 py-5 rounded-xl inline-block hover:scale-105 hover:shadow-[0_0_40px_rgba(204,255,0,0.3)] active:scale-95 transition-all"
            >
              START FREE TRIAL →
            </button>
            <p className="text-xs text-white/25">ללא כרטיס אשראי · ביטול בכל עת · מאובטח ב-SSL</p>
          </div>
        </AnimSection>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#151C25] border-t border-white/5 py-10 px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <span className="font-black text-base text-[#CCFF00]/60 uppercase tracking-tighter">KINETIC.</span>
          <span>© 2026 KINETIC Performance · כל הזכויות שמורות</span>
          <div className="flex gap-6">
            <button onClick={goLogin}    className="hover:text-white/60 transition-colors">Sign In</button>
            <button onClick={goRegister} className="hover:text-white/60 transition-colors">הרשמה</button>
            <button onClick={goPricing}  className="hover:text-white/60 transition-colors">מחיר</button>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
