import { useState, useEffect } from "react";
import Confetti from "../Confetti";
import AvatarDisplay from "../AvatarDisplay";

export default function DuelResult({ playerWon, playerScore, opponentScore, playerName, opponentName, playerAvatar, opponentAvatar, playerNameColor, record, levelData, wordDuelName, duelMode, isMultiplayer, rematchPending, rematchMessage, onRematch, onCancelRematch, onExit }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 50),
      setTimeout(() => setPhase(2), 250),
      setTimeout(() => setPhase(3), 500),
      setTimeout(() => setPhase(4), 750),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6 flex-1 animate-fade-in">
      {playerWon && <Confetti />}

      {phase >= 1 && (
        <div className="flex flex-col items-center gap-2 animate-bounce-in">
          <span className="text-7xl">{playerWon ? "🏆" : "😤"}</span>
          <h2
            className="text-4xl font-extrabold text-center"
            style={{
              color: playerWon ? "#FBBF24" : "#F1F5F9",
              textShadow: playerWon
                ? "0 0 30px rgba(245,158,11,0.6), 0 0 60px rgba(245,158,11,0.2)"
                : "none",
            }}
          >
            {playerWon ? "CHAMPION!" : "Good Game!"}
          </h2>
        </div>
      )}

      {phase >= 2 && (
        <div className="glass rounded-2xl p-5 w-full max-w-[300px] flex flex-col gap-4 animate-slide-up">
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <AvatarDisplay avatarId={playerAvatar} size="duel" />
              <span className="text-sm font-bold" style={{ color: playerNameColor || "#F1F5F9" }}>{playerName}</span>
              <span
                className="text-5xl font-extrabold"
                style={{ color: playerWon ? "#10B981" : "#EF4444" }}
              >
                {playerScore}
              </span>
            </div>
            <span className="text-2xl text-text-muted font-bold">—</span>
            <div className="flex flex-col items-center gap-1">
              <AvatarDisplay avatarId={opponentAvatar} size="duel" />
              <span className="text-text-muted text-sm font-bold">{opponentName}</span>
              <span
                className="text-5xl font-extrabold"
                style={{ color: !playerWon ? "#10B981" : "#EF4444" }}
              >
                {opponentScore}
              </span>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex items-center justify-between">
            <span className="text-text-muted text-sm">{duelMode === "word" ? "Word Duel" : "Celebrity"}</span>
            <span className="text-primary-light font-bold text-sm">
              {duelMode === "word"
                ? `${wordDuelName?.celebrity || "Word Duel"}`
                : `${levelData?.original || ""} ${levelData?.emoji || ""}`}
            </span>
          </div>
        </div>
      )}

      {phase >= 3 && (
        <div className="flex flex-col items-center gap-3 animate-bounce-in">
          {isMultiplayer ? (
            <div className={`glass rounded-2xl px-6 py-3 flex items-center gap-3
                            ${playerWon ? "ring-1 ring-gold/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : ""}`}>
              <span className="text-2xl">🪙</span>
              <span className="text-gradient-gold text-2xl font-extrabold">
                {playerWon ? "+100 coins" : "0 coins"}
              </span>
            </div>
          ) : (
            <div className="glass rounded-2xl px-6 py-3 flex items-center gap-3">
              <span className="text-lg">🎮</span>
              <span className="text-text-muted text-sm font-semibold">Practice mode — no coins</span>
            </div>
          )}

          <div className="glass rounded-xl px-5 py-3 flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-correct font-extrabold text-lg">{record.wins}</span>
              <span className="text-text-muted text-[10px] font-semibold">WINS</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-wrong font-extrabold text-lg">{record.losses}</span>
              <span className="text-text-muted text-[10px] font-semibold">LOSSES</span>
            </div>
          </div>
        </div>
      )}

      {phase >= 4 && (
        <div className="flex flex-col gap-3 w-full max-w-[280px] animate-slide-up">
          {rematchPending ? (
            <div className="w-full py-4 rounded-xl flex flex-col items-center gap-2"
                 style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <span className="text-gold-light font-bold text-sm animate-pulse">
                Waiting for opponent...
              </span>
              <button onClick={onCancelRematch}
                      className="text-text-muted text-xs cursor-pointer hover:text-text transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onRematch}
              className="w-full py-4 rounded-xl font-extrabold text-lg text-white cursor-pointer
                         active:scale-95 transition-all duration-200
                         shadow-[0_4px_24px_rgba(245,158,11,0.3)]"
              style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
            >
              Rematch ⚡
            </button>
          )}
          {rematchMessage && (
            <p className="text-text-muted text-xs text-center font-semibold">{rematchMessage}</p>
          )}
          <button
            onClick={onExit}
            className="w-full py-3 rounded-xl glass text-text-muted font-semibold text-sm
                       border-white/10 hover:border-white/20 active:scale-95 transition-all cursor-pointer"
          >
            Back to Menu
          </button>
        </div>
      )}

    </div>
  );
}
