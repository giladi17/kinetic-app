import { useState } from "react";
import { useGame } from "../context/GameContext";

export default function UGCForm() {
  const { state, dispatch } = useGame();
  const [realName, setRealName] = useState("");
  const [alteredName, setAlteredName] = useState("");
  const [clueText, setClueText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    setError("");
    const real = realName.trim().toUpperCase();
    const altered = alteredName.trim().toUpperCase();

    if (!real || !altered || !clueText.trim()) {
      setError("All fields are required (names + clue).");
      return false;
    }
    if (real.length !== altered.length) {
      setError("Names must be the same length (only substitution, no adding or removing letters).");
      return false;
    }

    let diffCount = 0;
    for (let i = 0; i < real.length; i++) {
      if (real[i] !== altered[i]) diffCount++;
    }
    if (diffCount !== 1) {
      setError(`Exactly ONE letter must be changed. Found ${diffCount} differences.`);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const level = {
      realName: realName.trim(),
      alteredName: alteredName.trim(),
      clue: clueText.trim(),
      hasImage: !!imageFile,
    };
    console.log("UGC Level Submitted:", level);
    dispatch({ type: "ADD_UGC_LEVEL", level });
    setSubmitted(true);
  };

  const statusColor = {
    Pending: "text-gold",
    Approved: "text-correct",
    Live: "text-correct",
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text">🎨 Create a Level</h2>
        <button
          onClick={() => dispatch({ type: "SET_SCREEN", screen: "game" })}
          className="text-text-muted hover:text-primary text-sm font-medium cursor-pointer"
        >
          ← Back
        </button>
      </div>

      {submitted ? (
        <div className="text-center py-8 animate-bounce-in">
          <span className="text-5xl mb-4 block">🎉</span>
          <h3 className="text-lg font-bold text-text mb-2">Thanks! Your level is under review</h3>
          <p className="text-text-muted text-sm mb-4">We&apos;ll notify you when it goes live.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setRealName("");
              setAlteredName("");
              setClueText("");
              setImageFile(null);
            }}
            className="px-6 py-2 rounded-xl bg-primary text-white font-semibold text-sm
                       hover:bg-primary-light active:scale-95 transition-all cursor-pointer shadow-md"
          >
            Create Another
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              1. Upload AI Image
            </label>
            <label className="flex items-center justify-center w-full h-24 rounded-xl border-2 border-dashed
                            border-surface-dim hover:border-primary/50 transition-colors cursor-pointer
                            text-text-muted text-sm bg-surface-raised">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              {imageFile ? `📎 ${imageFile.name}` : "📁 Tap to upload image (PNG/JPG, max 10MB)"}
            </label>
          </div>

          <div>
            <label className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              2. Original Celebrity Name
            </label>
            <input
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="e.g. Elon Musk"
              className="w-full px-4 py-3 rounded-xl bg-surface-raised text-text placeholder:text-text-muted/40
                        border border-surface-dim focus:border-primary outline-none text-sm shadow-sm"
            />
          </div>

          <div>
            <label className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              3. Distorted Name (one letter changed)
            </label>
            <input
              type="text"
              value={alteredName}
              onChange={(e) => setAlteredName(e.target.value)}
              placeholder="e.g. Elon Mask"
              className="w-full px-4 py-3 rounded-xl bg-surface-raised text-text placeholder:text-text-muted/40
                        border border-surface-dim focus:border-primary outline-none text-sm shadow-sm"
            />
          </div>

          <div>
            <label className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              4. Clue Text (hint for the player)
            </label>
            <input
              type="text"
              value={clueText}
              onChange={(e) => setClueText(e.target.value)}
              placeholder="e.g. Elon in the COVID-19 🦠"
              className="w-full px-4 py-3 rounded-xl bg-surface-raised text-text placeholder:text-text-muted/40
                        border border-surface-dim focus:border-primary outline-none text-sm shadow-sm"
            />
            <p className="text-text-muted text-xs mt-1">
              A short, funny hint that describes the image without giving away the answer.
            </p>
          </div>

          {realName && alteredName && (
            <div className="flex gap-4 justify-center p-3 bg-surface-raised rounded-xl border border-surface-dim shadow-sm">
              <div className="text-center">
                <span className="text-text-muted text-xs block mb-1">Original</span>
                <div className="flex gap-0.5">
                  {realName.toUpperCase().split("").map((l, i) => {
                    const alt = alteredName.toUpperCase();
                    const isDiff = i < alt.length && l !== alt[i];
                    return (
                      <span key={i} className={`text-sm font-bold ${isDiff ? "text-wrong" : "text-text-muted"}`}>
                        {l}
                      </span>
                    );
                  })}
                </div>
              </div>
              <span className="text-text-muted self-end mb-0.5">→</span>
              <div className="text-center">
                <span className="text-text-muted text-xs block mb-1">Distorted</span>
                <div className="flex gap-0.5">
                  {alteredName.toUpperCase().split("").map((l, i) => {
                    const real = realName.toUpperCase();
                    const isDiff = i < real.length && l !== real[i];
                    return (
                      <span key={i} className={`text-sm font-bold ${isDiff ? "text-correct" : "text-text-muted"}`}>
                        {l}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-wrong text-sm text-center font-medium">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={validate}
              className="flex-1 py-3 rounded-xl bg-surface-raised border border-surface-dim text-text font-semibold text-sm
                        hover:border-primary hover:shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              ✅ Validate
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm
                        hover:bg-primary-light active:scale-95 transition-all cursor-pointer shadow-md"
            >
              🚀 Submit
            </button>
          </div>

          <p className="text-text-muted text-xs text-center">
            💰 Earn coins every time someone plays your level!
          </p>
        </div>
      )}

      {state.ugcLevels.length > 0 && (
        <div className="mt-4">
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3">
            Levels You Created
          </h3>
          <div className="flex flex-col gap-2">
            {state.ugcLevels.map((lvl) => (
              <div key={lvl.id} className="flex items-center justify-between px-4 py-2.5 bg-surface-raised rounded-xl
                                          border border-surface-dim shadow-sm">
                <span className="text-text text-sm font-medium">
                  {lvl.realName} → {lvl.alteredName}
                </span>
                <span className={`text-xs font-semibold ${statusColor[lvl.status] || "text-text-muted"}`}>
                  {lvl.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
