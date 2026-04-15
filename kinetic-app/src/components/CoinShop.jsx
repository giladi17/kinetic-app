import { useState, useEffect, useRef, useCallback } from "react";
import { useGame } from "../context/GameContext";
import { playCoinSound } from "../utils/sounds";

const SPIN_KEY = "whooops_last_spin_date";
const SEGMENTS = [10, 20, 50, 100, 20, 30];
const SEGMENT_COLORS = ["#7C3AED", "#F97316", "#3B82F6", "#EAB308", "#10B981", "#EF4444"];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function ShopItem({ icon, name, desc, price, priceLabel, canAfford, onBuy, tag, inventory }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-2xl glass-light transition-all duration-200">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
           style={{ background: "rgba(255,255,255,0.05)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-text truncate">{name}</span>
          {tag && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full gradient-primary text-white font-bold shrink-0">{tag}</span>
          )}
        </div>
        <p className="text-[11px] text-text-muted truncate">{desc}</p>
        {inventory !== undefined && inventory > 0 && (
          <p className="text-[10px] text-correct font-semibold">Owned: {inventory}</p>
        )}
      </div>
      <button onClick={onBuy}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer active:scale-95 transition-all
                ${canAfford
                  ? "gradient-gold text-white shadow-[0_2px_12px_rgba(245,158,11,0.3)]"
                  : "bg-wrong/15 text-wrong/70 border border-wrong/20"}`}>
        {canAfford ? (priceLabel || `🪙 ${price}`) : `🪙 ${price}`}
      </button>
    </div>
  );
}

function SpinWheel({ onClose }) {
  const { state, dispatch } = useGame();
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [claimed, setClaimed] = useState(false);
  const rotationRef = useRef(0);
  const animRef = useRef(null);

  const alreadySpun = localStorage.getItem(SPIN_KEY) === getToday();

  const draw = useCallback((rotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 8;
    const segAngle = (Math.PI * 2) / SEGMENTS.length;

    ctx.clearRect(0, 0, size, size);

    SEGMENTS.forEach((val, i) => {
      const startA = rotation + i * segAngle;
      const endA = startA + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = SEGMENT_COLORS[i];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startA + segAngle / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px Poppins, sans-serif";
      ctx.fillText(`${val}`, r * 0.65, 5);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "10px Poppins, sans-serif";
      ctx.fillText("🪙", r * 0.65, -12);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a2e";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  useEffect(() => {
    draw(0);
  }, [draw]);

  const handleSpin = () => {
    if (spinning || alreadySpun) return;
    setSpinning(true);

    const segAngle = (Math.PI * 2) / SEGMENTS.length;
    const winIdx = Math.floor(Math.random() * SEGMENTS.length);
    const targetAngle = Math.PI * 2 * (4 + Math.random() * 2) - (winIdx * segAngle + segAngle / 2) - Math.PI / 2;
    const duration = 3000;
    const start = performance.now();

    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentAngle = eased * targetAngle;
      rotationRef.current = currentAngle;
      draw(currentAngle);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setResult(SEGMENTS[winIdx]);
        localStorage.setItem(SPIN_KEY, getToday());
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const handleClaim = () => {
    if (state.soundOn) playCoinSound();
    dispatch({ type: "ADD_COINS", amount: result });
    setClaimed(true);
    setTimeout(onClose, 1200);
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in"
         onClick={onClose}>
      <div className="glass rounded-3xl p-5 max-w-[340px] w-full mx-4 flex flex-col items-center gap-4 animate-bounce-in"
           onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-extrabold text-text">Daily Spin 🎰</h3>

        {alreadySpun && !result ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="text-4xl">⏰</span>
            <p className="text-text-muted text-sm font-semibold">Come back tomorrow!</p>
            <p className="text-text-muted/50 text-xs">You already spun today</p>
          </div>
        ) : (
          <>
            <div className="relative">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 text-2xl"
                   style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
                ▼
              </div>
              <canvas ref={canvasRef} width={240} height={240}
                      className="rounded-full"
                      style={{ boxShadow: "0 0 30px rgba(139,92,246,0.3), inset 0 0 20px rgba(0,0,0,0.3)" }} />
            </div>

            {result && !claimed ? (
              <div className="flex flex-col items-center gap-2 animate-bounce-in">
                <p className="text-3xl font-extrabold text-gradient-gold">+{result} 🪙</p>
                <button onClick={handleClaim}
                        className="px-8 py-3 rounded-xl gradient-gold text-white font-bold text-base
                                   shadow-[0_4px_20px_rgba(245,158,11,0.3)] active:scale-95 transition-all cursor-pointer">
                  Claim!
                </button>
              </div>
            ) : claimed ? (
              <div className="animate-bounce-in">
                <p className="text-xl font-extrabold text-correct">Claimed! 🎉</p>
              </div>
            ) : (
              <button onClick={handleSpin} disabled={spinning}
                      className={`px-8 py-3 rounded-xl font-bold text-base transition-all cursor-pointer active:scale-95
                        ${spinning
                          ? "glass text-text-muted cursor-wait"
                          : "gradient-primary text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)]"}`}>
                {spinning ? "Spinning..." : "Spin! 🎰"}
              </button>
            )}
          </>
        )}

        <button onClick={onClose} className="text-text-muted text-xs hover:text-text cursor-pointer transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

function AdSimulator({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + (100 / 30);
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(onComplete, 300);
    }
  }, [progress, onComplete]);

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <span className="text-3xl animate-pulse">📺</span>
      <p className="text-text text-sm font-bold">Watching ad...</p>
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full gradient-gold transition-all duration-100"
             style={{ width: `${progress}%` }} />
      </div>
      <p className="text-text-muted text-xs">{Math.min(3, Math.ceil((100 - progress) / 33))}s remaining</p>
    </div>
  );
}

export default function CoinShop() {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState("hints");
  const [toast, setToast] = useState("");
  const [showSpin, setShowSpin] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [flyCoins, setFlyCoins] = useState([]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const animateCoinFly = () => {
    const id = Date.now();
    setFlyCoins((prev) => [...prev, id]);
    setTimeout(() => setFlyCoins((prev) => prev.filter((c) => c !== id)), 800);
  };

  const buyItem = (actionType, payload, successMsg) => {
    dispatch({ type: actionType, ...payload });
    if (state.soundOn) playCoinSound();
    animateCoinFly();
    showToast(successMsg);
  };

  const handleSkipLevel = () => {
    dispatch({ type: "SKIP_LEVEL" });
  };

  const handleWatchAd = () => { setWatchingAd(true); };
  const handleAdComplete = () => {
    setWatchingAd(false);
    dispatch({ type: "ADD_COINS", amount: 50 });
    if (state.soundOn) playCoinSound();
    animateCoinFly();
    showToast("+50 coins earned! 🎉");
  };

  const tabs = [
    { id: "hints", label: "Hints", icon: "💡" },
    { id: "powerups", label: "Power-ups", icon: "⚡" },
    { id: "coins", label: "Coins", icon: "💰" },
    { id: "vip", label: "VIP", icon: "👑" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center"
           onClick={() => dispatch({ type: "TOGGLE_SHOP" })}>
        <div className="glass w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl p-5 pb-7
                        max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl border-t border-white/10"
             onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text">🏪 Shop</h2>
            <button onClick={() => dispatch({ type: "TOGGLE_SHOP" })}
                    className="text-text-muted hover:text-text text-xl w-8 h-8 flex items-center justify-center cursor-pointer transition-colors">
              ✕
            </button>
          </div>

          {/* Balance */}
          <div className="relative flex items-center gap-2 mb-4 justify-center glass-light rounded-2xl py-2.5">
            <span className="text-xl">🪙</span>
            <span className="text-gradient-gold text-2xl font-extrabold">{state.coins}</span>
            <span className="text-text-muted text-sm">coins</span>
            {flyCoins.map((id) => (
              <span key={id} className="absolute top-0 right-1/4 text-lg animate-coin-fly pointer-events-none">🪙</span>
            ))}
            {state.doubleCoinsLeft > 0 && (
              <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full gradient-gold text-white font-bold">
                2x ({state.doubleCoinsLeft})
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-4 bg-white/[0.03] rounded-xl p-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all
                        ${tab === t.id
                          ? "gradient-primary text-white shadow-[0_2px_10px_rgba(139,92,246,0.3)]"
                          : "text-text-muted hover:text-text"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex flex-col gap-2.5">

            {tab === "hints" && (
              <>
                <ShopItem icon="💡" name="Hint Pack x3" desc="Reveal 3 correct letters"
                          price={80} canAfford={state.coins >= 80} inventory={state.hintPacks}
                          onBuy={() => buyItem("BUY_HINT_PACK", { cost: 80, amount: 3 }, "+3 hints added! 💡")} />
                <ShopItem icon="💡" name="Hint Pack x10" desc="Reveal 10 correct letters" tag="Save 20%"
                          price={200} canAfford={state.coins >= 200} inventory={state.hintPacks > 0 ? state.hintPacks : undefined}
                          onBuy={() => buyItem("BUY_HINT_PACK", { cost: 200, amount: 10 }, "+10 hints added! 💡")} />
                <ShopItem icon="🌫️" name="Blur Pack x3" desc="Reveal image 3 times"
                          price={120} canAfford={state.coins >= 120} inventory={state.blurPacks}
                          onBuy={() => buyItem("BUY_BLUR_PACK", { cost: 120, amount: 3 }, "+3 blur reveals added! 🌫️")} />
              </>
            )}

            {tab === "powerups" && (
              <>
                <ShopItem icon="⏭️" name="Skip Level" desc="Skip current level instantly"
                          price={150} canAfford={state.coins >= 150}
                          onBuy={handleSkipLevel} />
                <ShopItem icon="✨" name="Double Coins" desc="Next 5 levels earn 2x coins" tag="Hot"
                          price={300} canAfford={state.coins >= 300}
                          inventory={state.doubleCoinsLeft > 0 ? state.doubleCoinsLeft : undefined}
                          onBuy={() => buyItem("BUY_DOUBLE_COINS", {}, "+5 double coin rounds! ✨")} />
                <ShopItem icon="❤️" name="Extra Life" desc="One retry in Daily Challenge"
                          price={100} canAfford={state.coins >= 100}
                          inventory={state.extraLives}
                          onBuy={() => buyItem("BUY_EXTRA_LIFE", {}, "+1 extra life added! ❤️")} />
              </>
            )}

            {tab === "coins" && (
              <>
                {watchingAd ? (
                  <div className="rounded-2xl glass-light p-4">
                    <AdSimulator onComplete={handleAdComplete} />
                  </div>
                ) : (
                  <ShopItem icon="📺" name="Watch Ad" desc="Watch a short ad for free coins"
                            price={0} priceLabel="FREE +50 🪙" canAfford={true}
                            onBuy={handleWatchAd} />
                )}
                <ShopItem icon="🎰" name="Daily Spin" desc="Spin the wheel for free coins!"
                          price={0} priceLabel="FREE Spin" canAfford={true}
                          tag={localStorage.getItem(SPIN_KEY) === getToday() ? "Done" : "1/day"}
                          onBuy={() => setShowSpin(true)} />
              </>
            )}

            {tab === "vip" && (
              <div className="rounded-2xl p-5 flex flex-col gap-4"
                   style={{
                     background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(180,83,9,0.08))",
                     border: "2px solid rgba(245,158,11,0.3)",
                     boxShadow: "0 0 30px rgba(245,158,11,0.1)",
                   }}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{"👑"}</span>
                  <div>
                    <h3 className="text-lg font-extrabold text-gradient-gold">VIP Pass</h3>
                    <p className="text-text-muted text-xs">Coming Soon</p>
                  </div>
                </div>
                <div className="text-gold-light font-extrabold text-2xl text-center">
                  $2.99<span className="text-sm text-text-muted font-semibold">/month</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { icon: "\u2713", text: "Double coins on every level" },
                    { icon: "\u2713", text: "No ads (future)" },
                    { icon: "\u2713", text: "Gold username color" },
                    { icon: "\u2713", text: "Exclusive VIP avatar" },
                    { icon: "\u2713", text: "VIP badge on profile" },
                  ].map((perk) => (
                    <div key={perk.text} className="flex items-center gap-2.5">
                      <span className="text-correct font-extrabold text-sm">{perk.icon}</span>
                      <span className="text-text text-sm">{perk.text}</span>
                    </div>
                  ))}
                </div>
                <button disabled
                        className="w-full py-3.5 rounded-xl font-bold text-sm text-text-muted/40 cursor-not-allowed"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}>
                  Coming Soon {"👑"}
                </button>
              </div>
            )}
          </div>

          {/* Inventory summary */}
          {(state.hintPacks > 0 || state.blurPacks > 0 || state.extraLives > 0 || state.doubleCoinsLeft > 0) && (
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <p className="text-text-muted text-[10px] font-semibold uppercase tracking-wider mb-2">Your Inventory</p>
              <div className="flex flex-wrap gap-2">
                {state.hintPacks > 0 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full glass-light text-text font-semibold">
                    💡 {state.hintPacks} hints
                  </span>
                )}
                {state.blurPacks > 0 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full glass-light text-text font-semibold">
                    🌫️ {state.blurPacks} blurs
                  </span>
                )}
                {state.doubleCoinsLeft > 0 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full glass-light text-text font-semibold">
                    ✨ 2x for {state.doubleCoinsLeft} levels
                  </span>
                )}
                {state.extraLives > 0 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full glass-light text-text font-semibold">
                    ❤️ {state.extraLives} lives
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSpin && <SpinWheel onClose={() => setShowSpin(false)} />}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 glass gradient-correct text-white px-5 py-2.5
                       rounded-full text-sm font-semibold shadow-[0_4px_24px_rgba(16,185,129,0.3)] animate-slide-up z-[60]">
          {toast}
        </div>
      )}
    </>
  );
}
