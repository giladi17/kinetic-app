import { useState } from "react";
import { useGame } from "../context/GameContext";
import DuelHistory from "./DuelHistory";

function StarRating({ perfect, skipped, hintsUsed, wrongAttempts }) {
  if (skipped) return <span className="text-xs text-text-muted">Skipped</span>;
  let stars = 3;
  if (wrongAttempts > 0) stars--;
  if (hintsUsed > 0) stars--;
  if (wrongAttempts > 2) stars = Math.max(stars - 1, 0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`text-sm ${i <= stars ? "opacity-100" : "opacity-20"}`}>
          {perfect && i === 1 ? "💎" : "⭐"}
        </span>
      ))}
    </div>
  );
}

export default function MySuccesses() {
  const { state, levels } = useGame();
  const [tab, setTab] = useState("wins");

  const completedCount = state.completedLevels.length;
  const perfectCount = Object.values(state.levelResults).filter((r) => r.perfect).length;

  return (
    <div className="flex flex-col gap-5 px-4 py-4 animate-fade-in">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-text">My Successes</h2>
      </div>

      <div className="flex gap-1.5 bg-white/[0.03] rounded-xl p-1">
        <button onClick={() => setTab("wins")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all
                  ${tab === "wins"
                    ? "gradient-primary text-white shadow-[0_2px_10px_rgba(139,92,246,0.3)]"
                    : "text-text-muted hover:text-text"}`}>
          🏆 My Wins
        </button>
        <button onClick={() => setTab("duels")}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all
                  ${tab === "duels"
                    ? "gradient-primary text-white shadow-[0_2px_10px_rgba(139,92,246,0.3)]"
                    : "text-text-muted hover:text-text"}`}>
          ⚔️ Duel History
        </button>
      </div>

      {tab === "duels" && <DuelHistory />}

      {tab === "wins" && (
      <>
      <p className="text-text-muted text-sm text-center">
        {completedCount}/{levels.length} levels completed
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-2xl font-extrabold text-gradient-primary">{completedCount}</div>
          <div className="text-[10px] text-text-muted font-medium mt-0.5">Solved</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-2xl font-extrabold text-gradient-gold">{perfectCount}</div>
          <div className="text-[10px] text-text-muted font-medium mt-0.5">Perfect</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-2xl font-extrabold text-correct">{state.bestStreak}</div>
          <div className="text-[10px] text-text-muted font-medium mt-0.5">Best Streak</div>
        </div>
      </div>

      <div className="w-full bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
        <div
          className="gradient-primary h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]"
          style={{ width: `${(completedCount / levels.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        {levels.map((level) => {
          const isCompleted = state.completedLevels.includes(level.id);
          const result = state.levelResults[level.id];

          return (
            <div
              key={level.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isCompleted
                  ? "glass"
                  : "bg-white/[0.02] border border-white/[0.04] opacity-40"
              }`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ring-1 ring-white/10"
                style={{ backgroundColor: isCompleted ? level.bgColor : "rgba(255,255,255,0.04)" }}
              >
                {isCompleted ? level.emoji : "🔒"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-text truncate">
                    {isCompleted ? level.answer : "???"}
                  </span>
                  {result?.perfect && (
                    <span className="text-[10px] bg-primary/20 text-primary-light font-bold px-2 py-0.5 rounded-full">
                      PERFECT
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted">
                  {isCompleted
                    ? `${level.original} → ${level.answer}`
                    : `Level ${level.id} · ${level.difficulty}`}
                </div>
              </div>

              <div className="shrink-0">
                {isCompleted && result ? (
                  <StarRating {...result} />
                ) : (
                  <span className="text-xs text-text-muted">Locked</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}
