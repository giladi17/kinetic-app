import { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import Confetti from "./Confetti";
import CoinFlyAnimation from "./CoinFlyAnimation";
import RewardedAdButton from "./RewardedAdButton";
import { playCoinSound, playWinSound } from "../utils/sounds";
import { isBossLevel, isMysteryLevel } from "../data/worlds";

function LetterDiff({ original, answer }) {
  const origLetters = original.replace(/\s/g, "").toUpperCase().split("");
  const ansLetters = answer.replace(/\s/g, "").split("");

  const origWords = original.split(" ");
  const ansWords = answer.split(" ");

  let oi = 0;
  const origParts = origWords.map((word) => {
    const letters = word.toUpperCase().split("").map((l) => {
      const idx = oi++;
      const changed = ansLetters[idx] !== l;
      return { letter: l, changed, type: "original" };
    });
    return letters;
  });

  let ai = 0;
  const ansParts = ansWords.map((word) => {
    const letters = word.split("").map((l) => {
      const idx = ai++;
      const changed = origLetters[idx] !== l;
      return { letter: l, changed, type: "answer" };
    });
    return letters;
  });

  const renderWord = (wordLetters) => (
    wordLetters.map((l, i) => (
      <span key={i} className={`font-extrabold ${
        l.changed
          ? l.type === "original" ? "text-wrong" : "text-correct"
          : "text-white/70"
      }`}>
        {l.letter}
      </span>
    ))
  );

  return (
    <div className="flex items-center gap-2 text-lg tracking-wide">
      <div className="flex gap-1">
        {origParts.map((word, wi) => (
          <span key={wi} className="flex">
            {wi > 0 && <span className="w-1.5" />}
            {renderWord(word)}
          </span>
        ))}
      </div>
      <span className="text-gold-light text-xl mx-1">→</span>
      <div className="flex gap-1">
        {ansParts.map((word, wi) => (
          <span key={wi} className="flex">
            {wi > 0 && <span className="w-1.5" />}
            {renderWord(word)}
          </span>
        ))}
      </div>
    </div>
  );
}

function AnimatedCounter({ target, duration = 800 }) {
  const [count, setCount] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return <span>+{count}</span>;
}

export default function WinScreen() {
  const { state, dispatch, currentLevelData, levels } = useGame();
  const isLastLevel = state.currentLevel >= levels.length;

  const [phase, setPhase] = useState(0);
  const [toast, setToast] = useState("");
  const [imgError, setImgError] = useState(false);
  const [coinFlyTrigger, setCoinFlyTrigger] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [adClaimed, setAdClaimed] = useState(false);

  const levelResult = state.levelResults[state.currentLevel] || {};
  const completedAt = levelResult.completedAt;
  const hintsUsed = levelResult.hintsUsed || 0;
  const wasSkipped = levelResult.skipped === true;
  const solveTime = levelResult.solveTimeSeconds || 0;
  const wrongAttempts = levelResult.wrongAttempts || 0;
  const isPerfect = hintsUsed === 0 && wrongAttempts === 0 && !wasSkipped;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 300),
      setTimeout(() => setPhase(3), 700),
      setTimeout(() => { setPhase(4); if (!wasSkipped) { setCoinFlyTrigger((t) => t + 1); if (state.soundOn) playCoinSound(); } }, 1100),
      setTimeout(() => setPhase(5), 1500),
    ];
    if (state.soundOn) playWinSound();
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (state.dailyBonusAwarded > 0) {
      const msg = state.dailyStreak === 7
        ? "+15 bonus coins! Week streak 🏆"
        : state.dailyStreak === 3
          ? "+5 bonus coins! 3 day streak 🔥"
          : null;
      if (msg) {
        setTimeout(() => { setToast(msg); setTimeout(() => setToast(""), 3000); }, 2500);
      }
    }
  }, []);

  const isBoss = isBossLevel(state.currentLevel);
  const isMystery = isMysteryLevel(state.currentLevel);
  const bossBonus = isBoss ? 20 : 0;
  const mysteryBonus = isMystery ? 15 : 0;
  const streakBonus = state.streak >= 3 ? 5 : 0;
  const perfectBonus = isPerfect ? 5 : 0;
  const dailyBonus = state.dailyBonusAwarded || 0;
  const multiplier = state.doubleCoinsLeft > 0 ? 2 : 1;
  const totalReward = (10 + streakBonus + bossBonus + mysteryBonus + perfectBonus + dailyBonus) * multiplier;

  const challengeUrl = `https://gilad-app.vercel.app?challenge=${state.currentLevel}&time=${solveTime}`;

  const generateShareCard = () => {
    return new Promise((resolve, reject) => {
      const W = 600, H = 700;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#7C3AED");
      grad.addColorStop(0.5, "#4F46E5");
      grad.addColorStop(1, "#3B82F6");
      ctx.fillStyle = grad;
      ctx.beginPath();
      const r = 32;
      ctx.moveTo(r, 0); ctx.lineTo(W - r, 0); ctx.quadraticCurveTo(W, 0, W, r);
      ctx.lineTo(W, H - r); ctx.quadraticCurveTo(W, H, W - r, H);
      ctx.lineTo(r, H); ctx.quadraticCurveTo(0, H, 0, H - r);
      ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.clip();

      const drawText = () => {
        ctx.textAlign = "center";

        ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText("🎯 WhoOops! Challenge", W / 2, 60);

        const boxY = imgLoaded ? 340 : 100;

        ctx.fillStyle = "rgba(255,255,255,0.15)";
        const bw = 340, bh = 60, bx = (W - bw) / 2, by = boxY;
        ctx.beginPath();
        ctx.moveTo(bx + 16, by); ctx.lineTo(bx + bw - 16, by); ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 16);
        ctx.lineTo(bx + bw, by + bh - 16); ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 16, by + bh);
        ctx.lineTo(bx + 16, by + bh); ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 16);
        ctx.lineTo(bx, by + 16); ctx.quadraticCurveTo(bx, by, bx + 16, by);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "600 22px system-ui, -apple-system, sans-serif";
        ctx.fillText(`Level ${state.currentLevel} - ${currentLevelData.original}`, W / 2, boxY + 38);

        ctx.fillStyle = "#FBBF24";
        ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
        ctx.fillText(`⏱️ My time: ${solveTime} sec`, W / 2, boxY + 110);

        if (isPerfect) {
          ctx.fillStyle = "#FCD34D";
          ctx.font = "600 22px system-ui, -apple-system, sans-serif";
          ctx.fillText("⭐ Perfect - No hints!", W / 2, boxY + 150);
        }

        const beatY = isPerfect ? boxY + 200 : boxY + 170;
        ctx.fillStyle = "white";
        ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
        ctx.fillText("Can you beat me? 👇", W / 2, beatY);

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "500 18px system-ui, -apple-system, sans-serif";
        ctx.fillText("gilad-app.vercel.app", W / 2, H - 30);

        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("toBlob failed")), "image/png");
      };

      let imgLoaded = false;
      if (currentLevelData.image) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imgLoaded = true;
          const size = 200, ix = (W - size) / 2, iy = 90, ir = 24;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(ix + ir, iy); ctx.lineTo(ix + size - ir, iy); ctx.quadraticCurveTo(ix + size, iy, ix + size, iy + ir);
          ctx.lineTo(ix + size, iy + size - ir); ctx.quadraticCurveTo(ix + size, iy + size, ix + size - ir, iy + size);
          ctx.lineTo(ix + ir, iy + size); ctx.quadraticCurveTo(ix, iy + size, ix, iy + size - ir);
          ctx.lineTo(ix, iy + ir); ctx.quadraticCurveTo(ix, iy, ix + ir, iy);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, ix, iy, size, size);
          ctx.restore();

          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(ix + ir, iy); ctx.lineTo(ix + size - ir, iy); ctx.quadraticCurveTo(ix + size, iy, ix + size, iy + ir);
          ctx.lineTo(ix + size, iy + size - ir); ctx.quadraticCurveTo(ix + size, iy + size, ix + size - ir, iy + size);
          ctx.lineTo(ix + ir, iy + size); ctx.quadraticCurveTo(ix, iy + size, ix, iy + size - ir);
          ctx.lineTo(ix, iy + ir); ctx.quadraticCurveTo(ix, iy, ix + ir, iy);
          ctx.closePath();
          ctx.stroke();

          drawText();
        };
        img.onerror = () => drawText();
        img.src = currentLevelData.image;
      } else {
        drawText();
      }
    });
  };

  const handleShare = async () => {
    setSharing(true);
    const fallbackText = `🎯 WhoOops! Challenge\nLevel ${state.currentLevel}\n⏱️ My time: ${solveTime} sec\n${isPerfect ? "⭐ Perfect - No hints!\n" : ""}Can you beat me? 👇\n${challengeUrl}`;
    try {
      const blob = await generateShareCard();
      const file = new File([blob], "whooops-challenge.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "WhoOops! Challenge",
          text: `Can you beat my time on Level ${state.currentLevel}?`,
          url: challengeUrl,
          files: [file],
        });
        setSharing(false);
        return;
      }

      if (navigator.share) {
        await navigator.share({ title: "WhoOops! Challenge", text: fallbackText, url: challengeUrl });
        setSharing(false);
        return;
      }

      await navigator.clipboard.writeText(fallbackText);
      setToast("Challenge link copied! 📋");
      setTimeout(() => setToast(""), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(fallbackText);
        setToast("Challenge link copied! 📋");
        setTimeout(() => setToast(""), 2500);
      } catch {}
    }
    setSharing(false);
  };

  const showImage = !!currentLevelData.image && !imgError;

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-4 pb-[120px] flex-1 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0"
           style={{ background: "linear-gradient(180deg, rgba(124,58,237,0.12) 0%, rgba(245,158,11,0.08) 50%, transparent 100%)" }} />

      {phase >= 1 && <Confetti />}
      <CoinFlyAnimation trigger={coinFlyTrigger} startY="55%" />

      {phase >= 1 && (
        <div className="relative z-10 text-center animate-bounce-in mt-2">
          <div className="flex justify-center">
            <LetterDiff original={currentLevelData.original} answer={currentLevelData.answer} />
          </div>
          <h2 className="font-extrabold text-transparent bg-clip-text leading-tight mt-2"
              style={{
                fontSize: "28px",
                backgroundImage: "linear-gradient(135deg, #FBBF24, #F59E0B, #D97706)",
                WebkitBackgroundClip: "text",
                filter: "drop-shadow(0 0 20px rgba(245,158,11,0.4))",
              }}>
            🎭 {currentLevelData.original.toUpperCase()}
          </h2>
        </div>
      )}

      {phase >= 2 && (
        <div className="relative z-10 animate-reveal-zoom">
          {showImage ? (
            <div className="mx-auto rounded-3xl"
                 style={{
                   width: "250px",
                   height: "250px",
                   border: "3px solid rgba(245,158,11,0.6)",
                   boxShadow: "0 0 40px rgba(245,158,11,0.25), 0 0 80px rgba(124,58,237,0.15), 0 12px 40px rgba(0,0,0,0.4)",
                   overflow: "hidden",
                 }}>
              <img src={currentLevelData.image} alt={currentLevelData.original}
                   className="w-full h-full object-cover block"
                   onError={() => setImgError(true)} />
            </div>
          ) : (
            <div className="mx-auto rounded-3xl flex flex-col items-center justify-center gap-3"
                 style={{
                   width: "250px", height: "250px",
                   background: `linear-gradient(135deg, ${currentLevelData.bgColor}, #0F0F1A)`,
                   border: "3px solid rgba(245,158,11,0.6)",
                   boxShadow: "0 0 40px rgba(245,158,11,0.25), 0 12px 40px rgba(0,0,0,0.4)",
                 }}>
              <span className="text-[80px]">{currentLevelData.emoji}</span>
            </div>
          )}
        </div>
      )}

      {phase >= 3 && (
        <p className="relative z-10 text-white/80 text-sm font-semibold text-center italic animate-fade-in">
          &ldquo;{currentLevelData.punchline}&rdquo;
        </p>
      )}

      {/* Solve time */}
      {phase >= 3 && !wasSkipped && solveTime > 0 && (
        <div className="relative z-10 animate-fade-in">
          <span className="text-sm font-bold px-4 py-1.5 rounded-full"
                style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  color: "#93C5FD",
                }}>
            ⏱️ Solved in {solveTime} sec! ⚡
          </span>
        </div>
      )}

      {/* Perfect label */}
      {phase >= 4 && isPerfect && !wasSkipped && (
        <div className="relative z-10 animate-bounce-in">
          <span className="text-sm font-extrabold px-4 py-1.5 rounded-full text-white"
                style={{
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  boxShadow: "0 0 20px rgba(245,158,11,0.4)",
                }}>
            ⭐ Perfect! No hints!
          </span>
        </div>
      )}

      {phase >= 4 && isBoss && !wasSkipped && (
        <div className="relative z-10 animate-bounce-in">
          <span className="text-sm font-extrabold px-4 py-1.5 rounded-full text-white"
                style={{
                  background: "linear-gradient(135deg, #DC2626, #991B1B)",
                  boxShadow: "0 0 20px rgba(220,38,38,0.4)",
                }}>
            ⚔️ BOSS DEFEATED!
          </span>
        </div>
      )}

      {phase >= 4 && isMystery && !wasSkipped && (
        <div className="relative z-10 animate-bounce-in">
          <span className="text-sm font-extrabold px-4 py-1.5 rounded-full text-white"
                style={{
                  background: "linear-gradient(135deg, #EAB308, #CA8A04)",
                  boxShadow: "0 0 20px rgba(234,179,8,0.4)",
                }}>
            ⚡ MYSTERY SOLVED!
          </span>
        </div>
      )}

      {phase >= 4 && !wasSkipped && (
        <div className="relative z-10 flex flex-col items-center gap-1.5 animate-bounce-in">
          <div className="rounded-2xl px-8 py-3 flex items-center gap-3"
               style={{
                 background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))",
                 border: "1px solid rgba(245,158,11,0.3)",
                 boxShadow: "0 0 24px rgba(245,158,11,0.15)",
               }}>
            <span className="text-3xl">🪙</span>
            <span className="text-3xl font-extrabold text-gradient-gold">
              <AnimatedCounter target={totalReward} />
            </span>
            <span className="text-gold-light/70 text-base font-bold">coins</span>
          </div>
          {multiplier > 1 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full gradient-gold text-white animate-pulse">
              2x DOUBLE COINS ACTIVE
            </span>
          )}
          {isPerfect && (
            <span className="font-semibold text-xs animate-fade-in flex items-center gap-1"
                  style={{ color: "#FBBF24" }}>
              ⭐ Perfect Bonus: +5 extra coins
            </span>
          )}
          {isBoss && (
            <span className="text-wrong font-semibold text-xs animate-fade-in flex items-center gap-1">
              ⚔️ Boss bonus: +20 extra coins
            </span>
          )}
          {isMystery && (
            <span className="font-semibold text-xs animate-fade-in flex items-center gap-1"
                  style={{ color: "#FBBF24" }}>
              ⚡ Mystery bonus: +15 extra coins
            </span>
          )}
          {state.streak >= 3 && (
            <span className="text-primary-light font-semibold text-xs animate-fade-in flex items-center gap-1">
              🔥 {state.streak} in a row! (+5 bonus)
            </span>
          )}
        </div>
      )}
      {phase >= 4 && wasSkipped && (
        <div className="relative z-10 flex flex-col items-center gap-1.5 animate-bounce-in">
          <div className="rounded-2xl px-6 py-3 flex items-center gap-2"
               style={{
                 background: "rgba(255,255,255,0.05)",
                 border: "1px solid rgba(255,255,255,0.15)",
               }}>
            <span className="text-2xl">⏭️</span>
            <span className="text-lg font-extrabold text-text-muted">Level Skipped</span>
          </div>
          <span className="text-text-muted/60 text-xs font-semibold">-150 coins</span>
        </div>
      )}

      {phase >= 4 && !wasSkipped && (
        <div className="relative z-10 flex gap-2.5 w-full max-w-[320px] animate-fade-in">
          <div className="flex-1 glass-light rounded-2xl py-2.5 px-2 flex flex-col items-center gap-0.5">
            <span className="text-sm">💡</span>
            <span className="text-base font-extrabold text-text">{hintsUsed}</span>
            <span className="text-[9px] text-text-muted font-semibold">Hints</span>
          </div>
          <div className="flex-1 glass-light rounded-2xl py-2.5 px-2 flex flex-col items-center gap-0.5">
            <span className="text-sm">🔥</span>
            <span className="text-base font-extrabold text-text">{state.streak}</span>
            <span className="text-[9px] text-text-muted font-semibold">Streak</span>
          </div>
          <div className="flex-1 glass-light rounded-2xl py-2.5 px-2 flex flex-col items-center gap-0.5">
            <span className="text-sm">📅</span>
            <span className="text-base font-extrabold text-text">{state.dailyStreak}d</span>
            <span className="text-[9px] text-text-muted font-semibold">Daily</span>
          </div>
        </div>
      )}

      {phase >= 5 && (
        <div className="relative z-10 flex flex-col gap-3 w-full max-w-[300px] animate-slide-up">
          {!isLastLevel ? (
            <button onClick={() => dispatch({ type: "NEXT_LEVEL" })}
                    className="w-full py-4 rounded-2xl text-white font-extrabold text-base
                               active:scale-95 transition-all duration-200 cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #F59E0B)",
                      boxShadow: "0 6px 30px rgba(124,58,237,0.35), 0 6px 30px rgba(245,158,11,0.2)",
                    }}>
              Next Level ▶
            </button>
          ) : (
            <div className="text-center text-text-muted font-semibold py-3">
              🎉 You completed all levels! More coming soon!
            </div>
          )}
          <button onClick={handleShare}
                  disabled={sharing}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white
                             active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
                    border: "1px solid rgba(124,58,237,0.5)",
                    boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
                    opacity: sharing ? 0.7 : 1,
                  }}>
            {sharing ? "Generating..." : "🎯 Challenge a Friend 📤"}
          </button>

          {!adClaimed && (
            <RewardedAdButton
              label="Watch Ad for Bonus"
              rewardAmount={50}
              className="w-full"
              onReward={(coins) => {
                dispatch({ type: "ADD_COINS", amount: coins });
                setCoinFlyTrigger((t) => t + 1);
                if (state.soundOn) playCoinSound();
                setAdClaimed(true);
              }}
            />
          )}
          {adClaimed && (
            <div className="w-full py-3 rounded-2xl text-center text-sm font-bold text-correct/70"
                 style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              ✅ Bonus claimed!
            </div>
          )}
        </div>
      )}


      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 glass gradient-correct text-white px-6 py-3
                       rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(16,185,129,0.3)] animate-fade-in z-50">
          ✅ {toast}
        </div>
      )}
    </div>
  );
}
