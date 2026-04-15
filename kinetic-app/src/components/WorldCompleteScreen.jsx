import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import Confetti from "./Confetti";
import CoinFlyAnimation from "./CoinFlyAnimation";
import { playCoinSound, playWinSound } from "../utils/sounds";
import { getWorld } from "../data/worlds";

const GRADIENT_COLORS = {
  "from-purple-900 to-indigo-900": "rgba(88,28,135,0.3), rgba(49,46,129,0.2)",
  "from-orange-900 to-amber-900": "rgba(124,45,18,0.3), rgba(120,53,15,0.2)",
  "from-blue-900 to-cyan-900": "rgba(30,58,138,0.3), rgba(22,78,99,0.2)",
  "from-green-900 to-emerald-900": "rgba(20,83,45,0.3), rgba(6,78,59,0.2)",
  "from-red-900 to-rose-900": "rgba(127,29,29,0.3), rgba(136,19,55,0.2)",
  "from-violet-900 to-fuchsia-900": "rgba(76,29,149,0.3), rgba(112,26,117,0.2)",
  "from-sky-900 to-slate-900": "rgba(12,74,110,0.3), rgba(30,41,59,0.2)",
  "from-yellow-900 to-amber-900": "rgba(113,63,18,0.3), rgba(120,53,15,0.2)",
  "from-gray-900 to-zinc-900": "rgba(17,24,39,0.3), rgba(24,24,27,0.2)",
  "from-pink-900 to-purple-900": "rgba(131,24,67,0.3), rgba(88,28,135,0.2)",
};

function getGradientCSS(gradient) {
  const colors = GRADIENT_COLORS[gradient];
  if (!colors) return "rgba(88,28,135,0.3), rgba(49,46,129,0.2)";
  return colors;
}

export default function WorldCompleteScreen() {
  const { state, dispatch } = useGame();

  const completedWorld = getWorld(state.currentLevel - 1);
  const nextWorld = getWorld(state.currentLevel);

  const [phase, setPhase] = useState(0);
  const [flash, setFlash] = useState(true);
  const [coinFlyTrigger, setCoinFlyTrigger] = useState(0);

  useEffect(() => {
    if (state.soundOn) playWinSound();

    const t0 = setTimeout(() => setFlash(false), 300);
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1200);
    const t4 = setTimeout(() => {
      setPhase(4);
      setCoinFlyTrigger((t) => t + 1);
      if (state.soundOn) playCoinSound();
    }, 1600);
    const t5 = setTimeout(() => setPhase(5), 2000);
    const t6 = setTimeout(() => setPhase(6), 2500);

    return () => { [t0, t1, t2, t3, t4, t5, t6].forEach(clearTimeout); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 pb-[120px] flex-1 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0"
           style={{
             background: `linear-gradient(180deg, ${getGradientCSS(nextWorld.gradient).split(",").slice(0, 1)}, transparent 100%)`,
           }} />

      {/* White flash */}
      {flash && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none"
             style={{ animation: "fadeOut 0.3s ease-out forwards" }} />
      )}

      {/* Confetti */}
      {phase >= 3 && <Confetti />}
      <CoinFlyAnimation trigger={coinFlyTrigger} startY="60%" />

      {/* Trophy */}
      {phase >= 1 && (
        <div className="relative z-10 animate-bounce-in mt-4">
          <span className="text-7xl" style={{ filter: "drop-shadow(0 0 20px rgba(245,158,11,0.5))" }}>
            🏆
          </span>
        </div>
      )}

      {/* Title */}
      {phase >= 2 && (
        <div className="relative z-10 text-center animate-bounce-in">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg, #FBBF24, #F59E0B, #D97706)",
                WebkitBackgroundClip: "text",
                filter: "drop-shadow(0 0 20px rgba(245,158,11,0.4))",
              }}>
            WORLD {completedWorld.id} COMPLETE!
          </h1>
          <p className="text-text-muted text-sm font-semibold mt-1">
            {completedWorld.emoji} {completedWorld.name}
          </p>
        </div>
      )}

      {/* Reward */}
      {phase >= 4 && (
        <div className="relative z-10 flex flex-col items-center gap-2 animate-bounce-in">
          <div className="rounded-2xl px-8 py-3 flex items-center gap-3"
               style={{
                 background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))",
                 border: "1px solid rgba(245,158,11,0.3)",
                 boxShadow: "0 0 24px rgba(245,158,11,0.15)",
               }}>
            <span className="text-3xl">⭐</span>
            <span className="text-3xl font-extrabold text-gradient-gold">+50</span>
            <span className="text-gold-light/70 text-base font-bold">bonus coins</span>
          </div>
        </div>
      )}

      {/* Next world preview */}
      {phase >= 5 && (
        <div className="relative z-10 w-full max-w-[300px] animate-fade-in">
          <div className="rounded-2xl p-4 flex flex-col items-center gap-2"
               style={{
                 background: "rgba(255,255,255,0.04)",
                 border: "1px solid rgba(255,255,255,0.1)",
                 boxShadow: "0 0 20px rgba(0,0,0,0.2)",
               }}>
            <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">Up Next</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{nextWorld.emoji}</span>
              <div>
                <p className="text-text font-extrabold text-lg">World {nextWorld.id}</p>
                <p className="text-text-muted text-sm font-semibold">{nextWorld.name}</p>
              </div>
            </div>
            <p className="text-text-muted/50 text-[10px]">
              Levels {nextWorld.startLevel} - {nextWorld.endLevel}
            </p>
          </div>
        </div>
      )}

      {/* Continue button */}
      {phase >= 6 && (
        <div className="relative z-10 w-full max-w-[300px] animate-slide-up">
          <button
            onClick={() => dispatch({ type: "CONTINUE_FROM_WORLD" })}
            className="w-full py-4 rounded-2xl text-white font-extrabold text-base
                       active:scale-95 transition-all duration-200 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #F59E0B)",
              boxShadow: "0 6px 30px rgba(124,58,237,0.35), 0 6px 30px rgba(245,158,11,0.2)",
            }}
          >
            Continue ▶
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
