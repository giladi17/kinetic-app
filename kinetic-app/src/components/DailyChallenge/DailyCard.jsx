import { useState, useEffect } from "react";
import { getDailyResult, getTimeUntilReset, formatCountdown } from "./dailyUtils";

export default function DailyCard({ onPlay }) {
  const [countdown, setCountdown] = useState(formatCountdown(getTimeUntilReset()));
  const result = getDailyResult();
  const fakeSolvedCount = 847 + Math.floor(Date.now() / 60000) % 500;

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(formatCountdown(getTimeUntilReset()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      onClick={() => !result && onPlay()}
      disabled={!!result}
      className="w-full rounded-2xl p-[2px] cursor-pointer transition-all active:scale-[0.98]"
      style={{
        background: result
          ? "linear-gradient(135deg, #10B981, #059669)"
          : "linear-gradient(135deg, #F59E0B, #D97706, #F59E0B)",
      }}
    >
      <div className="rounded-2xl bg-surface p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <h3 className="text-lg font-extrabold text-text">Daily Challenge</h3>
          </div>
          {result && <span className="text-correct text-xl">✅</span>}
        </div>

        {result ? (
          <div className="flex flex-col gap-1">
            <p className="text-correct font-bold text-sm">
              {result.emoji} Solved in {result.timeSec}s — {result.title}
            </p>
            <p className="text-text-muted text-xs">
              You're #{result.rank} out of {result.totalPlayers.toLocaleString()} players
            </p>
          </div>
        ) : (
          <p className="text-text-muted text-sm font-medium">
            Today's celebrity — can you beat the clock?
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs">
            Resets in <span className="text-gold-light font-bold">{countdown}</span>
          </span>
          <span className="text-text-muted text-xs">
            🔥 {fakeSolvedCount.toLocaleString()} solved today
          </span>
        </div>

        {!result && (
          <div className="mt-1 gradient-gold rounded-xl py-2.5 text-center">
            <span className="text-white font-extrabold text-sm">Play Now 👑</span>
          </div>
        )}
      </div>
    </button>
  );
}
