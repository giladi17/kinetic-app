export default function LetterBank({ letters, usedIndices, onSelectLetter, disabled }) {
  const midpoint = Math.ceil(letters.length / 2);
  const row1 = letters.slice(0, midpoint);
  const row2 = letters.slice(midpoint);
  const maxPerRow = Math.max(row1.length, row2.length);

  const gap = maxPerRow >= 7 ? 6 : maxPerRow >= 6 ? 8 : 10;
  const btnSize = maxPerRow >= 8 ? 38 : maxPerRow >= 7 ? 42 : maxPerRow >= 6 ? 46 : 52;
  const fontSize = btnSize >= 46 ? 20 : btnSize >= 42 ? 18 : 16;

  const btnStyle = { width: btnSize, height: btnSize, fontSize };

  const renderButton = (letter, bankIdx) => {
    const isUsed = usedIndices.includes(bankIdx);
    if (letter === "") return <div key={bankIdx} style={btnStyle} className="shrink-0" />;
    return (
      <button
        key={bankIdx}
        onClick={() => !isUsed && !disabled && onSelectLetter(bankIdx)}
        disabled={isUsed || disabled}
        style={btnStyle}
        className={`shrink-0 rounded-xl flex items-center justify-center font-bold
                   uppercase transition-all duration-150 cursor-pointer
                   ${isUsed
            ? "bg-white/[0.02] text-text-muted/20 scale-90 cursor-default"
            : "glass text-text hover:border-primary/30 hover:shadow-[0_0_12px_rgba(139,92,246,0.15)] active:scale-90"
          }`}
      >
        {letter}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center w-full mt-2" style={{ gap }}>
      <div className="flex justify-center" style={{ gap }}>
        {row1.map((letter, i) => renderButton(letter, i))}
      </div>
      <div className="flex justify-center" style={{ gap }}>
        {row2.map((letter, i) => renderButton(letter, midpoint + i))}
      </div>
    </div>
  );
}
