import { useState, useEffect } from "react";

const COIN_COUNT = 7;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default function CoinFlyAnimation({ trigger, startY = "50%" }) {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    const batch = Array.from({ length: COIN_COUNT }, (_, i) => ({
      id: Date.now() + i,
      startX: randomBetween(35, 65),
      arcX: randomBetween(-30, 30),
      delay: randomBetween(0, 0.15),
      duration: randomBetween(0.7, 0.9),
      size: randomBetween(18, 26),
    }));
    setCoins(batch);
    const timer = setTimeout(() => setCoins([]), 1200);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (coins.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {coins.map((c) => (
        <span
          key={c.id}
          style={{
            position: "absolute",
            left: `${c.startX}%`,
            top: startY,
            fontSize: `${c.size}px`,
            animation: `coin-fly-up ${c.duration}s cubic-bezier(0.2, 0.8, 0.3, 1) ${c.delay}s forwards`,
            "--arc-x": `${c.arcX}px`,
            opacity: 0,
          }}
        >
          🪙
        </span>
      ))}
      <style>{`
        @keyframes coin-fly-up {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(var(--arc-x), -40vh) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--arc-x), -80vh) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
