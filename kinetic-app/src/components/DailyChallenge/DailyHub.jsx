import { useState, useEffect } from "react";
import { useGame } from "../../context/GameContext";
import { getDailyResult } from "./dailyUtils";
import DailyCard from "./DailyCard";
import DailyChallengeScreen from "./DailyChallengeScreen";
import { subscribeDailyCount } from "../../utils/firebaseService";
import AdBanner from "../AdBanner";
import DailyMissions from "./DailyMissions";

export default function DailyHub() {
  const { dispatch } = useGame();
  const [playing, setPlaying] = useState(false);
  const [dailyPlayerCount, setDailyPlayerCount] = useState(0);
  const alreadyCompleted = !!getDailyResult();

  useEffect(() => {
    const unsubscribe = subscribeDailyCount(setDailyPlayerCount);
    return () => unsubscribe();
  }, []);

  if (playing && !alreadyCompleted) {
    return (
      <DailyChallengeScreen
        onExit={() => {
          setPlaying(false);
          dispatch({ type: "SET_SCREEN", screen: "daily" });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-4 flex-1">
      <div className="flex flex-col items-center gap-1">
        <span className="text-3xl">👑</span>
        <h2 className="text-2xl font-extrabold text-gradient-gold">Daily Challenge</h2>
        <p className="text-text-muted text-sm text-center">
          A new celebrity every day. Hints available — but they cost coins!
        </p>
        {dailyPlayerCount > 0 && (
          <p className="text-primary-light text-xs font-semibold mt-1">
            🌍 {dailyPlayerCount} player{dailyPlayerCount !== 1 ? "s" : ""} solved today
          </p>
        )}
      </div>

      <div className="w-full max-w-[360px]">
        <DailyCard onPlay={() => setPlaying(true)} />
      </div>

      <DailyMissions />

      <div className="glass rounded-2xl p-4 w-full max-w-[360px] flex flex-col gap-3">
        <h3 className="text-base font-bold text-text">How it works</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">🖼️</span>
            <p className="text-text-muted text-sm">
              Image starts fully blurred and clears over time
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">⏱️</span>
            <p className="text-text-muted text-sm">
              Speed timer — solve faster for more coins
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">💡</span>
            <p className="text-text-muted text-sm">
              Hints available — use coins or hint packs
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">🔄</span>
            <p className="text-text-muted text-sm">
              One attempt per day — resets at midnight
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">❤️</span>
            <p className="text-text-muted text-sm">
              3 wrong answers = game over (use Extra Life to retry)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">🏅</span>
            <p className="text-text-muted text-sm">
              Compete on the Daily Speed Ranking — fastest solver wins!
            </p>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-3 mt-1">
          <h4 className="text-sm font-bold text-text mb-2">Rewards</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { time: "< 10s", coins: "100", emoji: "🏆", label: "Legend" },
              { time: "10-20s", coins: "60", emoji: "⚡", label: "Fast" },
              { time: "20-40s", coins: "30", emoji: "🔥", label: "Good" },
              { time: "40s+", coins: "15", emoji: "✅", label: "Solved" },
            ].map((tier) => (
              <div key={tier.time} className="bg-white/[0.03] rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-lg">{tier.emoji}</span>
                <div>
                  <p className="text-text text-xs font-bold">{tier.time}</p>
                  <p className="text-gold-light text-xs font-semibold">+{tier.coins} coins</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[360px] mt-2 rounded-xl overflow-hidden opacity-70">
        <AdBanner adSlot="0000000000" />
      </div>
    </div>
  );
}
