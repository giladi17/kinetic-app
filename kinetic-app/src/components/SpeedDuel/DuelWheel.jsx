import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import DUEL_LEVELS from "../../data/duelLevels";

const LEVELS = DUEL_LEVELS;

const ITEM_HEIGHT = 56;

export default function DuelWheel({ onSelect, excludeIds = [], forcedLevel = null, forcedTarget = null, customLevels = null }) {
  const excludeKey = excludeIds.join(",");
  const sourcePool = customLevels || LEVELS;
  const availableLevels = useMemo(
    () => customLevels
      ? sourcePool.filter((l) => !excludeIds.includes(l.celebrity))
      : sourcePool.filter((l) => !excludeIds.includes(l.id)),
    [excludeKey, customLevels]
  );
  const wheelNames = useMemo(
    () => customLevels
      ? availableLevels.map((l) => ({ name: l.celebrity, emoji: "🔤" }))
      : availableLevels.map((l) => ({ name: l.original, emoji: l.emoji })),
    [availableLevels, customLevels]
  );
  const len = wheelNames.length;

  const [offset, setOffset] = useState(0);
  const [spinning, setSpinning] = useState(true);
  const [selected, setSelected] = useState(null);
  const [landed, setLanded] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [titlePulse, setTitlePulse] = useState(false);

  const audioCtxRef = useRef(null);
  const animRef = useRef(null);
  const startTime = useRef(null);
  const lastTickIdx = useRef(-1);
  const offsetRef = useRef(0);
  const levelsRef = useRef(availableLevels);
  levelsRef.current = availableLevels;

  const computedTarget = useMemo(() => {
    if (forcedLevel) {
      const idx = availableLevels.findIndex((l) =>
        (forcedLevel.id && l.id === forcedLevel.id) ||
        (forcedLevel.original && l.original === forcedLevel.original) ||
        (forcedLevel.celebrity && l.celebrity === forcedLevel.celebrity)
      );
      if (idx >= 0) return idx;
    }
    if (forcedTarget != null && forcedTarget < len) return forcedTarget;
    return Math.floor(Math.random() * availableLevels.length);
  }, [forcedTarget, forcedLevel, availableLevels, len]);

  const targetIdx = useRef(computedTarget);
  const totalItems = useRef(2 * len + targetIdx.current);
  const totalDistance = useRef(totalItems.current * ITEM_HEIGHT);
  const duration = useRef(5500 + Math.random() * 1000);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {}
    }
    return audioCtxRef.current;
  }, []);

  const playTick = useCallback((progress) => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const freq = progress < 0.7 ? 800 : 1000 + progress * 400;
      const vol = 0.04 + progress * 0.08;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }, [getAudioCtx]);

  const playWinSound = useCallback(() => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      [0, 0.12, 0.24].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime([523, 659, 784][i], ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    } catch {}
  }, [getAudioCtx]);

  useEffect(() => {
    startTime.current = performance.now();
    const dist = totalDistance.current;
    const dur = duration.current;
    const target = targetIdx.current;
    const levels = levelsRef.current;

    const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

    const animate = (now) => {
      const elapsed = now - startTime.current;
      const rawProgress = Math.min(elapsed / dur, 1);
      const eased = easeOutQuint(rawProgress);
      const currentOffset = eased * dist;

      offsetRef.current = currentOffset;
      setOffset(currentOffset);

      const currentItemIdx = Math.floor(currentOffset / ITEM_HEIGHT);
      if (currentItemIdx !== lastTickIdx.current) {
        lastTickIdx.current = currentItemIdx;
        playTick(rawProgress);
      }

      if (rawProgress >= 1) {
        setSpinning(false);
        setSelected(levels[target]);
        playWinSound();
        setTimeout(() => setLanded(true), 100);
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playTick, playWinSound]);

  useEffect(() => {
    if (landed) {
      setTitlePulse(true);
      const t = setTimeout(() => setTitlePulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [landed]);

  useEffect(() => {
    if (landed && selected) {
      setCountdown(3);
      const id = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(id);
            onSelect(forcedLevel || selected);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [landed, selected, onSelect, forcedLevel]);

  const centerItemGlobalIdx = Math.round(offset / ITEM_HEIGHT);
  const visibleCount = 7;
  const half = Math.floor(visibleCount / 2);

  const visibleItems = [];
  for (let i = -half; i <= half; i++) {
    const globalIdx = centerItemGlobalIdx + i;
    const dataIdx = ((globalIdx % len) + len) % len;
    const itemY = globalIdx * ITEM_HEIGHT;
    const distFromCenter = itemY - offset;
    visibleItems.push({
      ...wheelNames[dataIdx],
      key: globalIdx,
      distFromCenter,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-fade-in">
      <h2
        className="text-2xl font-extrabold text-gradient-gold mb-6 transition-all duration-300"
        style={{
          transform: spinning ? "scale(1)" : titlePulse ? "scale(1.15)" : "scale(1)",
          textShadow: !spinning ? "0 0 20px rgba(245,158,11,0.5)" : "none",
        }}
      >
        {spinning ? "🎰 Spinning..." : "🎯 Selected!"}
      </h2>

      <div
        className="relative w-full max-w-[340px] overflow-hidden rounded-2xl"
        style={{
          height: `${visibleCount * ITEM_HEIGHT}px`,
          background: "rgba(26,26,46,0.6)",
          border: "1px solid rgba(245,158,11,0.15)",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none" />

        <div
          className="absolute inset-x-0 z-20 pointer-events-none transition-all duration-300"
          style={{
            top: `${half * ITEM_HEIGHT}px`,
            height: `${ITEM_HEIGHT}px`,
            borderTop: landed ? "2px solid rgba(245,158,11,0.8)" : "2px solid rgba(245,158,11,0.4)",
            borderBottom: landed ? "2px solid rgba(245,158,11,0.8)" : "2px solid rgba(245,158,11,0.4)",
            background: landed ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.04)",
            boxShadow: landed ? "0 0 30px rgba(245,158,11,0.2)" : "none",
          }}
        />

        <div className="relative" style={{ height: "100%" }}>
          {visibleItems.map((item) => {
            const isCenter = Math.abs(item.distFromCenter) < ITEM_HEIGHT * 0.5;
            const dist = Math.abs(item.distFromCenter) / ITEM_HEIGHT;
            const opacity = Math.max(0.05, 1 - dist * 0.35);
            const scale = Math.max(0.7, 1 - dist * 0.08);
            const isWinner = isCenter && landed;

            return (
              <div
                key={item.key}
                className="absolute inset-x-0 flex items-center gap-3 px-6 rounded-xl"
                style={{
                  height: `${ITEM_HEIGHT}px`,
                  top: `${half * ITEM_HEIGHT + item.distFromCenter}px`,
                  opacity,
                  transform: `scale(${isWinner ? 1.12 : scale})`,
                  transition: landed ? "transform 0.3s ease, opacity 0.3s ease" : "none",
                  willChange: "transform, top, opacity",
                }}
              >
                <span className="text-2xl" style={{ filter: isCenter ? "none" : `grayscale(${dist * 0.5})` }}>
                  {item.emoji}
                </span>
                <span
                  className="font-bold"
                  style={{
                    fontSize: isCenter ? "18px" : "15px",
                    color: isWinner
                      ? "#F59E0B"
                      : isCenter
                        ? "#ffffff"
                        : `rgba(255,255,255,${Math.max(0.2, 0.6 - dist * 0.15)})`,
                    textShadow: isWinner ? "0 0 12px rgba(245,158,11,0.4)" : "none",
                  }}
                >
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {landed && selected && (
        <div className="flex flex-col items-center gap-3 mt-6 animate-bounce-in">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{selected.emoji}</span>
            <h3 className="text-2xl font-extrabold text-white">{selected.original || selected.display || selected.name}</h3>
          </div>
          <p className="text-gold-light font-semibold text-sm">Tonight&apos;s celebrity! 🎯</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-text-muted text-sm">Starting in</span>
            <span
              className="text-gold-light font-extrabold text-2xl"
              style={{ textShadow: "0 0 10px rgba(245,158,11,0.4)" }}
            >
              {countdown}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
