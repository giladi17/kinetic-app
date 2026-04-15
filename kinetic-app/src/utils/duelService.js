import { db } from "../firebase";
import { ref, set, get, update, onValue, remove, onDisconnect, serverTimestamp } from "firebase/database";
import DUEL_LEVELS from "../data/duelLevels";
import WORD_DUEL_NAMES from "../data/wordDuelNames";

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function getDeviceId() {
  let id = localStorage.getItem("whooops_device_id");
  if (!id) {
    id = "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("whooops_device_id", id);
  }
  return id;
}

export async function createRoom(nickname, duelMode = "speed", avatar = null) {
  if (!db) return null;
  const code = generateCode();
  const deviceId = getDeviceId();
  const roomRef = ref(db, `duels/${code}`);

  const existing = await get(roomRef);
  if (existing.exists()) return createRoom(nickname, duelMode, avatar);

  await set(roomRef, {
    status: "waiting",
    duelMode,
    createdAt: Date.now(),
    currentRound: 1,
    players: {
      player1: { id: deviceId, nickname, avatar: avatar || "astronaut", score: 0, answered: false, answeredAt: 0 },
    },
    rounds: [],
  });

  const p1Ref = ref(db, `duels/${code}/players/player1`);
  onDisconnect(p1Ref).update({ disconnected: true });

  return code;
}

export async function joinRoom(code, nickname, avatar = null) {
  if (!db) return { ok: false, error: "Firebase unavailable" };

  const roomRef = ref(db, `duels/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return { ok: false, error: "Room not found" };

  const room = snapshot.val();
  if (room.status !== "waiting") return { ok: false, error: "Room is full or game started" };

  const deviceId = getDeviceId();
  if (room.players?.player1?.id === deviceId) return { ok: false, error: "Can't join your own room" };

  await update(roomRef, {
    status: "ready",
    countdownStart: Date.now() + 1500,
    "players/player2": { id: deviceId, nickname, avatar: avatar || "astronaut", score: 0, answered: false, answeredAt: 0 },
  });

  const p2Ref = ref(db, `duels/${code}/players/player2`);
  onDisconnect(p2Ref).update({ disconnected: true });

  return { ok: true };
}

export function subscribeRoom(code, callback) {
  if (!db) return () => {};
  const roomRef = ref(db, `duels/${code}`);
  return onValue(roomRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  }, () => {});
}

export function pickLevelForRoom(excludeIds = []) {
  const available = DUEL_LEVELS.filter((l) => !excludeIds.includes(l.id));
  const pool = available.length > 0 ? available : DUEL_LEVELS;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: picked.id,
    celebrity: picked.celebrity || picked.original,
    twistedName: picked.twistedName || picked.original,
    answer: picked.answer,
    original: picked.original,
    clue: picked.clue,
    emoji: picked.emoji,
    image: typeof picked.image === "string" ? picked.image : `/images/${picked.answer.toLowerCase().replace(/\s+/g, "-")}.png`,
    changedFrom: picked.changedFrom,
    bgColor: picked.bgColor,
  };
}

export async function writeLevelToRoom(code, levelData, round) {
  if (!db) return;
  const pickedIdx = DUEL_LEVELS.findIndex((l) => l.id === levelData.id);

  await update(ref(db, `duels/${code}`), {
    status: "wheel",
    currentRound: round,
    currentLevel: levelData,
    lastRoundWinner: null,
    roundStartTime: 0,
    hints: null,
    wheelTarget: pickedIdx >= 0 ? pickedIdx : Math.floor(Math.random() * DUEL_LEVELS.length),
    "players/player1/answered": false,
    "players/player1/answeredAt": 0,
    "players/player2/answered": false,
    "players/player2/answeredAt": 0,
  });
}

export async function setRoomPlaying(code) {
  if (!db) return;
  await update(ref(db, `duels/${code}`), {
    status: "playing",
    roundStartTime: Date.now(),
  });
}

export async function submitAnswer(code, playerKey) {
  if (!db) return;
  const playerRef = ref(db, `duels/${code}/players/${playerKey}`);
  await update(playerRef, {
    answered: true,
    answeredAt: serverTimestamp(),
  });
}

export async function advanceRound(code, winner, newRound, p1Score, p2Score) {
  if (!db) return;
  const updates = {
    currentRound: newRound,
    lastRoundWinner: winner,
    "players/player1/score": p1Score,
    "players/player2/score": p2Score,
  };

  if (p1Score >= 2 || p2Score >= 2) {
    updates.status = "finished";
  } else {
    updates.status = "roundEnd";
  }

  await update(ref(db, `duels/${code}`), updates);
}

export async function writeHintToRoom(code, hintKey, idx, letter) {
  if (!db) return;
  await update(ref(db, `duels/${code}/hints`), {
    [hintKey]: { idx, letter, at: Date.now() },
  });
}

export async function writeRevealAll(code) {
  if (!db) return;
  await update(ref(db, `duels/${code}/hints`), { revealAll: true });
}

export async function deleteRoom(code) {
  if (!db) return;
  try { await remove(ref(db, `duels/${code}`)); } catch {}
}

export function getMyPlayerKey(room) {
  const deviceId = getDeviceId();
  if (room?.players?.player1?.id === deviceId) return "player1";
  if (room?.players?.player2?.id === deviceId) return "player2";
  return null;
}

export function getOpponentKey(myKey) {
  return myKey === "player1" ? "player2" : "player1";
}

// ── Word Duel multiplayer helpers ─────────────────────────────

export function pickWordDuelName(excludeNames = []) {
  const available = WORD_DUEL_NAMES.filter((n) => !excludeNames.includes(n.celebrity));
  const pool = available.length > 0 ? available : WORD_DUEL_NAMES;
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled[0];
}

export async function writeWordDuelLevelToRoom(code, wordDuelName, round, startingPlayer = "player1") {
  if (!db) return;
  const fullName = `${wordDuelName.firstName} ${wordDuelName.lastName}`;
  const letters = fullName.replace(/\s+/g, "").split("");
  const wordParts = [];
  let pos = 0;
  for (const part of fullName.split(/\s+/)) {
    wordParts.push({ word: part, start: pos });
    pos += part.length;
  }
  const initialUsed = wordParts.map((w) => w.word);

  const pickedIdx = WORD_DUEL_NAMES.findIndex((n) => n.celebrity === wordDuelName.celebrity);

  await update(ref(db, `duels/${code}`), {
    status: "wheel",
    currentRound: round,
    currentLevel: wordDuelName,
    lastRoundWinner: null,
    wheelTarget: pickedIdx >= 0 ? pickedIdx : Math.floor(Math.random() * WORD_DUEL_NAMES.length),
    wordDuel: {
      letters: letters.join(","),
      currentTurn: startingPlayer,
      turnStartedAt: 0,
      usedWords: initialUsed.join(","),
      moveCount: 0,
    },
    "players/player1/answered": false,
    "players/player1/answeredAt": 0,
    "players/player2/answered": false,
    "players/player2/answeredAt": 0,
  });
}

export async function startWordDuelTimer(code) {
  if (!db) return;
  await update(ref(db, `duels/${code}/wordDuel`), {
    turnStartedAt: Date.now(),
  });
}

export async function submitWordDuelMove(code, newLetters, newWord, nextTurn) {
  if (!db) return;
  const roomRef = ref(db, `duels/${code}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) return;
  const data = snapshot.val();
  const wd = data.wordDuel || {};

  const usedList = wd.usedWords ? wd.usedWords.split(",") : [];
  usedList.push(newWord);

  await update(ref(db, `duels/${code}/wordDuel`), {
    letters: newLetters.join(","),
    currentTurn: nextTurn,
    turnStartedAt: Date.now(),
    usedWords: usedList.join(","),
    moveCount: (wd.moveCount || 0) + 1,
  });
}

