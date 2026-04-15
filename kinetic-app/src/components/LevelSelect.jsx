import { useState, useEffect, useRef, useMemo } from "react";
import { useGame } from "../context/GameContext";
import Confetti from "./Confetti";
import CoinFlyAnimation from "./CoinFlyAnimation";
import { playCoinSound, playUnlockSound } from "../utils/sounds";
import { WORLD_THEMES, LEVELS_PER_WORLD } from "../data/worlds";

function getWorldTheme(index) {
  const t = WORLD_THEMES[index % WORLD_THEMES.length];
  return { ...t, gradient: t.cssGradient };
}

export default function LevelSelect() {
  const { state, dispatch, levels } = useGame();
  const [toast, setToast] = useState("");
  const [expandedWorld, setExpandedWorld] = useState(null);
  const [animatedBars, setAnimatedBars] = useState(false);
  const worldRefs = useRef({});

  const [unlockAnimPhase, setUnlockAnimPhase] = useState(-1);
  const [unlockWorldIndex, setUnlockWorldIndex] = useState(null);
  const [showNewBadge, setShowNewBadge] = useState(null);
  const [coinFlyTrigger, setCoinFlyTrigger] = useState(0);

  const completed = state.completedLevels;
  const currentUnlocked = state.currentLevel;
  const completedCount = completed.length;

  const totalWorlds = Math.ceil(levels.length / LEVELS_PER_WORLD);

  const currentWorldIndex = Math.floor((currentUnlocked - 1) / LEVELS_PER_WORLD);

  const sparkles = useMemo(() => {
    if (unlockWorldIndex === null) return [];
    return Array.from({ length: 14 }, () => ({
      left: 35 + Math.random() * 30,
      top: 25 + Math.random() * 50,
      size: 3 + Math.random() * 5,
      dx: (Math.random() - 0.5) * 100,
      dy: (Math.random() - 0.5) * 100,
      duration: 0.4 + Math.random() * 0.6,
      delay: Math.random() * 0.3,
    }));
  }, [unlockWorldIndex]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedBars(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (unlockAnimPhase < 0) {
      setExpandedWorld(currentWorldIndex);
    }
  }, [currentWorldIndex, unlockAnimPhase]);

  useEffect(() => {
    if (expandedWorld !== null && worldRefs.current[expandedWorld] && unlockAnimPhase < 0) {
      worldRefs.current[expandedWorld].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [expandedWorld, unlockAnimPhase]);

  useEffect(() => {
    if (state.worldJustUnlocked === null || state.worldJustUnlocked === undefined) return;

    const idx = state.worldJustUnlocked;
    setUnlockWorldIndex(idx);
    setExpandedWorld(null);
    setUnlockAnimPhase(0);

    setTimeout(() => {
      if (worldRefs.current[idx]) {
        worldRefs.current[idx].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    const timers = [
      setTimeout(() => setUnlockAnimPhase(1), 500),
      setTimeout(() => setUnlockAnimPhase(2), 1500),
      setTimeout(() => { setUnlockAnimPhase(3); playUnlockSound(); }, 2000),
      setTimeout(() => setUnlockAnimPhase(4), 2500),
      setTimeout(() => setUnlockAnimPhase(5), 3000),
      setTimeout(() => { setUnlockAnimPhase(6); setCoinFlyTrigger((t) => t + 1); playCoinSound(); }, 3500),
      setTimeout(() => {
        setUnlockAnimPhase(-1);
        setUnlockWorldIndex(null);
        setShowNewBadge(idx);
        dispatch({ type: "CLEAR_WORLD_UNLOCK" });
        setExpandedWorld(idx);
        setTimeout(() => setShowNewBadge(null), 5000);
      }, 5000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [state.worldJustUnlocked, dispatch]);

  const handleTapLevel = (level) => {
    if (level.id === currentUnlocked) {
      dispatch({ type: "GO_TO_LEVEL", level: level.id });
    } else if (completed.includes(level.id)) {
      setToast("Already completed! ✅");
      setTimeout(() => setToast(""), 2000);
    } else {
      setToast("Complete previous levels to unlock 🔒");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const worlds = Array.from({ length: totalWorlds }, (_, i) => {
    const start = i * LEVELS_PER_WORLD;
    const end = Math.min(start + LEVELS_PER_WORLD, levels.length);
    const worldLevels = levels.slice(start, end);
    const worldCompleted = worldLevels.filter((l) => completed.includes(l.id)).length;
    const isWorldActive = currentUnlocked >= start + 1 && currentUnlocked <= end;
    const isWorldCompleted = worldCompleted === worldLevels.length;
    const isWorldLocked = currentUnlocked < start + 1;
    const previousWorldIndex = i - 1;
    const theme = getWorldTheme(i);
    return { index: i, levels: worldLevels, completedCount: worldCompleted, total: worldLevels.length, isActive: isWorldActive, isCompleted: isWorldCompleted, isLocked: isWorldLocked, previousWorldIndex, theme, start, end };
  });

  return (
    <div className="flex flex-col gap-4 px-3 py-4 animate-fade-in pb-24 min-h-screen"
         style={{ background: "linear-gradient(180deg, #1a0533 0%, #0a0a1a 40%, #0d1025 100%)" }}>

      {unlockAnimPhase >= 0 && (
        <div className="fixed inset-0 z-40 pointer-events-none"
             style={{ background: "rgba(0, 0, 0, 0.7)", transition: "opacity 0.5s", opacity: 1 }} />
      )}

      <div className="flex items-center justify-center gap-3 mb-1">
        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold"
             style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", color: "#A78BFA" }}>
          ⭐ {completedCount} / {levels.length} completed
        </div>
        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold"
             style={{ background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", color: "#93C5FD" }}>
          🌍 World {currentWorldIndex + 1}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {worlds.map((world) => {
          const { theme, index, isLocked, isCompleted, isActive, completedCount: wCompleted, total } = world;
          const isExpanded = expandedWorld === index;
          const progressPct = animatedBars ? Math.round((wCompleted / total) * 100) : 0;
          const isUnlockTarget = unlockWorldIndex === index && unlockAnimPhase >= 0;

          if (isUnlockTarget) {
            const stillLocked = unlockAnimPhase < 3;
            return (
              <div key={index}
                   ref={(el) => (worldRefs.current[index] = el)}
                   className="rounded-3xl overflow-hidden relative"
                   style={{
                     background: stillLocked
                       ? "rgba(15, 15, 30, 0.8)"
                       : `linear-gradient(135deg, ${theme.glowSoft}, rgba(15, 15, 30, 0.9))`,
                     border: stillLocked
                       ? "1px solid rgba(255,255,255,0.05)"
                       : `2px solid ${theme.color}`,
                     zIndex: 50,
                     boxShadow: !stillLocked ? `0 0 40px ${theme.glow}, 0 0 80px ${theme.glowSoft}` : "none",
                     transition: "all 0.5s ease-out",
                   }}>
                <div className="flex flex-col items-center justify-center py-10 gap-3 relative">
                  {stillLocked && (
                    <span className="text-5xl" style={{
                      display: "inline-block",
                      animation: unlockAnimPhase === 1 ? "lock-shake 0.3s ease-in-out infinite"
                               : unlockAnimPhase === 2 ? "lock-crack 0.15s ease-in-out infinite"
                               : "none",
                    }}>
                      🔒
                    </span>
                  )}

                  {unlockAnimPhase === 3 && (
                    <span className="text-5xl absolute" style={{
                      animation: "lock-break 0.5s ease-out forwards",
                      top: "2rem",
                    }}>
                      🔒
                    </span>
                  )}

                  {!stillLocked && (
                    <div style={{ animation: "world-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}>
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                           style={{ background: theme.gradient, boxShadow: `0 4px 24px ${theme.glow}` }}>
                        {theme.emoji}
                      </div>
                    </div>
                  )}

                  {unlockAnimPhase >= 2 && unlockAnimPhase <= 4 && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {sparkles.map((s, i) => (
                        <div key={i} className="absolute rounded-full" style={{
                          left: `${s.left}%`,
                          top: `${s.top}%`,
                          width: s.size,
                          height: s.size,
                          background: theme.color,
                          boxShadow: `0 0 8px ${theme.color}`,
                          "--dx": `${s.dx}px`,
                          "--dy": `${s.dy}px`,
                          animation: `sparkle-burst ${s.duration}s ease-out ${s.delay}s forwards`,
                        }} />
                      ))}
                    </div>
                  )}

                  <p className="text-base font-bold" style={{
                    color: stillLocked ? "rgba(255,255,255,0.3)" : theme.color,
                    transition: "color 0.5s",
                  }}>
                    World {index + 1} — {theme.name} {theme.emoji}
                  </p>

                  {stillLocked && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                      Complete World {index} to unlock
                    </p>
                  )}

                  {unlockAnimPhase >= 4 && (
                    <p className="text-2xl font-extrabold text-white" style={{
                      animation: "text-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                      textShadow: `0 0 20px ${theme.glow}, 0 2px 10px rgba(0,0,0,0.5)`,
                    }}>
                      🌍 World {index + 1} Unlocked!
                    </p>
                  )}
                </div>
              </div>
            );
          }

          if (isLocked) {
            return (
              <div key={index}
                   ref={(el) => (worldRefs.current[index] = el)}
                   className="rounded-3xl overflow-hidden transition-all duration-300"
                   style={{
                     background: "rgba(15, 15, 30, 0.8)",
                     border: "1px solid rgba(255,255,255,0.05)",
                     opacity: 0.5,
                   }}>
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <span className="text-4xl">🔒</span>
                  <p className="text-base font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
                    World {index + 1} — {theme.name} {theme.emoji}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Complete World {index} to unlock
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={index}
                 ref={(el) => (worldRefs.current[index] = el)}
                 className="rounded-3xl overflow-hidden transition-all duration-300"
                 style={{
                   background: `linear-gradient(135deg, ${theme.glowSoft}, rgba(15, 15, 30, 0.9))`,
                   border: `1px solid ${isActive ? theme.color + "60" : theme.color + "30"}`,
                   boxShadow: isActive ? `0 0 30px ${theme.glowSoft}, 0 4px 20px rgba(0,0,0,0.3)` : "0 4px 20px rgba(0,0,0,0.2)",
                 }}>

              <button
                onClick={() => setExpandedWorld(isExpanded ? null : index)}
                className="w-full px-4 py-4 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform duration-150">

                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                     style={{ background: theme.gradient, boxShadow: `0 4px 16px ${theme.glow}` }}>
                  {theme.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white truncate">
                      World {index + 1} — {theme.name}
                    </h3>
                    {isCompleted && <span className="text-sm">✅</span>}
                    {isActive && !isCompleted && <span className="text-sm">▶️</span>}
                    {showNewBadge === index && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                            style={{
                              background: theme.gradient,
                              animation: "pulse-badge 1.5s ease-in-out infinite",
                              boxShadow: `0 0 8px ${theme.glow}`,
                            }}>
                        NEW!
                      </span>
                    )}
                  </div>

                  <div className="w-full h-2 rounded-full mt-1.5 overflow-hidden"
                       style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all duration-1000 ease-out"
                         style={{
                           width: `${progressPct}%`,
                           background: theme.gradient,
                           boxShadow: progressPct > 0 ? `0 0 8px ${theme.glow}` : "none",
                         }} />
                  </div>
                  <p className="text-xs mt-1 font-semibold" style={{ color: theme.color }}>
                    {wCompleted} / {total}
                  </p>
                </div>

                <div className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
                     style={{
                       background: isCompleted ? "rgba(16, 185, 129, 0.2)" : isActive ? theme.glowSoft : "rgba(255,255,255,0.05)",
                       color: isCompleted ? "#34D399" : isActive ? theme.color : "rgba(255,255,255,0.4)",
                       border: `1px solid ${isCompleted ? "rgba(16, 185, 129, 0.3)" : isActive ? theme.color + "40" : "rgba(255,255,255,0.08)"}`,
                     }}>
                  {isCompleted ? "Done ✅" : isActive ? "Playing ▶" : `${wCompleted}/${total}`}
                </div>

                <span className="text-white/40 text-lg transition-transform duration-300 shrink-0"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                  ▼
                </span>
              </button>

              <div className="transition-all duration-400 ease-in-out overflow-hidden"
                   style={{
                     maxHeight: isExpanded ? `${Math.ceil(total / 2) * 300 + 40}px` : "0px",
                     opacity: isExpanded ? 1 : 0,
                   }}>
                <div className="grid grid-cols-2 gap-2.5 px-3 pb-4">
                  {world.levels.map((level) => {
                    const isLevelCompleted = completed.includes(level.id);
                    const isLevelCurrent = level.id === currentUnlocked;
                    const isLevelLocked = !isLevelCompleted && !isLevelCurrent;

                    return (
                      <button
                        key={level.id}
                        onClick={() => handleTapLevel(level)}
                        className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 active:scale-95 aspect-square flex flex-col items-center justify-end"
                        style={{
                          border: isLevelCompleted
                            ? "2px solid rgba(16, 185, 129, 0.6)"
                            : isLevelCurrent
                              ? `2px solid ${theme.color}`
                              : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isLevelCompleted
                            ? "0 0 16px rgba(16, 185, 129, 0.25)"
                            : isLevelCurrent
                              ? `0 0 20px ${theme.glow}, 0 0 40px ${theme.glowSoft}`
                              : "none",
                          opacity: isLevelLocked ? 0.45 : 1,
                          animation: isLevelCurrent ? "pulse-glow-world 2s ease-in-out infinite" : "none",
                          "--glow-color": theme.glow,
                          "--glow-soft": theme.glowSoft,
                        }}>

                        {isLevelCompleted && level.image ? (
                          <img src={level.image} alt={level.answer}
                               className="absolute inset-0 w-full h-full object-cover"
                               onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center"
                               style={{ background: isLevelLocked ? "rgba(10,10,20,0.9)" : `linear-gradient(135deg, rgba(20,20,40,0.95), ${theme.glowSoft})` }}>
                            {isLevelLocked ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-2xl">🔒</span>
                                <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
                                  Level {level.id}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-3xl">{level.emoji}</span>
                                <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>
                                  Level {level.id}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {isLevelCompleted && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
                               style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                            ✓
                          </div>
                        )}

                        {isLevelCurrent && !isLevelCompleted && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="px-3 py-1.5 rounded-full text-white font-bold text-xs shadow-lg"
                                 style={{ background: theme.gradient, boxShadow: `0 4px 16px ${theme.glow}` }}>
                              Play ▶
                            </div>
                          </div>
                        )}

                        {isLevelCompleted && (
                          <div className="absolute top-1.5 left-1.5 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white"
                               style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
                            {level.id}
                          </div>
                        )}

                        {isLevelCompleted && (
                          <div className="relative z-10 w-full px-1.5 pb-1.5">
                            <p className="text-white text-[10px] font-bold text-center truncate drop-shadow-lg">
                              {level.answer}
                            </p>
                          </div>
                        )}

                        {isLevelCurrent && !isLevelCompleted && (
                          <div className="absolute inset-0 rounded-2xl levels-shimmer-active" style={{ "--shimmer-color": theme.color + "30" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {unlockAnimPhase >= 5 && <Confetti />}
      <CoinFlyAnimation trigger={coinFlyTrigger} />

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 glass text-white px-5 py-2.5
                       rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.3)] animate-slide-up z-50">
          {toast}
        </div>
      )}

      <style>{`
        @keyframes lock-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-8px) rotate(-10deg); }
          75% { transform: translateX(8px) rotate(10deg); }
        }
        @keyframes lock-crack {
          0%, 100% { transform: translateX(0) rotate(0deg) scale(1); }
          20% { transform: translateX(-4px) rotate(-6deg) scale(1.08); }
          40% { transform: translateX(5px) rotate(7deg) scale(1.12); }
          60% { transform: translateX(-6px) rotate(-5deg) scale(1.08); }
          80% { transform: translateX(4px) rotate(4deg) scale(1.12); }
        }
        @keyframes lock-break {
          0% { transform: scale(1); opacity: 1; }
          30% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(2.5) rotate(20deg); opacity: 0; }
        }
        @keyframes world-reveal {
          0% { transform: scale(0) rotate(-20deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes sparkle-burst {
          0% { transform: scale(0) translate(0, 0); opacity: 1; }
          100% { transform: scale(1.5) translate(var(--dx), var(--dy)); opacity: 0; }
        }
        @keyframes text-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
