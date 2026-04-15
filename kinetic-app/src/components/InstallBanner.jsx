import { useState, useEffect, useRef } from "react";

const DISMISSED_KEY = "whooops_pwa_dismissed";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS()) {
      setIosMode(true);
      setVisible(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (iosMode) {
      dismiss();
      return;
    }
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      dismiss();
    }
    deferredPrompt.current = null;
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 72,
        left: 8,
        right: 8,
        zIndex: 9999,
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
        border: "1px solid rgba(124,58,237,0.4)",
        borderRadius: 16,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 -4px 24px rgba(124,58,237,0.3)",
        animation: "slideUpBanner 0.4s ease-out",
      }}
    >
      <span style={{ fontSize: 28, flexShrink: 0 }}>📱</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {iosMode ? (
          <p style={{ margin: 0, color: "#e2e8f0", fontSize: 13, lineHeight: 1.4 }}>
            Tap <strong>Share</strong> → <strong>"Add to Home Screen"</strong>
          </p>
        ) : (
          <p style={{ margin: 0, color: "#e2e8f0", fontSize: 13, lineHeight: 1.4 }}>
            Add <strong>WhoOops!</strong> to your home screen
          </p>
        )}
      </div>

      {!iosMode && (
        <button
          onClick={handleInstall}
          style={{
            background: "linear-gradient(135deg, #7C3AED, #9333EA)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "8px 14px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Install ✅
        </button>
      )}

      <button
        onClick={dismiss}
        style={{
          background: "transparent",
          border: "none",
          color: "#94a3b8",
          fontSize: 20,
          cursor: "pointer",
          padding: "4px 4px",
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>

      <style>{`
        @keyframes slideUpBanner {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
