import { useState, useEffect, useRef } from "react";
import AvatarDisplay from "../AvatarDisplay";

export default function DuelBetAnimation({ playerName, opponentName, playerAvatar, opponentAvatar, playerNameColor, playerCoins, entryFee, winPot, onDeductCoins, onDone }) {
  const [stage, setStage] = useState(0);
  const [displayCoins, setDisplayCoins] = useState(playerCoins);
  const [showPot, setShowPot] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const firedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const deductedRef = useRef(false);

  useEffect(() => {
    // Stage 0: cards slide in (0ms)
    // Stage 1: coins tick down (500ms)
    // Stage 2: pot appears (1600ms)
    // Stage 3: title appears (2200ms)
    // Done: fire callback (3200ms)

    const t1 = setTimeout(() => setStage(1), 500);
    const t2 = setTimeout(() => {
      setShowPot(true);
      setStage(2);
    }, 1600);
    const t3 = setTimeout(() => {
      setShowTitle(true);
      setStage(3);
    }, 2200);
    const t4 = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        onDoneRef.current();
      }
    }, 3200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // Coin tick-down animation
  useEffect(() => {
    if (stage < 1) return;
    if (deductedRef.current) return;
    deductedRef.current = true;

    onDeductCoins();

    const target = playerCoins - entryFee;
    const steps = 12;
    const interval = 80;
    let step = 0;

    const id = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayCoins(Math.round(playerCoins - entryFee * progress));
      if (step >= steps) {
        clearInterval(id);
        setDisplayCoins(target);
      }
    }, interval);

    return () => clearInterval(id);
  }, [stage, playerCoins, entryFee, onDeductCoins]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: "linear-gradient(180deg, rgba(15,15,26,0.97), rgba(30,15,60,0.97))" }}>
      <div className="flex flex-col items-center gap-5 w-full max-w-[340px] px-4">

        {/* Player card */}
        <div className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-500"
             style={{
               background: "rgba(124,58,237,0.12)",
               border: "1px solid rgba(124,58,237,0.3)",
               boxShadow: "0 0 20px rgba(124,58,237,0.15)",
               transform: stage >= 0 ? "translateX(0)" : "translateX(-100%)",
               opacity: stage >= 0 ? 1 : 0,
             }}>
          <AvatarDisplay avatarId={playerAvatar} size="duel" />
          <div className="flex-1">
            <p className="font-extrabold text-base" style={{ color: playerNameColor || "#F1F5F9" }}>{playerName}</p>
            <div className="flex items-center gap-2">
              <span className="text-gold-light font-bold text-sm">
                {displayCoins} &#x1FA99;
              </span>
              {stage >= 1 && (
                <span className="text-wrong font-extrabold text-xs animate-bounce-in">
                  -{entryFee}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* VS + Pot center */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#x2694;&#xFE0F;</span>
            <span className="text-white font-extrabold text-3xl tracking-wider"
                  style={{ textShadow: "0 0 30px rgba(245,158,11,0.5)" }}>
              VS
            </span>
            <span className="text-2xl">&#x2694;&#xFE0F;</span>
          </div>

          {showPot && (
            <div className="flex flex-col items-center gap-1 animate-bounce-in">
              <div className="rounded-full px-6 py-2 flex items-center gap-2"
                   style={{
                     background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.15))",
                     border: "2px solid rgba(245,158,11,0.5)",
                     boxShadow: "0 0 24px rgba(245,158,11,0.3)",
                   }}>
                <span className="text-2xl">&#x1F3C6;</span>
                <span className="text-gold-light font-extrabold text-2xl">{winPot}</span>
                <span className="text-lg">&#x1FA99;</span>
              </div>
              <p className="text-gold-light/70 text-xs font-semibold">Winner takes {winPot} coins!</p>
            </div>
          )}

          {showTitle && (
            <p className="text-white font-extrabold text-xl tracking-wide animate-fade-in mt-1"
               style={{ textShadow: "0 0 20px rgba(139,92,246,0.6)" }}>
              DUEL BEGINS!
            </p>
          )}
        </div>

        {/* Opponent card */}
        <div className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-500"
             style={{
               background: "rgba(245,158,11,0.08)",
               border: "1px solid rgba(245,158,11,0.3)",
               boxShadow: "0 0 20px rgba(245,158,11,0.1)",
               transform: stage >= 0 ? "translateX(0)" : "translateX(100%)",
               opacity: stage >= 0 ? 1 : 0,
             }}>
          <AvatarDisplay avatarId={opponentAvatar} size="duel" />
          <div className="flex-1">
            <p className="text-white font-extrabold text-base">{opponentName}</p>
            <div className="flex items-center gap-2">
              <span className="text-gold-light font-bold text-sm">
                ??? &#x1FA99;
              </span>
              {stage >= 1 && (
                <span className="text-wrong font-extrabold text-xs animate-bounce-in">
                  -{entryFee}
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
