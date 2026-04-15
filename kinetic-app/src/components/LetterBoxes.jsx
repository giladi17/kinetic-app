import { useRef, useEffect, useState } from "react";

export default function LetterBoxes({ answer, placedLetters, onRemoveLetter, isWin, shaking, flashRed, greenSequence, hintedIndices }) {
  const words = answer.split(" ");
  const longestWord = Math.max(...words.map((w) => w.length));
  let globalIndex = 0;

  const hintedSet = hintedIndices ? new Set(hintedIndices) : null;

  let boxSize, innerGap;
  if (longestWord >= 9) {
    boxSize = "w-8 h-10 text-sm";
    innerGap = "gap-1.5";
  } else if (longestWord >= 7) {
    boxSize = "w-10 h-12 text-base";
    innerGap = "gap-1.5";
  } else {
    boxSize = "w-12 h-14 text-lg";
    innerGap = "gap-2";
  }

  return (
    <div className={`flex flex-col items-center gap-3 px-2 ${shaking ? "animate-shake" : ""}`}>
      {words.map((word, wordIdx) => (
        <div key={wordIdx} className={`flex ${innerGap} justify-center`}>
          {word.split("").map((_, charIdx) => {
            const idx = globalIndex++;
            return (
              <LetterBox
                key={idx}
                idx={idx}
                placed={placedLetters[idx]}
                isWin={isWin}
                flashRed={flashRed}
                isGreenSeq={greenSequence && greenSequence.includes(idx)}
                isHinted={hintedSet && hintedSet.has(idx)}
                onRemove={onRemoveLetter}
                boxSize={boxSize}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function LetterBox({ idx, placed, isWin, flashRed, isGreenSeq, isHinted, onRemove, boxSize }) {
  const filled = placed !== null && placed !== undefined;
  const prevFilled = useRef(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (filled && !prevFilled.current) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timer);
    }
    prevFilled.current = filled;
  }, [filled]);

  let boxStyle = {};
  let boxClasses;

  if (isGreenSeq) {
    boxClasses = "text-white";
    boxStyle = {
      background: "linear-gradient(135deg, #10B981, #059669)",
      border: "2px solid rgba(16,185,129,0.6)",
      boxShadow: "0 0 14px rgba(16,185,129,0.4)",
    };
  } else if (flashRed) {
    boxClasses = "animate-flash-red text-text";
    boxStyle = {
      background: "rgba(239,68,68,0.15)",
      border: "2px solid rgba(239,68,68,0.5)",
    };
  } else if (isHinted) {
    boxClasses = "text-gold-light";
    boxStyle = {
      background: "rgba(245,158,11,0.15)",
      border: "2px solid #F59E0B",
      boxShadow: "0 0 12px rgba(245,158,11,0.3)",
    };
  } else if (filled) {
    boxClasses = "text-text";
    boxStyle = {
      background: "rgba(124,58,237,0.1)",
      border: "2px solid #7C3AED",
      boxShadow: "0 0 12px rgba(124,58,237,0.25), inset 0 0 8px rgba(124,58,237,0.08)",
    };
  } else {
    boxClasses = "";
    boxStyle = {
      background: "rgba(255,255,255,0.03)",
      border: "2px solid rgba(255,255,255,0.1)",
    };
  }

  return (
    <button
      onClick={() => filled && !isWin && !isHinted && onRemove(idx)}
      style={boxStyle}
      className={`${boxSize} rounded-xl flex items-center justify-center font-bold
                 transition-all duration-200 uppercase cursor-pointer ${boxClasses}
                 ${animating ? "animate-pop-in" : ""}`}
      disabled={isWin || isHinted}
    >
      {filled ? placed : (
        <span className="w-2 h-2 rounded-full bg-white/30 block" />
      )}
    </button>
  );
}
