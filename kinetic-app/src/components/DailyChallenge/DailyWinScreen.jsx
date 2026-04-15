import { useState, useEffect } from "react";
import Confetti from "../Confetti";
import CoinFlyAnimation from "../CoinFlyAnimation";

export default function DailyWinScreen({ result, level, onExit }) {
  const [phase, setPhase] = useState(0);
  const [toast, setToast] = useState("");
  const [coinFlyTrigger, setCoinFlyTrigger] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 50),
      setTimeout(() => setPhase(2), 150),
      setTimeout(() => setPhase(3), 250),
      setTimeout(() => { setPhase(4); setCoinFlyTrigger((t) => t + 1); }, 400),
      setTimeout(() => setPhase(5), 550),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleShare = async () => {
    const shareText = `WhoOops! Daily Challenge ✅\nSolved in ${result.timeSec} seconds!\nPlay at gilad-app.vercel.app`;
    const shareUrl = "https://gilad-app.vercel.app";

    if (navigator.share) {
      try {
        await navigator.share({ title: "WhoOops! 🎭", text: shareText, url: shareUrl });
        return;
      } catch {}
    }

    navigator.clipboard.writeText(shareText).then(() => {
      setToast("Link copied! 📋");
      setTimeout(() => setToast(""), 2500);
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4 flex-1">
      <Confetti />
      <CoinFlyAnimation trigger={coinFlyTrigger} startY="55%" />

      {phase >= 1 && (
        <div className="flex flex-col items-center gap-1 animate-bounce-in">
          <span className="text-3xl">👑</span>
          <h2 className="text-2xl font-extrabold text-gradient-gold text-center">
            Daily Challenge Complete!
          </h2>
        </div>
      )}

      {phase >= 2 && (
        <div className="animate-bounce-in flex flex-col items-center gap-2">
          <div
            className="font-mono text-5xl font-extrabold tracking-wider"
            style={{
              color: result.emoji === "🏆" ? "#10B981" : result.emoji === "⚡" ? "#FBBF24" : result.emoji === "🔥" ? "#F97316" : "#10B981",
              textShadow: "0 0 30px currentColor",
            }}
          >
            {result.timeSec}s
          </div>
          <h3 className="text-xl font-extrabold text-white text-center">
            {result.emoji} {result.title}
          </h3>
        </div>
      )}

      {phase >= 3 && (
        <div className="animate-reveal-zoom">
          {level.image ? (
            <div className="relative w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden mx-auto
                           shadow-[0_8px_32px_rgba(245,158,11,0.3)] ring-2 ring-gold/40">
              <img src={level.image} alt={level.answer} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md py-1.5 px-3 text-center">
                <span className="text-white font-extrabold text-base">{level.answer}</span>
              </div>
            </div>
          ) : (
            <div
              className="w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden mx-auto flex flex-col items-center justify-center gap-2
                         shadow-[0_8px_32px_rgba(245,158,11,0.3)] ring-2 ring-gold/40"
              style={{ background: `linear-gradient(135deg, ${level.bgColor}, #0F0F1A)` }}
            >
              <span className="text-[64px]">{level.emoji}</span>
              <span className="text-lg font-extrabold text-white">{level.answer}</span>
            </div>
          )}
        </div>
      )}

      {phase >= 4 && (
        <div className="flex flex-col items-center gap-3 animate-slide-up">
          <div className="glass rounded-2xl px-6 py-3 flex items-center gap-3">
            <span className="text-2xl">🪙</span>
            <span className="text-gradient-gold text-xl font-extrabold">+{result.coins} coins</span>
          </div>

          <div className="glass rounded-xl px-5 py-2.5 text-center">
            <p className="text-text-muted text-sm font-medium">
              🌍 You're <span className="text-gold-light font-bold">#{result.rank}</span> out of{" "}
              <span className="text-text font-bold">{result.totalPlayers.toLocaleString()}</span> players
            </p>
          </div>

          <p className="text-text-muted text-xs">
            {level.original} → {level.answer}
          </p>
        </div>
      )}

      {phase >= 5 && (
        <div className="flex flex-col gap-3 w-full max-w-[280px] animate-slide-up">
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-xl gradient-gold text-white font-bold text-base
                       hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer
                       shadow-[0_4px_24px_rgba(245,158,11,0.3)]"
          >
            Share Result 🌍
          </button>
          <button
            onClick={onExit}
            className="w-full py-3 rounded-xl glass text-text-muted font-semibold text-sm
                       border-white/10 hover:border-white/20 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            Back to Menu
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 glass gradient-correct text-white px-6 py-3
                       rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(16,185,129,0.3)] animate-fade-in z-50">
          ✅ {toast}
        </div>
      )}
    </div>
  );
}
