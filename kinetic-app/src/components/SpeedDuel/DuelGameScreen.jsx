import { useState, useEffect, useCallback, useRef } from "react";
import { useGame } from "../../context/GameContext";
import LetterBoxes from "../LetterBoxes";
import LetterBank from "../LetterBank";
import { stripEmoji } from "../../utils/text";

// --- AI Bot difficulty tuning ---
const BOT_FINISH_MIN = 17000;  // minimum total ms before bot answers
const BOT_FINISH_MAX = 25000;  // maximum total ms before bot answers

const SIMILAR_LETTERS = {
  O: "Q", Q: "O", I: "L", L: "I", S: "Z", B: "D", D: "B", M: "N",
  N: "M", P: "R", R: "P", C: "G", G: "C", V: "W", W: "V", E: "F",
  F: "E", U: "V", K: "X", X: "K", H: "N", T: "Y", Y: "T",
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

  const targetDecoys = 3 + Math.floor(Math.random() * 3);
  while (decoys.length < targetDecoys) {
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
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-all duration-200"
          style={{
            backgroundColor: i < step ? "#FBBF24" : "rgba(251,191,36,0.2)",
            transform: i < step ? "scale(1.3)" : "scale(0.7)",
          }}
        />
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

export default function DuelGameScreen({ level, currentRound, playerScore, opponentScore, playerName, opponentName, playerAvatar, opponentAvatar, onRoundComplete }) {
  const { state } = useGame();
  const answer = level.answer;
  const answerNoSpaces = answer.replace(/\s/g, "");

  const [bankLetters] = useState(() => generateLetterBank(answer, level));
  const [placedLetters, setPlacedLetters] = useState(() => new Array(answerNoSpaces.length).fill(null));
  const [usedBankIndices, setUsedBankIndices] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [opponentDone, setOpponentDone] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [showPlayerWin, setShowPlayerWin] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [hintedIndices, setHintedIndices] = useState([]);
  const [secondsUntilHint, setSecondsUntilHint] = useState(HINT_INTERVAL);

  const startTime = useRef(Date.now());
  const bankRef = useRef(bankLetters);
  const gameOver = useRef(false);
  const nextHintAt = useRef(HINT_INTERVAL);
  const placedRef = useRef(placedLetters);
  placedRef.current = placedLetters;
  const hintedRef = useRef(new Set());
  const usedBankRef = useRef(usedBankIndices);
  usedBankRef.current = usedBankIndices;
  const botTimers = useRef([]);

  const revealHintLetter = useCallback(() => {
    const correctLetters = answerNoSpaces.split("");
    const currentPlaced = placedRef.current;
    const currentHinted = hintedRef.current;

    const unrevealed = [];
    for (let i = 0; i < correctLetters.length; i++) {
      if (currentPlaced[i] === null && !currentHinted.has(i)) {
        unrevealed.push(i);
      }
    }

    if (unrevealed.length === 0) return;

    const randIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const letter = correctLetters[randIdx];

    hintedRef.current.add(randIdx);
    setHintedIndices([...hintedRef.current]);

    setPlacedLetters((prev) => {
      const newPlaced = [...prev];
      newPlaced[randIdx] = letter;
      return newPlaced;
    });

    const bankIdx = bankRef.current.findIndex((l, bi) => l === letter && !usedBankRef.current.includes(bi));
    if (bankIdx >= 0) {
      setUsedBankIndices((prev) => [...prev, bankIdx]);
    }
  }, [answerNoSpaces]);

  // Bot finishes after a single random delay (hidden from player)
  useEffect(() => {
    const delay = BOT_FINISH_MIN + Math.random() * (BOT_FINISH_MAX - BOT_FINISH_MIN);
    const tid = setTimeout(() => {
      if (gameOver.current) return;
      setOpponentDone(true);
      gameOver.current = true;
      setShowReveal(true);
      setTimeout(() => onRoundComplete(false), 3000);
    }, delay);
    botTimers.current.push(tid);

    return () => botTimers.current.forEach(clearTimeout);
  }, [onRoundComplete]);

  // Elapsed timer + hint system
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver.current) return;
      const elapsedSec = (Date.now() - startTime.current) / 1000;
      setElapsed(elapsedSec);

      const remaining = Math.max(0, Math.ceil(nextHintAt.current - elapsedSec));
      setSecondsUntilHint(remaining);

      if (elapsedSec >= nextHintAt.current) {
        revealHintLetter();
        nextHintAt.current = elapsedSec + HINT_INTERVAL;
        setSecondsUntilHint(HINT_INTERVAL);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [revealHintLetter]);

  const handleWin = useCallback(() => {
    gameOver.current = true;
    botTimers.current.forEach(clearTimeout);
    setShowPlayerWin(true);
    setTimeout(() => onRoundComplete(true), 3000);
  }, [onRoundComplete]);

  const handleSelectLetter = useCallback((bankIdx) => {
    if (gameOver.current) return;

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
              const indicesToClear = [];
              for (let i = 0; i < cleared.length; i++) {
                if (!hintedRef.current.has(i)) {
                  cleared[i] = null;
                  indicesToClear.push(i);
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
  }, [answerNoSpaces, handleWin]);

  const handleRemoveLetter = useCallback((boxIdx) => {
    if (gameOver.current || hintedRef.current.has(boxIdx)) return;

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
  }, []);

  const elapsedDisplay = Math.floor(elapsed);

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-2 pb-[100px] flex-1 animate-fade-in">
      {/* Scoreboard */}
      <div className="w-full glass rounded-xl px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text font-bold text-sm">{playerName}</span>
          <span className="text-gold-light font-extrabold text-lg">{playerScore}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-text-muted text-[10px] font-semibold uppercase">Round {currentRound}/3</span>
          <span className="font-extrabold text-xl font-mono text-text-muted">
            {elapsedDisplay}s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gold-light font-extrabold text-lg">{opponentScore}</span>
          <span className="text-text font-bold text-sm">{opponentName}</span>
        </div>
      </div>

      {/* Opponent activity — no timing info revealed */}
      <div className={`w-full rounded-lg px-3 py-1.5 flex items-center justify-between transition-all duration-300
                       ${opponentDone
          ? "bg-wrong/20 border border-wrong/40 animate-shake"
          : "glass-light"}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{opponentDone ? "🏁" : "⚡"}</span>
          <span className={`font-semibold text-xs ${opponentDone ? "text-wrong" : "text-text-muted"}`}>
            {opponentName}
          </span>
        </div>
        {opponentDone ? (
          <span className="text-xs font-extrabold text-wrong">Finished! Hurry!</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-xs">playing</span>
            <TypingDots />
          </div>
        )}
      </div>

      {/* Celebrity info */}
      <h2 className="text-lg font-extrabold text-text text-center">{level.original}</h2>
      <p className="text-text-muted text-xs italic text-center">&ldquo;{stripEmoji(level.clue)}&rdquo;</p>

      <LetterBoxes
        answer={answer}
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
        letters={bankLetters}
        usedIndices={usedBankIndices}
        onSelectLetter={handleSelectLetter}
        disabled={false}
      />

      {/* Player won overlay */}
      {showPlayerWin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.92), rgba(5,150,105,0.92))" }}>
          <div className="flex flex-col items-center gap-4 px-6 animate-bounce-in">
            <span className="text-5xl">🎉</span>
            <h2 className="text-2xl font-extrabold text-white text-center">You got it! +1 point</h2>

            <p className="text-white/80 text-base font-semibold">
              It was: <span className="text-white font-extrabold">{level.original || level.answer}</span>
            </p>

            <div className="w-[140px] h-[140px] rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.4)]"
                 style={{ border: "3px solid rgba(255,255,255,0.3)" }}>
              {level.image && !imgError ? (
                <img src={typeof level.image === "string" ? level.image : `/images/${level.answer.toLowerCase().replace(/\s+/g, "-")}.png`}
                     alt={level.answer}
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
                <span className="text-white font-extrabold text-xl">{playerScore + 1}</span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex flex-col items-center">
                <span className="text-white/70 text-[10px] font-semibold uppercase">{opponentName}</span>
                <span className="text-white font-extrabold text-xl">{opponentScore}</span>
              </div>
            </div>

            <p className="text-white/60 text-sm font-semibold animate-pulse">
              {playerScore + 1 >= 2 ? "Final result..." : "Next round starting..."}
            </p>
          </div>
        </div>
      )}

      {/* Opponent won overlay */}
      {showReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.92), rgba(234,88,12,0.92))" }}>
          <div className="flex flex-col items-center gap-4 px-6 animate-bounce-in">
            <span className="text-5xl">⚡</span>
            <h2 className="text-2xl font-extrabold text-white text-center">Opponent got it first!</h2>

            <p className="text-white/80 text-base font-semibold">
              The answer was: <span className="text-white font-extrabold">{level.answer}</span>
            </p>

            <div className="w-[250px] h-[250px] rounded-3xl overflow-hidden"
                 style={{
                   border: "3px solid rgba(255,255,255,0.3)",
                   boxShadow: "0 0 40px rgba(0,0,0,0.5), 0 0 80px rgba(220,38,38,0.15)",
                 }}>
              {level.image && !imgError ? (
                <img src={typeof level.image === "string" ? level.image : `/images/${level.answer.toLowerCase().replace(/\s+/g, "-")}.png`}
                     alt={level.answer}
                     className="w-full h-full object-cover"
                     onError={() => setImgError(true)} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                     style={{ background: level.bgColor || "#1a1a2e" }}>
                  <span className="text-[80px]">{level.emoji}</span>
                </div>
              )}
            </div>

            <div className="glass rounded-xl px-6 py-3 flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-white/70 text-[10px] font-semibold uppercase">You</span>
                <span className="text-white font-extrabold text-xl">{playerScore}</span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex flex-col items-center">
                <span className="text-white/70 text-[10px] font-semibold uppercase">{opponentName}</span>
                <span className="text-white font-extrabold text-xl">{opponentScore + 1}</span>
              </div>
            </div>

            <p className="text-white/60 text-sm font-semibold animate-pulse">Next round starting...</p>
          </div>
        </div>
      )}

    </div>
  );
}
