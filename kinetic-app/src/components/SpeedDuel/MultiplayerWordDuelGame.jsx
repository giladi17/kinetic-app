import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGame } from "../../context/GameContext";
import { isValidWord, generateAIMove } from "./wordDuelUtils";
import AvatarDisplay from "../AvatarDisplay";
import {
  subscribeRoom, submitWordDuelMove, advanceRound, getOpponentKey,
  writeCurrentAction, clearCurrentAction,
} from "../../utils/duelService";
import DuelEmoji from "./DuelEmoji";

function getTurnTime(turnNumber) {
  return Math.max(6, 15 - (turnNumber - 1) * 2);
}

const KEYBOARD_ROWS = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  "ZXCVBNM".split(""),
];

function splitNameToWords(name) {
  const words = [];
  let pos = 0;
  for (const part of name.split(/\s+/)) {
    words.push({ word: part, start: pos });
    pos += part.length;
  }
  return words;
}

export default function MultiplayerWordDuelGame({
  roomCode, myKey, wordDuelName,
  currentRound, playerName, opponentName,
  playerAvatar, opponentAvatar, playerNameColor,
  playerScore, opponentScore,
  onRoundComplete, onDisconnect,
}) {
  const { state, dispatch } = useGame();
  const oppKey = getOpponentKey(myKey);

  const fullName = `${wordDuelName.firstName} ${wordDuelName.lastName}`;
  const nameWords = useMemo(() => splitNameToWords(fullName), [fullName]);

  const [displayLetters, setDisplayLetters] = useState(() =>
    fullName.replace(/\s+/g, "").split("")
  );
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(myKey === "player1");
  const [shaking, setShaking] = useState(false);
  const [changedIdx, setChangedIdx] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [usedWords, setUsedWords] = useState(() => {
    const s = new Set();
    nameWords.forEach((w) => s.add(w.word));
    return s;
  });
  const [moveCount, setMoveCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getTurnTime(1));
  const [roundOver, setRoundOver] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [error, setError] = useState(null);
  const [timeBoostUsed, setTimeBoostUsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [oppAction, setOppAction] = useState(null);
  const [turnTimeFlash, setTurnTimeFlash] = useState(null);

  const allLettersRef = useRef(fullName.replace(/\s+/g, "").split(""));
  const turnStartRef = useRef(0);
  const bonusTimeRef = useRef(0);
  const tickRef = useRef(null);
  const roundOverRef = useRef(false);
  const isMyTurnRef = useRef(myKey === "player1");
  const moveCountRef = useRef(0);
  const processingRef = useRef(false);
  const onRoundCompleteRef = useRef(onRoundComplete);
  const historyRef = useRef(null);
  const lastTurnStartRef = useRef(0);
  onRoundCompleteRef.current = onRoundComplete;

  const resetTurnClock = useCallback((serverTime) => {
    turnStartRef.current = serverTime || Date.now();
    bonusTimeRef.current = 0;
    const tt = getTurnTime(moveCountRef.current + 1);
    setTimeLeft(tt);
  }, []);

  // Timer tick
  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (roundOverRef.current) return;
      if (turnStartRef.current === 0) return;
      const tt = getTurnTime(moveCountRef.current + 1);
      const elapsed = (Date.now() - turnStartRef.current) / 1000;
      const remaining = Math.max(0, Math.ceil(tt + bonusTimeRef.current - elapsed));
      setTimeLeft(remaining);

      if (remaining <= 0 && !roundOverRef.current) {
        roundOverRef.current = true;
        setRoundOver(true);

        if (myKey === "player1") {
          const timedOutPlayer = isMyTurnRef.current ? myKey : oppKey;
          const winner = timedOutPlayer === myKey ? oppKey : myKey;
          const p1Score = playerScore + (winner === "player1" ? 1 : 0);
          const p2Score = opponentScore + (winner === "player2" ? 1 : 0);
          advanceRound(roomCode, winner, currentRound + 1, p1Score, p2Score);
        }
      }
    }, 200);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [myKey, oppKey, roomCode, playerScore, opponentScore, currentRound]);

  // Subscribe to room for turn sync and round results
  useEffect(() => {
    const unsub = subscribeRoom(roomCode, (data) => {
      if (!data) return;

      const opp = data.players?.[oppKey];
      if (opp?.disconnected) { onDisconnect(); return; }

      // Round decided by Player 1
      if (data.lastRoundWinner && !processingRef.current) {
        processingRef.current = true;
        roundOverRef.current = true;
        setRoundOver(true);
        const iWon = data.lastRoundWinner === myKey;
        setRoundResult(iWon ? "win" : "lose");
        setTimeout(() => onRoundCompleteRef.current(iWon), 2500);
        return;
      }

      const wd = data.wordDuel;
      if (!wd) return;

      // Sync letters and turn from Firebase
      const fbLetters = wd.letters ? wd.letters.split(",") : null;
      if (fbLetters && fbLetters.length > 0) {
        setDisplayLetters(fbLetters);
        allLettersRef.current = fbLetters;
      }

      const iAmCurrent = wd.currentTurn === myKey;
      isMyTurnRef.current = iAmCurrent;
      setIsMyTurn(iAmCurrent);

      const fbMoveCount = wd.moveCount || 0;
      if (fbMoveCount !== moveCountRef.current) {
        moveCountRef.current = fbMoveCount;
        setMoveCount(fbMoveCount);
        const newTT = getTurnTime(fbMoveCount + 1);
        setTurnTimeFlash(newTT);
        setTimeout(() => setTurnTimeFlash(null), 1200);
      }

      if (wd.turnStartedAt && wd.turnStartedAt > 0 && wd.turnStartedAt !== lastTurnStartRef.current) {
        lastTurnStartRef.current = wd.turnStartedAt;
        resetTurnClock(wd.turnStartedAt);
      }

      // Sync used words
      if (wd.usedWords) {
        const words = wd.usedWords.split(",");
        setUsedWords(new Set(words));
      }

      // Read opponent's live action
      const oppData = data.players?.[oppKey];
      setOppAction(oppData?.currentAction || null);
    });

    return () => unsub();
  }, [roomCode, myKey, oppKey, onDisconnect, resetTurnClock]);

  const findWordForIndex = (idx) => {
    for (const w of nameWords) {
      if (idx >= w.start && idx < w.start + w.word.length) return w;
    }
    return null;
  };

  const getCurrentWordAt = (letters, idx) => {
    const w = findWordForIndex(idx);
    if (!w) return null;
    return letters.slice(w.start, w.start + w.word.length).join("");
  };

  const resetLetters = () => {
    setDisplayLetters([...allLettersRef.current]);
    setSelectedIdx(null);
    setChangedIdx(null);
  };

  const handleAddTime = () => {
    if (timeBoostUsed || state.coins < 40 || !isMyTurn || roundOver) return;
    dispatch({ type: "USE_HINT", cost: 40 });
    setTimeBoostUsed(true);
    bonusTimeRef.current += 5;
    setToast("+5 seconds!");
    setTimeout(() => setToast(null), 2000);
  };

  const handleTapLetter = (idx) => {
    if (!isMyTurn || roundOver) return;
    const newIdx = idx === selectedIdx ? null : idx;
    setSelectedIdx(newIdx);
    setError(null);
    if (newIdx !== null) {
      writeCurrentAction(roomCode, myKey, { selectedPosition: newIdx, proposedLetter: null, timestamp: Date.now() });
    } else {
      clearCurrentAction(roomCode, myKey);
    }
  };

  const handleKeyPress = useCallback((ch) => {
    if (!isMyTurnRef.current || roundOverRef.current || selectedIdx === null) return;
    const allLetters = allLettersRef.current;
    if (ch === allLetters[selectedIdx]) return;

    writeCurrentAction(roomCode, myKey, { selectedPosition: selectedIdx, proposedLetter: ch, timestamp: Date.now() });

    const newLetters = [...allLetters];
    newLetters[selectedIdx] = ch;

    const newWord = getCurrentWordAt(newLetters, selectedIdx);
    if (!newWord) return;

    if (!isValidWord(newWord)) {
      setDisplayLetters(newLetters);
      setChangedIdx(selectedIdx);
      setShaking(true);
      setError(`"${newWord}" is not a valid word`);
      setTimeout(() => {
        setShaking(false);
        setError(null);
        resetLetters();
        clearCurrentAction(roomCode, myKey);
      }, 800);
      return;
    }

    if (usedWords.has(newWord)) {
      setDisplayLetters(newLetters);
      setChangedIdx(selectedIdx);
      setShaking(true);
      setError("This word was already used!");
      setTimeout(() => {
        setShaking(false);
        setError(null);
        resetLetters();
        clearCurrentAction(roomCode, myKey);
      }, 800);
      return;
    }

    clearCurrentAction(roomCode, myKey);

    const oldWord = getCurrentWordAt(allLetters, selectedIdx);
    setDisplayLetters(newLetters);
    setChangedIdx(selectedIdx);
    setUsedWords((prev) => new Set(prev).add(newWord));
    setMoveHistory((prev) => [...prev, { from: oldWord, to: newWord, player: "you" }]);
    allLettersRef.current = newLetters;
    setSelectedIdx(null);

    const nextTurn = myKey === "player1" ? "player2" : "player1";
    submitWordDuelMove(roomCode, newLetters, newWord, nextTurn);

    setTimeout(() => {
      setChangedIdx(null);
      setTimeBoostUsed(false);
    }, 400);
  }, [selectedIdx, usedWords, roomCode, myKey]);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [moveHistory.length]);

  if (roundOver && roundResult) {
    const iWon = roundResult === "win";
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-6 flex-1 animate-fade-in justify-center">
        <span className="text-6xl">{iWon ? "🏆" : "⏱️"}</span>
        <h2 className="text-2xl font-extrabold text-white">
          {iWon ? "You win this round!" : `${opponentName} wins this round!`}
        </h2>
        <div className="flex items-center gap-4 text-lg font-extrabold">
          <span className="text-correct">{playerScore + (iWon ? 1 : 0)}</span>
          <span className="text-text-muted">—</span>
          <span className="text-wrong">{opponentScore + (iWon ? 0 : 1)}</span>
        </div>
        <p className="text-text-muted text-sm animate-pulse">
          {(playerScore + (iWon ? 1 : 0)) >= 2 || (opponentScore + (iWon ? 0 : 1)) >= 2
            ? "Final result..." : "Next round starting..."}
        </p>
      </div>
    );
  }

  const currentTurnTime = getTurnTime(moveCount + 1);
  const timerRatio = currentTurnTime > 0 ? timeLeft / currentTurnTime : 1;
  const timerColor = timerRatio > 0.6 ? "text-correct" : timerRatio > 0.3 ? "text-gold-light" : "text-wrong";
  const barColor = timerRatio > 0.6 ? "bg-correct" : timerRatio > 0.3 ? "bg-gold" : "bg-wrong";
  const timerUrgent = timerRatio <= 0.3;

  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-2 pb-[100px] flex-1 animate-fade-in">
      {/* Split-screen player header */}
      <div className="w-full flex gap-2">
        {/* Left: You */}
        <div className={`flex-1 rounded-xl p-3 flex flex-col items-center gap-1 transition-all duration-300
                         ${isMyTurn
            ? "border-2 border-correct/50 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
            : "border border-white/10"}`}
             style={{ background: isMyTurn ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)" }}>
          <AvatarDisplay avatarId={playerAvatar} size="duelSmall" />
          <span className="font-bold text-xs truncate max-w-full" style={{ color: playerNameColor || "#F1F5F9" }}>{playerName}</span>
          <span className="text-gold-light font-extrabold text-lg leading-none">{playerScore}</span>
          {isMyTurn ? (
            <span className="text-correct text-[10px] font-bold uppercase">Your Turn</span>
          ) : (
            <span className="text-text-muted text-[10px] font-semibold flex items-center gap-1">
              waiting
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-text-muted/50 animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </span>
            </span>
          )}
        </div>

        {/* Center: Round + LIVE */}
        <div className="flex flex-col items-center justify-center gap-1 px-1">
          <span className="text-text-muted text-[9px] font-semibold uppercase">Round</span>
          <span className="text-text font-extrabold text-sm">{currentRound}/3</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-correct animate-pulse" />
            <span className="text-correct text-[9px] font-bold">LIVE</span>
          </div>
        </div>

        {/* Right: Opponent */}
        <div className={`flex-1 rounded-xl p-3 flex flex-col items-center gap-1 transition-all duration-300
                         ${!isMyTurn
            ? "border-2 border-gold/50 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
            : "border border-white/10"}`}
             style={{ background: !isMyTurn ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)" }}>
          <AvatarDisplay avatarId={opponentAvatar} size="duelSmall" />
          <span className="text-text font-bold text-xs truncate max-w-full">{opponentName}</span>
          <span className="text-gold-light font-extrabold text-lg leading-none">{opponentScore}</span>
          {!isMyTurn ? (
            <span className="text-gold-light text-[10px] font-bold uppercase flex items-center gap-1">
              {oppAction?.proposedLetter ? "Picking..." : oppAction?.selectedPosition != null ? "Selecting..." : "Thinking"}
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-gold-light animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </span>
            </span>
          ) : (
            <span className="text-text-muted text-[10px] font-semibold flex items-center gap-1">
              waiting
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-text-muted/50 animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Turn time flash */}
      {turnTimeFlash && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                        animate-fade-in pointer-events-none">
          <div className="glass rounded-2xl px-6 py-3 border border-white/20 shadow-[0_0_30px_rgba(139,92,246,0.4)]">
            <span className="text-white font-extrabold text-xl">⏱️ {turnTimeFlash} seconds!</span>
          </div>
        </div>
      )}

      {/* Timer */}
      <div className="flex flex-col items-center gap-1.5 w-full max-w-[280px]">
        <div className="flex items-center gap-2">
          <div className={`rounded-full px-4 py-1.5 glass border flex items-center gap-2
                           ${timerUrgent ? "border-wrong/50 animate-pulse" : "border-white/10"}`}>
            <span className="text-sm">⏱️</span>
            <span className={`font-extrabold text-2xl font-mono ${timerColor} ${timerUrgent ? "animate-bounce" : ""}`}>
              {timeLeft}
            </span>
            <span className={`text-xs font-bold ${isMyTurn ? "text-primary-light" : "text-gold-light"}`}>
              {isMyTurn ? "YOU" : opponentName}
            </span>
          </div>
          {isMyTurn && !timeBoostUsed && (
            <button
              onClick={handleAddTime}
              disabled={state.coins < 40}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200
                         cursor-pointer active:scale-90
                         ${state.coins >= 40
                  ? "bg-gold/20 border border-gold/40 text-gold-light hover:bg-gold/30"
                  : "bg-white/[0.03] text-text-muted/30 border border-white/5 cursor-not-allowed"}`}
            >
              +5s (40🪙)
            </button>
          )}
        </div>
        {/* Timer progress bar */}
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-200 ${barColor}`}
               style={{ width: `${Math.max(0, timerRatio * 100)}%` }} />
        </div>
      </div>

      {/* Celebrity name */}
      <div className="flex items-center gap-2">
        <span className="text-text-muted text-xs font-semibold">Change ONE letter!</span>
      </div>

      {/* Full name letter boxes */}
      <div className={`flex flex-wrap justify-center gap-y-2 gap-x-4 ${shaking ? "animate-shake" : ""}`}>
        {nameWords.map((w, wi) => (
          <div key={wi} className="flex gap-1">
            {displayLetters.slice(w.start, w.start + w.word.length).map((ch, li) => {
              const globalIdx = w.start + li;
              const isSelected = isMyTurn && selectedIdx === globalIdx;
              const isChanged = changedIdx === globalIdx;
              const isOppSelected = !isMyTurn && oppAction?.selectedPosition === globalIdx;
              const oppProposed = isOppSelected && oppAction?.proposedLetter;

              let boxClass = "glass border border-white/10 text-white";
              if (isSelected) {
                boxClass = "bg-primary/25 border-2 border-primary text-primary-light shadow-[0_0_16px_rgba(139,92,246,0.4)] scale-110";
              } else if (isChanged) {
                boxClass = "bg-gold/20 border-2 border-gold text-gold-light shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pop-in";
              } else if (oppProposed) {
                boxClass = "bg-gold/25 border-2 border-gold text-gold-light shadow-[0_0_14px_rgba(245,158,11,0.35)]";
              } else if (isOppSelected) {
                boxClass = "border-2 border-gold/60 text-white shadow-[0_0_10px_rgba(245,158,11,0.2)]";
              }

              const displayChar = oppProposed ? oppAction.proposedLetter : ch;

              return (
                <button
                  key={globalIdx}
                  onClick={() => handleTapLetter(globalIdx)}
                  disabled={!isMyTurn}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center
                             font-extrabold text-lg transition-all duration-200
                             cursor-pointer active:scale-95 ${boxClass}`}
                >
                  {displayChar}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Action hint */}
      {isMyTurn && (
        <div className="rounded-full px-4 py-1 text-sm font-bold bg-correct/15 text-correct border border-correct/30">
          {selectedIdx !== null ? "Now pick a letter below \u2193" : "Tap a letter to change it"}
        </div>
      )}

      {/* Keyboard */}
      {isMyTurn && (
        <div className="flex flex-col gap-1.5 w-full max-w-[360px]">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 justify-center">
              {row.map((ch) => {
                const isCurrentLetter = selectedIdx !== null && displayLetters[selectedIdx] === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => handleKeyPress(ch)}
                    disabled={selectedIdx === null}
                    className={`flex-1 max-w-[36px] h-10 rounded-lg font-bold text-sm
                               transition-all duration-150 cursor-pointer active:scale-90
                               ${selectedIdx === null
                        ? "bg-white/[0.03] text-text-muted/30 cursor-not-allowed"
                        : isCurrentLetter
                          ? "bg-wrong/20 text-wrong border border-wrong/30"
                          : "glass text-white hover:bg-white/10 active:bg-primary/20"}`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-wrong/90 text-white px-5 py-2.5
                         rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(239,68,68,0.4)] animate-slide-up z-50">
          {error}
        </div>
      )}

      {/* Boost toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-correct/90 text-white px-5 py-2.5
                         rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(16,185,129,0.4)] animate-slide-up z-50">
          {toast}
        </div>
      )}

      {/* Move history */}
      {moveHistory.length > 0 && (
        <div ref={historyRef}
          className="w-full glass rounded-xl p-2 max-h-[70px] overflow-y-auto">
          <div className="flex flex-wrap gap-1">
            {moveHistory.map((m, i) => (
              <span key={i} className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                ${m.player === "you" ? "bg-primary/15 text-primary-light" : "bg-gold/15 text-gold-light"}`}>
                {m.from}→{m.to}
              </span>
            ))}
          </div>
        </div>
      )}

      {!roundOver && <DuelEmoji roomCode={roomCode} myKey={myKey} />}
    </div>
  );
}
