import { useState, useEffect, useCallback, useRef } from "react";
import { useGame } from "../../context/GameContext";
import { getDailyLevel, saveDailyResult } from "./dailyUtils";
import LetterBoxes from "../LetterBoxes";
import LetterBank from "../LetterBank";
import Confetti from "../Confetti";
import DailyWinScreen from "./DailyWinScreen";
import { playCorrectLetter, playWrongLetter, playWinSound, playDrumRoll } from "../../utils/sounds";
import { stripEmoji } from "../../utils/text";

const SIMILAR_LETTERS = {
  O: "Q", Q: "O", I: "L", L: "I", S: "Z", B: "D", D: "B",
  M: "N", N: "M", P: "R", R: "P", C: "G", G: "C", V: "W", W: "V",
  E: "F", F: "E", U: "V", K: "X", X: "K", H: "N", T: "Y", Y: "T",
};

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

const BLUR_START = 24;
const BLUR_DECAY_INTERVAL = 5000;
const BLUR_DECAY_STEP = 3;
const BLUR_LETTER_BONUS = 2;

function getTimerColor(sec) {
  if (sec < 10) return { color: "#10B981", label: "🏆 Legend pace" };
  if (sec < 20) return { color: "#FBBF24", label: "⚡ Fast pace" };
  if (sec < 40) return { color: "#F97316", label: "🔥 Good pace" };
  return { color: "#EF4444", label: "Keep going!" };
}

