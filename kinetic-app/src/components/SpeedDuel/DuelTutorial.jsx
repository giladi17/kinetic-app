import { useState, useRef } from "react";

const CARDS = [
  {
    icon: "⚡",
    title: "Speed Duel",
    visual: (
      <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
        <div className="w-full rounded-2xl p-4 flex flex-col items-center gap-3"
             style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)" }}>
          <div className="flex gap-1.5 justify-center">
            {["B", "R", "A", "D"].map((l, i) => (
              <div key={i} className="w-9 h-11 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                   style={{
                     background: "rgba(124,58,237,0.25)",
                     border: "2px solid rgba(124,58,237,0.5)",
                     animation: `duelFillIn 0.3s ease-out ${i * 0.15}s both`,
                   }}>
                {l}
              </div>
            ))}
            <div className="w-3" />
            {["P", "I", "T", "T"].map((l, i) => (
              <div key={i + 4} className="w-9 h-11 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                   style={{
                     background: "rgba(124,58,237,0.25)",
                     border: "2px solid rgba(124,58,237,0.5)",
                     animation: `duelFillIn 0.3s ease-out ${(i + 4) * 0.15}s both`,
                   }}>
                {l}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">⏱️</span>
            <span className="text-xs font-bold" style={{ color: "#FBBF24" }}>First to guess wins!</span>
          </div>
        </div>
      </div>
    ),
    text: "Same celebrity puzzle — race your opponent!\nBest of 3 rounds wins the match.",
  },
  {
    icon: "🔤",
    title: "Word Duel",
    visual: (
      <div className="flex flex-col items-center gap-3 w-full max-w-[280px]">
        <div className="w-full rounded-2xl p-4 flex flex-col items-center gap-2.5"
             style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
          {["WILL", "MILL", "MILE", "BILE"].map((word, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-white/30 text-xs mr-1">→</span>}
              {word.split("").map((l, j) => {
                const prev = i > 0 ? ["WILL", "MILL", "MILE", "BILE"][i - 1] : null;
                const changed = prev && prev[j] !== l;
                return (
                  <span key={j} className="w-8 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{
                          background: changed ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                          border: changed ? "2px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.1)",
                          color: changed ? "#34D399" : "white",
                        }}>
                    {l}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">⏳</span>
          <span className="text-xs font-bold" style={{ color: "#93C5FD" }}>Time decreases each turn!</span>
        </div>
      </div>
    ),
    text: "Take turns changing ONE letter.\nCan't find a word in time? You lose!",
  },
];

export default function DuelTutorial({ onDone }) {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);
  const [animating, setAnimating] = useState(false);
  const touchStart = useRef(null);

  const goTo = (index) => {
    if (animating || index === current) return;
    setDir(index > current ? 1 : -1);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 250);
  };

  const dismiss = () => {
    localStorage.setItem("hasSeenDuelTutorial", "true");
    onDone();
  };

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    touchStart.current = null;
    if (Math.abs(diff) < 50) return;
    if (diff > 0 && current < CARDS.length - 1) goTo(current + 1);
    if (diff < 0 && current > 0) goTo(current - 1);
  };

  const card = CARDS[current];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0F0F1A 100%)" }}
         onTouchStart={handleTouchStart}
         onTouchEnd={handleTouchEnd}>

      <button onClick={dismiss}
              className="absolute top-5 right-5 text-white/25 text-xs hover:text-white/50 transition-colors cursor-pointer z-10 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
        Skip
      </button>

      <div className="w-full max-w-[400px] h-full flex flex-col px-5 py-6">
        <div className={`flex-1 flex flex-col items-center justify-center gap-5 transition-all duration-250
              ${animating ? (dir > 0 ? "opacity-0 -translate-x-10" : "opacity-0 translate-x-10") : "opacity-100 translate-x-0"}`}>

          <span className="text-6xl">{card.icon}</span>
          <h1 className="text-3xl font-extrabold text-white text-center">{card.title}</h1>

          {card.visual}

          <p className="text-white/60 text-sm text-center leading-relaxed whitespace-pre-line max-w-[280px]">
            {card.text}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 pb-4">
          <div className="flex gap-2.5">
            {CARDS.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                      className={`rounded-full transition-all duration-300 cursor-pointer ${
                        i === current ? "w-8 h-2.5 gradient-primary" : "w-2.5 h-2.5 bg-white/15"
                      }`} />
            ))}
          </div>

          {current < CARDS.length - 1 ? (
            <button onClick={() => goTo(current + 1)}
                    className="w-full max-w-[280px] py-4 rounded-2xl gradient-primary text-white font-extrabold text-base
                               active:scale-95 transition-all duration-200 cursor-pointer
                               shadow-[0_4px_32px_rgba(139,92,246,0.4)]">
              Next →
            </button>
          ) : (
            <button onClick={dismiss}
                    className="w-full max-w-[280px] py-4 rounded-2xl text-white font-extrabold text-base
                               active:scale-95 transition-all duration-200 cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #F59E0B)",
                      boxShadow: "0 6px 30px rgba(124,58,237,0.35), 0 6px 30px rgba(245,158,11,0.2)",
                    }}>
              Let&apos;s Duel! ⚔️
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes duelFillIn {
          from { opacity: 0; transform: scale(0.7) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
