let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration = 0.1, vol = 0.08, type = "sine") {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playCorrectLetter() {
  playTone(880, 0.08, 0.06, "sine");
}

export function playWrongLetter() {
  playTone(200, 0.2, 0.07, "sawtooth");
}

export function playWinSound() {
  const ctx = getCtx();
  if (!ctx) return;
  [523, 659, 784].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 0.1, "sine"), i * 130);
  });
}

export function playCoinSound() {
  playTone(1200, 0.06, 0.05, "sine");
  setTimeout(() => playTone(1600, 0.08, 0.05, "sine"), 70);
}

export function playDrumRoll() {
  const ctx = getCtx();
  if (!ctx) return;
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      playTone(100 + Math.random() * 60, 0.05, 0.04 + i * 0.005, "triangle");
    }, i * 60);
  }
}

export function playDailyReward() {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 0.08, "sine"), i * 150);
  });
}

export function playUnlockSound() {
  playTone(150, 0.15, 0.1, "sawtooth");
  setTimeout(() => playTone(100, 0.1, 0.08, "square"), 100);
  setTimeout(() => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, 0.1, "sine"), i * 120);
    });
  }, 300);
}