export default function DailyChallengeScreen({ onExit }) {
  const { state, dispatch } = useGame();
  const level = getDailyLevel();
  const answer = level.answer;
  const answerNoSpaces = answer.replace(/\s/g, "");

  const [bankLetters] = useState(() => generateLetterBank(answer, level));
  const [placedLetters, setPlacedLetters] = useState(() => new Array(answerNoSpaces.length).fill(null));
  const [usedBankIndices, setUsedBankIndices] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [greenSequence, setGreenSequence] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [result, setResult] = useState(null);

  const [blur, setBlur] = useState(BLUR_START);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showFailModal, setShowFailModal] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState([]);
  const [showHintModal, setShowHintModal] = useState(false);

  const startTime = useRef(Date.now());
  const placedRef = useRef(placedLetters);
  const usedRef = useRef(usedBankIndices);
  const bankRef = useRef(bankLetters);
  const blurRef = useRef(BLUR_START);
  const winRef = useRef(false);
  const revealedRef = useRef(revealedIndices);

  placedRef.current = placedLetters;
  usedRef.current = usedBankIndices;
  bankRef.current = bankLetters;
  blurRef.current = blur;
  revealedRef.current = revealedIndices;

  useEffect(() => {
    if (state.soundOn) playDrumRoll();
    const timerId = setInterval(() => {
      if (winRef.current) return;
      setElapsedMs(Date.now() - startTime.current);
    }, 100);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const blurTimer = setInterval(() => {
      if (winRef.current) return;
      setBlur((prev) => Math.max(0, prev - BLUR_DECAY_STEP));
    }, BLUR_DECAY_INTERVAL);
    return () => clearInterval(blurTimer);
  }, []);

  const triggerWinSequence = useCallback(() => {
    const finalTime = Date.now() - startTime.current;
    winRef.current = true;
    if (state.soundOn) playWinSound();

    const res = saveDailyResult(finalTime);
    dispatch({ type: "DAILY_CHALLENGE_WIN", coins: res.coins });
    setResult(res);
  }, [dispatch, state.soundOn]);

  const doRevealLetter = useCallback(() => {
    const placed = placedRef.current;
    const used = usedRef.current;
    const bank = bankRef.current;
    const revealed = revealedRef.current;

    const emptyIdx = placed.findIndex((l, i) => l === null && !revealed.includes(i));
    if (emptyIdx === -1) return false;

    const correctLetter = answerNoSpaces[emptyIdx];
    const bankIdx = bank.findIndex((l, i) => l === correctLetter && !used.includes(i));

    if (bankIdx !== -1) {
      setRevealedIndices((prev) => [...prev, emptyIdx]);
      handleSelectLetter(bankIdx);
      return true;
    }
    return false;
  }, [answerNoSpaces]);

  const confirmHint = useCallback(() => {
    setShowHintModal(false);
    if (state.hintPacks <= 0 && state.coins < 40) return;
    const revealed = doRevealLetter();
    if (!revealed) return;
    if (state.hintPacks > 0) {
      dispatch({ type: "USE_HINT_PACK" });
    } else {
      dispatch({ type: "USE_HINT", cost: 40 });
    }
  }, [state.hintPacks, state.coins, dispatch, doRevealLetter]);

  const handleSelectLetter = useCallback((bankIdx) => {
    setPlacedLetters((prev) => {
      const nextEmpty = prev.findIndex((l, i) => l === null && !revealedRef.current.includes(i));
      if (nextEmpty === -1) return prev;

      const newPlaced = [...prev];
      newPlaced[nextEmpty] = bankRef.current[bankIdx];
      setUsedBankIndices((prevUsed) => [...prevUsed, bankIdx]);

      setBlur((b) => Math.max(0, b - BLUR_LETTER_BONUS));
      if (state.soundOn) playCorrectLetter();

      const allFilled = newPlaced.every((l) => l !== null);
      if (allFilled) {
        const attempt = newPlaced.join("");
        if (attempt === answerNoSpaces) {
          setTimeout(() => triggerWinSequence(), 100);
        } else {
          if (state.soundOn) playWrongLetter();
          setFlashRed(true);
          setShaking(true);
          const newWrong = wrongAttempts + 1;
          setWrongAttempts(newWrong);
          setTimeout(() => {
            setFlashRed(false);
            setShaking(false);
            setPlacedLetters((p) => {
              const cleared = [...p];
              for (let i = 0; i < cleared.length; i++) {
                if (!revealedRef.current.includes(i)) cleared[i] = null;
              }
              return cleared;
            });
            setUsedBankIndices((prevUsed) => {
              const hintBankIndices = new Set();
              revealedRef.current.forEach((hIdx) => {
                const letter = answerNoSpaces[hIdx];
                const bIdx = bankRef.current.findIndex((l, bi) => l === letter && !hintBankIndices.has(bi));
                if (bIdx >= 0) hintBankIndices.add(bIdx);
              });
              return [...hintBankIndices];
            });
            if (newWrong >= 3) setShowFailModal(true);
          }, 600);
        }
      }

      return newPlaced;
    });
  }, [answerNoSpaces, triggerWinSequence]);

  const handleRemoveLetter = useCallback((boxIdx) => {
    if (revealedRef.current.includes(boxIdx)) return;
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

  if (result) {
    return <DailyWinScreen result={result} level={level} onExit={onExit} />;
  }

  const elapsedSec = elapsedMs / 1000;
  const timerInfo = getTimerColor(elapsedSec);
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = Math.floor(elapsedSec % 60);
  const tenths = Math.floor((elapsedSec * 10) % 10);
  const timerText = `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
  const showImage = !!level.image && !imgError;

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-2 flex-1">
      {showConfetti && <Confetti />}

      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">👑</span>
        <h2 className="text-lg font-extrabold text-gradient-gold">Daily Challenge</h2>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div
          className="font-mono text-4xl font-extrabold tracking-wider tabular-nums"
          style={{ color: timerInfo.color, textShadow: `0 0 20px ${timerInfo.color}40` }}
        >
          {timerText}
        </div>
        <span className="text-xs font-semibold" style={{ color: timerInfo.color }}>
          {timerInfo.label}
        </span>
      </div>

      {!isWin && (
        <div className="flex flex-col items-center gap-2 w-full">
          <h3 className="text-xl font-extrabold text-text text-center tracking-wide">
            {level.original}
          </h3>
          <p className="text-primary-light font-semibold text-xs">
            But something is off... 🤔
          </p>

          <div className="relative w-full max-w-[180px] aspect-square rounded-2xl
                         ring-2 ring-gold/40 animate-gold-glow
                         shadow-[0_0_24px_rgba(245,158,11,0.2)]">
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              {showImage ? (
                <img
                  src={level.image}
                  alt="mystery"
                  className="w-full h-full object-cover"
                  style={{
                    filter: `blur(${blur}px)`,
                    transition: "filter 0.5s ease",
                    transform: "scale(1.1)",
                  }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${level.bgColor}, #0F0F1A)`,
                    filter: `blur(${Math.min(blur, 8)}px)`,
                    transition: "filter 0.5s ease",
                    transform: "scale(1.1)",
                  }}
                >
                  <span className="text-[72px]">{level.emoji}</span>
                </div>
              )}
            </div>
            {blur > 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="text-4xl text-white/40 drop-shadow-lg">?</span>
              </div>
            )}
          </div>

          <p className="text-text-muted text-xs font-medium italic">
            &ldquo;{stripEmoji(level.clue)}&rdquo;
          </p>

          <button
            onClick={() => setShowHintModal(true)}
            disabled={state.hintPacks <= 0 && state.coins < 40}
            className={`py-2.5 px-6 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer
                       ${state.hintPacks > 0 || state.coins >= 40
                ? "text-white active:scale-95"
                : "bg-white/[0.03] text-text-muted/30 border border-white/[0.05] cursor-not-allowed"}`}
            style={state.hintPacks > 0 || state.coins >= 40 ? {
              background: "linear-gradient(135deg, #7C3AED, #9333EA)",
              boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
            } : {}}
          >
            💡 Hint {state.hintPacks > 0 ? `(${state.hintPacks})` : ""}
          </button>
        </div>
      )}

      {isWin && (
        <div className="animate-reveal-zoom">
          {showImage ? (
            <div className="relative w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden mx-auto
                           shadow-[0_8px_32px_rgba(245,158,11,0.3)] ring-2 ring-gold/40">
              <img src={level.image} alt={level.answer} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md py-1.5 px-3 text-center">
                <span className="text-white font-extrabold text-base">{level.answer}</span>
              </div>
            </div>
          ) : (
            <div
              className="w-full max-w-[200px] aspect-square rounded-2xl overflow-hidden mx-auto flex flex-col items-center justify-center gap-2
                         shadow-[0_8px_32px_rgba(245,158,11,0.3)] ring-2 ring-gold/40"
              style={{ background: `linear-gradient(135deg, ${level.bgColor}, #0F0F1A)` }}
            >
              <span className="text-[64px]">{level.emoji}</span>
              <span className="text-lg font-extrabold text-white">{level.answer}</span>
            </div>
          )}
        </div>
      )}

      <LetterBoxes
        answer={answer}
        placedLetters={placedLetters}
        onRemoveLetter={handleRemoveLetter}
        isWin={isWin}
        shaking={shaking}
        flashRed={flashRed}
        greenSequence={greenSequence}
        hintedIndices={revealedIndices}
      />

      {!isWin && (
        <LetterBank
          letters={bankLetters}
          usedIndices={usedBankIndices}
          onSelectLetter={handleSelectLetter}
          disabled={isWin}
        />
      )}

      {!isWin && (
        <button
          onClick={onExit}
          className="text-text-muted text-xs font-semibold hover:text-text transition-colors cursor-pointer mt-1"
        >
          ← Back to menu
        </button>
      )}

      {showHintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
             onClick={() => setShowHintModal(false)}>
          <div className="glass rounded-2xl p-6 mx-6 max-w-[320px] w-full flex flex-col items-center gap-4 animate-bounce-in"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold text-text">Use a Hint? 💡</h3>
            <p className="text-text-muted text-sm text-center">This will reveal one correct letter</p>
            <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
              {state.hintPacks > 0 ? (
                <>
                  <span>📦</span>
                  <span className="text-correct font-bold text-sm">You have {state.hintPacks} hint pack{state.hintPacks > 1 ? "s" : ""}</span>
                </>
              ) : (
                <>
                  <span>🪙</span>
                  <span className="text-gold-light font-bold text-sm">Your balance: {state.coins} coins</span>
                </>
              )}
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowHintModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-text-muted font-semibold text-sm
                           hover:border-white/20 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmHint}
                className="flex-1 py-3 rounded-xl gradient-primary text-white font-bold text-sm
                           hover:opacity-90 active:scale-95 transition-all cursor-pointer
                           shadow-[0_4px_16px_rgba(139,92,246,0.3)]"
              >
                {state.hintPacks > 0 ? "Use Pack ✨" : "Yes — 40 coins"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass rounded-2xl p-6 mx-6 max-w-[320px] w-full flex flex-col items-center gap-4 animate-bounce-in"
               onClick={(e) => e.stopPropagation()}>
            <span className="text-5xl">💔</span>
            <h3 className="text-xl font-extrabold text-text">3 Wrong Attempts!</h3>
            <p className="text-text-muted text-sm text-center">
              {state.extraLives > 0
                ? "Use an Extra Life to keep trying?"
                : "You're out! Come back tomorrow or get Extra Lives from the shop."}
            </p>
            {state.extraLives > 0 && (
              <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                <span>❤️</span>
                <span className="text-correct font-bold text-sm">{state.extraLives} Extra {state.extraLives === 1 ? "Life" : "Lives"} available</span>
              </div>
            )}
            <div className="flex gap-3 w-full">
              {state.extraLives > 0 ? (
                <>
                  <button
                    onClick={onExit}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-text-muted font-semibold text-sm
                               hover:border-white/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Give Up
                  </button>
                  <button
                    onClick={() => {
                      dispatch({ type: "USE_EXTRA_LIFE" });
                      setWrongAttempts(0);
                      setShowFailModal(false);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer active:scale-95
                               gradient-correct text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:opacity-90"
                  >
                    Use Life ❤️
                  </button>
                </>
              ) : (
                <button
                  onClick={onExit}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer active:scale-95
                             gradient-primary text-white shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:opacity-90"
                >
                  Back to Menu
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
