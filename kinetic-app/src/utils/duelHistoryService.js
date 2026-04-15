import { db } from "../firebase";
import { ref, push, get, update } from "firebase/database";

function getDeviceId() {
  let id = localStorage.getItem("whooops_device_id");
  if (!id) {
    id = "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("whooops_device_id", id);
  }
  return id;
}

export async function saveDuelResult({ opponent, opponentAvatar, mode, result }) {
  if (!db) return;
  try {
    const deviceId = getDeviceId();
    const historyRef = ref(db, `duelHistory/${deviceId}`);
    await push(historyRef, {
      opponent,
      opponentAvatar: opponentAvatar || "robot",
      mode: mode || "speed",
      result,
      date: Date.now(),
    });
  } catch (e) {
    console.warn("Firebase duel history save failed:", e.message);
  }
}

export async function saveBothDuelResults({
  player1Id, player2Id,
  player1Name, player2Name,
  player1Avatar, player2Avatar,
  mode, winnerKey,
}) {
  if (!db) return;
  try {
    const now = Date.now();
    const key = `duel_${now}_${Math.random().toString(36).slice(2, 8)}`;

    const updates = {};
    updates[`duelHistory/${player1Id}/${key}`] = {
      opponent: player2Name,
      opponentAvatar: player2Avatar || "robot",
      mode: mode || "speed",
      result: winnerKey === "player1" ? "win" : "lose",
      date: now,
    };
    updates[`duelHistory/${player2Id}/${key}`] = {
      opponent: player1Name,
      opponentAvatar: player1Avatar || "robot",
      mode: mode || "speed",
      result: winnerKey === "player2" ? "win" : "lose",
      date: now,
    };

    await update(ref(db), updates);
  } catch (e) {
    console.warn("Firebase dual duel history save failed:", e.message);
  }
}

export async function getDuelHistory(limit = 20) {
  if (!db) return [];
  try {
    const deviceId = getDeviceId();
    const snapshot = await get(ref(db, `duelHistory/${deviceId}`));
    if (!snapshot.exists()) return [];

    const entries = [];
    snapshot.forEach((child) => {
      entries.push({ id: child.key, ...child.val() });
    });
    return entries.sort((a, b) => b.date - a.date).slice(0, limit);
  } catch (e) {
    console.warn("Firebase duel history read failed:", e.message);
    return [];
  }
}
