const { chromium } = require("playwright");

const BASE_URL = "http://localhost:5173";
const ROUND_TARGET = 4;

// ─── Console helpers ───────────────────────────────────────────
const C = {
  r: "\x1b[0m", red: "\x1b[31m", grn: "\x1b[32m",
  yel: "\x1b[33m", cyn: "\x1b[36m", dim: "\x1b[2m", bold: "\x1b[1m",
};
const ts = () => new Date().toLocaleTimeString("en-US", { hour12: false });
const log  = (m) => console.log(`${C.dim}${ts()}${C.r} ${C.cyn}[TEST]${C.r} ${m}`);
const pass = (m) => console.log(`${C.dim}${ts()}${C.r} ${C.grn}[ OK ]${C.r} ${m}`);
const fail = (m) => console.error(`${C.dim}${ts()}${C.r} ${C.red}[FAIL]${C.r} ${m}`);
const warn = (m) => console.log(`${C.dim}${ts()}${C.r} ${C.yel}[WARN]${C.r} ${m}`);

const errors = [];
let totalRounds = 0;

// ─── Setup ─────────────────────────────────────────────────────

async function setupPlayer(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });

  // Inject storage values BEFORE page scripts run — prevents race conditions
  // with React's saveState effect that can overwrite our values.
  await ctx.addInitScript((n) => {
    localStorage.setItem("whooops_tutorial_seen", "true");
    localStorage.setItem("hasSeenDuelTutorial", "true");
    localStorage.setItem("duelNickname", n);
    localStorage.setItem("whooops_nickname", n);
    localStorage.setItem("whooops_coins", "9999");
    localStorage.setItem("whooops_current_level", "2");
    localStorage.setItem("whooops_daily_reward_date", new Date().toISOString().split("T")[0]);
    localStorage.setItem("whooops_daily_reward_streak", "0");
    sessionStorage.setItem("whooops_splash_seen", "1");
  }, name);

  const page = await ctx.newPage();
  page.setDefaultTimeout(30_000);
  page.on("pageerror", (err) => warn(`[${name} JS error] ${err.message}`));

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  log(`${name} ready`);
  return page;
}

// ─── Navigation ────────────────────────────────────────────────

async function goToDuelLobby(page, label) {
  await page.evaluate(() => localStorage.setItem("whooops_coins", "9999"));

  // Wait for any full-screen blocking overlay (tutorial, splash, popup) to clear
  try {
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('.fixed.inset-0');
      for (const el of els) {
        const s = getComputedStyle(el);
        if (s.pointerEvents === 'none' || s.display === 'none' ||
            s.visibility === 'hidden' || parseFloat(s.opacity) === 0) continue;
        return false;
      }
      return true;
    }, { timeout: 10_000 });
  } catch { /* proceed anyway */ }

  const tab = page.locator("nav button", { hasText: "Duel" });
  await tab.waitFor({ timeout: 15_000 });
  await tab.click();
  await page.waitForTimeout(600);
  log(`${label} → Duel lobby`);
}

// ─── Room management ───────────────────────────────────────────

async function createSpeedRoom(page) {
  await page.locator("button", { hasText: "Speed Room" }).click();

  // Wait for the "Waiting for opponent" text — confirms we're on the waiting screen
  await page.locator("text=Waiting for opponent").waitFor({ timeout: 20_000 });

  // Poll until the 4-digit room code appears (createRoom is async)
  const code = await page.evaluate(() =>
    new Promise((resolve, reject) => {
      let attempts = 0;
      const poll = setInterval(() => {
        for (const p of document.querySelectorAll("p")) {
          const match = p.textContent.trim().match(/\d{4}/);
          if (match) { clearInterval(poll); resolve(match[0]); return; }
        }
        if (++attempts > 50) { clearInterval(poll); reject(new Error("Room code timeout")); }
      }, 200);
    })
  );

  log(`Room created: ${code}`);
  return code;
}

async function joinRoom(page, code) {
  const input = page.locator('input[placeholder="Enter room code"]');
  await input.waitFor({ timeout: 10_000 });
  await input.fill(code);
  await page.locator("button", { hasText: "Join Room" }).click();
  log(`P2 joining room ${code}`);
}

// ─── Data extraction via React fiber ───────────────────────────

