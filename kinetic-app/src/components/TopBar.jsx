import { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { getWorld, isBossLevel, isMysteryLevel } from "../data/worlds";
import AvatarDisplay from "./AvatarDisplay";
import { getPlayerTitle } from "../data/titles";
import { subscribeIncomingRequests } from "../utils/friendService";
import InfoModal from "./Footer";

export default function TopBar() {
  const { state, dispatch, levels } = useGame();
  const [coinGlow, setCoinGlow] = useState(false);
  const [coinBounce, setCoinBounce] = useState(false);
  const prevCoins = useRef(state.coins);
  const [friendReqCount, setFriendReqCount] = useState(0);
  const [infoOpen, setInfoOpen] = useState(null);

  useEffect(() => {
    const unsub = subscribeIncomingRequests((reqs) => setFriendReqCount(Object.keys(reqs).length));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (state.coins > prevCoins.current) {
      setCoinGlow(true);
      setCoinBounce(true);
      const glowTimer = setTimeout(() => setCoinGlow(false), 1500);
      const bounceTimer = setTimeout(() => setCoinBounce(false), 400);
      prevCoins.current = state.coins;
      return () => { clearTimeout(glowTimer); clearTimeout(bounceTimer); };
    }
    prevCoins.current = state.coins;
  }, [state.coins]);

  return (
    <div className="flex flex-col items-center w-full gap-1 pt-2 pb-1 relative">
      <h1
        className="text-xl font-extrabold tracking-tight text-gradient-primary"
        style={{ textShadow: "0 0 20px rgba(139,92,246,0.3)" }}
      >
        WhoOops!
      </h1>
      <div className="flex items-center justify-between px-4 py-1 w-full">
        <div className="flex flex-col items-start gap-1">
          <button
            onClick={() => dispatch({ type: "SET_SCREEN", screen: "levels" })}
            className="glass rounded-full px-4 py-1.5 cursor-pointer hover:border-primary/30 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span className="text-text font-bold text-sm tracking-wide">
              {getWorld(state.currentLevel).emoji} World {getWorld(state.currentLevel).id} — Level {state.currentLevel} / {levels.length}
            </span>
            {isBossLevel(state.currentLevel) && (
              <span className="text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded"
                    style={{ background: "linear-gradient(135deg, #DC2626, #991B1B)" }}>
                ⚔️ BOSS
              </span>
            )}
            {isMysteryLevel(state.currentLevel) && (
              <span className="text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded"
                    style={{ background: "linear-gradient(135deg, #EAB308, #CA8A04)" }}>
                ⚡ MYSTERY
              </span>
            )}
          </button>
          <div className="animate-pulse-glow rounded-full px-3 py-0.5 text-[10px] font-bold text-white"
               style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            🔥 New levels added weekly!
          </div>
        </div>

        <div className={`flex items-center gap-1 glass rounded-full px-3 py-1.5
                        transition-all duration-500 ${coinGlow ? "shadow-[0_0_20px_rgba(245,158,11,0.5)] border-gold/40" : ""}`}>
          <span className="text-lg">🪙</span>
          <span
            className="text-gold-light font-bold text-sm transition-all duration-500"
            style={coinBounce
              ? { transform: "scale(1.3)", transition: "transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)" }
              : coinGlow
                ? { transform: "scale(1.1)", transition: "transform 0.3s ease-out" }
                : { transform: "scale(1)", transition: "transform 0.3s ease-out" }
            }
          >
            {state.coins}
          </span>
          <button
            onClick={() => dispatch({ type: "TOGGLE_SHOP" })}
            className="min-w-[28px] h-[28px] rounded-full flex items-center justify-center
                       gradient-gold text-white text-sm font-extrabold
                       shadow-[0_0_12px_rgba(245,158,11,0.4)]
                       hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ml-1"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => dispatch({ type: "SET_SCREEN", screen: "profile" })}
            className="hover:scale-105 transition-all cursor-pointer active:scale-95 flex flex-col items-center gap-0.5 relative"
          >
            <AvatarDisplay avatarId={state.selectedAvatar} size="topbar" />
            {friendReqCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center
                             text-[9px] font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)", boxShadow: "0 0 8px rgba(239,68,68,0.5)" }}>
                {friendReqCount}
              </span>
            )}
            <span className="text-[8px] font-bold text-primary-light/70 leading-none">
              {getPlayerTitle(state.completedLevels.length).emoji} {getPlayerTitle(state.completedLevels.length).name}
            </span>
          </button>
          <button
            onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
            className="glass w-9 h-9 rounded-full flex items-center justify-center
                       hover:border-primary/30 transition-all text-base cursor-pointer active:scale-95"
          >
            ⚙️
          </button>
          <button
            onClick={() => setInfoOpen((v) => v ? null : "menu")}
            className="glass w-7 h-7 rounded-full flex items-center justify-center
                       hover:border-primary/30 transition-all text-xs cursor-pointer active:scale-95 text-text-muted/60 hover:text-text-muted"
          >
            ⓘ
          </button>
        </div>
      </div>

      {infoOpen === "menu" && (
        <div className="absolute top-full right-4 mt-1 z-50 glass rounded-xl py-1.5 min-w-[160px] animate-fade-in"
             style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <button onClick={() => setInfoOpen("privacy")}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-text hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center gap-2">
            <span className="text-sm">🔒</span> Privacy Policy
          </button>
          <button onClick={() => setInfoOpen("how")}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-text hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center gap-2">
            <span className="text-sm">❓</span> How to Play
          </button>
        </div>
      )}

      <InfoModal open={infoOpen === "privacy" ? "privacy" : infoOpen === "how" ? "how" : null}
                 onClose={() => setInfoOpen(null)} />

    </div>
  );
}
