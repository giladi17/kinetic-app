import { useState, useEffect, useRef, useCallback } from "react";
import LEVELS from "../data/levels";
import LetterBoxes from "./LetterBoxes";
import LetterBank from "./LetterBank";
import Confetti from "./Confetti";
import { playCorrectLetter, playWrongLetter, playWinSound } from "../utils/sounds";
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

export default function ChallengeScreen({ levelNumber, friendTime, isNewUser, onPlayFullGame }) {
  const levelData = LEVELS[levelNumber - 1];

  const [phase, setPhase] = useState(isNewUser ? "tutorial" : "intro");
  const [tutorialStep, setTutorialStep] = useState(0);
  const [bankLetters, setBankLetters] = useState([]);
  const [placedLetters, setPlacedLetters] = useState([]);
  const [usedBankIndices, setUsedBankIndices] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [liveTimer, setLiveTimer] = useState(0);
  const [solveTime, setSolveTime] = useState(null);
  const [imgError, setImgError] = useState(false);

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const placedRef = useRef(placedLetters);
  const usedRef = useRef(usedBankIndices);
  const bankRef = useRef(bankLetters);

  placedRef.current = placedLetters;
  usedRef.current = usedBankIndices;
  bankRef.current = bankLetters;

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  if (!levelData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
           style={{ background: "linear-gradient(135deg, #1a1033 0%, #0f0f1a 100%)" }}>
        <span className="text-5xl">🤷</span>
        <p className="text-white text-xl font-bold text-center">Level {levelNumber} not found</p>
        <button onClick={onPlayFullGame}
                className="px-8 py-3 rounded-2xl text-white font-bold active:scale-95 transition-all cursor-pointer"
                style={{ background: "linear-gradient(135deg, #7C3AED, #F59E0B)" }}>
          Play WhoOops! →
        </button>
      </div>
    );
  }

  const answer = levelData.answer;
  const answerNoSpaces = answer.replace(/\s/g, "");

  const startChallenge = () => {
    const bank = generateLetterBank(answer, levelData);
    setBankLetters(bank);
    bankRef.current = bank;
    setPlacedLetters(new Array(answerNoSpaces.length).fill(null));
    setUsedBankIndices([]);
    setPhase("playing");
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setLiveTimer(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 200);
  };

  const handleWin = () => {
    const time = Math.round((Date.now() - startTimeRef.current) / 1000);
    setSolveTime(time);
    setIsWin(true);
    clearInterval(timerRef.current);
    playWinSound();
    setPhase("result");
  };

  const handleSelectLetter = (bankIdx) => {
    if (isWin) return;
    const bank = bankRef.current;

    setPlacedLetters((prev) => {
      const nextEmpty = prev.findIndex((l) => l === null);
      if (nextEmpty === -1) return prev;

      const newPlaced = [...prev];
      newPlaced[nextEmpty] = bank[bankIdx];

      setUsedBankIndices((prevUsed) => [...prevUsed, bankIdx]);
      playCorrectLetter();

      const allFilled = newPlaced.every((l) => l !== null);
      if (allFilled) {
        const attempt = newPlaced.join("");
        if (attempt === answerNoSpaces) {
          setTimeout(() => handleWin(), 100);
        } else {
          playWrongLetter();
          setFlashRed(true);
          setShaking(true);
          setTimeout(() => {
            setFlashRed(false);
            setShaking(false);
            setPlacedLetters(new Array(answerNoSpaces.length).fill(null));
            setUsedBankIndices([]);
          }, 600);
        }
      }

      return newPlaced;
    });
  };

  const handleRemoveLetter = (boxIdx) => {
    setPlacedLetters((prev) => {
      const letter = prev[boxIdx];
      if (!letter) return prev;
      const newPlaced = [...prev];
      newPlaced[boxIdx] = null;

      setUsedBankIndices((prevUsed) => {
        const bank = bankRef.current;
        const idx = prevUsed.findIndex((bi) => bank[bi] === letter);
        if (idx === -1) return prevUsed;
        return [...prevUsed.slice(0, idx), ...prevUsed.slice(idx + 1)];
      });

      return newPlaced;
    });
  };

  // --- TUTORIAL PHASE (new users only) ---
  if (phase === "tutorial") {
    const tutorialCards = [
      {
        emoji: "🎭",
        title: "Welcome to WhoOops!",
        content: "Celebrity names are twisted with puns and wordplay. Your job: figure out the REAL name!",
        visual: (
          <div className="flex flex-col items-center gap-2 rounded-2xl px-6 py-4"
               style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span className="text-2xl font-extrabold tracking-wider text-white">
              ELON M<span style={{ color: "#EF4444", textShadow: "0 0 12px rgba(239,68,68,0.5)" }}>U</span>SK
            </span>
            <span className="text-white/40 text-sm">↓</span>
            <span className="text-2xl font-extrabold tracking-wider text-white">
              ELON M<span style={{ color: "#10B981", textShadow: "0 0 12px rgba(16,185,129,0.5)" }}>A</span>SK
            </span>
          </div>
        ),
      },
      {
        emoji: "🧩",
        title: "Spell the answer!",
        content: "Use the letter tiles to spell the correct celebrity name. Get it right to reveal the AI image and earn coins!",
        visual: (
          <div className="flex gap-2 justify-center">
            {["B", "R", "A", "D"].map((l, i) => (
              <div key={i} className="w-11 h-13 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                   style={{ background: "rgba(124,58,237,0.2)", border: "2px solid rgba(124,58,237,0.5)" }}>
                {l}
              </div>
            ))}
          </div>
        ),
      },
    ];

    const card = tutorialCards[tutorialStep];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
           style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0F0F1A 100%)" }}>
        <div className="flex flex-col items-center gap-6 animate-fade-in max-w-[360px] w-full">
          <span className="text-6xl">{card.emoji}</span>
          <h1 className="text-2xl font-extrabold text-white text-center">{card.title}</h1>
          {card.visual}
          <p className="text-white/60 text-sm text-center leading-relaxed max-w-[280px]">
            {card.content}
          </p>

          <div className="flex gap-2.5 mt-2">
            {tutorialCards.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${
                i === tutorialStep ? "w-8 h-2.5" : "w-2.5 h-2.5 bg-white/15"
              }`}
              style={i === tutorialStep ? { background: "linear-gradient(135deg, #7C3AED, #9333EA)" } : {}} />
            ))}
          </div>

          <button onClick={() => {
                    if (tutorialStep < tutorialCards.length - 1) {
                      setTutorialStep(tutorialStep + 1);
                    } else {
                      setPhase("intro");
                    }
                  }}
                  className="w-full max-w-[280px] py-4 rounded-2xl text-white font-extrabold text-base
                             active:scale-95 transition-all cursor-pointer"
                  style={{
                    background: tutorialStep < tutorialCards.length - 1
                      ? "linear-gradient(135deg, #7C3AED, #9333EA)"
                      : "linear-gradient(135deg, #7C3AED, #F59E0B)",
                    boxShadow: "0 6px 30px rgba(124,58,237,0.35)",
                  }}>
            {tutorialStep < tutorialCards.length - 1 ? "Next →" : "Got it! Let's go! 🚀"}
          </button>

          {tutorialStep < tutorialCards.length - 1 && (
            <button onClick={() => setPhase("intro")}
                    className="text-white/25 text-xs hover:text-white/50 transition-colors cursor-pointer">
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- INTRO PHASE ---
  if (phase === "intro") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
           style={{ background: "linear-gradient(180deg, #1a1033 0%, #0f0f1a 50%, #0d1025 100%)" }}>
        <div className="flex flex-col items-center gap-5 animate-fade-in max-w-[360px] w-full">
          <span className="text-6xl">🎯</span>
          <h1 className="text-3xl font-extrabold text-white text-center">
            Challenge!
          </h1>

          <div className="w-full rounded-2xl p-5 flex flex-col items-center gap-3"
               style={{
                 background: "rgba(124,58,237,0.1)",
                 border: "1px solid rgba(124,58,237,0.3)",
               }}>
            <p className="text-white/70 text-sm text-center">Your friend solved</p>
            <p className="text-white text-xl font-extrabold">Level {levelNumber}</p>
            {friendTime > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏱️</span>
                <span className="text-2xl font-extrabold" style={{ color: "#FBBF24" }}>
                  {friendTime} seconds
                </span>
              </div>
            )}
          </div>

          <p className="text-white/60 text-base font-semibold text-center">
            Can you beat {friendTime > 0 ? "their time" : "them"}?
          </p>

          <button onClick={startChallenge}
                  className="w-full py-4 rounded-2xl text-white font-extrabold text-lg
                             active:scale-95 transition-all cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED, #F59E0B)",
                    boxShadow: "0 6px 30px rgba(124,58,237,0.35), 0 6px 30px rgba(245,158,11,0.2)",
                  }}>
            Start Challenge ▶
          </button>
        </div>
      </div>
    );
  }

  // --- RESULT PHASE ---
  if (phase === "result") {
    const won = friendTime > 0 && solveTime < friendTime;
    const tied = friendTime > 0 && solveTime === friendTime;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6"
           style={{ background: "linear-gradient(180deg, #1a1033 0%, #0f0f1a 50%, #0d1025 100%)" }}>
        <Confetti />

        <div className="flex flex-col items-center gap-5 animate-fade-in max-w-[360px] w-full">
          {won ? (
            <>
              <span className="text-6xl">🏆</span>
              <h2 className="text-2xl font-extrabold text-white text-center">You beat your friend!</h2>
            </>
          ) : tied ? (
            <>
              <span className="text-6xl">🤝</span>
              <h2 className="text-2xl font-extrabold text-white text-center">It's a tie!</h2>
            </>
          ) : friendTime > 0 ? (
            <>
              <span className="text-6xl">😅</span>
              <h2 className="text-2xl font-extrabold text-white text-center">Your friend wins!</h2>
            </>
          ) : (
            <>
              <span className="text-6xl">🎉</span>
              <h2 className="text-2xl font-extrabold text-white text-center">Challenge Complete!</h2>
            </>
          )}

          <div className="w-full rounded-2xl p-5 flex flex-col items-center gap-3"
               style={{
                 background: "rgba(124,58,237,0.1)",
                 border: "1px solid rgba(124,58,237,0.3)",
               }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="text-xl font-extrabold text-white">
                Your time: {solveTime} second{solveTime !== 1 ? "s" : ""}
              </span>
            </div>
            {friendTime > 0 && (
              <div className="flex items-center gap-2 text-white/50">
                <span className="text-sm">👤</span>
                <span className="text-sm font-semibold">
                  Friend's time: {friendTime} second{friendTime !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <div className="w-full rounded-2xl p-4 flex items-center gap-3"
               style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {levelData.image && !imgError ? (
              <img src={levelData.image} alt={levelData.answer}
                   className="w-14 h-14 rounded-xl object-cover shrink-0"
                   onError={() => setImgError(true)} />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: `linear-gradient(135deg, ${levelData.bgColor}, #0F0F1A)` }}>
                <span className="text-2xl">{levelData.emoji}</span>
              </div>
            )}
            <div>
              <p className="text-white font-bold text-sm">{levelData.answer}</p>
              <p className="text-white/50 text-xs">{levelData.original}</p>
            </div>
          </div>

          <button onClick={onPlayFullGame}
                  className="w-full py-4 rounded-2xl text-white font-extrabold text-base
                             active:scale-95 transition-all cursor-pointer mt-2"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED, #F59E0B)",
                    boxShadow: "0 6px 30px rgba(124,58,237,0.35), 0 6px 30px rgba(245,158,11,0.2)",
                  }}>
            {isNewUser ? "Start playing WhoOops! →" : "Back to my game →"}
          </button>
        </div>
      </div>
    );
  }

  // --- PLAYING PHASE ---
  return (
    <div className="min-h-screen flex flex-col items-center gap-3 px-4 py-4"
         style={{ background: "linear-gradient(180deg, #1a1033 0%, #0f0f1a 50%, #0d1025 100%)" }}>

      {/* Timer bar */}
      <div className="w-full max-w-[340px] flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full"
             style={{
               background: "rgba(59, 130, 246, 0.15)",
               border: "1px solid rgba(59, 130, 246, 0.3)",
             }}>
          <span className="text-sm">⏱️</span>
          <span className="text-lg font-extrabold" style={{ color: "#93C5FD", minWidth: "36px", textAlign: "center" }}>
            {liveTimer}s
          </span>
        </div>
        {friendTime > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
               style={{
                 background: "rgba(245, 158, 11, 0.1)",
                 border: "1px solid rgba(245, 158, 11, 0.25)",
               }}>
            <span className="text-xs">🎯</span>
            <span className="text-xs font-bold" style={{ color: "#FBBF24" }}>
              Beat {friendTime}s
            </span>
          </div>
        )}
        <div className="px-3 py-1.5 rounded-full text-xs font-bold"
             style={{
               background: "rgba(124,58,237,0.15)",
               border: "1px solid rgba(124,58,237,0.3)",
               color: "#A78BFA",
             }}>
          Lvl {levelNumber}
        </div>
      </div>

      {/* Level info */}
      <h2 className="text-xl font-extrabold text-white text-center tracking-wide">
        {levelData.original}
      </h2>
      <p className="text-primary-light font-bold text-sm"
         style={{ textShadow: "0 0 12px rgba(139,92,246,0.3)" }}>
        But something is off... 🤔
      </p>
      <p className="text-text-muted font-medium text-center text-sm italic px-4 leading-snug">
        &ldquo;{stripEmoji(levelData.clue)}&rdquo;
      </p>

      {/* Image */}
      <div className="relative w-full aspect-square rounded-2xl max-w-[180px]
                       shadow-[0_0_24px_rgba(139,92,246,0.2)] ring-2 ring-primary/30">
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          {levelData.image && !imgError ? (
            <img src={levelData.image} alt="mystery"
                 className="w-full h-full object-cover"
                 style={{ filter: "blur(8px)", transform: "scale(1.15)" }}
                 onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
                 style={{
                   background: `linear-gradient(135deg, ${levelData.bgColor}, #0F0F1A)`,
                   filter: "blur(6px)",
                   transform: "scale(1.15)",
                 }}>
              <span className="text-[72px]">{levelData.emoji}</span>
            </div>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-4xl text-white/40 drop-shadow-lg">?</span>
        </div>
      </div>

      <LetterBoxes
        answer={answer}
        placedLetters={placedLetters}
        onRemoveLetter={handleRemoveLetter}
        isWin={isWin}
        shaking={shaking}
        flashRed={flashRed}
        greenSequence={null}
      />

      <LetterBank
        letters={bankLetters}
        usedIndices={usedBankIndices}
        onSelectLetter={handleSelectLetter}
        disabled={isWin}
      />
    </div>
  );
}
