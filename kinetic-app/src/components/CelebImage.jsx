import { useState } from "react";
import { stripEmoji } from "../utils/text";

export default function CelebImage({ level, isWin, bouncing }) {
  const [zoomed, setZoomed] = useState(false);
  const [imgError, setImgError] = useState(false);

  const showImage = !!level.image && !imgError;

  const renderVisual = (size = "normal") => {
    if (showImage) {
      return (
        <img
          src={level.image}
          alt={isWin ? level.answer : "Mystery celebrity"}
          className="w-full h-full object-cover"
          draggable={false}
          onError={() => setImgError(true)}
        />
      );
    }
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-3"
        style={{
          background: `linear-gradient(135deg, ${level.bgColor}, #0F0F1A)`,
        }}
      >
        <span className={`${size === "large" ? "text-[120px]" : "text-[80px]"} leading-none drop-shadow-2xl`}>
          {level.emoji}
        </span>
        <span className={`${size === "large" ? "text-2xl" : "text-xl"} font-extrabold text-white tracking-wider drop-shadow-lg`}>
          {level.answer}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col items-center gap-3 w-full">
        <div
          className={`relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden
                      cursor-pointer transition-transform duration-300
                      shadow-[0_8px_32px_rgba(139,92,246,0.15)] ring-1 ring-white/10
                      ${bouncing ? "animate-image-bounce" : ""}`}
          onClick={() => !isWin && setZoomed(true)}
        >
          {renderVisual()}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

          {isWin && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md py-2.5 px-3 text-center border-t border-white/10">
              <span className="text-white font-extrabold text-lg tracking-wider drop-shadow-md">
                {level.answer}
              </span>
            </div>
          )}
        </div>

        {!isWin && (
          <p className="text-text-muted font-medium text-center text-sm italic px-4">
            &ldquo;{stripEmoji(level.clue)}&rdquo;
          </p>
        )}
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setZoomed(false)}
        >
          <div className="w-full max-w-[360px] rounded-2xl overflow-hidden animate-bounce-in shadow-2xl ring-1 ring-white/10">
            {renderVisual("large")}
          </div>
        </div>
      )}
    </>
  );
}
