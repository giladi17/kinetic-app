import LEVELS from "../../data/levels";
import { incrementDailyCount } from "../../utils/firebaseService";

const STORAGE_KEY = "whooops_daily_challenge";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function dateSeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const DAILY_POOL_SIZE = 50;
const DAILY_POOL = LEVELS.slice(-DAILY_POOL_SIZE);

export function getDailyLevel() {
  const today = getToday();
  const seed = dateSeed(today);
  const index = seed % DAILY_POOL.length;
  return DAILY_POOL[index];
}

export function getDailyResult() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.date !== getToday()) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveDailyResult(timeMs) {
  const level = getDailyLevel();
  const timeSec = timeMs / 1000;

  let title, coins, emoji;
  if (timeSec < 10) {
    title = "LEGEND! Incredible!";
    coins = 100;
    emoji = "🏆";
  } else if (timeSec < 20) {
    title = "Lightning Fast!";
    coins = 60;
    emoji = "⚡";
  } else if (timeSec < 40) {
    title = "On Fire!";
    coins = 30;
    emoji = "🔥";
  } else {
    title = "Solved it! Great job!";
    coins = 15;
    emoji = "✅";
  }

  const fakeRank = Math.floor(Math.random() * 400) + 50;
  const fakePlayers = fakeRank + Math.floor(Math.random() * 2000) + 200;

  const result = {
    date: getToday(),
    levelId: level.id,
    answer: level.answer,
    timeMs,
    timeSec: Math.round(timeSec * 10) / 10,
    title,
    coins,
    emoji,
    rank: fakeRank,
    totalPlayers: fakePlayers,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  incrementDailyCount();

  const roundedSec = Math.round(timeSec * 10) / 10;
  const prevBest = parseFloat(localStorage.getItem("whooops_best_daily_time"));
  if (!prevBest || roundedSec < prevBest) {
    localStorage.setItem("whooops_best_daily_time", String(roundedSec));
  }

  return result;
}

export function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow - now;
}

export function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
