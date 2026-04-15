import { useGame } from "../context/GameContext";

export default function StreakBanner() {
  const { state } = useGame();
  const streak = state.dailyStreak;

  const isGold = streak >= 7;
  const isPulsing = streak >= 3;

  const message = streak === 0
    ? "Start your streak today!"
    : streak >= 7
      ? "On fire!"
      : "Keep it going!";

  const icon = streak >= 7 ? "🏆" : "🔥";

  return (
    <div
      className="w-full rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2"
      style={{
        background: isGold
          ? "linear-gradient(135deg, #F59E0B, #D97706)"
          : "linear-gradient(135deg, #7C3AED, #9333EA)",
        boxShadow: isGold
          ? "0 0 20px rgba(245,158,11,0.3)"
          : "0 0 20px rgba(124,58,237,0.3)",
      }}
    >
      <span className={`text-lg ${isPulsing ? "animate-pulse" : ""}`}>{icon}</span>
      <span className="text-white font-bold text-sm">
        {streak > 0 ? `${streak} day${streak > 1 ? "s" : ""} streak` : ""}
      </span>
      <span className="text-white/80 text-xs font-medium">– {message}</span>
    </div>
  );
}
