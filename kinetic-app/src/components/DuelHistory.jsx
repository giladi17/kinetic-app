import { useState, useEffect } from "react";
import { getDuelHistory } from "../utils/duelHistoryService";
import AvatarDisplay from "./AvatarDisplay";

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DuelHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDuelHistory(20).then((h) => {
      setHistory(h);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h3 className="text-base font-extrabold text-text mb-3 px-1 flex items-center gap-2">
        <span className="text-lg">{"\u{2694}\uFE0F"}</span> Duel History
      </h3>

      {loading ? (
        <p className="text-text-muted text-sm text-center py-4">Loading...</p>
      ) : history.length === 0 ? (
        <div className="text-center py-6 flex flex-col items-center gap-2">
          <span className="text-3xl">{"\u{2694}\uFE0F"}</span>
          <p className="text-text-muted text-sm">No duels yet. Challenge someone!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {history.map((entry) => (
            <div key={entry.id}
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                 style={{
                   background: entry.result === "win"
                     ? "rgba(16,185,129,0.06)"
                     : "rgba(239,68,68,0.06)",
                   border: entry.result === "win"
                     ? "1px solid rgba(16,185,129,0.15)"
                     : "1px solid rgba(239,68,68,0.15)",
                 }}>
              <AvatarDisplay avatarId={entry.opponentAvatar || "robot"} size="topbar" />
              <div className="flex-1 min-w-0">
                <p className="text-text font-bold text-sm truncate">{entry.opponent}</p>
                <p className="text-[10px] text-text-muted">
                  {entry.mode === "word" ? "Word Duel" : "Celebrity"} {"\u00B7"} {formatDate(entry.date)}
                </p>
              </div>
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                entry.result === "win"
                  ? "bg-correct/20 text-correct"
                  : "bg-wrong/20 text-wrong"
              }`}>
                {entry.result === "win" ? "WIN" : "LOSE"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
