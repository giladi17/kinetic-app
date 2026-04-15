import { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import AvatarDisplay from "./AvatarDisplay";
import AvatarPicker from "./AvatarPicker";
import { getAvatarById } from "../data/avatars";
import { getPlayerTitle } from "../data/titles";
import { getBackgroundById, getUsernameColorById } from "../data/profileCustomization";
import BackgroundPicker from "./BackgroundPicker";
import NameColorPicker from "./NameColorPicker";
import FriendsList from "./FriendsList";

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

const NICK_KEY = "whooops_nickname";

function getBestDailyTime() {
  try {
    const raw = localStorage.getItem("whooops_best_daily_time");
    if (raw) return parseFloat(raw);
  } catch {}
  return null;
}

export default function PlayerProfile() {
  const { state, dispatch } = useGame();
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICK_KEY) || "Player");
  const [editing, setEditing] = useState(false);
  const [tempNick, setTempNick] = useState(nickname);

  const currentAvatar = getAvatarById(state.selectedAvatar);
  const currentBg = getBackgroundById(state.selectedBg);
  const currentNameColor = getUsernameColorById(state.selectedNameColor);

  useEffect(() => { localStorage.setItem(NICK_KEY, nickname); }, [nickname]);
  useEffect(() => { localStorage.setItem("whooops_avatar", currentAvatar.emoji); }, [currentAvatar.emoji]);

  const duelRecord = (() => {
    try { return JSON.parse(localStorage.getItem("duelRecord")) || { wins: 0, losses: 0 }; }
    catch { return { wins: 0, losses: 0 }; }
  })();

  const bestDaily = getBestDailyTime();

  const stats = [
    { label: "Levels Completed", value: state.completedLevels.length, icon: "🎮" },
    { label: "Current Streak", value: `${state.streak}d`, icon: "🔥" },
    { label: "Best Streak", value: `${state.bestStreak}d`, icon: "🏆" },
    { label: "Total Coins", value: state.totalCoinsEarned, icon: "🪙" },
    { label: "Duels Won", value: duelRecord.wins, icon: "⚡" },
    { label: "Best Daily", value: bestDaily ? `${bestDaily}s` : "—", icon: "⏱️" },
  ];

  const handleSaveNick = () => {
    if (tempNick.trim().length >= 2) {
      setNickname(tempNick.trim());
      setEditing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-4 pb-24 animate-fade-in">

      {/* Avatar + Nickname */}
      <div className="rounded-3xl p-6 flex flex-col items-center gap-4"
           style={{
             background: currentBg.gradient,
             border: "1px solid rgba(124,58,237,0.2)",
             boxShadow: "0 0 30px rgba(124,58,237,0.1)",
           }}>

        {/* Avatar display */}
        <AvatarDisplay avatarId={state.selectedAvatar} size="profile" />

        {/* Nickname */}
        {editing ? (
          <div className="flex gap-2 items-center animate-fade-in">
            <input
              type="text"
              value={tempNick}
              onChange={(e) => setTempNick(e.target.value)}
              maxLength={16}
              autoFocus
              className="px-4 py-2 rounded-xl text-text font-bold text-center text-base
                         outline-none transition-all w-40"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "2px solid rgba(124,58,237,0.4)",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSaveNick()}
            />
            <button
              onClick={handleSaveNick}
              className="px-4 py-2 rounded-xl text-white text-sm font-bold cursor-pointer active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #9333EA)",
                boxShadow: "0 0 12px rgba(124,58,237,0.3)",
              }}
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setTempNick(nickname); setEditing(true); }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <h2 className="text-2xl font-extrabold" style={{ color: currentNameColor.color }}>{nickname}</h2>
            <span className="text-text-muted/40 group-hover:text-text-muted text-sm transition-colors">✏️</span>
          </button>
        )}
        <span className="text-sm font-bold text-primary-light">
          {getPlayerTitle(state.completedLevels.length).emoji} {getPlayerTitle(state.completedLevels.length).name}
        </span>
      </div>

      {/* Stats grid */}
      <div>
        <h3 className="text-base font-extrabold text-text mb-3 px-1">Stats</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl py-3.5 px-3 flex items-center gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(124,58,237,0.03))",
                border: "1px solid rgba(124,58,237,0.15)",
              }}
            >
              <span className="text-2xl">{s.icon}</span>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-text">{s.value}</span>
                <span className="text-[10px] text-text-muted font-semibold leading-tight">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avatar Picker */}
      <AvatarPicker />

      {/* Background Picker */}
      <BackgroundPicker />

      {/* Username Color Picker */}
      <NameColorPicker />

      {/* Friends */}
      <FriendsList />

      {/* Badges */}
      <div>
        <h3 className="text-base font-extrabold text-text mb-3 px-1">Badges</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {BADGES.map((badge) => {
            const unlocked = badge.check(state);
            return (
              <div
                key={badge.id}
                className={`rounded-2xl p-3.5 flex items-center gap-3 transition-all ${
                  unlocked ? "" : "opacity-40"
                }`}
                style={unlocked ? {
                  background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))",
                  border: "1px solid rgba(245,158,11,0.25)",
                  boxShadow: "0 0 16px rgba(245,158,11,0.08)",
                } : {
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    unlocked ? "" : "grayscale"
                  }`}
                  style={unlocked ? {
                    background: "linear-gradient(135deg, #FBBF24, #D97706)",
                    boxShadow: "0 0 12px rgba(245,158,11,0.3)",
                  } : {
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  {unlocked ? badge.icon : "🔒"}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${unlocked ? "text-text" : "text-text-muted"}`}>
                    {badge.label}
                  </p>
                  <p className="text-[10px] text-text-muted/60 truncate">{badge.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => dispatch({ type: "SET_SCREEN", screen: "game" })}
        className="mx-auto py-2.5 px-6 rounded-xl text-text-muted text-sm font-semibold
                   hover:text-text transition-colors cursor-pointer active:scale-95"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        ← Back to Game
      </button>
    </div>
  );
}
