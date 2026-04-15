import { useState, useEffect } from "react";

export default function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1700);
    const doneTimer = setTimeout(onDone, 2200);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #7C3AED 50%, #0F0F1A 100%)" }}
    >
      <div className="flex flex-col items-center gap-5 animate-bounce-in">
        <h1
          className="text-5xl font-extrabold text-transparent bg-clip-text"
          style={{
            backgroundImage: "linear-gradient(135deg, #FBBF24, #F59E0B, #D97706)",
            WebkitBackgroundClip: "text",
            filter: "drop-shadow(0 0 30px rgba(245,158,11,0.5))",
            animation: "splash-glow 1.5s ease-in-out infinite alternate",
          }}
        >
          WhoOops!
        </h1>

        <p className="text-white/70 text-base font-semibold tracking-wide">
          The Celebrity Twist Game 🎭
        </p>

        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full bg-white/80"
              style={{
                animation: `splash-bounce 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splash-glow {
          from { filter: drop-shadow(0 0 20px rgba(245,158,11,0.3)); }
          to   { filter: drop-shadow(0 0 40px rgba(124,58,237,0.6)); }
        }
        @keyframes splash-bounce {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-12px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
