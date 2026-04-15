import { db } from "../firebase";
import { ref, set, get, push, query, orderByChild, limitToLast, runTransaction, onValue } from "firebase/database";

function getDeviceId() {
  let id = localStorage.getItem("whooops_device_id");
  if (!id) {
    id = "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("whooops_device_id", id);
  }
  return id;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

// --- LEADERBOARD ---

export async function saveLeaderboardScore(nickname, avatar, score, levelsCompleted, bestStreak) {
  if (!db) return;
  try {
    const deviceId = getDeviceId();
    const playerRef = ref(db, `leaderboard/${deviceId}`);
    await set(playerRef, {
      nickname,
      avatar,
      score,
      levelsCompleted,
      bestStreak,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn("Firebase leaderboard save failed:", e.message);
  }
}

export async function getLeaderboardTop10() {
  if (!db) return [];
  try {
    const lbRef = query(ref(db, "leaderboard"), orderByChild("score"), limitToLast(15));
    const snapshot = await get(lbRef);
    if (!snapshot.exists()) return [];

    const entries = [];
    snapshot.forEach((child) => {
      entries.push({ id: child.key, ...child.val() });
    });

    return entries.sort((a, b) => b.score - a.score).slice(0, 10);
  } catch (e) {
    console.warn("Firebase leaderboard read failed:", e.message);
    return [];
  }
}

// --- DAILY CHALLENGE COUNTER ---

export async function incrementDailyCount() {
  if (!db) return;
  try {
    const today = getToday();
    const countRef = ref(db, `daily/${today}/count`);
    await runTransaction(countRef, (current) => (current || 0) + 1);
  } catch (e) {
    console.warn("Firebase daily count increment failed:", e.message);
  }
}

export async function getDailyCount() {
  if (!db) return 0;
  try {
    const today = getToday();
    const countRef = ref(db, `daily/${today}/count`);
    const snapshot = await get(countRef);
    return snapshot.exists() ? snapshot.val() : 0;
  } catch (e) {
    console.warn("Firebase daily count read failed:", e.message);
    return 0;
  }
}

export function subscribeDailyCount(callback) {
  if (!db) { callback(0); return () => {}; }
  const today = getToday();
  const countRef = ref(db, `daily/${today}/count`);
  return onValue(countRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : 0);
  }, () => {});
}

// --- PLAYER STREAK ---

export async function savePlayerStreak(streak, dailyStreak) {
  if (!db) return;
  try {
    const deviceId = getDeviceId();
    const playerRef = ref(db, `players/${deviceId}/streak`);
    await set(playerRef, {
      streak,
      dailyStreak,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn("Firebase streak save failed:", e.message);
  }
}

export async function getPlayerStreak() {
  if (!db) return null;
  try {
    const deviceId = getDeviceId();
    const playerRef = ref(db, `players/${deviceId}/streak`);
    const snapshot = await get(playerRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (e) {
    console.warn("Firebase streak read failed:", e.message);
    return null;
  }
}
