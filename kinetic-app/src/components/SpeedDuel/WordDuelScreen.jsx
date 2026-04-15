import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGame } from "../../context/GameContext";
import { isValidWord, generateAIMove } from "./wordDuelUtils";

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

export default function WordDuelScreen({
  wordDuelName,
  currentRound,
  playerScore,
  opponentScore,
  playerName,
  opponentName,
  playerAvatar,
  opponentAvatar,
  onRoundComplete,
}) {
  const { state, dispatch } = useGame();

  const fullName = `${wordDuelName.firstName} ${wordDuelName.lastName}`;
  const nameWords = useMemo(() => splitNameToWords(fullName), [fullName]);
  const allLettersRef = useRef(fullName.replace(/\s+/g, "").split(""));

  const [displayLetters, setDisplayLetters] = useState(allLettersRef.current);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [changedIdx, setChangedIdx] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [usedWords, setUsedWords] = useState(() => {
    const s = new Set();
    nameWords.forEach((w) => s.add(w.word));
    return s;
  });
  const [turnNumber, setTurnNumber] = useState(1);
  const [timeLeft, setTimeLeft] = useState(getTurnTime(1));
  const [roundOver, setRoundOver] = useState(false);
  const [error, setError] = useState(null);
  const [timeBoostUsed, setTimeBoostUsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [turnTimeFlash, setTurnTimeFlash] = useState(null);

  const turnStartRef = useRef(Date.now());
  const bonusTimeRef = useRef(0);
  const tickRef = useRef(null);
  const aiTimeoutRef = useRef(null);
  const roundOverRef = useRef(false);
  const isPlayerTurnRef = useRef(true);
  const turnNumberRef = useRef(1);
  const onRoundCompleteRef = useRef(onRoundComplete);
  const historyRef = useRef(null);
  onRoundCompleteRef.current = onRoundComplete;

  const resetTurnClock = useCallback(() => {
    turnStartRef.current = Date.now();
    bonusTimeRef.current = 0;
    const tt = getTurnTime(turnNumberRef.current);
    setTimeLeft(tt);
  }, []);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (roundOverRef.current) return;
      const tt = getTurnTime(turnNumberRef.current);
      const elapsed = (Date.now() - turnStartRef.current) / 1000;
      const remaining = Math.max(0, Math.ceil(tt + bonusTimeRef.current - elapsed));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        roundOverRef.current = true;
        setRoundOver(true);
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
        const playerWins = !isPlayerTurnRef.current;
        setTimeout(() => onRoundCompleteRef.current(playerWins), 1200);
      }
    }, 200);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (roundOver) return;
    if (moveHistory.length > 0) return;
    resetTurnClock();
  }, [resetTurnClock, roundOver, moveHistory.length]);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [moveHistory.length]);

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
    if (timeBoostUsed || state.coins < 40 || !isPlayerTurn || roundOver) return;
    dispatch({ type: "USE_HINT", cost: 40 });
    setTimeBoostUsed(true);
    bonusTimeRef.current += 5;
    setToast("+5 seconds! ⏱️");
    setTimeout(() => setToast(null), 2000);
  };

  const handleTapLetter = (idx) => {
    if (!isPlayerTurn || roundOver) return;
    setSelectedIdx(idx === selectedIdx ? null : idx);
    setError(null);
  };

  const handleKeyPress = useCallback((ch) => {
    if (!isPlayerTurnRef.current || roundOverRef.current || selectedIdx === null) return;
    const allLetters = allLettersRef.current;
    if (ch === allLetters[selectedIdx]) return;

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
      }, 800);
      return;
    }

    const oldWord = getCurrentWordAt(allLetters, selectedIdx);
    setDisplayLetters(newLetters);
    setChangedIdx(selectedIdx);
    setUsedWords((prev) => new Set(prev).add(newWord));
    setMoveHistory((prev) => [...prev, { from: oldWord, to: newWord, player: "you" }]);
    allLettersRef.current = newLetters;
    setSelectedIdx(null);

    setTimeout(() => {
      setChangedIdx(null);
      isPlayerTurnRef.current = false;
      setIsPlayerTurn(false);
      const nextTurn = turnNumberRef.current + 1;
      turnNumberRef.current = nextTurn;
      setTurnNumber(nextTurn);
      const newTT = getTurnTime(nextTurn);
      setTurnTimeFlash(newTT);
      setTimeout(() => setTurnTimeFlash(null), 1200);
      resetTurnClock();
    }, 400);
  }, [selectedIdx, usedWords, resetTurnClock]);

  useEffect(() => {
    if (isPlayerTurn || roundOver) return;

    setAiThinking(true);
    const willTimeout = Math.random() < 0.05;
    const delay = willTimeout ? 16000 : 3000 + Math.random() * 5000;

    aiTimeoutRef.current = setTimeout(() => {
      if (roundOverRef.current) return;
      if (willTimeout) return;

      const allLetters = allLettersRef.current;
      let aiMoved = false;
      const shuffledWords = [...nameWords].sort(() => Math.random() - 0.5);

      for (const w of shuffledWords) {
        const word = allLetters.slice(w.start, w.start + w.word.length).join("");
        const aiWord = generateAIMove(word, usedWords);
        if (aiWord) {
          const newLetters = [...allLetters];
          const aiLetters = aiWord.split("");
          let diffIdx = -1;
          for (let i = 0; i < aiLetters.length; i++) {
            if (aiLetters[i] !== word[i]) {
              diffIdx = w.start + i;
              break;
            }
          }
          for (let i = 0; i < aiLetters.length; i++) {
            newLetters[w.start + i] = aiLetters[i];
          }

          setDisplayLetters(newLetters);
          setChangedIdx(diffIdx);
          setUsedWords((prev) => new Set(prev).add(aiWord));
          setMoveHistory((prev) => [...prev, { from: word, to: aiWord, player: "ai" }]);
          allLettersRef.current = newLetters;
          aiMoved = true;

          setTimeout(() => {
            if (roundOverRef.current) return;
            setChangedIdx(null);
            setAiThinking(false);
            isPlayerTurnRef.current = true;
            setIsPlayerTurn(true);
            setTimeBoostUsed(false);
            const nextTurn = turnNumberRef.current + 1;
            turnNumberRef.current = nextTurn;
            setTurnNumber(nextTurn);
            const newTT = getTurnTime(nextTurn);
            setTurnTimeFlash(newTT);
            setTimeout(() => setTurnTimeFlash(null), 1200);
            resetTurnClock();
          }, 600);
          break;
        }
      }

      if (!aiMoved && !roundOverRef.current) {
        roundOverRef.current = true;
        setRoundOver(true);
        setAiThinking(false);
        setTimeout(() => onRoundCompleteRef.current(true), 1200);
      }
    }, delay);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [isPlayerTurn, roundOver, usedWords, nameWords, resetTurnClock]);

  if (roundOver) {
    const playerTimedOut = isPlayerTurnRef.current && timeLeft === 0;
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-6 flex-1 animate-fade-in justify-center">
        <span className="text-6xl">{playerTimedOut ? "⏱️" : "🏆"}</span>
        <h2 className="text-2xl font-extrabold text-white">
          {playerTimedOut ? "Time's Up!" : `${opponentName} ran out of time!`}
        </h2>
        <p className="text-text-muted text-sm">
          {playerTimedOut ? `${opponentName} wins this round` : "You win this round!"}
        </p>
      </div>
    );
  }

  const currentTurnTime = getTurnTime(turnNumber);
  const timerRatio = currentTurnTime > 0 ? timeLeft / currentTurnTime : 1;
  const timerColor = timerRatio > 0.6 ? "text-correct" : timerRatio > 0.3 ? "text-gold-light" : "text-wrong";
  const barColor = timerRatio > 0.6 ? "bg-correct" : timerRatio > 0.3 ? "bg-gold" : "bg-wrong";
  const timerUrgent = timerRatio <= 0.3;

  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-2 pb-[100px] flex-1 animate-fade-in">
      {/* Scoreboard */}
      <div className="w-full glass rounded-xl px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPlayerTurn ? "bg-correct" : "bg-text-muted/30"}`} />
          <span className="text-text font-bold text-sm">{playerName}</span>
          <span className="text-gold-light font-extrabold text-lg">{playerScore}</span>
        </div>
        <span className="text-text-muted text-[10px] font-semibold uppercase">Round {currentRound}/3</span>
        <div className="flex items-center gap-2">
          <span className="text-gold-light font-extrabold text-lg">{opponentScore}</span>
          <span className="text-text font-bold text-sm">{opponentName}</span>
          <span className={`w-2 h-2 rounded-full ${!isPlayerTurn ? "bg-correct" : "bg-text-muted/30"}`} />
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
            <span className={`text-xs font-bold ${isPlayerTurn ? "text-primary-light" : "text-gold-light"}`}>
              {isPlayerTurn ? "YOU" : opponentName}
            </span>
          </div>
          {isPlayerTurn && !timeBoostUsed && (
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
          {isPlayerTurn && timeBoostUsed && (
            <span className="text-correct text-xs font-bold">✓</span>
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
              const isSelected = isPlayerTurn && selectedIdx === globalIdx;
              const isChanged = changedIdx === globalIdx;

              let boxClass = "glass border border-white/10 text-white";
              if (isSelected) {
                boxClass = "bg-primary/25 border-2 border-primary text-primary-light shadow-[0_0_16px_rgba(139,92,246,0.4)] scale-110";
              } else if (isChanged) {
                boxClass = "bg-gold/20 border-2 border-gold text-gold-light shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pop-in";
              }

              return (
                <button
                  key={globalIdx}
                  onClick={() => handleTapLetter(globalIdx)}
                  disabled={!isPlayerTurn}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center
                             font-extrabold text-lg transition-all duration-200
                             cursor-pointer active:scale-95 ${boxClass}`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Turn indicator */}
      <div className={`rounded-full px-4 py-1 text-sm font-bold transition-all duration-300
                       ${isPlayerTurn
          ? "bg-correct/15 text-correct border border-correct/30"
          : "bg-gold/15 text-gold-light border border-gold/30"}`}>
        {aiThinking ? (
          <span className="flex items-center gap-2">
            {opponentName} thinking
            <span className="inline-flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-gold-light animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </span>
          </span>
        ) : isPlayerTurn ? (
          selectedIdx !== null ? "Now pick a letter below ↓" : "Tap a letter to change it"
        ) : (
          `${opponentName}'s turn`
        )}
      </div>

      {/* Keyboard */}
      {isPlayerTurn && (
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
          ❌ {error}
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
    </div>
  );
}