async function getGameData(page) {
  return page.evaluate(() => {
    function climb(el) {
      const fk = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
      if (!fk) return null;
      let f = el[fk];
      for (let i = 0; i < 60 && f; i++, f = f.return) {
        const p = f.memoizedProps;
        if (p && p.level && typeof p.level.answer === "string") {
          return { answer: p.level.answer, original: p.level.original };
        }
      }
      return null;
    }
    const h2 = document.querySelector("h2");
    if (h2) { const r = climb(h2); if (r) return r; }
    const boxes = document.querySelector(".flex.flex-col.items-center.gap-3.px-2");
    if (boxes) { const r = climb(boxes); if (r) return r; }
    return null;
  });
}

async function getCelebrityName(page) {
  return (await page.locator("h2").first().textContent()).trim();
}

// ─── Gameplay actions ──────────────────────────────────────────

function getBankSelector() {
  return ".flex.flex-col.items-center.w-full.mt-2";
}

async function solvePuzzle(page, answer) {
  const letters = answer.replace(/\s/g, "").split("");

  const bankTexts = await page.evaluate((sel) => {
    const containers = document.querySelectorAll(sel);
    const c = containers[containers.length - 1];
    if (!c) return [];
    return [...c.querySelectorAll("button")].map((b) =>
      b.textContent.trim().toUpperCase()
    );
  }, getBankSelector());

  const used = new Set();
  for (const letter of letters) {
    const idx = bankTexts.findIndex((t, i) => t === letter && !used.has(i));
    if (idx < 0) continue;
    used.add(idx);
    const btn = page.locator(getBankSelector()).last().locator("button").nth(idx);
    await btn.click({ timeout: 2_000 }).catch(() => {});
    await page.waitForTimeout(30 + Math.random() * 50);
  }
}

async function rapidRandomClicks(page, n = 10) {
  const btns = page.locator(getBankSelector()).last().locator("button");
  const total = await btns.count().catch(() => 0);
  if (!total) return;

  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * total);
    await btns.nth(idx).click({ timeout: 500 }).catch(() => {});
    await page.waitForTimeout(10 + Math.random() * 30);
  }
}

async function clearLetterBoxes(page) {
  const boxes = page.locator(".flex.flex-col.items-center.gap-3.px-2 button");
  const count = await boxes.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    await boxes.nth(i).click({ timeout: 300 }).catch(() => {});
  }
}

// ─── Phase detection ───────────────────────────────────────────

async function waitForPlayingPhase(page, label) {
  await page.locator("text=LIVE").waitFor({ timeout: 90_000 });
  try {
    await page.locator("text=Syncing").waitFor({ state: "hidden", timeout: 15_000 });
  } catch { /* already hidden */ }
  await page.waitForTimeout(400);
  log(`${label} playing`);
}

async function waitForRoundResult(page, timeout = 30_000) {
  await page
    .locator("text=/You got it|Opponent got it first/")
    .first()
    .waitFor({ timeout });
}

async function isOnResultScreen(page) {
  const a = await page.locator("text=CHAMPION!").isVisible().catch(() => false);
  const b = await page.locator("text=Good Game!").isVisible().catch(() => false);
  return a || b;
}

// ─── Single round ──────────────────────────────────────────────

