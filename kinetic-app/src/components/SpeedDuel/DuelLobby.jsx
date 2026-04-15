import { useState, useEffect, useCallback, useRef } from "react";
import { useGame } from "../../context/GameContext";
import DUEL_LEVELS from "../../data/duelLevels";
import WORD_DUEL_NAMES from "../../data/wordDuelNames";
import DuelBetAnimation from "./DuelBetAnimation";
import DuelCountdown from "./DuelCountdown";
import DuelWheel from "./DuelWheel";
import DuelGameScreen from "./DuelGameScreen";
import DuelRoundTransition from "./DuelRoundTransition";
import DuelResult from "./DuelResult";
import MultiplayerDuelGame from "./MultiplayerDuelGame";
import MultiplayerWordDuelGame from "./MultiplayerWordDuelGame";
import WordDuelScreen from "./WordDuelScreen";
import DuelTutorial from "./DuelTutorial";
import AdBanner from "../AdBanner";
import AvatarDisplay from "../AvatarDisplay";
import { getUsernameColorById } from "../../data/profileCustomization";
import {
  createRoom, joinRoom, subscribeRoom, writeLevelToRoom, pickLevelForRoom,
  writeWordDuelLevelToRoom, pickWordDuelName, startWordDuelTimer,
  setRoomPlaying, getMyPlayerKey, getOpponentKey, deleteRoom,
  sendRematchRequest, subscribeRematchRequest, subscribeRematchResponse,
  acceptRematchWithRoom, clearRematchRequest, getDeviceIdPublic,
} from "../../utils/duelService";
import { saveDuelResult } from "../../utils/duelHistoryService";

const OPPONENT_NAMES = [
  "QuizNinja", "BrainStorm", "PunMaster", "WordWiz", "SpeedKing",
  "FlashMind", "QuickDraw", "LetterBoss", "NameGenius", "PuzzlePro",
];

function getRandomOpponent() {
  return `${OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)]}${Math.floor(100 + Math.random() * 900)}`;
}

function pickRandomLevel(excludeIds) {
  const available = DUEL_LEVELS.filter((l) => !excludeIds.includes(l.id));
  if (available.length === 0) return DUEL_LEVELS[Math.floor(Math.random() * DUEL_LEVELS.length)];
  return available[Math.floor(Math.random() * available.length)];
}

function WaitingDots() {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full transition-all duration-300"
              style={{ backgroundColor: i < dots ? "#FBBF24" : "rgba(251,191,36,0.2)", transform: i < dots ? "scale(1.2)" : "scale(0.8)" }} />
      ))}
    </span>
  );
}

