import { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";

const BADGES = [
  { id: "first_win", label: "First Win", icon: "🥇", desc: "Complete level 1", check: (s) => s.completedLevels.length >= 1 },
  { id: "ten_levels", label: "Decathlon", icon: "🎯", desc: "Complete 10 levels", check: (s) => s.completedLevels.length >= 10 },
  { id: "fifty_levels", label: "Half Century", icon: "💪", desc: "Complete 50 levels", check: (s) => s.completedLevels.length >= 50 },
  { id: "hundred_levels", label: "Centurion", icon: "👑", desc: "Complete 100 levels", check: (s) => s.completedLevels.length >= 100 },
  { id: "streak_3", label: "On Fire", icon: "🔥", desc: "3 day streak", check: (s) => s.bestStreak >= 3 },
  { id: "streak_7", label: "Unstoppable", icon: "⚡", desc: "7 day streak", check: (s) => s.bestStreak >= 7 },
  { id: "moneybags", label: "Moneybags", icon: "🪙", desc: "Earn 500 coins", check: (s) => s.totalCoinsEarned >= 500 },
  { id: "duelist", label: "Duelist", icon: "⚔️", desc: "Win 5 duels", check: () => { try { const r = JSON.parse(localStorage.getItem("duelRecord")); return r && r.wins >= 5; } catch { return false; } } },
];

const SEEN_KEY = "whooops_badges_seen";

function getSeenBadges() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; }
  catch { return []; }
}

export default function BadgeUnlockPopup() {
  const { state } = useGame();
  const [popup, setPopup] = useState(null);
  const queueRef = useRef([]);
  const showingRef = useRef(false);

  useEffect(() => {
    const seen = getSeenBadges();
    const newUnlocks = [];

    for (const badge of BADGES) {
      if (badge.check(state) && !seen.includes(badge.id)) {
        newUnlocks.push(badge);
      }
    }

    if (newUnlocks.length > 0) {
      const updatedSeen = [...seen, ...newUnlocks.map((b) => b.id)];
      localStorage.setItem(SEEN_KEY, JSON.stringify(updatedSeen));
      queueRef.current.push(...newUnlocks);
      showNext();
    }
  }, [state.completedLevels.length, state.bestStreak, state.totalCoinsEarned]);

  const showNext = () => {
    if (showingRef.current || queueRef.current.length === 0) return;
    showingRef.current = true;
    const badge = queueRef.current.shift();
    setPopup(badge);
    setTimeout(() => {
      setPopup(null);
      showingRef.current = false;
      showNext();
    }, 3500);
  };

  if (!popup) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] animate-bounce-in">
      <div className="glass rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[260px]"
           style={{
             background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))",
             border: "1px solid rgba(245,158,11,0.4)",
             boxShadow: "0 0 40px rgba(245,158,11,0.2), 0 8px 32px rgba(0,0,0,0.3)",
           }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
             style={{
               background: "linear-gradient(135deg, #FBBF24, #D97706)",
               boxShadow: "0 0 20px rgba(245,158,11,0.4)",
             }}>
          {popup.icon}
        </div>
        <div className="flex flex-col">
          <span className="text-gold-light text-[10px] font-bold uppercase tracking-wider">Badge Unlocked!</span>
          <span className="text-text font-extrabold text-base">{popup.label}</span>
          <span className="text-text-muted text-xs">{popup.desc}</span>
        </div>
      </div>
    </div>
  );
}
