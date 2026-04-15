import { useEffect } from "react";
import AvatarDisplay from "../AvatarDisplay";

export default function DuelRoundTransition({ roundNum, playerScore, opponentScore, playerName, opponentName, playerAvatar, opponentAvatar, playerNameColor, lastRoundWinner, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  const playerWonLast = lastRoundWinner === "player";

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-fade-in gap-5">
      <span className="text-6xl animate-bounce-in">{playerWonLast ? "🥊" : "😅"}</span>

      <h2 className="text-2xl font-extrabold text-white animate-bounce-in">
        {playerWonLast ? "You won this round!" : "Opponent won this round!"}
      </h2>

      <div className="flex items-center gap-6 animate-slide-up">
        <div className="flex flex-col items-center gap-1">
          <AvatarDisplay avatarId={playerAvatar} size="duelSmall" />
          <span className="text-xs font-semibold" style={{ color: playerNameColor || "#94a3b8" }}>{playerName}</span>
          <span className="text-4xl font-extrabold text-white">{playerScore}</span>
        </div>
        <span className="text-2xl text-text-muted font-bold">—</span>
        <div className="flex flex-col items-center gap-1">
          <AvatarDisplay avatarId={opponentAvatar} size="duelSmall" />
          <span className="text-text-muted text-xs font-semibold">{opponentName}</span>
          <span className="text-4xl font-extrabold text-white">{opponentScore}</span>
        </div>
      </div>

      <p className="text-gold-light font-semibold text-sm animate-pulse mt-2">
        Round {roundNum} starting...
      </p>
    </div>
  );
}
