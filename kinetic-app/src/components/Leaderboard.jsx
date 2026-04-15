import { useState, useMemo, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { getLeaderboardTop10, saveLeaderboardScore } from "../utils/firebaseService";
import { getDailyResult } from "./DailyChallenge/dailyUtils";
import { getAvatarById } from "../data/avatars";
import { getPlayerTitle } from "../data/titles";
import { getUsernameColorById } from "../data/profileCustomization";

const WEEKLY_KEY = "whooops_weekly_leaderboard";
const WEEKLY_COINS_KEY = "whooops_weekly_coins";
const WEEKLY_START_KEY = "whooops_weekly_start";

function getMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

const FAKE_PLAYERS = [
  { name: "QuizMaster99", avatar: "🧠", levels: 5, coins: 280, streak: 5 },
  { name: "PunLover", avatar: "😂", levels: 4, coins: 210, streak: 3 },
  { name: "CelebGuesser", avatar: "🌟", levels: 4, coins: 190, streak: 2 },
  { name: "WordNinja", avatar: "🥷", levels: 3, coins: 160, streak: 3 },
  { name: "BrainStorm", avatar: "⚡", levels: 3, coins: 145, streak: 2 },
  { name: "LuckyGuess", avatar: "🍀", levels: 2, coins: 130, streak: 1 },
  { name: "Newbie123", avatar: "🐣", levels: 1, coins: 110, streak: 1 },
  { name: "JustStarted", avatar: "👋", levels: 0, coins: 100, streak: 0 },
];

function generateWeeklyFakes() {
  const names = ["BlitzKing", "StarPlayer", "MindBender", "PuzzlePro", "RapidFire",
    "NeonNinja", "VelvetFox", "IronBrain", "AceGamer", "TurboMind"];
  const avatars = ["🦊", "🐸", "🎃", "🤖", "🦄", "🐲", "🎭", "🧊", "🌈", "💀"];

  return names.map((name, i) => ({
    name: `${name}${100 + Math.floor(Math.random() * 900)}`,
    avatar: avatars[i],
    weeklyCoins: Math.floor(30 + Math.random() * 250),
    isPlayer: false,
  }));
}

const DAILY_LB_KEY = "whooops_daily_leaderboard";
const DAILY_LB_DATE_KEY = "whooops_daily_leaderboard_date";

function generateDailyFakes() {
  const names = ["SpeedKing", "FlashSolver", "QuickThink", "RapidEyes", "SwiftMind",
    "BlazeQuiz", "TurboGuess", "NitroStar", "RocketBrain", "ZoomPro"];
  const avatars = ["🚀", "⚡", "🔥", "🧠", "💨", "🎯", "🏅", "💫", "🌟", "🦅"];

  return names.map((name, i) => ({
    name: `${name}${100 + Math.floor(Math.random() * 900)}`,
    avatar: avatars[i],
    timeSec: Math.round((8 + Math.random() * 50) * 10) / 10,
    isPlayer: false,
  }));
}

function getScore(levels, coins, streak) {
  return levels * 100 + coins + streak * 20;
}

const MEDAL = { 0: "🥇", 1: "🥈", 2: "🥉" };

export default function Leaderboard() {
  const { state } = useGame();
  const [tab, setTab] = useState("alltime");

  const playerNick = localStorage.getItem("whooops_nickname") || "You";
  const playerAvatarData = getAvatarById(state.selectedAvatar);
  const playerAvatar = playerAvatarData.emoji;

  const [weeklyCoins, setWeeklyCoins] = useState(() => {
    const storedMonday = localStorage.getItem(WEEKLY_START_KEY);
    const currentMonday = getMonday();
    if (storedMonday !== currentMonday) {
      localStorage.setItem(WEEKLY_START_KEY, currentMonday);
      localStorage.setItem(WEEKLY_COINS_KEY, "0");
      localStorage.removeItem(WEEKLY_KEY);
      return 0;
    }
    return parseInt(localStorage.getItem(WEEKLY_COINS_KEY)) || 0;
  });

  const [weeklyFakes] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WEEKLY_KEY));
      if (stored && stored.length) return stored;
    } catch {}
    const fakes = generateWeeklyFakes();
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(fakes));
    return fakes;
  });

  useEffect(() => {
    const oldTotal = parseInt(localStorage.getItem("_prev_total_coins")) || state.totalCoinsEarned;
    const diff = state.totalCoinsEarned - oldTotal;
    if (diff > 0) {
      const newWeekly = weeklyCoins + diff;
      setWeeklyCoins(newWeekly);
      localStorage.setItem(WEEKLY_COINS_KEY, newWeekly);
    }
    localStorage.setItem("_prev_total_coins", state.totalCoinsEarned);
  }, [state.totalCoinsEarned]);

  const [firebasePlayers, setFirebasePlayers] = useState([]);

  const playerLevels = state.completedLevels.length;
  const hasEnoughData = playerLevels >= 3;

  useEffect(() => {
    if (hasEnoughData) {
      const playerScore = getScore(playerLevels, state.coins, state.bestStreak);
      saveLeaderboardScore(playerNick, playerAvatar, playerScore, playerLevels, state.bestStreak);
    }
  }, [playerLevels, state.coins, state.bestStreak, playerNick, playerAvatar, hasEnoughData]);

  useEffect(() => {
    getLeaderboardTop10().then((players) => {
      if (players.length > 0) setFirebasePlayers(players);
    });
  }, [tab]);

  // All-time rankings
  const alltimeRankings = useMemo(() => {
    if (!hasEnoughData) return [];
    const nameColor = getUsernameColorById(state.selectedNameColor).color;
    const player = { name: playerNick, avatar: playerAvatar, levels: playerLevels, coins: state.coins, streak: state.bestStreak, isPlayer: true, nameColor };

    const fbOthers = firebasePlayers
      .filter((p) => p.id !== localStorage.getItem("whooops_device_id"))
      .map((p) => ({
        name: p.nickname || "Player",
        avatar: p.avatar || "😎",
        levels: p.levelsCompleted || 0,
        coins: 0,
        streak: p.bestStreak || 0,
        score: p.score || 0,
        isPlayer: false,
      }));

    const fakes = FAKE_PLAYERS.map((p) => ({ ...p, isPlayer: false, score: getScore(p.levels, p.coins, p.streak) }));
    const allOthers = [...fbOthers, ...fakes];
    const seen = new Set();
    const deduped = allOthers.filter((p) => { if (seen.has(p.name)) return false; seen.add(p.name); return true; });

    const all = [{ ...player, score: getScore(player.levels, player.coins, player.streak) }, ...deduped];
    return all.sort((a, b) => b.score - a.score);
  }, [playerLevels, state.coins, state.bestStreak, hasEnoughData, playerNick, playerAvatar, firebasePlayers]);

  // Weekly rankings
  const weeklyRankings = useMemo(() => {
    const nameColor = getUsernameColorById(state.selectedNameColor).color;
    const player = { name: playerNick, avatar: playerAvatar, weeklyCoins, isPlayer: true, nameColor };
    const all = [player, ...weeklyFakes];
    return all.sort((a, b) => b.weeklyCoins - a.weeklyCoins);
  }, [weeklyCoins, weeklyFakes, playerNick, playerAvatar]);

  // Daily rankings
  const [dailyFakes] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    const storedDate = localStorage.getItem(DAILY_LB_DATE_KEY);
    if (storedDate === today) {
      try {
        const stored = JSON.parse(localStorage.getItem(DAILY_LB_KEY));
        if (stored && stored.length) return stored;
      } catch {}
    }
    const fakes = generateDailyFakes();
    localStorage.setItem(DAILY_LB_KEY, JSON.stringify(fakes));
    localStorage.setItem(DAILY_LB_DATE_KEY, today);
    return fakes;
  });

  const dailyRankings = useMemo(() => {
    const result = getDailyResult();
    const list = [...dailyFakes];
    if (result) {
      list.push({ name: playerNick, avatar: playerAvatar, timeSec: result.timeSec, isPlayer: true, nameColor: getUsernameColorById(state.selectedNameColor).color });
    }
    return list.sort((a, b) => a.timeSec - b.timeSec);
  }, [dailyFakes, playerNick, playerAvatar]);

  const rankings = tab === "alltime" ? alltimeRankings : tab === "weekly" ? weeklyRankings : dailyRankings;
  const playerRank = rankings.findIndex((p) => p.isPlayer) + 1;

  if (!hasEnoughData && tab === "alltime") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 px-6 py-16 animate-fade-in">
        <div className="text-6xl">🏆</div>
        <div className="text-center">
          <h2 className="text-xl font-extrabold text-text mb-2">Be the first champion!</h2>
          <p className="text-text-muted text-sm leading-relaxed">
            Complete at least 3 levels to appear on the leaderboard.
          </p>
        </div>
        <div className="glass rounded-2xl px-5 py-3 text-center">
          <p className="text-text-muted text-xs">Your progress</p>
          <p className="text-primary-light font-extrabold text-lg">{playerLevels} / 3 levels</p>
        </div>
        <button onClick={() => setTab("weekly")}
                className="text-primary-light text-sm font-bold cursor-pointer hover:underline">
          View Weekly Leaderboard →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 pb-24 animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-2 justify-center">
        {[{ id: "alltime", label: "All Time 🏆" }, { id: "weekly", label: "This Week 📊" }, { id: "daily", label: "Daily ⏱️" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-5 py-2 rounded-full text-sm font-bold cursor-pointer transition-all active:scale-95
                    ${tab === t.id
                      ? "gradient-primary text-white shadow-[0_4px_16px_rgba(139,92,246,0.3)]"
                      : "glass-light text-text-muted hover:text-text"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="text-center">
        <h2 className="text-xl font-extrabold text-text">
          {tab === "alltime" ? "Leaderboard" : tab === "weekly" ? "Weekly Ranking" : "Daily Speed Ranking"}
        </h2>
        <p className="text-text-muted text-sm mt-1">
          {tab === "daily" && !getDailyResult() ? (
            <span className="text-text-muted/70">Solve today's challenge to appear!</span>
          ) : (
            <>
              Your rank: <span className="text-primary-light font-bold">#{playerRank}</span>
              {tab === "weekly" && <span className="text-text-muted/50 ml-2">· Resets Monday</span>}
              {tab === "daily" && <span className="text-text-muted/50 ml-2">· Resets at midnight</span>}
            </>
          )}
        </p>
      </div>

      {/* Top 3 podium */}
      <div className="flex justify-center gap-3 items-end pb-2">
        {[1, 0, 2].map((idx) => {
          const p = rankings[idx];
          if (!p) return null;
          const isCenter = idx === 0;
          return (
            <div key={idx} className={`flex flex-col items-center ${isCenter ? "order-2" : idx === 1 ? "order-1" : "order-3"}`}>
              <div className="text-lg mb-1">{MEDAL[idx]}</div>
              <div className={`rounded-full flex items-center justify-center shadow-lg ${
                p.isPlayer ? "ring-2 ring-primary shadow-[0_0_16px_rgba(139,92,246,0.3)]" : "ring-1 ring-white/10"
              } ${isCenter ? "w-16 h-16 text-3xl" : "w-12 h-12 text-2xl"}`}
                   style={{ backgroundColor: p.isPlayer ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)" }}>
                {p.avatar}
              </div>
              <span className={`text-xs font-bold mt-1.5 truncate max-w-[70px] ${p.isPlayer ? "text-primary-light" : "text-text"}`}>
                {p.name}
              </span>
              <span className="text-[10px] text-text-muted">
                {tab === "alltime" ? `${p.score} pts` : tab === "weekly" ? `${p.weeklyCoins} 🪙` : `${p.timeSec}s`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div className="flex flex-col gap-2">
        {rankings.slice(0, 10).map((p, i) => (
          <div key={i}
               className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                 p.isPlayer ? "glass border-primary/20 shadow-[0_0_16px_rgba(139,92,246,0.1)]" : "glass-light"
               }`}>
            <span className={`w-7 text-center font-extrabold text-sm ${i < 3 ? "text-gold-light" : "text-text-muted"}`}>
              {i < 3 ? MEDAL[i] : `#${i + 1}`}
            </span>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
              p.isPlayer ? "ring-1 ring-primary/40" : ""
            }`} style={{ backgroundColor: p.isPlayer ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.06)" }}>
              {p.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm truncate" style={{ color: p.nameColor || (p.isPlayer ? "#c4b5fd" : "#F1F5F9") }}>{p.name}</span>
                {tab === "alltime" && p.levels != null && (
                  <span className="text-[9px] font-bold text-text-muted/70">{getPlayerTitle(p.levels || 0).emoji}</span>
                )}
              </div>
              <div className="text-[10px] text-text-muted">
                {tab === "alltime"
                  ? `${getPlayerTitle(p.levels || 0).name} · ${p.levels} levels`
                  : tab === "weekly" ? `earned this week` : `today's solve`}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-extrabold text-sm text-text">
                {tab === "alltime" ? p.score : tab === "weekly" ? p.weeklyCoins : `${p.timeSec}s`}
              </div>
              <div className="text-[10px] text-text-muted">{tab === "alltime" ? "pts" : tab === "weekly" ? "🪙" : "⏱️"}</div>
            </div>
          </div>
        ))}
      </div>

      {tab === "weekly" && (
        <p className="text-center text-text-muted/40 text-xs mt-2">
          Winner gets +100 coins bonus at reset!
        </p>
      )}
      {tab === "daily" && (
        <p className="text-center text-text-muted/40 text-xs mt-2">
          Fastest solver today wins! Resets at midnight.
        </p>
      )}
    </div>
  );
}