async function playRound(p1, p2, roundInGame) {
  totalRounds++;
  log(`── Round ${roundInGame} (total #${totalRounds}) ──`);

  // 1️⃣  Wait for both players to reach the playing phase
  await Promise.all([
    waitForPlayingPhase(p1, "P1"),
    waitForPlayingPhase(p2, "P2"),
  ]);

  // 2️⃣  VALIDATION — both screens must show the same celebrity
  const [c1, c2] = await Promise.all([
    getCelebrityName(p1),
    getCelebrityName(p2),
  ]);

  if (c1 !== c2) {
    const msg = `Round #${totalRounds} DESYNC — P1: "${c1}" | P2: "${c2}"`;
    fail(msg);
    errors.push(msg);
  } else {
    pass(`Round #${totalRounds}: Both see "${c1}"`);
  }

  // 3️⃣  Extract the answer from React fiber
  const data = (await getGameData(p1)) || (await getGameData(p2));
  if (!data) {
    const msg = `Round #${totalRounds}: answer extraction failed`;
    fail(msg);
    errors.push(msg);
    return;
  }
  log(`Answer: "${data.answer}"`);

  // 4️⃣  Gameplay actions — varies by round to cover different scenarios
  if (totalRounds === 3) {
    // ── RACE CONDITION: both players solve simultaneously ──
    log("RACE CONDITION TEST — both solving at the same time");
    await Promise.all([
      solvePuzzle(p1, data.answer),
      solvePuzzle(p2, data.answer),
    ]);
  } else if (totalRounds === 4) {
    // ── EDGE CASE: P2 stress-submits while P1 is mid-solve ──
    log("EDGE CASE — P2 submits while P1 is typing");
    await Promise.all([
      (async () => {
        await rapidRandomClicks(p2, 15);
        await clearLetterBoxes(p2);
        await rapidRandomClicks(p2, 10);
      })(),
      (async () => {
        await p1.waitForTimeout(150);
        await solvePuzzle(p1, data.answer);
      })(),
    ]);
  } else {
    // ── Standard: one solves, the other stress-clicks ──
    const solver = roundInGame % 2 === 1 ? p1 : p2;
    const stresser = roundInGame % 2 === 1 ? p2 : p1;
    const sLbl = roundInGame % 2 === 1 ? "P1" : "P2";
    const xLbl = roundInGame % 2 === 1 ? "P2" : "P1";
    log(`${sLbl} solving, ${xLbl} stress-clicking`);

    await Promise.all([
      rapidRandomClicks(stresser, 12),
      (async () => {
        await solver.waitForTimeout(80);
        await solvePuzzle(solver, data.answer);
      })(),
    ]);
  }

  // 5️⃣  Wait for round result overlay (on either screen)
  log("Waiting for round result overlay...");
  try {
    await Promise.race([
      waitForRoundResult(p1, 20_000),
      waitForRoundResult(p2, 20_000),
    ]);
    pass(`Round #${totalRounds} completed`);
  } catch {
    warn("Round result overlay not detected — continuing");
  }

  // Let overlays and transitions finish
  await p1.waitForTimeout(4_500);
}

// ─── Single game (best of 3) ──────────────────────────────────

async function playGame(p1, p2, gameNum) {
  log(`\n${"─".repeat(50)}`);
  log(`GAME ${gameNum}`);
  log("─".repeat(50));

  await Promise.all([goToDuelLobby(p1, "P1"), goToDuelLobby(p2, "P2")]);

  const code = await createSpeedRoom(p1);
  await joinRoom(p2, code);

  log("Waiting through bet → countdown → wheel...");

  let roundInGame = 0;

  while (true) {
    roundInGame++;

    await playRound(p1, p2, roundInGame);

    const gameOver =
      (await isOnResultScreen(p1)) || (await isOnResultScreen(p2));

    if (gameOver) {
      log(`Game ${gameNum} finished after ${roundInGame} round(s)`);
      return;
    }

    log("Round transition → next round...");
    await p1.waitForTimeout(3_000);
  }
}

// ─── Main ──────────────────────────────────────────────────────

(async () => {
  console.log("\n" + "═".repeat(62));
  console.log(
    `${C.bold}${C.cyn}  ⚡ Multiplayer Speed Room — Stress Test${C.r}`
  );
  console.log(`${C.dim}  Target: ${ROUND_TARGET} rounds across multiple games${C.r}`);
  console.log("═".repeat(62) + "\n");

  const browser = await chromium.launch({ headless: false });

  let p1, p2;
  try {
    p1 = await setupPlayer(browser, "StressP1");
    p2 = await setupPlayer(browser, "StressP2");

    let gameNum = 0;
    while (totalRounds < ROUND_TARGET) {
      gameNum++;
      await playGame(p1, p2, gameNum);

      if (totalRounds < ROUND_TARGET) {
        log("Both players exiting...");
        for (const pg of [p1, p2]) {
          const btn = pg.locator("button", { hasText: "Back to Menu" });
          if (await btn.isVisible().catch(() => false)) {
            await btn.click().catch(() => {});
            await pg.waitForTimeout(500);
          }
        }
        // Reload for clean state
        await Promise.all([
          p1.reload({ waitUntil: "networkidle" }),
          p2.reload({ waitUntil: "networkidle" }),
        ]);
      }
    }
  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
    errors.push(`Fatal: ${err.message}`);
  }

  // ─── Summary ─────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  console.log(`${C.bold}${C.cyn}  SUMMARY${C.r}`);
  console.log("═".repeat(62));
  console.log(`  Rounds played  : ${totalRounds}`);
  console.log(`  Sync errors    : ${errors.length}`);
  console.log("");

  if (errors.length === 0) {
    pass("ALL ROUNDS SYNCED — no desync detected");
  } else {
    fail(`${errors.length} error(s) found:`);
    errors.forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
  }

  console.log("\n" + "═".repeat(62) + "\n");

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
