import { useState } from "react";
import { useGame } from "../context/GameContext";
import { BACKGROUNDS } from "../data/profileCustomization";

export default function BackgroundPicker() {
  const { state, dispatch } = useGame();
  const [confirmBg, setConfirmBg] = useState(null);

  const handleTap = (bg) => {
    if (state.unlockedBgs.includes(bg.id)) {
      dispatch({ type: "SELECT_BG", bgId: bg.id });
    } else {
      setConfirmBg(bg);
    }
  };

  const handleConfirm = () => {
    if (!confirmBg) return;
    dispatch({ type: "UNLOCK_BG", bgId: confirmBg.id, cost: confirmBg.cost });
    setConfirmBg(null);
  };

  return (
    <>
      <div>
        <h3 className="text-base font-extrabold text-text mb-3 px-1">Profile Background</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {BACKGROUNDS.map((bg) => {
            const isUnlocked = state.unlockedBgs.includes(bg.id);
            const isSelected = state.selectedBg === bg.id;

            return (
              <button
                key={bg.id}
                onClick={() => handleTap(bg)}
                className={`relative rounded-xl p-3 flex flex-col items-center gap-1.5 cursor-pointer
                           active:scale-90 transition-all duration-200
                           ${!isUnlocked ? "opacity-50" : ""}
                           ${isSelected ? "ring-2 ring-correct ring-offset-2 ring-offset-[#0f0f1a]" : ""}`}
                style={{
                  background: bg.gradient,
                  border: isSelected ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="w-8 h-8 rounded-full" style={{ background: bg.preview, opacity: 0.8 }} />
                <span className="text-[10px] font-bold text-text">{bg.name}</span>
                {!isUnlocked && (
                  <div className="absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold text-white flex items-center gap-0.5"
                       style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                    {bg.cost} {"\u{1FA99}"}
                  </div>
                )}
                {isSelected && (
                  <div className="absolute -bottom-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold text-white bg-correct">
                    {"\u2713"}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {confirmBg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
             onClick={() => setConfirmBg(null)}>
          <div className="rounded-3xl p-6 flex flex-col items-center gap-4 w-[300px] animate-bounce-in"
               style={{ background: "linear-gradient(135deg, rgba(30,20,60,0.98), rgba(15,15,26,0.98))", border: "2px solid rgba(255,255,255,0.15)" }}
               onClick={(e) => e.stopPropagation()}>
            <div className="w-full h-20 rounded-xl" style={{ background: confirmBg.gradient }} />
            <h3 className="text-xl font-extrabold text-text">{confirmBg.name}</h3>
            <p className="text-text-muted text-sm text-center">
              Unlock for <span className="text-gold-light font-extrabold">{confirmBg.cost} {"\u{1FA99}"}</span>?
            </p>
            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-text-muted text-xs">Balance:</span>
              <span className={`font-extrabold text-sm ${state.coins >= confirmBg.cost ? "text-correct" : "text-wrong"}`}>
                {state.coins} {"\u{1FA99}"}
              </span>
            </div>
            {state.coins < confirmBg.cost && (
              <p className="text-wrong text-xs font-semibold">Need {confirmBg.cost - state.coins} more coins.</p>
            )}
            <div className="flex gap-3 w-full">
              <button onClick={() => setConfirmBg(null)}
                      className="flex-1 py-3 rounded-xl glass text-text-muted font-semibold text-sm cursor-pointer active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={state.coins < confirmBg.cost}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer active:scale-95 transition-all
                        ${state.coins >= confirmBg.cost ? "text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)]" : "bg-white/[0.03] text-text-muted/30 cursor-not-allowed"}`}
                      style={state.coins >= confirmBg.cost ? { background: "linear-gradient(135deg, #F59E0B, #D97706)" } : {}}>
                Unlock {confirmBg.cost} {"\u{1FA99}"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
