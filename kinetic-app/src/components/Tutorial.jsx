import { useState, useRef } from "react";
import { useGame } from "../context/GameContext";

const CARDS = [
  {
    title: "Spot the Twist 🎭",
    visual: (
      <div className="flex flex-col items-center gap-4">
        <div className="w-40 h-40 rounded-3xl overflow-hidden"
             style={{ border: "3px solid rgba(245,158,11,0.5)", boxShadow: "0 0 30px rgba(245,158,11,0.2), 0 8px 32px rgba(0,0,0,0.4)" }}>
          <img src="/images/elon-mask.png" alt="Elon Musk" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-white text-2xl font-extrabold tracking-widest">ELON MUSK</p>
          <div className="flex items-center gap-2 text-base font-bold">
            <span className="text-white/50">becomes</span>
          </div>
          <div className="flex text-2xl font-extrabold tracking-widest">
            <span className="text-white">ELON M</span>
            <span className="relative" style={{ color: "#F97316", textShadow: "0 0 14px rgba(249,115,22,0.7)" }}>
              A
              <span className="absolute -bottom-0.5 left-0 right-0 h-[3px] rounded-full" style={{ background: "#F97316", boxShadow: "0 0 8px rgba(249,115,22,0.6)" }} />
            </span>
            <span className="text-white">SK</span>
          </div>
        </div>
      </div>
    ),
    text: "One letter is wrong — can you spot it?",
  },
  {
    title: "Need Help? 💡",
    visual: (
      <div className="flex flex-col gap-3 w-full max-w-[280px]">
        {[
          { emoji: "💡", label: "Hint", desc: "reveals one letter" },
          { emoji: "👁️", label: "Reveal", desc: "shows the image" },
          { emoji: "🆘", label: "Ask", desc: "copy puzzle & send to a friend" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
               style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-white font-bold text-sm">{item.label}</span>
            <span className="text-white/40 text-sm">→ {item.desc}</span>
          </div>
        ))}
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="text-lg">⭐</span>
          <span className="text-sm font-bold" style={{ color: "#FBBF24" }}>No hints used = +5 bonus coins!</span>
        </div>
      </div>
    ),
    text: "",
  },
  {
    title: "Special Levels ⚡",
    visual: (
      <div className="flex flex-col gap-4 w-full max-w-[280px]">
        <div className="rounded-2xl p-4 flex items-center gap-4"
             style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
          <span className="text-4xl">⚡</span>
          <div>
            <p className="text-white font-bold text-sm">Mystery Level</p>
            <p className="text-white/50 text-xs">Image only, no name shown</p>
          </div>
        </div>
        <div className="rounded-2xl p-4 flex items-center gap-4"
             style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <span className="text-4xl">⚔️</span>
          <div>
            <p className="text-white font-bold text-sm">Boss Level</p>
            <p className="text-white/50 text-xs">Ultimate challenge — every 25 levels!</p>
          </div>
        </div>
      </div>
    ),
    text: "Every world has unique challenges!",
  },
  {
    title: "Challenge Friends 🎯",
    visual: (
      <div className="flex flex-col items-center gap-4 w-full max-w-[280px]">
        <div className="flex flex-col items-center gap-1">
          <span className="text-5xl">🏆</span>
        </div>
        <div className="w-full rounded-2xl p-4 flex flex-col items-center gap-2"
             style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}>
          <p className="text-white/70 text-xs">Share your result</p>
          <p className="text-lg font-extrabold" style={{ color: "#FBBF24" }}>⏱️ Can you beat 12 sec? 👇</p>
          <p className="text-white/40 text-[11px]">gilad-app.vercel.app</p>
        </div>
      </div>
    ),
    text: "Beat a level → share your time →\nfriend tries to beat you!",
  },
];

export default function Tutorial() {
  const { dispatch } = useGame();
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

  const handleSkip = () => dispatch({ type: "SET_TUTORIAL_SEEN" });

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0F0F1A 100%)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full max-w-[400px] h-full flex flex-col px-5 py-6">
        <div
          className={`flex-1 flex flex-col items-center justify-center gap-6 transition-all duration-250
            ${animating ? (dir > 0 ? "opacity-0 -translate-x-10" : "opacity-0 translate-x-10") : "opacity-100 translate-x-0"}`}
        >
          <h1 className="text-3xl font-extrabold text-white text-center">{card.title}</h1>

          {card.visual}

          {card.text && (
            <p className="text-white/60 text-base text-center leading-relaxed whitespace-pre-line max-w-[280px]">
              {card.text}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 pb-4">
          {/* Dot indicators */}
          <div className="flex gap-2.5">
            {CARDS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  i === current ? "w-8 h-2.5 gradient-primary" : "w-2.5 h-2.5 bg-white/15"
                }`}
              />
            ))}
          </div>

          {/* Action button */}
          {current < CARDS.length - 1 ? (
            <button
              onClick={() => goTo(current + 1)}
              className="w-full max-w-[280px] py-4 rounded-2xl gradient-primary text-white font-extrabold text-base
                         active:scale-95 transition-all duration-200 cursor-pointer
                         shadow-[0_4px_32px_rgba(139,92,246,0.4)]"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="w-full max-w-[280px] py-4 rounded-2xl text-white font-extrabold text-base
                         active:scale-95 transition-all duration-200 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #F59E0B)",
                boxShadow: "0 6px 30px rgba(124,58,237,0.35), 0 6px 30px rgba(245,158,11,0.2)",
              }}
            >
              Let&apos;s Play! 🚀
            </button>
          )}

          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="text-white/25 text-xs hover:text-white/50 transition-colors cursor-pointer py-1"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
