import { useState } from "react";
import { useGame } from "../context/GameContext";
import { AVATARS, getAvatarById, getRarityBorderColor, getRarityGlow, getAvatarRarity } from "../data/avatars";

const RARITY_LABELS = {
  free: { label: "Free", color: "text-text-muted" },
  rare: { label: "Rare", color: "text-blue-400" },
  epic: { label: "Epic", color: "text-purple-400" },
  legendary: { label: "Legendary", color: "text-gold-light" },
};

export default function AvatarPicker() {
  const { state, dispatch } = useGame();
  const [confirmAvatar, setConfirmAvatar] = useState(null);

  const handleTapAvatar = (avatar) => {
    if (state.unlockedAvatars.includes(avatar.id)) {
      dispatch({ type: "SELECT_AVATAR", avatarId: avatar.id });
    } else {
      setConfirmAvatar(avatar);
    }
  };

  const handleConfirmPurchase = () => {
    if (!confirmAvatar) return;
    dispatch({ type: "UNLOCK_AVATAR", avatarId: confirmAvatar.id, cost: confirmAvatar.cost });
    setConfirmAvatar(null);
  };

  return (
    <>
      <div>
        <h3 className="text-base font-extrabold text-text mb-3 px-1">Avatars</h3>
        <div className="grid grid-cols-5 gap-2.5">
          {AVATARS.map((avatar) => {
            const isUnlocked = state.unlockedAvatars.includes(avatar.id);
            const isSelected = state.selectedAvatar === avatar.id;
            const borderColor = getRarityBorderColor(avatar.cost);
            const glow = getRarityGlow(avatar.cost);

            return (
              <button
                key={avatar.id}
                onClick={() => handleTapAvatar(avatar)}
                className="relative flex flex-col items-center gap-1 cursor-pointer active:scale-90 transition-all duration-200"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200
                             ${!isUnlocked ? "grayscale opacity-50" : ""}
                             ${isSelected ? "scale-110 ring-2 ring-correct ring-offset-2 ring-offset-[#0f0f1a]" : ""}`}
                  style={{
                    border: `2.5px solid ${isSelected ? "#10B981" : borderColor}`,
                    boxShadow: isSelected ? "0 0 16px rgba(16,185,129,0.4)" : isUnlocked ? glow : "none",
                    background: isSelected
                      ? "rgba(16,185,129,0.12)"
                      : isUnlocked
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.02)",
                  }}
                >
                  {avatar.emoji}
                </div>

                <span className="text-[10px] font-bold text-text-muted truncate max-w-[56px]">
                  {avatar.name}
                </span>

                {!isUnlocked && (
                  <div
                    className="absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold text-white flex items-center gap-0.5"
                    style={{
                      background: "linear-gradient(135deg, #F59E0B, #D97706)",
                      boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
                    }}
                  >
                    {avatar.cost} <span className="text-[8px]">{"\u{1FA99}"}</span>
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

      {confirmAvatar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setConfirmAvatar(null)}
        >
          <div
            className="rounded-3xl p-6 flex flex-col items-center gap-4 w-[300px] animate-bounce-in"
            style={{
              background: "linear-gradient(135deg, rgba(30,20,60,0.98), rgba(15,15,26,0.98))",
              border: `2px solid ${getRarityBorderColor(confirmAvatar.cost)}`,
              boxShadow: `0 0 40px ${getRarityBorderColor(confirmAvatar.cost)}, 0 20px 60px rgba(0,0,0,0.5)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-5xl"
              style={{
                border: `3px solid ${getRarityBorderColor(confirmAvatar.cost)}`,
                boxShadow: getRarityGlow(confirmAvatar.cost),
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {confirmAvatar.emoji}
            </div>

            <div className="text-center">
              <h3 className="text-xl font-extrabold text-text">{confirmAvatar.name}</h3>
              <p className={`text-xs font-bold mt-0.5 ${RARITY_LABELS[getAvatarRarity(confirmAvatar.cost)]?.color}`}>
                {RARITY_LABELS[getAvatarRarity(confirmAvatar.cost)]?.label}
              </p>
            </div>

            <p className="text-text-muted text-sm text-center">
              Unlock <span className="text-text font-bold">{confirmAvatar.name}</span> for{" "}
              <span className="text-gold-light font-extrabold">{confirmAvatar.cost} {"\u{1FA99}"}</span>?
            </p>

            <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-text-muted text-xs">Your balance:</span>
              <span className={`font-extrabold text-sm ${state.coins >= confirmAvatar.cost ? "text-correct" : "text-wrong"}`}>
                {state.coins} {"\u{1FA99}"}
              </span>
            </div>

            {state.coins < confirmAvatar.cost && (
              <p className="text-wrong text-xs font-semibold">
                Not enough coins! Need {confirmAvatar.cost - state.coins} more.
              </p>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmAvatar(null)}
                className="flex-1 py-3 rounded-xl glass text-text-muted font-semibold text-sm
                           border-white/10 hover:border-white/20 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={state.coins < confirmAvatar.cost}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer active:scale-95
                           ${state.coins >= confirmAvatar.cost
                    ? "text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)]"
                    : "bg-white/[0.03] text-text-muted/30 cursor-not-allowed"}`}
                style={state.coins >= confirmAvatar.cost ? {
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                } : {}}
              >
                Unlock {confirmAvatar.cost} {"\u{1FA99}"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
