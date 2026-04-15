import { useState, useEffect, useRef } from "react";

export default function DuelCountdown({ onDone }) {
  const [count, setCount] = useState(3);
  const firedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (firedRef.current) return;
    firedRef.current = true;
    const timer = setTimeout(() => onDoneRef.current(), 500);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div
        key={count}
        className="flex flex-col items-center gap-4"
        style={{
          animation: "countdown-pop 0.6s ease-out",
        }}
      >
        {count > 0 ? (
          <span
            className="font-extrabold text-white"
            style={{
              fontSize: "120px",
              lineHeight: 1,
              textShadow: "0 0 60px rgba(139,92,246,0.8), 0 0 120px rgba(139,92,246,0.3)",
            }}
          >
            {count}
          </span>
        ) : (
          <>
            <span
              className="font-extrabold"
              style={{
                fontSize: "100px",
                lineHeight: 1,
                background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 40px rgba(245,158,11,0.6))",
              }}
            >
              GO!
            </span>
            <span className="text-3xl">⚡</span>
          </>
        )}
      </div>
    </div>
  );
}
