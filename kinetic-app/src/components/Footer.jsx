import { useEffect, useMemo, useState } from "react";

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-3 py-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ background: "rgba(0,0,0,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-[520px] glass rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 20px 80px rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3"
             style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-sm font-extrabold text-white/90 tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full grid place-items-center glass hover:border-primary/30 transition-all cursor-pointer active:scale-95"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="text-[12px] leading-relaxed text-white/75 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InfoModal({ open, onClose }) {
  const privacy = useMemo(() => (
    <>
      <p>
        This Privacy Policy explains how WhoOops! (the “App”) handles information when you use the game.
      </p>

      <div className="space-y-2">
        <p className="font-bold text-white/85">Information we collect</p>
        <p>
          We do <span className="font-semibold text-white/85">not</span> ask you to create an account, and we do not intentionally collect
          personal information like your real name, email address, phone number, or precise location.
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-bold text-white/85">Local storage</p>
        <p>
          The App stores game progress (like levels, coins, streaks, and scores) locally on your device using your browser’s local storage.
          This data stays on your device and helps the game work properly.
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-bold text-white/85">Ads and cookies</p>
        <p>
          To support the App, we may display advertising in the future (for example via Google AdSense or similar providers).
          Ad providers may use cookies or similar technologies to show and measure ads and to help prevent fraud.
          You can control cookies through your browser settings.
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-bold text-white/85">Third‑party services</p>
        <p>
          The App may use third‑party services for hosting, analytics, or error reporting. These providers may process limited technical
          information (such as device/browser details) necessary to operate the service.
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-bold text-white/85">AI-generated content disclaimer</p>
        <p>
          Images in WhoOops! are AI‑generated parody created for entertainment purposes only. They are not real photographs. WhoOops! is not
          affiliated with, sponsored by, or endorsed by any celebrity or their representatives.
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-bold text-white/85">Changes</p>
        <p>
          We may update this policy from time to time. Changes will be reflected in this modal and take effect when posted.
        </p>
      </div>
    </>
  ), []);

  const howToPlay = useMemo(() => (
    <>
      <p>
        WhoOops! is an AI image‑guessing game. Each round shows a stylized, AI‑generated parody image of a famous person or character.
        Your goal is to guess the name correctly.
      </p>

      <div className="space-y-2">
        <p className="font-bold text-white/85">How a round works</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Look closely at the image for clues.</li>
          <li>Fill the name using the letter bank.</li>
          <li>If you get stuck, use hints (when available) to reveal helpful info.</li>
        </ul>
      </div>

      <div className="space-y-2">
        <p className="font-bold text-white/85">Coins, streaks, and modes</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Win rounds to earn coins and keep your streak.</li>
          <li>Try the Daily Challenge for a fresh puzzle each day.</li>
          <li>Jump into Duels for a fast, competitive twist.</li>
        </ul>
      </div>

      <p className="text-white/60">
        Tip: AI images can be intentionally “off” — focus on iconic features, outfits, and context clues.
      </p>
    </>
  ), []);

  if (!open) return null;

  return (
    <>
      {open === "privacy" && (
        <Modal title="Privacy Policy" onClose={onClose}>
          {privacy}
        </Modal>
      )}
      {open === "how" && (
        <Modal title="How to Play" onClose={onClose}>
          {howToPlay}
        </Modal>
      )}
    </>
  );
}