export default function DuelLobby() {
  const { state, dispatch } = useGame();
  const ENTRY_FEE = 50;
  const WIN_POT = 100;

  const [showTutorial, setShowTutorial] = useState(
    () => !localStorage.getItem("hasSeenDuelTutorial")
  );

  const [phase, setPhase] = useState("lobby");
  const [nickname, setNickname] = useState(() =>
    localStorage.getItem("duelNickname") || localStorage.getItem("whooops_nickname") || "Player"
  );
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentAvatar, setOpponentAvatar] = useState("robot");
  const [opponentFound, setOpponentFound] = useState(false);
  const [toast, setToast] = useState("");

  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [duelMode, setDuelMode] = useState(null);
  const [duelLevel, setDuelLevel] = useState(null);
  const [wordDuelName, setWordDuelName] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [lastRoundWinner, setLastRoundWinner] = useState(null);
  const [playerWon, setPlayerWon] = useState(false);
  const [usedLevelIds, setUsedLevelIds] = useState([]);

  const [room, setRoom] = useState(null);
  const [myKey, setMyKey] = useState(null);
  const [opponentDeviceId, setOpponentDeviceId] = useState(null);
  const [rematchNotif, setRematchNotif] = useState(null);
  const [rematchPending, setRematchPending] = useState(false);
  const [rematchMessage, setRematchMessage] = useState(null);
  const rematchTimerRef = useRef(null);
  const rematchResponseUnsub = useRef(null);
  const countdownTriggered = useRef(false);
  const lastWheelRound = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const duelModeRef = useRef(duelMode);
  duelModeRef.current = duelMode;

  const unsubRef = useRef(null);

  const [record, setRecord] = useState(() => {
    try { return JSON.parse(localStorage.getItem("duelRecord")) || { wins: 0, losses: 0 }; }
    catch { return { wins: 0, losses: 0 }; }
  });

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      if (rematchResponseUnsub.current) rematchResponseUnsub.current();
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeRematchRequest((req) => {
      if (!req) { setRematchNotif(null); return; }
      if (Date.now() - req.timestamp > 30000) {
        clearRematchRequest();
        setRematchNotif(null);
        return;
      }
      setRematchNotif(req);
      if (rematchTimerRef.current) clearTimeout(rematchTimerRef.current);
      rematchTimerRef.current = setTimeout(() => {
        clearRematchRequest();
        setRematchNotif(null);
      }, 30000 - (Date.now() - req.timestamp));
    });
    return () => {
      unsub();
      if (rematchTimerRef.current) clearTimeout(rematchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const activePlaying = ["waiting", "betAnimation", "countdown", "wheel", "playing", "wordDuel", "roundTransition", "result", "disconnected"].includes(phase);
    dispatch({ type: "SET_DUEL_PLAYING", value: activePlaying });
  }, [phase, dispatch]);

  // P2 safety net: if stuck in roundTransition waiting for P1 to write next round,
  // after 30s Player 2 writes the next round to Firebase themselves and advances
  useEffect(() => {
    if (phase !== "roundTransition" || !isMultiplayer || myKey === "player1") return;
    const timer = setTimeout(() => {
      const nextRound = currentRound + 1;
      const startingPlayer = nextRound % 2 === 1 ? "player1" : "player2";
      if (duelMode === "word") {
        const name = pickWordDuelName(usedLevelIds);
        writeWordDuelLevelToRoom(roomCode, name, nextRound, startingPlayer);
      } else {
        const levelData = pickLevelForRoom(usedLevelIds);
        writeLevelToRoom(roomCode, levelData, nextRound);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [phase, isMultiplayer, myKey, currentRound, duelMode, usedLevelIds, roomCode]);

  const listenToRoom = useCallback((code) => {
    if (unsubRef.current) unsubRef.current();
    countdownTriggered.current = false;
    lastWheelRound.current = 0;

    unsubRef.current = subscribeRoom(code, (data) => {
      if (!data) {
        if (phaseRef.current !== "result" && phaseRef.current !== "lobby") {
          setPhase("disconnected");
        }
        return;
      }
      setRoom(data);

      const key = getMyPlayerKey(data);
      setMyKey(key);

      // Player2 joined -> both see "opponent found", then bet animation -> countdown
      if (data.status === "ready" && !countdownTriggered.current) {
        countdownTriggered.current = true;
        const oppKey = getOpponentKey(key);
        setOpponentName(data.players?.[oppKey]?.nickname || "Opponent");
        setOpponentAvatar(data.players?.[oppKey]?.avatar || "robot");
        setOpponentDeviceId(data.players?.[oppKey]?.id || null);
        setOpponentFound(true);

        const delay = data.countdownStart ? Math.max(0, data.countdownStart - Date.now()) : 1500;
        setTimeout(() => setPhase("betAnimation"), delay);
      }

      // Detect room mode from Firebase
      if (data.duelMode && data.duelMode !== duelModeRef.current) {
        setDuelMode(data.duelMode);
      }

      // New round level written → detect by round number (no manual reset needed)
      const fbRound = data.currentRound || 1;
      if (data.status === "wheel" && data.currentLevel && fbRound > lastWheelRound.current) {
        lastWheelRound.current = fbRound;
        const lvl = data.currentLevel;
        if (data.duelMode === "word") {
          setWordDuelName(lvl);
          setUsedLevelIds((prev) => [...prev, lvl.celebrity]);
        } else {
          setDuelLevel(lvl);
          setUsedLevelIds((prev) => [...prev, lvl.id]);
        }
        setPhase("wheel");
      }

      // Disconnect detection — skip if game already finished
      if (data.players && phaseRef.current !== "result" && phaseRef.current !== "lobby") {
        const oppKey = key ? getOpponentKey(key) : null;
        if (oppKey && data.players[oppKey]?.disconnected) {
          setPhase("disconnected");
        }
      }
    });
  }, []);

  // --- Multiplayer: create ---
  const handleCreateMultiplayer = async (mode = "speed") => {
    if (state.coins < ENTRY_FEE) {
      setToast(`Need ${ENTRY_FEE} coins to enter! 🪙`);
      setTimeout(() => setToast(""), 2500);
      return;
    }
    setIsMultiplayer(true);
    setDuelMode(mode);
    setOpponentFound(false);
    setPhase("waiting");

    const code = await createRoom(nickname, mode, state.selectedAvatar);
    if (!code) {
      setToast("Failed to create room");
      setPhase("lobby");
      return;
    }
    setRoomCode(code);
    listenToRoom(code);
  };

  // --- Multiplayer: join (auto-detects room mode from Firebase) ---
  const handleJoinMultiplayer = async () => {
    if (joinCode.length !== 4) return;
    if (state.coins < ENTRY_FEE) {
      setJoinError(`Need ${ENTRY_FEE} coins to enter!`);
      return;
    }
    setJoinError("");

    const result = await joinRoom(joinCode, nickname, state.selectedAvatar);
    if (!result.ok) {
      setJoinError(result.error);
      return;
    }

    setIsMultiplayer(true);
    setRoomCode(joinCode);
    setOpponentFound(true);
    listenToRoom(joinCode);
  };

  // --- Solo AI duel ---
  const AI_AVATARS = ["wizard", "ninja", "alien", "dragon", "ghost", "demon", "vampire", "robot"];
  const handleCreateSoloDuel = (mode) => {
    setIsMultiplayer(false);
    setDuelMode(mode);
    setRoomCode(String(Math.floor(1000 + Math.random() * 9000)));
    setOpponentName(getRandomOpponent());
    setOpponentAvatar(AI_AVATARS[Math.floor(Math.random() * AI_AVATARS.length)]);
    setOpponentFound(false);
    setPhase("waiting");
    setTimeout(() => setOpponentFound(true), 3000);
    setTimeout(() => setPhase("countdown"), 4500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setToast("Copied! 🎉");
      setTimeout(() => setToast(""), 2000);
    });
  };

  // Countdown done -> pick level, then show wheel
  const handleCountdownDone = useCallback(() => {
    if (isMultiplayer) {
      if (myKey === "player1") {
        const startingPlayer = currentRound % 2 === 1 ? "player1" : "player2";
        if (duelMode === "word") {
          const name = pickWordDuelName(usedLevelIds);
          writeWordDuelLevelToRoom(roomCode, name, currentRound, startingPlayer);
        } else {
          const levelData = pickLevelForRoom(usedLevelIds);
          writeLevelToRoom(roomCode, levelData, currentRound);
        }
      }
    } else {
      if (duelMode === "word") {
        const name = pickWordDuelName(usedLevelIds);
        setWordDuelName(name);
      } else {
        const lvl = pickRandomLevel(usedLevelIds);
        setDuelLevel(lvl);
      }
      setPhase("wheel");
    }
  }, [isMultiplayer, myKey, usedLevelIds, roomCode, currentRound, duelMode]);

  // Wheel done -> both go to playing with the SAME level
  const handleWheelSelect = useCallback((selectedLevel) => {
    if (isMultiplayer) {
      if (myKey === "player1") {
        if (duelMode === "word") {
          startWordDuelTimer(roomCode);
        } else {
          setRoomPlaying(roomCode);
        }
      }
      setPhase(duelMode === "word" ? "wordDuel" : "playing");
    } else {
      if (duelMode === "word") {
        setUsedLevelIds((prev) => [...prev, selectedLevel.celebrity]);
      } else {
        setUsedLevelIds((prev) => [...prev, selectedLevel.id]);
      }
      setPhase(duelMode === "word" ? "wordDuel" : "playing");
    }
  }, [isMultiplayer, duelMode, myKey, roomCode]);

  // --- Round complete (true = win, false = lose, null = draw) ---
  const handleRoundComplete = useCallback((playerWonRound) => {
    const newPlayerScore = playerScore + (playerWonRound === true ? 1 : 0);
    const newOpponentScore = opponentScore + (playerWonRound === false ? 1 : 0);
    setPlayerScore(newPlayerScore);
    setOpponentScore(newOpponentScore);
    setLastRoundWinner(playerWonRound === true ? "player" : playerWonRound === false ? "opponent" : "draw");

    const matchOver = newPlayerScore >= 2 || newOpponentScore >= 2;
    if (matchOver) {
      const iWon = newPlayerScore >= 2;
      setPlayerWon(iWon);
      const newRecord = iWon
        ? { wins: record.wins + 1, losses: record.losses }
        : { wins: record.wins, losses: record.losses + 1 };
      setRecord(newRecord);
      localStorage.setItem("duelRecord", JSON.stringify(newRecord));
      if (iWon && isMultiplayer) dispatch({ type: "DUEL_WIN", coins: WIN_POT });

      saveDuelResult({ opponent: opponentName, opponentAvatar, mode: duelMode, result: iWon ? "win" : "lose" });

      setRematchPending(false);
      setRematchMessage(null);
      setPhase("result");
    } else {
      setPhase("roundTransition");
    }
  }, [playerScore, opponentScore, record, dispatch, isMultiplayer, WIN_POT, opponentName, opponentAvatar, duelMode]);

  const handleTransitionDone = useCallback(() => {
    setCurrentRound((r) => r + 1);
    if (isMultiplayer) {
      if (myKey === "player1") {
        const nextRound = currentRound + 1;
        const startingPlayer = nextRound % 2 === 1 ? "player1" : "player2";
        if (duelMode === "word") {
          const name = pickWordDuelName(usedLevelIds);
          writeWordDuelLevelToRoom(roomCode, name, nextRound, startingPlayer);
        } else {
          const levelData = pickLevelForRoom(usedLevelIds);
          writeLevelToRoom(roomCode, levelData, nextRound);
        }
      }
    } else {
      if (duelMode === "word") {
        const name = pickWordDuelName(usedLevelIds);
        setWordDuelName(name);
      } else {
        const lvl = pickRandomLevel(usedLevelIds);
        setDuelLevel(lvl);
      }
      setPhase("wheel");
    }
  }, [isMultiplayer, duelMode, usedLevelIds, roomCode, currentRound, myKey]);

  const handleAcceptRematch = useCallback(async () => {
    if (!rematchNotif) return;

    if (unsubRef.current) unsubRef.current();
    if (roomCode) deleteRoom(roomCode);

    setPlayerScore(0);
    setOpponentScore(0);
    setCurrentRound(1);
    setDuelLevel(null);
    setWordDuelName(null);
    setUsedLevelIds([]);
    setIsMultiplayer(true);
    setOpponentFound(false);
    setRematchPending(false);

    const mode = rematchNotif.mode || duelMode || "speed";
    setDuelMode(mode);

    const code = await createRoom(nickname, mode, state.selectedAvatar);
    if (!code) {
      setToast("Failed to create room");
      clearRematchRequest();
      setRematchNotif(null);
      setPhase("lobby");
      return;
    }

    setRoomCode(code);
    listenToRoom(code);
    await acceptRematchWithRoom(code);

    setRematchNotif(null);
    setPhase("waiting");
  }, [rematchNotif, nickname, listenToRoom, state.selectedAvatar, roomCode, duelMode]);

  const handleRematch = useCallback(() => {
    if (!isMultiplayer || !opponentDeviceId) {
      setPlayerScore(0);
      setOpponentScore(0);
      setCurrentRound(1);
      setDuelLevel(null);
      setWordDuelName(null);
      setUsedLevelIds([]);
      setLastRoundWinner(null);
      setPlayerWon(false);
      setIsMultiplayer(false);
      setOpponentName(getRandomOpponent());
      setOpponentAvatar(AI_AVATARS[Math.floor(Math.random() * AI_AVATARS.length)]);
      setOpponentFound(false);
      setPhase("waiting");
      setTimeout(() => setOpponentFound(true), 2000);
      setTimeout(() => setPhase("countdown"), 3500);
      return;
    }

    if (rematchNotif && rematchNotif.requesterId === opponentDeviceId) {
      handleAcceptRematch();
      return;
    }

    setRematchPending(true);
    setRematchMessage(null);

    sendRematchRequest(opponentDeviceId, nickname, state.selectedAvatar, duelMode || "speed");

    if (rematchResponseUnsub.current) rematchResponseUnsub.current();
    rematchResponseUnsub.current = subscribeRematchResponse(opponentDeviceId, async (resp) => {
      if (!resp) return;

      if (resp.status === "accepted" && resp.roomCode) {
        if (rematchTimerRef.current) clearTimeout(rematchTimerRef.current);
        if (rematchResponseUnsub.current) { rematchResponseUnsub.current(); rematchResponseUnsub.current = null; }

        if (unsubRef.current) unsubRef.current();
        if (roomCode) deleteRoom(roomCode);

        setPlayerScore(0);
        setOpponentScore(0);
        setCurrentRound(1);
        setDuelLevel(null);
        setWordDuelName(null);
        setUsedLevelIds([]);
        setRematchPending(false);
        setIsMultiplayer(true);

        const result = await joinRoom(resp.roomCode, nickname, state.selectedAvatar);
        if (result.ok) {
          setRoomCode(resp.roomCode);
          listenToRoom(resp.roomCode);
        } else {
          setRematchMessage("Room expired");
          setTimeout(() => setRematchMessage(null), 2500);
          setPhase("lobby");
        }

        clearRematchRequest(opponentDeviceId);
        return;
      }

      if (resp.status === "cleared") {
        if (rematchTimerRef.current) clearTimeout(rematchTimerRef.current);
        if (rematchResponseUnsub.current) { rematchResponseUnsub.current(); rematchResponseUnsub.current = null; }
        setRematchPending(false);
        setRematchMessage("Opponent declined");
        setTimeout(() => setRematchMessage(null), 2500);
      }
    });

    if (rematchTimerRef.current) clearTimeout(rematchTimerRef.current);
    rematchTimerRef.current = setTimeout(() => {
      if (rematchResponseUnsub.current) { rematchResponseUnsub.current(); rematchResponseUnsub.current = null; }
      clearRematchRequest(opponentDeviceId);
      setRematchPending(false);
      setRematchMessage("No response");
      setTimeout(() => setRematchMessage(null), 2500);
    }, 30000);
  }, [isMultiplayer, roomCode, duelMode, nickname, listenToRoom, opponentDeviceId, state.selectedAvatar, rematchNotif, handleAcceptRematch]);

  const handleDeclineRematch = useCallback(() => {
    clearRematchRequest();
    setRematchNotif(null);
  }, []);

  const handleCancelRematch = useCallback(() => {
    if (rematchTimerRef.current) clearTimeout(rematchTimerRef.current);
    if (rematchResponseUnsub.current) { rematchResponseUnsub.current(); rematchResponseUnsub.current = null; }
    if (opponentDeviceId) clearRematchRequest(opponentDeviceId);
    setRematchPending(false);
    setRematchMessage(null);
  }, [opponentDeviceId]);

  const handleExit = useCallback(() => {
    if (isMultiplayer && roomCode) deleteRoom(roomCode);
    if (unsubRef.current) unsubRef.current();
    dispatch({ type: "SET_SCREEN", screen: "game" });
  }, [dispatch, isMultiplayer, roomCode]);

  const handleExitDuel = useCallback(() => {
    if (isMultiplayer && roomCode) deleteRoom(roomCode);
    if (unsubRef.current) unsubRef.current();
    setPlayerScore(0);
    setOpponentScore(0);
    setCurrentRound(1);
    setDuelLevel(null);
    setWordDuelName(null);
    setUsedLevelIds([]);
    setIsMultiplayer(false);
    setPhase("lobby");
  }, [isMultiplayer, roomCode]);

  const exitButton = (
    <button onClick={handleExitDuel}
            className="fixed top-3 right-3 z-50 glass rounded-full w-10 h-10 flex items-center justify-center
                       text-text-muted hover:text-white active:scale-90 transition-all cursor-pointer"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
      ✕
    </button>
  );

  if (showTutorial) {
    return <DuelTutorial onDone={() => setShowTutorial(false)} />;
  }

  // --- Multiplayer game ---
  if (phase === "playing" && isMultiplayer && duelLevel && room) {
    return (
      <>
        {exitButton}
        <MultiplayerDuelGame
          key={`mp-round-${currentRound}`}
          roomCode={roomCode}
          room={room}
          myKey={myKey}
          level={duelLevel}
          currentRound={currentRound}
          playerName={nickname || "You"}
          opponentName={opponentName}
          playerAvatar={state.selectedAvatar}
          playerNameColor={getUsernameColorById(state.selectedNameColor).color}
          opponentAvatar={opponentAvatar}
          playerScore={playerScore}
          opponentScore={opponentScore}
          onRoundComplete={handleRoundComplete}
          onDisconnect={() => setPhase("disconnected")}
        />
      </>
    );
  }

  // --- Multiplayer word duel ---
  if (phase === "wordDuel" && isMultiplayer && wordDuelName && room) {
    return (
      <>
        {exitButton}
        <MultiplayerWordDuelGame
          key={`mp-word-round-${currentRound}`}
          roomCode={roomCode}
          myKey={myKey}
          wordDuelName={wordDuelName}
          currentRound={currentRound}
          playerName={nickname || "You"}
          opponentName={opponentName}
          playerAvatar={state.selectedAvatar}
          playerNameColor={getUsernameColorById(state.selectedNameColor).color}
          opponentAvatar={opponentAvatar}
          playerScore={playerScore}
          opponentScore={opponentScore}
          onRoundComplete={handleRoundComplete}
          onDisconnect={() => setPhase("disconnected")}
        />
      </>
    );
  }

  // --- Solo word duel ---
  if (phase === "wordDuel" && wordDuelName) {
    return (
      <>
        {exitButton}
        <WordDuelScreen
          key={`word-round-${currentRound}`}
          wordDuelName={wordDuelName}
          currentRound={currentRound}
          playerScore={playerScore}
          opponentScore={opponentScore}
          playerName={nickname || "You"}
          opponentName={opponentName}
          playerAvatar={state.selectedAvatar}
          playerNameColor={getUsernameColorById(state.selectedNameColor).color}
          opponentAvatar={opponentAvatar}
          onRoundComplete={handleRoundComplete}
        />
      </>
    );
  }

  if (phase === "betAnimation") {
    return (
      <>
        {exitButton}
        <DuelBetAnimation
          playerName={nickname || "You"}
          opponentName={opponentName}
          playerAvatar={state.selectedAvatar}
          playerNameColor={getUsernameColorById(state.selectedNameColor).color}
          opponentAvatar={opponentAvatar}
          playerCoins={state.coins}
          entryFee={ENTRY_FEE}
          winPot={WIN_POT}
          onDeductCoins={() => dispatch({ type: "DUEL_ENTRY_FEE" })}
          onDone={() => setPhase("countdown")}
        />
      </>
    );
  }

  if (phase === "countdown") return <>{exitButton}<DuelCountdown onDone={handleCountdownDone} /></>;

  // Wheel phase - in multiplayer, both players see same wheel with same target
  if (phase === "wheel") {
    const isWordMode = duelMode === "word";
    if (isMultiplayer) {
      const currentItem = isWordMode ? wordDuelName : duelLevel;
      if (currentItem) {
        return (
          <>
            {exitButton}
            <DuelWheel
              key={`mp-wheel-${currentRound}`}
              onSelect={handleWheelSelect}
              excludeIds={usedLevelIds.filter((id) => isWordMode ? id !== currentItem.celebrity : id !== currentItem.id)}
              forcedLevel={currentItem}
              forcedTarget={room?.wheelTarget}
              customLevels={isWordMode ? WORD_DUEL_NAMES : null}
            />
          </>
        );
      }
    }
    const soloForcedLevel = isWordMode ? wordDuelName : duelLevel;
    return (
      <>
        {exitButton}
        <DuelWheel
          key={`wheel-${currentRound}`}
          onSelect={handleWheelSelect}
          excludeIds={usedLevelIds}
          forcedLevel={soloForcedLevel}
          customLevels={isWordMode ? WORD_DUEL_NAMES : null}
        />
      </>
    );
  }

  if (phase === "playing" && !isMultiplayer && duelLevel) {
    return (
      <>
        {exitButton}
        <DuelGameScreen
          key={`round-${currentRound}`}
          level={duelLevel}
          currentRound={currentRound}
          playerScore={playerScore}
          opponentScore={opponentScore}
          playerName={nickname || "You"}
          opponentName={opponentName}
          playerAvatar={state.selectedAvatar}
          playerNameColor={getUsernameColorById(state.selectedNameColor).color}
          opponentAvatar={opponentAvatar}
          onRoundComplete={handleRoundComplete}
        />
      </>
    );
  }

  if (phase === "roundTransition") {
    return (
      <>
        {exitButton}
        <DuelRoundTransition
          roundNum={currentRound + 1}
          playerScore={playerScore}
          opponentScore={opponentScore}
          playerName={nickname || "You"}
          opponentName={opponentName}
          playerAvatar={state.selectedAvatar}
          playerNameColor={getUsernameColorById(state.selectedNameColor).color}
          opponentAvatar={opponentAvatar}
          lastRoundWinner={lastRoundWinner}
          onDone={handleTransitionDone}
        />
      </>
    );
  }

  if (phase === "result") {
    return (
      <>
        <DuelResult
          playerWon={playerWon}
          playerScore={playerScore}
          opponentScore={opponentScore}
          playerName={nickname || "You"}
          opponentName={opponentName}
          playerAvatar={state.selectedAvatar}
          playerNameColor={getUsernameColorById(state.selectedNameColor).color}
          opponentAvatar={opponentAvatar}
          record={record}
          levelData={duelLevel}
          wordDuelName={wordDuelName}
          duelMode={duelMode}
          isMultiplayer={isMultiplayer}
          rematchPending={rematchPending}
          rematchMessage={rematchMessage}
          onRematch={handleRematch}
          onCancelRematch={handleCancelRematch}
          onExit={handleExit}
        />
        {rematchNotif && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[340px] animate-bounce-in">
            <div className="glass rounded-2xl p-4 flex flex-col gap-3"
                 style={{ border: "2px solid rgba(245,158,11,0.4)", boxShadow: "0 8px 40px rgba(245,158,11,0.2)" }}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{"\u{1F504}"}</span>
                <div className="flex-1">
                  <p className="text-text font-bold text-sm">{rematchNotif.requesterName} wants a rematch!</p>
                  <p className="text-text-muted text-[10px]">Tap Accept to join</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAcceptRematch}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer active:scale-95 transition-all"
                        style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                  Accept
                </button>
                <button onClick={handleDeclineRematch}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-text-muted cursor-pointer active:scale-95 transition-all glass">
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- Disconnected ---
  if (phase === "disconnected") {
    const handleDisconnectExit = () => {
      if (isMultiplayer) {
        dispatch({ type: "DUEL_WIN", coins: WIN_POT });
        const newRecord = { wins: record.wins + 1, losses: record.losses };
        setRecord(newRecord);
        localStorage.setItem("duelRecord", JSON.stringify(newRecord));
      }
      handleExit();
    };
    return (
      <div className="flex flex-col items-center gap-5 px-4 py-6 flex-1 animate-fade-in justify-center">
        <span className="text-6xl">😔</span>
        <h2 className="text-2xl font-extrabold text-text">Opponent Left</h2>
        <p className="text-text-muted text-sm text-center">Your opponent disconnected from the game.</p>
        {isMultiplayer && (
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <span className="text-correct font-bold text-sm">You win! +{WIN_POT} 🪙</span>
          </div>
        )}
        <button onClick={handleDisconnectExit}
                className="px-8 py-3 rounded-xl gradient-primary text-white font-bold cursor-pointer active:scale-95 transition-all">
          Back to Menu
        </button>
      </div>
    );
  }

  // --- Waiting screen (multiplayer) ---
  if (phase === "waiting" && isMultiplayer) {
    return (
      <div className="flex flex-col items-center gap-5 px-4 py-6 flex-1 animate-fade-in">
        <div className="text-5xl animate-pulse">🌐</div>
        <h2 className="text-2xl font-extrabold text-text">Multiplayer Room</h2>

        <div className="glass rounded-2xl px-8 py-5 flex flex-col items-center gap-3"
             style={{ border: "1px solid rgba(124,58,237,0.3)", boxShadow: "0 0 30px rgba(124,58,237,0.1)" }}>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Room Code</p>
          <p className="text-5xl font-extrabold text-gradient-gold tracking-[0.3em]">{roomCode}</p>
          <p className="text-text-muted text-sm text-center mt-1">Share this code with your friend!</p>
          <button onClick={handleCopyCode}
                  className="glass rounded-full px-5 py-2 text-sm font-bold text-primary-light
                             hover:border-primary/40 active:scale-95 transition-all cursor-pointer">
            Copy Code 📋
          </button>
        </div>

        {opponentFound ? (
          <div className="flex flex-col items-center gap-2 animate-bounce-in">
            <div className="glass rounded-xl px-5 py-3 flex items-center gap-3
                           ring-1 ring-correct/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
              <span className="text-correct text-xl">🟢</span>
              <span className="text-correct font-bold text-sm">{opponentName} joined! Get ready...</span>
            </div>
            <p className="text-gold-light font-semibold text-sm animate-pulse">Starting duel...</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <WaitingDots />
            <span className="text-gold-light font-semibold text-sm">Waiting for opponent...</span>
            <span className="text-lg">👀</span>
          </div>
        )}

        {!opponentFound && (
          <button onClick={() => { deleteRoom(roomCode); setPhase("lobby"); }}
                  className="text-text-muted text-xs hover:text-text transition-colors cursor-pointer mt-4">
            ← Cancel
          </button>
        )}

        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 glass gradient-correct text-white px-5 py-2.5
                         rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(16,185,129,0.3)] animate-slide-up z-50">
            {toast}
          </div>
        )}
      </div>
    );
  }

  // --- Waiting screen (AI) ---
  if (phase === "waiting" && !isMultiplayer) {
    return (
      <div className="flex flex-col items-center gap-5 px-4 py-6 flex-1 animate-fade-in">
        <div className="text-5xl animate-pulse">⚡</div>
        <h2 className="text-2xl font-extrabold text-text">Finding Opponent</h2>
        {opponentFound ? (
          <div className="flex flex-col items-center gap-2 animate-bounce-in">
            <div className="glass rounded-xl px-5 py-3 flex items-center gap-3
                           ring-1 ring-correct/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
              <span className="text-correct text-xl">🟢</span>
              <span className="text-correct font-bold text-sm">{opponentName} joined!</span>
            </div>
            <p className="text-gold-light font-semibold text-sm animate-pulse">Starting duel...</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <WaitingDots />
            <span className="text-gold-light font-semibold text-sm">Matching...</span>
          </div>
        )}
        {!opponentFound && (
          <button onClick={() => setPhase("lobby")}
                  className="text-text-muted text-xs hover:text-text transition-colors cursor-pointer mt-4">
            ← Back
          </button>
        )}
      </div>
    );
  }

  // --- Lobby screen ---
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 pt-1 pb-3 animate-fade-in">
      <h2 className="text-lg font-extrabold text-text">⚡ Duel Arena</h2>

      {/* Multiplayer section */}
      <div className="w-full max-w-[300px]">
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <span className="text-text-muted text-[10px] font-semibold uppercase tracking-wider">🌐 Real Multiplayer</span>
          <span className="text-gold-light text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gold/15 border border-gold/20">
            {ENTRY_FEE} 🪙
          </span>
        </div>

        <div className="flex gap-2 mb-2">
          <button onClick={() => handleCreateMultiplayer("speed")}
                  className="flex-1 rounded-2xl p-3 cursor-pointer active:scale-[0.97] transition-all duration-200
                             border border-gold/20 hover:border-gold/40"
                  style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))" }}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">⚡</span>
              <h3 className="text-sm font-extrabold text-gold-light">Speed Room</h3>
            </div>
          </button>

          <button onClick={() => handleCreateMultiplayer("word")}
                  className="flex-1 rounded-2xl p-3 cursor-pointer active:scale-[0.97] transition-all duration-200
                             border border-primary/20 hover:border-primary/40"
                  style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(124,58,237,0.08))" }}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">🔤</span>
              <h3 className="text-sm font-extrabold text-primary-light">Word Room</h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-correct/15 text-correct font-bold">NEW</span>
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-1">
          <input type="text" value={joinCode}
                 onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setJoinError(""); }}
                 placeholder="Enter room code" maxLength={4}
                 className="w-full px-4 py-2.5 rounded-xl glass text-text font-bold text-center text-base tracking-[0.2em]
                            placeholder:text-text-muted/40 outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
          <button onClick={handleJoinMultiplayer} disabled={joinCode.length !== 4}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer active:scale-95
                    ${joinCode.length === 4
                      ? "gradient-primary text-white shadow-[0_4px_16px_rgba(139,92,246,0.3)]"
                      : "bg-white/[0.03] text-text-muted/30 cursor-not-allowed"}`}>
            Join Room
          </button>
          {joinError && <p className="text-wrong text-xs text-center font-semibold">{joinError}</p>}
        </div>
      </div>

      {/* Separator */}
      <div className="flex items-center gap-3 w-full max-w-[300px]">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-text-muted text-[10px] font-semibold">OR PLAY VS AI</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* AI modes */}
      <div className="flex gap-2 w-full max-w-[300px]">
        <button onClick={() => handleCreateSoloDuel("speed")}
                className="flex-1 rounded-2xl p-3 cursor-pointer active:scale-[0.97] transition-all duration-200
                           border border-gold/20 hover:border-gold/40"
                style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))" }}>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">⚡</span>
            <h3 className="text-sm font-extrabold text-gold-light">Speed Duel</h3>
            <p className="text-text-muted text-[9px]">vs AI</p>
          </div>
        </button>

        <button onClick={() => handleCreateSoloDuel("word")}
                className="flex-1 rounded-2xl p-3 cursor-pointer active:scale-[0.97] transition-all duration-200
                           border border-primary/20 hover:border-primary/40"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(124,58,237,0.08))" }}>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">🔤</span>
            <h3 className="text-sm font-extrabold text-primary-light">Word Duel</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-correct/15 text-correct font-bold">NEW</span>
          </div>
        </button>
      </div>

      {record.wins + record.losses > 0 && (
        <div className="glass rounded-xl px-5 py-2 flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-correct font-extrabold text-lg">{record.wins}</span>
            <span className="text-text-muted text-[10px] font-semibold">WINS</span>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-wrong font-extrabold text-lg">{record.losses}</span>
            <span className="text-text-muted text-[10px] font-semibold">LOSSES</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-[320px] mt-1 rounded-xl overflow-hidden opacity-70">
        <AdBanner adSlot="0000000000" />
      </div>

      {rematchNotif && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[340px] animate-bounce-in">
          <div className="glass rounded-2xl p-4 flex flex-col gap-3"
               style={{ border: "2px solid rgba(245,158,11,0.4)", boxShadow: "0 8px 40px rgba(245,158,11,0.2)" }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{"\u{1F504}"}</span>
              <div className="flex-1">
                <p className="text-text font-bold text-sm">{rematchNotif.requesterName} wants a rematch!</p>
                <p className="text-text-muted text-[10px]">Tap Accept to join</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAcceptRematch}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer active:scale-95 transition-all"
                      style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                Accept
              </button>
              <button onClick={handleDeclineRematch}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-text-muted cursor-pointer active:scale-95 transition-all glass">
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 glass gradient-correct text-white px-5 py-2.5
                       rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(16,185,129,0.3)] animate-slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
