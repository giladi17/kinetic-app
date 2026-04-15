import { useState, useEffect, useCallback, useRef } from "react";
import { useGame } from "../context/GameContext";
import LetterBoxes from "./LetterBoxes";
import LetterBank from "./LetterBank";
import Confetti from "./Confetti";
import StreakBanner from "./StreakBanner";
import { playCorrectLetter, playWrongLetter, playWinSound } from "../utils/sounds";
import { isBossLevel, isMysteryLevel, getWorld } from "../data/worlds";
import { stripEmoji } from "../utils/text";

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

function MysteryIntroOverlay({ onDone }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 100),      // Step 1: suspense text
      setTimeout(() => setStep(2), 2100),      // Step 2: lightning + shake
      setTimeout(() => setStep(3), 2600),      // Step 3: title drop
      setTimeout(() => setStep(4), 3400),      // Step 4: info text
      setTimeout(() => setStep(5), 4200),      // Step 5: "look carefully"
      setTimeout(() => onDone(), 6200),         // Step 6: dismiss & start
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: "linear-gradient(180deg, rgba(10,8,2,0.98), rgba(20,15,3,0.98))" }}>

      {/* Lightning flash (Step 2) */}
      {step === 2 && (
        <div className="fixed inset-0 pointer-events-none z-[60]"
             style={{ animation: "mFlash 0.5s ease-out forwards" }} />
      )}

      <div className={`flex flex-col items-center gap-5 px-6 ${step === 2 ? "animate-shake" : ""}`}>

        {/* Step 1: Suspense */}
        {step >= 1 && step < 3 && (
          <div className="flex flex-col items-center gap-4" style={{ animation: "mFadeIn 0.6s ease-out both" }}>
            <div className="text-5xl flex gap-3" style={{ animation: "mPulseQ 1.5s ease-in-out infinite" }}>
              <span>❓</span><span>❓</span><span>❓</span>
            </div>
            <p className="text-text-muted text-base font-semibold text-center leading-relaxed">
              Something is different<br />about this level...
            </p>
          </div>
        )}

        {/* Step 2+: Lightning bolt */}
        {step >= 2 && step < 5 && (
          <span className="text-7xl" style={{
            filter: "drop-shadow(0 0 30px rgba(234,179,8,0.8))",
            animation: "mDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}>⚡</span>
        )}

        {/* Step 3+: Title */}
        {step >= 3 && step < 5 && (
          <h2 className="text-3xl font-extrabold text-center"
              style={{
                color: "#FBBF24",
                textShadow: "0 0 30px rgba(234,179,8,0.6), 0 0 60px rgba(234,179,8,0.3)",
                animation: "mDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
              }}>
            ⚡ MYSTERY LEVEL ⚡
          </h2>
        )}

        {/* Step 4: Info */}
        {step >= 4 && step < 5 && (
          <div className="flex flex-col items-center gap-3" style={{ animation: "mFadeIn 0.4s ease-out both" }}>
            <div className="glass rounded-2xl p-4 max-w-[280px]">
              <p className="text-text-muted text-sm text-center leading-relaxed">
                No name. No clue. Just the image.<br />
                Can you figure out who this is?
              </p>
            </div>
            <p className="text-yellow-400/60 text-xs font-bold">+15 bonus coins if you solve it!</p>
          </div>
        )}

        {/* Step 5: Look carefully */}
        {step >= 5 && (
          <div className="flex flex-col items-center gap-4" style={{ animation: "mFadeIn 0.5s ease-out both" }}>
            <span className="text-6xl">👁️</span>
            <p className="text-xl font-extrabold text-center"
               style={{
                 color: "#FBBF24",
                 textShadow: "0 0 20px rgba(234,179,8,0.4)",
               }}>
              Look carefully...
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes mFlash {
          0% { background: rgba(234,179,8,0.35); }
          15% { background: rgba(255,255,255,0.6); }
          30% { background: rgba(234,179,8,0.2); }
          50% { background: rgba(255,255,255,0.4); }
          70% { background: rgba(234,179,8,0.1); }
          85% { background: rgba(255,255,255,0.25); }
          100% { background: transparent; }
        }
        @keyframes mDrop {
          from { opacity: 0; transform: translateY(-50px) scale(0.7); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mPulseQ {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default function GameScreen() {
  const { state, dispatch, currentLevelData } = useGame();
  const answer = currentLevelData.answer;
  const answerNoSpaces = answer.replace(/\s/g, "");
  const isBoss = isBossLevel(state.currentLevel);
  const isMystery = isMysteryLevel(state.currentLevel);
  const isSpecial = isBoss || isMystery;

  const [bankLetters, setBankLetters] = useState(() => generateLetterBank(answer, currentLevelData));
  const [placedLetters, setPlacedLetters] = useState(() => new Array(answerNoSpaces.length).fill(null));
  const [usedBankIndices, setUsedBankIndices] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [greenSequence, setGreenSequence] = useState(null);
  const [shareGlowing, setShareGlowing] = useState(false);
  const [toast, setToast] = useState("");
  const [revealedIndices, setRevealedIndices] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [blurUsed, setBlurUsed] = useState(false);
  const [imageBlur, setImageBlur] = useState(() => (isBossLevel(state.currentLevel) || isMysteryLevel(state.currentLevel)) ? 0 : 10);
  const [showBlurModal, setShowBlurModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showBossIntro, setShowBossIntro] = useState(() => isBossLevel(state.currentLevel));
  const [showMysteryIntro, setShowMysteryIntro] = useState(() => isMysteryLevel(state.currentLevel));
  const [mysteryAutoHinted, setMysteryAutoHinted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeWorld, setWelcomeWorld] = useState(null);

  const inactivityTimer = useRef(null);
  const levelRef = useRef(state.currentLevel);
  const placedRef = useRef(placedLetters);
  const usedRef = useRef(usedBankIndices);
  const bankRef = useRef(bankLetters);
  const revealedRef = useRef(revealedIndices);
  const startTimeRef = useRef(null);

  placedRef.current = placedLetters;
  usedRef.current = usedBankIndices;
  bankRef.current = bankLetters;
  revealedRef.current = revealedIndices;

  useEffect(() => {
    if (!isBoss && !isMystery) {
      startTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (levelRef.current !== state.currentLevel) {
      levelRef.current = state.currentLevel;
      const newBank = generateLetterBank(currentLevelData.answer, currentLevelData);
      setBankLetters(newBank);
      setPlacedLetters(new Array(currentLevelData.answer.replace(/\s/g, "").length).fill(null));
      setUsedBankIndices([]);
      setShaking(false);
      setFlashRed(false);
      setIsWin(false);
      setGreenSequence(null);
      setShareGlowing(false);
      setRevealedIndices([]);
      setShowConfetti(false);
      setBlurUsed(false);
      setImageBlur((isBossLevel(state.currentLevel) || isMysteryLevel(state.currentLevel)) ? 0 : 10);
      setImgError(false);
      setShowBossIntro(isBossLevel(state.currentLevel));
      setShowMysteryIntro(isMysteryLevel(state.currentLevel));
      setMysteryAutoHinted(false);

      const isBossNew = isBossLevel(state.currentLevel);
      const isMysteryNew = isMysteryLevel(state.currentLevel);
      if (!isBossNew && !isMysteryNew) {
        startTimeRef.current = Date.now();
      } else {
        startTimeRef.current = null;
      }
    }
  }, [state.currentLevel, currentLevelData]);

  useEffect(() => {
    inactivityTimer.current = setTimeout(() => {
      setShareGlowing(true);
    }, 45000);
    return () => clearTimeout(inactivityTimer.current);
  }, [state.lastActivityTime]);

  useEffect(() => {
    if (!isMystery || showMysteryIntro || mysteryAutoHinted || isWin) return;
    const timer = setTimeout(() => {
      setMysteryAutoHinted(true);
      dispatch({ type: "USE_HINT", cost: 0 });
      doRevealLetter();
    }, 45000);
    return () => clearTimeout(timer);
  }, [isMystery, showMysteryIntro, mysteryAutoHinted, isWin]);

  useEffect(() => {
    if (state.worldJustEntered) {
      const w = getWorld(state.currentLevel);
      setWelcomeWorld(w);
      setShowWelcome(true);
      dispatch({ type: "CLEAR_WORLD_ENTERED" });
      const timer = setTimeout(() => setShowWelcome(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [state.worldJustEntered, state.currentLevel, dispatch]);

  useEffect(() => {
    if (state.wrongAttempts >= 3) {
      setShareGlowing(true);
    }
  }, [state.wrongAttempts]);

  useEffect(() => {
    if (!state.pendingHint) return;
    const hint = state.pendingHint;
    dispatch({ type: "CLEAR_PENDING_HINT" });

    if (hint === "reveal") {
      doRevealLetter();
    } else if (hint === "remove") {
      doRemoveWrongLetters();
    }
  }, [state.pendingHint]);

  const triggerWinSequence = useCallback(() => {
    if (state.soundOn) playWinSound();
    const solveTime = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;
    dispatch({ type: "COMPLETE_LEVEL", solveTime });
  }, [dispatch, state.soundOn]);

  const handleSelectLetter = useCallback((bankIdx) => {
    dispatch({ type: "RECORD_ACTIVITY" });
    clearTimeout(inactivityTimer.current);

    setPlacedLetters((prev) => {
      const nextEmpty = prev.findIndex((l) => l === null);
      if (nextEmpty === -1) return prev;

      const newPlaced = [...prev];
      newPlaced[nextEmpty] = bankRef.current[bankIdx];

      setUsedBankIndices((prevUsed) => [...prevUsed, bankIdx]);

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
          dispatch({ type: "WRONG_ATTEMPT" });
          setTimeout(() => {
            setFlashRed(false);
            setShaking(false);
            setPlacedLetters(new Array(answerNoSpaces.length).fill(null));
            setUsedBankIndices([]);
            setRevealedIndices([]);
          }, 600);
        }
      }

      return newPlaced;
    });
  }, [answerNoSpaces, dispatch, triggerWinSequence]);

  const handleRemoveLetter = useCallback((boxIdx) => {
    if (revealedRef.current.includes(boxIdx)) return;
    dispatch({ type: "RECORD_ACTIVITY" });

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
  }, [dispatch]);

  const doRevealLetter = () => {
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
  };

  const doRemoveWrongLetters = () => {
    const used = usedRef.current;
    const bank = bankRef.current;
    const correctSet = new Set(answerNoSpaces.split(""));
    const newBank = bank.map((l, i) => {
      if (used.includes(i)) return l;
      if (!correctSet.has(l)) return "";
      return l;
    });
    setBankLetters(newBank);
  };

  const handleHintTap = () => {
    setShowHintModal(true);
  };

  const confirmHint = () => {
    setShowHintModal(false);
    const revealed = doRevealLetter();
    if (!revealed) return;
    if (state.hintPacks > 0) {
      dispatch({ type: "USE_HINT_PACK" });
    } else {
      if (state.coins < 40) return;
      dispatch({ type: "USE_HINT", cost: 40 });
    }
  };

  const confirmBlurHint = () => {
    setShowBlurModal(false);
    if (blurUsed) return;
    if (state.blurPacks > 0) {
      dispatch({ type: "USE_BLUR_PACK" });
    } else {
      if (state.coins < 60) return;
      dispatch({ type: "USE_HINT", cost: 60 });
    }
    setBlurUsed(true);
    setImageBlur(3);
    setToast("Getting warmer... 🌫️");
    setTimeout(() => setToast(""), 2500);
  };

  const handleShare = async () => {
    const text = `🆘 Help me solve WhoOops!\n\nCelebrity: ${currentLevelData.original}\nClue: "${stripEmoji(currentLevelData.clue)}"\n\nCan you figure out the connection?\n🔗 gilad-app.vercel.app`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setToast("Copied! Send to a friend 📋");
    setTimeout(() => setToast(""), 2000);
    setShareGlowing(false);
  };

  return (
    <div className="flex flex-col items-center gap-1 px-4 py-1 pb-[70px] flex-1">
      {showConfetti && <Confetti />}
      <StreakBanner />

      {showWelcome && welcomeWorld && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
             style={{ animation: "welcomeSlide 2.5s ease-in-out forwards" }}>
          <div className="mt-16 px-6 py-3 rounded-2xl text-white font-extrabold text-lg text-center"
               style={{
                 background: "linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(59, 130, 246, 0.9))",
                 boxShadow: "0 4px 30px rgba(124, 58, 237, 0.4), 0 0 60px rgba(59, 130, 246, 0.2)",
                 backdropFilter: "blur(12px)",
               }}>
            {welcomeWorld.emoji} Welcome to World {welcomeWorld.id}!
          </div>
        </div>
      )}

      {!isWin && (
        <div className="flex flex-col items-center gap-1 w-full">
          {isBoss ? (
            <>
              <p className="text-wrong font-extrabold text-sm tracking-wider uppercase"
                 style={{ textShadow: "0 0 12px rgba(239,68,68,0.4)" }}>
                ⚔️ Boss Level
              </p>
              <p className="text-text-muted font-bold text-sm">
                👁️ Who is this celebrity?
              </p>
            </>
          ) : isMystery ? (
            <>
              <div className="w-full max-w-[340px] rounded-xl py-1.5 px-3 text-center font-extrabold text-sm"
                   style={{
                     background: "linear-gradient(135deg, rgba(234,179,8,0.2), rgba(245,158,11,0.15))",
                     border: "1px solid rgba(234,179,8,0.4)",
                     color: "#FBBF24",
                     textShadow: "0 0 12px rgba(234,179,8,0.4)",
                   }}>
                ⚡ MYSTERY LEVEL — Who is this?
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-extrabold text-text text-center tracking-wide">
                {currentLevelData.original}
              </h2>
              <p className="text-text-muted font-medium text-center text-sm italic px-4 leading-snug">
                &ldquo;{stripEmoji(currentLevelData.clue)}&rdquo;
              </p>
            </>
          )}

          <div className={`relative w-full aspect-square rounded-2xl
                         shadow-[0_0_24px_rgba(139,92,246,0.2)]
                         ${isBoss ? "max-w-[220px] ring-2 ring-wrong/40"
                           : isMystery ? "max-w-[220px] ring-2 ring-yellow-500/40"
                           : "max-w-[160px] ring-2 ring-primary/30 animate-pulse-glow"}`}>
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              {currentLevelData.image && !imgError ? (
                <img
                  src={currentLevelData.image}
                  alt="mystery"
                  className="w-full h-full object-cover"
                  style={{
                    filter: `blur(${imageBlur}px)`,
                    transition: "filter 0.5s ease",
                    transform: isSpecial ? "none" : "scale(1.15)",
                  }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${currentLevelData.bgColor}, #0F0F1A)`,
                    filter: `blur(${Math.min(imageBlur, 8)}px)`,
                    transition: "filter 0.5s ease",
                    transform: isSpecial ? "none" : "scale(1.15)",
                  }}
                >
                  <span className="text-[72px]">{currentLevelData.emoji}</span>
                </div>
              )}
            </div>
            {!isSpecial && imageBlur > 6 && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="text-4xl text-white/40 drop-shadow-lg">?</span>
              </div>
            )}
          </div>
          {!isSpecial && (
            <p className="text-text-muted text-[10px] font-medium">
              {blurUsed ? "Image revealed partially 🌫️" : "Solve to reveal! 🎭"}
            </p>
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
      />

      {!isWin && (
        <div className="flex gap-2 w-full max-w-[340px]">
          {/* Primary: Hint */}
          <button
            onClick={handleHintTap}
            disabled={state.hintPacks <= 0 && state.coins < 40}
            className={`flex-1 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer
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

          {/* Secondary: Blur (hidden on boss/mystery levels) */}
          {!isSpecial && (
            <button
              onClick={() => !blurUsed && setShowBlurModal(true)}
              disabled={blurUsed || (state.blurPacks <= 0 && state.coins < 60)}
              className={`flex-1 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer
                         ${blurUsed
                  ? "bg-white/[0.03] text-text-muted/30 border border-white/[0.05] cursor-not-allowed"
                  : state.blurPacks > 0 || state.coins >= 60
                    ? "text-primary-light active:scale-95"
                    : "bg-white/[0.03] text-text-muted/30 border border-white/[0.05] cursor-not-allowed"}`}
              style={!blurUsed && (state.blurPacks > 0 || state.coins >= 60) ? {
                background: "rgba(124,58,237,0.08)",
                border: "2px solid rgba(124,58,237,0.5)",
              } : {}}
            >
              {blurUsed ? "Used ✓" : `👁️ Reveal${state.blurPacks > 0 ? ` (${state.blurPacks})` : ""}`}
            </button>
          )}

          {/* Tertiary: Ask */}
          <button
            onClick={handleShare}
            className={`flex-1 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer
                       text-text-muted active:scale-95
                       ${shareGlowing ? "animate-pulse-glow" : ""}`}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            🆘 Ask
          </button>
        </div>
      )}

      {!isWin && (
        <LetterBank
          letters={bankLetters}
          usedIndices={usedBankIndices}
          onSelectLetter={handleSelectLetter}
          disabled={isWin}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 glass gradient-correct text-white px-5 py-2.5
                       rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(16,185,129,0.3)] animate-slide-up z-50">
          {toast}
        </div>
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

      {showBlurModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
             onClick={() => setShowBlurModal(false)}>
          <div className="glass rounded-2xl p-6 mx-6 max-w-[320px] w-full flex flex-col items-center gap-4 animate-bounce-in"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold text-text">Reveal the image? 🌫️</h3>
            <p className="text-text-muted text-sm text-center">
              Reduce the blur to reveal more of the image
            </p>
            <p className="text-text-muted text-xs">
              (1 use only)
            </p>
            <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
              {state.blurPacks > 0 ? (
                <>
                  <span>📦</span>
                  <span className="text-correct font-bold text-sm">You have {state.blurPacks} blur pack{state.blurPacks > 1 ? "s" : ""}</span>
                </>
              ) : (
                <>
                  <span>🪙</span>
                  <span className="text-gold-light font-bold text-sm">This costs 60 coins ({state.coins} available)</span>
                </>
              )}
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowBlurModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-text-muted font-semibold text-sm
                           hover:border-white/20 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmBlurHint}
                disabled={blurUsed || (state.blurPacks <= 0 && state.coins < 60)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer active:scale-95
                           ${!blurUsed && (state.blurPacks > 0 || state.coins >= 60)
                  ? "gradient-primary text-white shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:opacity-90"
                  : "bg-white/[0.03] text-text-muted/30 cursor-not-allowed"}`}
              >
                {state.blurPacks > 0 ? "Use Pack ✨" : "Yes — 60 coins"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMysteryIntro && (
        <MysteryIntroOverlay onDone={() => { setShowMysteryIntro(false); startTimeRef.current = Date.now(); }} />
      )}

      {showBossIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: "linear-gradient(180deg, rgba(15,5,5,0.97), rgba(40,10,10,0.97))" }}>
          <div className="flex flex-col items-center gap-5 px-6 animate-bounce-in">
            <span className="text-6xl">⚔️</span>
            <h2 className="text-3xl font-extrabold text-wrong text-center"
                style={{ textShadow: "0 0 30px rgba(239,68,68,0.6)" }}>
              BOSS LEVEL
            </h2>
            <div className="glass rounded-2xl p-4 max-w-[280px]">
              <p className="text-text-muted text-sm text-center leading-relaxed">
                No blur. Just the image.<br />
                Can you figure out who this is?
              </p>
            </div>
            <p className="text-wrong/60 text-xs font-bold">+30 bonus coins if you solve it!</p>
            <button
              onClick={() => { setShowBossIntro(false); startTimeRef.current = Date.now(); }}
              className="px-10 py-4 rounded-2xl font-extrabold text-base text-white
                         active:scale-95 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #DC2626, #991B1B)",
                boxShadow: "0 6px 30px rgba(220,38,38,0.4)",
              }}
            >
              TAP TO START
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes welcomeSlide {
          0% { opacity: 0; transform: translateY(-30px); }
          12% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
