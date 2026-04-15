import { useState, useEffect, useCallback, useRef } from "react";
import { useGame } from "../../context/GameContext";
import LetterBoxes from "../LetterBoxes";
import LetterBank from "../LetterBank";
import { stripEmoji } from "../../utils/text";
import {
  subscribeRoom, submitAnswer, advanceRound,
  getOpponentKey, writeHintToRoom,
} from "../../utils/duelService";
import DuelEmoji from "./DuelEmoji";

const SIMILAR_LETTERS = {
  O: "Q", Q: "O", I: "L", L: "I", S: "Z", B: "D", D: "B",
  M: "N", N: "M", P: "R", R: "P", C: "G", G: "C", V: "W", W: "V",
  E: "F", F: "E", U: "V", K: "X", X: "K", H: "N", T: "Y", Y: "T",
};

const HINT_INTERVAL = 30;

function generateLetterBank(answer, level) {
  const answerLetters = answer.replace(/\s/g, "").split("");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const decoys = [];

  if (level.changedFrom && !answerLetters.includes(level.changedFrom)) {
    decoys.push(level.changedFrom);
  }

  const answerSet = new Set(answerLetters);
  for (const letter of answerLetters) {
    if (decoys.length >= 2) break;
    const similar = SIMILAR_LETTERS[letter];
    if (similar && !answerSet.has(similar) && !decoys.includes(similar)) {
      decoys.push(similar);
      break;
    }
  }

  while (decoys.length < 4) {
    const letter = alphabet[Math.floor(Math.random() * 26)];
    if (!answerSet.has(letter) && !decoys.includes(letter)) {
      decoys.push(letter);
    }
  }

  const all = [...answerLetters, ...decoys];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

function TypingDots() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-200"
              style={{ backgroundColor: i < step ? "#FBBF24" : "rgba(251,191,36,0.2)", transform: i < step ? "scale(1.3)" : "scale(0.7)" }} />
      ))}
    </span>
  );
}

