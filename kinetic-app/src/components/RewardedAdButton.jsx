import { useState, useEffect, useCallback, useRef } from "react";

const AD_DURATION = 5;

export default function RewardedAdButton({ onReward, rewardAmount = 30, label = "Watch Ad", className = "" }) {
  const [loading, setLoading] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [canClaim, setCanClaim] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const intervalRef = useRef(null);

  const startAd = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowAd(true);
      setCountdown(AD_DURATION);
      setCanClaim(false);
      setClaimed(false);
    }, 800);
  }, []);

  useEffect(() => {
    if (!showAd || canClaim) return;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setCanClaim(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [showAd, canClaim]);

  const handleClaim = () => {
    setClaimed(true);
    onReward?.(rewardAmount);
    setTimeout(() => {
      setShowAd(false);
      setClaimed(false);
    }, 1200);
  };

  const handleClose = () => {
    clearInterval(intervalRef.current);
    setShowAd(false);
    setCountdown(AD_DURATION);
    setCanClaim(false);
    setClaimed(false);
  };

  return (
    <>
      <button
        onClick={startAd}
        disabled={loading || showAd}
        className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm
                   transition-all duration-200 cursor-pointer active:scale-95
                   ${loading || showAd
                     ? "bg-white/[0.04] text-white/30 cursor-not-allowed"
                     : "text-white shadow-[0_4px_24px_rgba(245,158,11,0.3)]"}
                   ${className}`}
        style={!(loading || showAd) ? {
          background: "linear-gradient(135deg, #F59E0B, #D97706)",
        } : undefined}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <span className="text-lg">🎬</span>
            {label} (+{rewardAmount} coins)
          </>
        )}
      </button>

      {showAd && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="w-full max-w-[380px] mx-4 flex flex-col items-center gap-5">

            {!claimed ? (
              <>
                <div className="w-full aspect-video rounded-2xl overflow-hidden relative"
                     style={{
                       background: "linear-gradient(135deg, #1a1033, #0f0f1a)",
                       border: "2px solid rgba(124,58,237,0.3)",
                       boxShadow: "0 0 40px rgba(124,58,237,0.15)",
                     }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <span className="text-5xl">{canClaim ? "🎉" : "📺"}</span>
                    <p className="text-white/70 text-sm font-semibold">
                      {canClaim ? "Ad Complete!" : "Watching ad..."}
                    </p>
                    {!canClaim && (
                      <div className="w-48 h-2 rounded-full bg-white/10 overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-linear"
                          style={{
                            width: `${((AD_DURATION - countdown) / AD_DURATION) * 100}%`,
                            background: "linear-gradient(90deg, #7C3AED, #F59E0B)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {!canClaim ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-extrabold text-white"
                         style={{
                           background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
                           boxShadow: "0 0 30px rgba(124,58,237,0.4)",
                         }}>
                      {countdown}
                    </div>
                    <p className="text-white/40 text-xs">seconds remaining</p>
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    className="w-full max-w-[280px] py-4 rounded-2xl font-extrabold text-base text-white
                               active:scale-95 transition-all cursor-pointer animate-bounce-in"
                    style={{
                      background: "linear-gradient(135deg, #F59E0B, #D97706)",
                      boxShadow: "0 6px 30px rgba(245,158,11,0.4)",
                    }}
                  >
                    Claim +{rewardAmount} Coins! 🪙
                  </button>
                )}

                {!canClaim && (
                  <button
                    onClick={handleClose}
                    className="text-white/20 text-xs hover:text-white/40 transition-colors cursor-pointer mt-2"
                  >
                    Skip (no reward)
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 animate-bounce-in">
                <span className="text-6xl">🪙</span>
                <h3 className="text-2xl font-extrabold text-white">+{rewardAmount} Coins!</h3>
                <p className="text-white/50 text-sm">Added to your balance</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
