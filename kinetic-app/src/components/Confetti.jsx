import { useEffect, useState } from "react";

const COLORS = ["#8B5CF6", "#F59E0B", "#10B981", "#A78BFA", "#FBBF24", "#EF4444", "#6D28D9", "#34D399"];

export default function Confetti() {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const newPieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 10,
      rotation: Math.random() * 360,
      shape: Math.random() > 0.5 ? "circle" : "rect",
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className={p.shape === "circle" ? "absolute rounded-full" : "absolute rounded-sm"}
          style={{
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.shape === "circle" ? p.size : p.size * 0.6,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
            boxShadow: `0 0 6px ${p.color}40`,
          }}
        />
      ))}
    </div>
  );
}
