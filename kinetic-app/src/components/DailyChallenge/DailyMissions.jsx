import { useState } from "react";
import { useGame } from "../../context/GameContext";
import {
  getDailyMissions,
  getMissionProgress,
  getClaimedMissions,
  claimMission,
} from "../../data/missions";

export default function DailyMissions() {
  const { dispatch } = useGame();
  const [missions] = useState(() => getDailyMissions());
  const [progress, setProgress] = useState(() => getMissionProgress());
  const [claimed, setClaimed] = useState(() => getClaimedMissions());
  const [claimAnim, setClaimAnim] = useState(null);

  const handleClaim = (mission) => {
    if (claimed.includes(mission.id)) return;
    claimMission(mission.id);
    dispatch({ type: "ADD_COINS", amount: mission.reward });
    setClaimed((prev) => [...prev, mission.id]);
    setClaimAnim(mission.id);
    setTimeout(() => setClaimAnim(null), 1200);
  };

  const refreshProgress = () => setProgress(getMissionProgress());

  return (
    <div className="w-full max-w-[360px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-extrabold text-text flex items-center gap-2">
          <span className="text-lg">{"\u{1F3AF}"}</span> Daily Missions
        </h3>
        <span className="text-[10px] text-text-muted font-semibold px-2 py-0.5 rounded-full glass-light">
          Resets at midnight
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {missions.map((mission) => {
          const current = progress[mission.trackKey] || 0;
          const isComplete = current >= mission.target;
          const isClaimed = claimed.includes(mission.id);
          const ratio = Math.min(1, current / mission.target);

          return (
            <div
              key={mission.id}
              className={`rounded-2xl p-3.5 transition-all duration-300 ${
                isClaimed ? "opacity-60" : ""
              }`}
              style={{
                background: isComplete && !isClaimed
                  ? "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))"
                  : "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02))",
                border: isComplete && !isClaimed
                  ? "1px solid rgba(16,185,129,0.3)"
                  : "1px solid rgba(124,58,237,0.15)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-text">{mission.label}</span>
                <span className="text-xs font-extrabold text-gold-light">
                  +{mission.reward} {"\u{1FA99}"}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete ? "bg-correct" : "bg-primary"
                  }`}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted font-semibold">
                  {Math.min(current, mission.target)} / {mission.target}
                </span>

                {isClaimed ? (
                  <span className="text-xs font-bold text-correct flex items-center gap-1">
                    {"\u2713"} Claimed
                  </span>
                ) : isComplete ? (
                  <button
                    onClick={() => handleClaim(mission)}
                    className="px-4 py-1.5 rounded-full text-xs font-bold text-white cursor-pointer
                               active:scale-90 transition-all shadow-[0_2px_12px_rgba(245,158,11,0.3)]"
                    style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
                  >
                    {claimAnim === mission.id ? "+{0} \u{1FA99}".replace("{0}", mission.reward) : `Claim ${mission.reward} \u{1FA99}`}
                  </button>
                ) : (
                  <span className="text-[11px] text-text-muted/50 font-semibold">In progress</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
