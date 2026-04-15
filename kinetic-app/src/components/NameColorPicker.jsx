import { useState } from "react";
import { useGame } from "../context/GameContext";
import { USERNAME_COLORS } from "../data/profileCustomization";

export default function NameColorPicker() {
  const { state, dispatch } = useGame();
  const [confirmColor, setConfirmColor] = useState(null);

  const handleTap = (c) => {
    if (state.unlockedNameColors.includes(c.id)) {
      dispatch({ type: "SELECT_NAME_COLOR", colorId: c.id });
    } else {
      setConfirmColor(c);
    }
  };

  const handleConfirm = () => {
    if (!confirmColor) return;
    dispatch({ type: "UNLOCK_NAME_COLOR", colorId: confirmColor.id, cost: confirmColor.cost });
    setConfirmColor(null);
  };

  return (
    <>
      <div>
        <h3 className="text-base font-extrabold text-text mb-3 px-1">Username Color</h3>
        <div className="grid grid-cols-4 gap-2.5">
          {USERNAME_COLORS.map((c) => {
            const isUnlocked = state.unlockedNameColors.includes(c.id);
            const isSelected = state.selectedNameColor === c.id;

            return (
              <button
                key={c.id}
                onClick={() => handleTap(c)}
                className={`relative rounded-xl p-2.5 flex flex-col items-center gap-1 cursor-pointer
                           active:scale-90 transition-all duration-200
                           ${!isUnlocked ? "opacity-50" : ""}
                           ${isSelected ? "ring-2 ring-correct ring-offset-2 ring-offset-[#0f0f1a]" : ""}`}
                style={{
                  background: isSelected ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                  border: isSelected ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span className="text-base font-extrabold" style={{ color: c.color }}>Aa</span>
                <span className="text-[9px] font-bold text-text-muted">{c.name}</span>
                {!isUnlocked && (
                  <div className="absolute -top-1 -right-1 rounded-full px-1 py-0.5 text-[8px] font-extrabold text-white"
                       style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                    {c.cost}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {confirmColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
             style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
             onClick={() => setConfirmColor(null)}>
          <div className="rounded-3xl p-6 flex flex-col items-center gap-4 w-[300px] animate-bounce-in"
               style={{ background: "linear-gradient(135deg, rgba(30,20,60,0.98), rgba(15,15,26,0.98))", border: "2px solid rgba(255,255,255,0.15)" }}
               onClick={(e) => e.stopPropagation()}>
            <span className="text-4xl font-extrabold" style={{ color: confirmColor.color }}>Player</span>
            <h3 className="text-xl font-extrabold text-text">{confirmColor.name}</h3>
            <p className="text-text-muted text-sm text-center">
              Unlock for <span className="text-gold-light font-extrabold">{confirmColor.cost} {"\u{1FA99}"}</span>?
            </p>
            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-text-muted text-xs">Balance:</span>
              <span className={`font-extrabold text-sm ${state.coins >= confirmColor.cost ? "text-correct" : "text-wrong"}`}>
                {state.coins} {"\u{1FA99}"}
              </span>
            </div>
            {state.coins < confirmColor.cost && (
              <p className="text-wrong text-xs font-semibold">Need {confirmColor.cost - state.coins} more coins.</p>
            )}
            <div className="flex gap-3 w-full">
              <button onClick={() => setConfirmColor(null)}
                      className="flex-1 py-3 rounded-xl glass text-text-muted font-semibold text-sm cursor-pointer active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={state.coins < confirmColor.cost}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer active:scale-95 transition-all
                        ${state.coins >= confirmColor.cost ? "text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)]" : "bg-white/[0.03] text-text-muted/30 cursor-not-allowed"}`}
                      style={state.coins >= confirmColor.cost ? { background: "linear-gradient(135deg, #F59E0B, #D97706)" } : {}}>
                Unlock {confirmColor.cost} {"\u{1FA99}"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