export async function writeCurrentAction(code, playerKey, action) {
  if (!db) return;
  await update(ref(db, `duels/${code}/players/${playerKey}`), { currentAction: action });
}

export async function clearCurrentAction(code, playerKey) {
  if (!db) return;
  await update(ref(db, `duels/${code}/players/${playerKey}`), { currentAction: null });
}

export async function wordDuelTimeout(code, winner, newRound, p1Score, p2Score) {
  if (!db) return;
  await advanceRound(code, winner, newRound, p1Score, p2Score);
}

// ── Rematch helpers ─────────────────────────────

export async function sendRematchRequest(opponentDeviceId, requesterName, requesterAvatar, mode) {
  if (!db) return;
  try {
    const myId = getDeviceId();
    await set(ref(db, `rematchRequests/${opponentDeviceId}`), {
      requesterId: myId,
      requesterName,
      requesterAvatar: requesterAvatar || "astronaut",
      mode: mode || "speed",
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn("Rematch request send failed:", e.message);
  }
}

export function subscribeRematchRequest(callback) {
  if (!db) { callback(null); return () => {}; }
  const deviceId = getDeviceId();
  const reqRef = ref(db, `rematchRequests/${deviceId}`);
  return onValue(reqRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  }, () => callback(null));
}

export function subscribeRematchResponse(opponentDeviceId, callback) {
  if (!db) { callback(null); return () => {}; }
  const reqRef = ref(db, `rematchRequests/${opponentDeviceId}`);
  const unsub = onValue(reqRef, (snapshot) => {
    if (!snapshot.exists()) { callback({ status: "cleared" }); return; }
    const data = snapshot.val();
    if (data.newRoomCode) { callback({ status: "accepted", roomCode: data.newRoomCode }); return; }
    callback({ status: "pending" });
  }, () => callback(null));
  return unsub;
}

export async function acceptRematchWithRoom(newRoomCode) {
  if (!db) return;
  const myId = getDeviceId();
  await update(ref(db, `rematchRequests/${myId}`), { newRoomCode });
}

export async function clearRematchRequest(targetDeviceId) {
  if (!db) return;
  const id = targetDeviceId || getDeviceId();
  try { await remove(ref(db, `rematchRequests/${id}`)); } catch {}
}

export function getDeviceIdPublic() {
  return getDeviceId();
}
