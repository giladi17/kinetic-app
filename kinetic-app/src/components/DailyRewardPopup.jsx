import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { playDailyReward } from "../utils/sounds";
import CoinFlyAnimation from "./CoinFlyAnimation";

const REWARD_TIERS = [
  { day: 1, coins: 10 },
  { day: 2, coins: 10 },
  { day: 3, coins: 20 },
  { day: 4, coins: 20 },
  { day: 5, coins: 20 },
  { day: 6, coins: 30 },
  { day: 7, coins: 50 },
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

const STORAGE_KEY_CLAIM = "whooops_daily_reward_date";
const STORAGE_KEY_STREAK = "whooops_daily_reward_streak";

export default function DailyRewardPopup() {
  const { state, dispatch } = useGame();
  const [show, setShow] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [coinFlyTrigger, setCoinFlyTrigger] = useState(0);
  const [streak, setStreak] = useState(1);
  const [reward, setReward] = useState(10);
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    if (!state.tutorialSeen) return;

    const today = getToday();
    const lastDate = localStorage.getItem(STORAGE_KEY_CLAIM);

    if (lastDate === today) return;

    const yesterday = getYesterday();
    let currentStreak = parseInt(localStorage.getItem(STORAGE_KEY_STREAK)) || 0;

    if (lastDate === yesterday) {
      currentStreak = Math.min(currentStreak + 1, 7);
    } else {
      localStorage.setItem(STORAGE_KEY_CLAIM, today);
      localStorage.setItem(STORAGE_KEY_STREAK, "0");
      return;
    }

    const tier = REWARD_TIERS[currentStreak - 1] || REWARD_TIERS[0];

    setStreak(currentStreak);
    setReward(tier.coins);
    setShow(true);

    setTimeout(() => setSpinning(false), 1500);
  }, [state.tutorialSeen]);

  const handleClaim = () => {
    if (state.soundOn) playDailyReward();
    setCoinFlyTrigger((t) => t + 1);
    dispatch({ type: "ADD_COINS", amount: reward });

    const today = getToday();
    localStorage.setItem(STORAGE_KEY_CLAIM, today);
    localStorage.setItem(STORAGE_KEY_STREAK, streak);

    setClaimed(true);
    setTimeout(() => setShow(false), 2000);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in">
      <CoinFlyAnimation trigger={coinFlyTrigger} startY="50%" />
      <div className="glass rounded-3xl p-6 max-w-[340px] w-full mx-4 text-center shadow-2xl border border-white/10 animate-bounce-in">

        {!claimed ? (
          <>
            <div className={`text-6xl mb-3 ${spinning ? "animate-spin" : "animate-bounce-in"}`}
                 style={{ animationDuration: spinning ? "0.6s" : "0.5s" }}>
              🪙
            </div>

            <h2 className="text-2xl font-extrabold text-text mb-1">Daily Reward!</h2>
            <p className="text-text-muted text-sm mb-4">Day {streak} streak</p>

            {/* Streak dots */}
            <div className="flex justify-center gap-1.5 mb-4">
              {REWARD_TIERS.map((tier, i) => (
                <div key={i}
                     className="flex flex-col items-center gap-0.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${i < streak
                      ? "gradient-gold text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                      : i === streak
                        ? "ring-2 ring-gold/40 text-text-muted bg-white/5"
                        : "bg-white/5 text-text-muted/40"}`}>
                    {i < streak ? "✓" : tier.coins}
                  </div>
                  <span className="text-[8px] text-text-muted/50">D{i + 1}</span>
                </div>
              ))}
            </div>

            <div className="glass rounded-2xl px-5 py-3 mb-5">
              <p className="text-text-muted text-xs mb-1">Today's reward</p>
              <p className="text-3xl font-extrabold text-gradient-gold">+{reward} 🪙</p>
            </div>

            <button onClick={handleClaim}
                    className="w-full py-3.5 rounded-xl gradient-gold text-white font-bold text-base
                               shadow-[0_4px_24px_rgba(245,158,11,0.3)] active:scale-95 transition-all cursor-pointer">
              Claim Reward!
            </button>
          </>
        ) : (
          <div className="py-4 animate-bounce-in">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-extrabold text-correct">Claimed!</h2>
            <p className="text-text-muted text-sm mt-1">+{reward} coins added</p>
            <p className="text-text-muted/60 text-xs mt-3">Come back tomorrow for more!</p>
          </div>
        )}
      </div>
    </div>
  );
}