function HintProgressBar({ secondsUntilHint }) {
  const progress = Math.max(0, Math.min(1, secondsUntilHint / HINT_INTERVAL));

  let barColor = "bg-correct";
  if (secondsUntilHint <= 5) barColor = "bg-wrong";
  else if (secondsUntilHint <= 15) barColor = "bg-gold-light";

  return (
    <div className="w-full">
      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${barColor}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function MultiplayerDuelGame({
  roomCode, room, myKey, level, currentRound,
  playerName, opponentName,
  playerAvatar, opponentAvatar,
  playerScore, opponentScore,
  onRoundComplete, onDisconnect,
}) {
  const { state } = useGame();
  const oppKey = getOpponentKey(myKey);
  const answer = level.answer;
  const answerNoSpaces = answer.replace(/\s/g, "");

  const [bankLetters] = useState(() => generateLetterBank(answer, level));
  const [placedLetters, setPlacedLetters] = useState(() => new Array(answerNoSpaces.length).fill(null));
  const [usedBankIndices, setUsedBankIndices] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [hintedIndices, setHintedIndices] = useState([]);

  const [displayMyScore, setDisplayMyScore] = useState(playerScore);
  const [displayOppScore, setDisplayOppScore] = useState(opponentScore);
  const [roundResult, setRoundResult] = useState(null);
  const [imgError, setImgError] = useState(false);

  const roundStartRef = useRef(0);
  const bankRef = useRef(bankLetters);
  const gameOver = useRef(false);
  const hasSubmitted = useRef(false);
  const processingRef = useRef(false);
  const arbiterCalledRef = useRef(false);
  const latestRoomRef = useRef(null);
  const onRoundCompleteRef = useRef(onRoundComplete);
  onRoundCompleteRef.current = onRoundComplete;
  const onDisconnectRef = useRef(onDisconnect);
  onDisconnectRef.current = onDisconnect;
  const playerScoreRef = useRef(playerScore);
  playerScoreRef.current = playerScore;
  const opponentScoreRef = useRef(opponentScore);
  opponentScoreRef.current = opponentScore;
  const currentRoundRef = useRef(currentRound);
  currentRoundRef.current = currentRound;
  const nextHintAt = useRef(HINT_INTERVAL);
  const hintCountRef = useRef(0);
  const hintedRef = useRef(new Set());
  const [secondsUntilHint, setSecondsUntilHint] = useState(HINT_INTERVAL);
  const [syncing, setSyncing] = useState(true);
  const placedRef = useRef(placedLetters);
  placedRef.current = placedLetters;
  const usedBankRef = useRef(usedBankIndices);
  usedBankRef.current = usedBankIndices;

  const applyHintLocally = useCallback((idx, letter) => {
    if (hintedRef.current.has(idx)) return;
    hintedRef.current.add(idx);
    setHintedIndices([...hintedRef.current]);

    setPlacedLetters((prev) => {
      const newPlaced = [...prev];
      newPlaced[idx] = letter;
      return newPlaced;
    });

    const bankIdx = bankRef.current.findIndex((l, bi) => l === letter && !usedBankRef.current.includes(bi));
    if (bankIdx >= 0) {
      setUsedBankIndices((prev) => [...prev, bankIdx]);
    }
  }, []);

  // Elapsed timer — counts up from roundStartTime
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver.current || syncing || roundStartRef.current === 0) return;
      const elapsedSec = (Date.now() - roundStartRef.current) / 1000;
      setElapsed(elapsedSec);

      const remaining = Math.max(0, Math.ceil(nextHintAt.current - elapsedSec));
      setSecondsUntilHint(remaining);

      // Player 1 is the hint authority — writes one hint every HINT_INTERVAL
      if (myKey === "player1" && !gameOver.current) {
        if (elapsedSec >= nextHintAt.current) {
          hintCountRef.current += 1;
          nextHintAt.current = elapsedSec + HINT_INTERVAL;
          setSecondsUntilHint(HINT_INTERVAL);

          const correctLetters = answerNoSpaces.split("");
          const unrevealed = [];
          for (let i = 0; i < correctLetters.length; i++) {
            if (placedRef.current[i] === null && !hintedRef.current.has(i)) {
              unrevealed.push(i);
            }
          }
          if (unrevealed.length > 0) {
            const randIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
            const letter = correctLetters[randIdx];
            writeHintToRoom(roomCode, `hint${hintCountRef.current}`, randIdx, letter);
          }
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, [myKey, roomCode, answerNoSpaces]);

  // Subscribe to room changes — stable deps, uses refs for mutable values
  useEffect(() => {
    const unsub = subscribeRoom(roomCode, (data) => {
      if (!data) return;
      latestRoomRef.current = data;

      if (data.roundStartTime && data.roundStartTime > 0 && roundStartRef.current === 0) {
        roundStartRef.current = data.roundStartTime;
        setTimeout(() => setSyncing(false), 800);
      }

      const me = data.players?.[myKey];
      const opp = data.players?.[oppKey];

      if (opp?.disconnected) { onDisconnectRef.current(); return; }

      // Process hint events from Firebase
      if (data.hints) {
        for (const key of Object.keys(data.hints)) {
          const h = data.hints[key];
          if (h && h.idx != null && h.letter && !hintedRef.current.has(h.idx)) {
            applyHintLocally(h.idx, h.letter);
          }
        }
      }

      // Both players read the winner from Firebase (written by Player 1)
      if (data.lastRoundWinner && !processingRef.current) {
        processingRef.current = true;
        gameOver.current = true;

        const isDraw = data.lastRoundWinner === "draw";
        if (isDraw) {
          setRoundResult("draw");
          setTimeout(() => onRoundCompleteRef.current(null), 3000);
        } else {
          const iWon = data.lastRoundWinner === myKey;
          const pScore = playerScoreRef.current;
          const oScore = opponentScoreRef.current;
          setDisplayMyScore(pScore + (iWon ? 1 : 0));
          setDisplayOppScore(oScore + (iWon ? 0 : 1));
          setRoundResult(iWon ? "win" : "lose");
          setTimeout(() => onRoundCompleteRef.current(iWon), 3000);
        }
        return;
      }

      // Player 1 is the arbiter — first to answer wins, guarded against double calls
      if (myKey === "player1" && !arbiterCalledRef.current && !processingRef.current) {
        if (me?.answered || opp?.answered) {
          arbiterCalledRef.current = true;

          let winner;
          if (me?.answered && opp?.answered) {
            winner = me.answeredAt <= opp.answeredAt ? "player1" : "player2";
          } else {
            winner = me?.answered ? "player1" : "player2";
          }

          const iWon = winner === "player1";
          const pScore = playerScoreRef.current;
          const oScore = opponentScoreRef.current;
          const p1Score = pScore + (iWon ? 1 : 0);
          const p2Score = oScore + (iWon ? 0 : 1);
          advanceRound(roomCode, winner, currentRoundRef.current + 1, p1Score, p2Score);
        }
      }
    });

    return () => unsub();
  }, [roomCode, myKey, oppKey, applyHintLocally]);

  const handleWin = useCallback(() => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;
    gameOver.current = true;
    submitAnswer(roomCode, myKey);
  }, [roomCode, myKey]);

  const handleSelectLetter = useCallback((bankIdx) => {
    if (gameOver.current || syncing) return;

    setPlacedLetters((prev) => {
      const nextEmpty = prev.findIndex((l, i) => l === null && !hintedRef.current.has(i));
      if (nextEmpty === -1) return prev;

      const newPlaced = [...prev];
      newPlaced[nextEmpty] = bankRef.current[bankIdx];
      setUsedBankIndices((prevUsed) => [...prevUsed, bankIdx]);

      const allFilled = newPlaced.every((l) => l !== null);
      if (allFilled) {
        const attempt = newPlaced.join("");
        if (attempt === answerNoSpaces) {
          setTimeout(() => handleWin(), 50);
        } else {
          setFlashRed(true);
          setShaking(true);
          setTimeout(() => {
            setFlashRed(false);
            setShaking(false);
            setPlacedLetters((p) => {
              const cleared = [...p];
              for (let i = 0; i < cleared.length; i++) {
                if (!hintedRef.current.has(i)) {
                  cleared[i] = null;
                }
              }
              return cleared;
            });
            setUsedBankIndices((prevUsed) => {
              const hintBankIndices = new Set();
              hintedRef.current.forEach((hIdx) => {
                const letter = answerNoSpaces[hIdx];
                const bIdx = bankRef.current.findIndex((l, bi) => l === letter && !hintBankIndices.has(bi));
                if (bIdx >= 0) hintBankIndices.add(bIdx);
              });
              return [...hintBankIndices];
            });
          }, 600);
        }
      }

      return newPlaced;
    });
  }, [handleWin, answerNoSpaces, syncing]);

  const handleRemoveLetter = useCallback((boxIdx) => {
    if (gameOver.current || syncing || hintedRef.current.has(boxIdx)) return;
    setPlacedLetters((prev) => {
      const letter = prev[boxIdx];
      if (!letter) return prev;
      const newPlaced = [...prev];
      newPlaced[boxIdx] = null;
      setUsedBankIndices((prevUsed) => {
        const idx = prevUsed.findIndex((bi) => bankRef.current[bi] === letter);
        if (idx === -1) return prevUsed;
        return [...prevUsed.slice(0, idx), ...prevUsed.slice(idx + 1)];
      });
      return newPlaced;
    });
  }, [syncing]);

  const oppAnswered = room?.players?.[oppKey]?.answered;
  const elapsedDisplay = Math.floor(elapsed);

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-2 pb-[100px] flex-1 animate-fade-in">
      {/* Scoreboard */}
      <div className="w-full glass rounded-xl px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text font-bold text-sm">{playerName}</span>
          <span className="text-gold-light font-extrabold text-lg">{displayMyScore}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-text-muted text-[10px] font-semibold uppercase">Round {currentRound}/3</span>
          <span className="font-extrabold text-xl font-mono text-text-muted">
            {elapsedDisplay}s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gold-light font-extrabold text-lg">{displayOppScore}</span>
          <span className="text-text font-bold text-sm">{opponentName}</span>
        </div>
      </div>

      {/* Sync overlay */}
      {syncing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <span className="text-4xl">⚡</span>
            <span className="text-white font-bold text-lg">Syncing...</span>
            <span className="text-text-muted text-xs">Getting ready for round {currentRound}</span>
          </div>
        </div>
      )}

      {/* Live multiplayer badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
             style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <span className="w-2 h-2 rounded-full bg-correct animate-pulse" />
          <span className="text-correct text-xs font-bold">LIVE</span>
        </div>
      </div>

      {/* Opponent activity */}
      <div className={`w-full rounded-lg px-3 py-1.5 flex items-center justify-between transition-all duration-300
                       ${oppAnswered ? "bg-wrong/20 border border-wrong/40 animate-shake" : "glass-light"}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{oppAnswered ? "🏁" : "⚡"}</span>
          <span className={`font-semibold text-xs ${oppAnswered ? "text-wrong" : "text-text-muted"}`}>
            {opponentName}
          </span>
        </div>
        {oppAnswered ? (
          <span className="text-xs font-extrabold text-wrong">Answered! Hurry!</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-xs">solving</span>
            <TypingDots />
          </div>
        )}
      </div>

      {/* Round result overlay — win */}
      {roundResult === "win" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.92), rgba(5,150,105,0.92))" }}>
          <div className="flex flex-col items-center gap-4 px-6 animate-bounce-in">
            <span className="text-5xl">🎉</span>
            <h3 className="text-2xl font-extrabold text-white">You got it! +1 point</h3>

            <p className="text-white/80 text-base font-semibold">
              It was: <span className="text-white font-extrabold">{level.original}</span>
            </p>

            <div className="w-[140px] h-[140px] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.4)]"
                 style={{ border: "3px solid rgba(255,255,255,0.3)" }}>
              {level.image && !imgError ? (
                <img src={level.image} alt={level.original}
                     className="w-full h-full object-cover"
                     onError={() => setImgError(true)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                     style={{ background: level.bgColor || "#1a1a2e" }}>
                  <span className="text-6xl">{level.emoji}</span>
                </div>
              )}
            </div>

            <div className="glass rounded-xl px-6 py-3 flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-white/70 text-[10px] font-semibold uppercase">{playerName}</span>
                <span className="text-white font-extrabold text-xl">{displayMyScore}</span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex flex-col items-center">
                <span className="text-white/70 text-[10px] font-semibold uppercase">{opponentName}</span>
                <span className="text-white font-extrabold text-xl">{displayOppScore}</span>
              </div>
            </div>
            <p className="text-white/60 text-sm font-semibold animate-pulse">
              {displayMyScore >= 2 || displayOppScore >= 2 ? "Final result..." : "Next round starting..."}
            </p>
          </div>
        </div>
      )}

      {/* Round result overlay — opponent won with answer reveal */}
      {roundResult === "lose" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.92), rgba(234,88,12,0.92))" }}>
          <div className="flex flex-col items-center gap-4 px-6 animate-bounce-in">
            <span className="text-5xl">⚡</span>
            <h2 className="text-2xl font-extrabold text-white text-center">Opponent got it first!</h2>

            <p className="text-white/80 text-base font-semibold">
              The answer was: <span className="text-white font-extrabold">{level.original}</span>
            </p>

            <div className="w-[140px] h-[140px] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.4)]"
                 style={{ border: "3px solid rgba(255,255,255,0.3)" }}>
              {level.image && !imgError ? (
                <img src={level.image} alt={level.original}
                     className="w-full h-full object-cover"
                     onError={() => setImgError(true)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                     style={{ background: level.bgColor || "#1a1a2e" }}>
                  <span className="text-6xl">{level.emoji}</span>
                </div>
              )}
            </div>

            <div className="glass rounded-xl px-6 py-3 flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-white/70 text-[10px] font-semibold uppercase">You</span>
                <span className="text-white font-extrabold text-xl">{displayMyScore}</span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex flex-col items-center">
                <span className="text-white/70 text-[10px] font-semibold uppercase">{opponentName}</span>
                <span className="text-white font-extrabold text-xl">{displayOppScore}</span>
              </div>
            </div>

            <p className="text-white/60 text-sm font-semibold animate-pulse">
              {displayMyScore >= 2 || displayOppScore >= 2 ? "Final result..." : "Next round starting..."}
            </p>
          </div>
        </div>
      )}

      {/* Celebrity info */}
      <h2 className="text-lg font-extrabold text-text text-center">{level.original}</h2>
      <p className="text-text-muted text-xs italic text-center">&ldquo;{stripEmoji(level.clue)}&rdquo;</p>

      <LetterBoxes
        answer={level.answer}
        placedLetters={placedLetters}
        onRemoveLetter={handleRemoveLetter}
        isWin={false}
        shaking={shaking}
        flashRed={flashRed}
        greenSequence={null}
        hintedIndices={hintedIndices}
      />

      {/* Hint progress bar */}
      {!gameOver.current && (
        <HintProgressBar secondsUntilHint={secondsUntilHint} />
      )}

      <LetterBank
        letters={bankRef.current}
        usedIndices={usedBankIndices}
        onSelectLetter={handleSelectLetter}
        disabled={false}
      />

      {!roundResult && <DuelEmoji roomCode={roomCode} myKey={myKey} />}
    </div>
  );
}
