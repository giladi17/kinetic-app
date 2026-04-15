const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

const C = {
  r: "\x1b[0m", red: "\x1b[31m", grn: "\x1b[32m",
  yel: "\x1b[33m", cyn: "\x1b[36m", dim: "\x1b[2m", bold: "\x1b[1m",
};
const ts = () => new Date().toLocaleTimeString("en-US", { hour12: false });
const log  = (m) => console.log(`${C.dim}${ts()}${C.r} ${C.cyn}[TEST]${C.r} ${m}`);
const pass = (m) => console.log(`${C.dim}${ts()}${C.r} ${C.grn}[ OK ]${C.r} ${m}`);
const fail = (m) => console.error(`${C.dim}${ts()}${C.r} ${C.red}[FAIL]${C.r} ${m}`);
const warn = (m) => console.log(`${C.dim}${ts()}${C.r} ${C.yel}[WARN]${C.r} ${m}`);

// Parse duelLevels.js to build original→[answers] lookup (multiple possible answers per celeb)
function buildAnswerLookup() {
  const levelsFile = fs.readFileSync(path.join(__dirname, "src/data/duelLevels.js"), "utf-8");
  const lookup = {};
  const re = /answer:\s*"([^"]+)"[\s\S]*?original:\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(levelsFile)) !== null) {
    const original = match[2];
    const answer = match[1].replace(/\s+/g, "");
    if (!lookup[original]) lookup[original] = [];
    lookup[original].push(answer);
  }
  return lookup;
}

const ANSWER_LOOKUP = buildAnswerLookup();
log(`Loaded ${Object.keys(ANSWER_LOOKUP).length} level answers`);

const errors = [];

async function setupPlayer(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
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
  page.on("pageerror", (err) => warn(`[${name} JS] ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "warning" || msg.type() === "error") {
      const text = msg.text();
      if (text.includes("duel") || text.includes("Firebase") || text.includes("history") || text.includes("PERMISSION_DENIED")) {
        warn(`[${name} console.${msg.type()}] ${text}`);
      }
    }
  });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  log(`${name} ready`);
  return page;
}

async function goToDuelLobby(page, label) {
  await page.evaluate(() => localStorage.setItem("whooops_coins", "9999"));
  const tab = page.locator("nav button", { hasText: "Duel" });
  await tab.waitFor({ timeout: 15_000 });
  await tab.click();
  await page.waitForTimeout(600);
  log(`${label} → Duel lobby`);
}

async function getCoins(page) {
  return page.evaluate(() => parseInt(localStorage.getItem("whooops_coins") || "0"));
}

async function createSpeedRoom(page) {
  await page.locator("button", { hasText: "Speed Room" }).click();
  await page.locator("text=Waiting for opponent").waitFor({ timeout: 20_000 });

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
  log(`Speed Room created: ${code}`);
  return code;
}

async function joinRoom(page, code) {
  const input = page.locator('input[placeholder="Enter room code"]');
  await input.waitFor({ timeout: 10_000 });
  await input.fill(code);
  await page.locator("button", { hasText: "Join Room" }).click();
  log(`P2 joining room ${code}`);
}

async function waitForGameplay(page, label, timeout = 60_000) {
  await page.locator("text=LIVE").waitFor({ timeout });
  log(`${label} in gameplay`);
}

async function solveSpeedRound(page, label, answerLookup) {
  await page.waitForTimeout(2000);

  const original = await page.evaluate(() => {
    const h2 = document.querySelector("h2.text-lg.font-extrabold");
    return h2 ? h2.textContent.trim() : null;
  });

  if (!original) { warn(`${label}: No celebrity name found`); return false; }

  const possibleAnswers = answerLookup[original];
  if (!possibleAnswers || possibleAnswers.length === 0) {
    warn(`${label}: No answer found for "${original}" in lookup table`);
    return false;
  }

  log(`${label}: Celebrity "${original}" → ${possibleAnswers.length} possible answer(s)`);

  const solved = await page.evaluate((answers) => {
    const bankContainer = document.querySelector(".flex-col.mt-2");
    if (!bankContainer) return { error: "no bank container" };
    const bankBtns = Array.from(bankContainer.querySelectorAll("button.shrink-0"));
    if (bankBtns.length === 0) return { error: "no bank buttons" };

    for (const answer of answers) {
      const usedIdx = new Set();
      const sequence = [];
      let valid = true;

      for (const ch of answer) {
        let found = false;
        for (let i = 0; i < bankBtns.length; i++) {
          if (usedIdx.has(i)) continue;
          if (bankBtns[i].textContent.trim() === ch) {
            sequence.push(i);
            usedIdx.add(i);
            found = true;
            break;
          }
        }
        if (!found) { valid = false; break; }
      }

      if (valid) return { sequence, answer };
    }

    const avail = bankBtns.map(b => b.textContent.trim()).join(",");
    return { error: `None of [${answers.join(", ")}] matched bank: [${avail}]` };
  }, possibleAnswers);

  if (solved.error) {
    warn(`${label}: ${solved.error}`);
    return false;
  }

  for (const idx of solved.sequence) {
    await page.evaluate((i) => {
      const bc = document.querySelector(".flex-col.mt-2");
      if (bc) { const btns = bc.querySelectorAll("button.shrink-0"); if (btns[i]) btns[i].click(); }
    }, idx);
    await page.waitForTimeout(80);
  }

  pass(`${label}: Solved "${solved.answer}" (${solved.sequence.length} letters)`);
  return true;
}

async function waitForRoundOverlay(page, timeout = 15_000) {
  return page.evaluate((to) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const poll = setInterval(() => {
        const overlays = document.querySelectorAll(".fixed.inset-0");
        for (const el of overlays) {
          const t = el.textContent || "";
          if (t.includes("You got it")) { clearInterval(poll); resolve("win"); return; }
          if (t.includes("Opponent got it")) { clearInterval(poll); resolve("lose"); return; }
        }
        if (Date.now() - start > to) { clearInterval(poll); resolve(null); }
      }, 150);
    });
  }, timeout);
}

async function waitForResultScreen(page, label, timeout = 30_000) {
  try {
    await page.locator("text=/CHAMPION|Good Game/").first().waitFor({ timeout });
    const isChamp = await page.locator("text=CHAMPION").isVisible().catch(() => false);
    const result = isChamp ? "WON" : "LOST";
    log(`${label}: Final → ${result}`);
    return result;
  } catch {
    warn(`${label}: Result screen not detected`);
    return null;
  }
}

async function checkDuelHistory(page, label) {
  const nav = page.locator("nav button", { hasText: "Wins" });
  if (!(await nav.isVisible().catch(() => false))) {
    warn(`${label}: Wins tab not visible`);
    return false;
  }
  await nav.click();
  await page.waitForTimeout(800);

  const duelTab = page.locator("button", { hasText: "Duel History" });
  if (!(await duelTab.isVisible().catch(() => false))) {
    fail(`${label}: "Duel History" tab missing`);
    errors.push(`${label}: No duel history tab`);
    return false;
  }
  await duelTab.click();
  await page.waitForTimeout(3000);

  const debugInfo = await page.evaluate(() => {
    const body = document.body.innerText;
    const hasLoading = body.includes("Loading...");
    const hasNoDuels = body.includes("No duels yet");
    let winCount = 0, loseCount = 0;
    for (const el of document.querySelectorAll("span")) {
      const t = el.textContent.trim();
      if (t === "WIN") winCount++;
      if (t === "LOSE") loseCount++;
    }
    return { hasLoading, hasNoDuels, winCount, loseCount, deviceId: localStorage.getItem("whooops_device_id") };
  });

  log(`${label}: History debug — loading:${debugInfo.hasLoading} noDuels:${debugInfo.hasNoDuels} wins:${debugInfo.winCount} loses:${debugInfo.loseCount} deviceId:${debugInfo.deviceId}`);

  const count = debugInfo.winCount + debugInfo.loseCount;

  if (count > 0) {
    pass(`${label}: Duel History has ${count} entries`);
    return true;
  } else {
    fail(`${label}: Duel History EMPTY`);
    errors.push(`${label}: Empty duel history`);
    return false;
  }
}

(async () => {
  console.log("\n" + "=".repeat(62));
  console.log(`${C.bold}${C.cyn}  ⚡ Speed Duel — Full Integration Test v3${C.r}`);
  console.log(`${C.dim}  Auto-solves puzzles, checks coins/history/disconnect${C.r}`);
  console.log("=".repeat(62) + "\n");

  const browser = await chromium.launch({ headless: false });
  let p1, p2;

  try {
    p1 = await setupPlayer(browser, "SpeedP1");
    p2 = await setupPlayer(browser, "SpeedP2");

    await Promise.all([goToDuelLobby(p1, "P1"), goToDuelLobby(p2, "P2")]);

    const p1Start = await getCoins(p1);
    const p2Start = await getCoins(p2);
    log(`Starting coins — P1: ${p1Start}, P2: ${p2Start}`);

    // ═════════════════════════════════════════
    log("═══ GAME: Speed Duel ═══");
    // ═════════════════════════════════════════

    const code = await createSpeedRoom(p1);
    await joinRoom(p2, code);

    await waitForGameplay(p1, "P1", 60_000);
    pass("Gameplay started");

    let p1Wins = 0, p2Wins = 0;
    for (let round = 1; round <= 3; round++) {
      log(`── Round ${round} ──`);
      await p1.waitForTimeout(800);

      const solved = await solveSpeedRound(p1, "P1", ANSWER_LOOKUP);
      if (!solved) {
        warn("Could not auto-solve, waiting for hints...");
        await p1.waitForTimeout(80_000);
      }

      const [r1, r2] = await Promise.all([
        waitForRoundOverlay(p1, 20_000),
        waitForRoundOverlay(p2, 20_000),
      ]);

      log(`  P1: ${r1 || "?"}, P2: ${r2 || "?"}`);
      if (r1 === "win") p1Wins++;
      else if (r1 === "lose") p2Wins++;

      if (p1Wins >= 2 || p2Wins >= 2) {
        log(`  Match decided: P1=${p1Wins} P2=${p2Wins}`);
        break;
      }

      log("  Next round...");
      await p1.waitForTimeout(5000);
      try { await waitForGameplay(p1, "P1", 20_000); } catch { break; }
    }

    await p1.waitForTimeout(2000);
    const [res1, res2] = await Promise.all([
      waitForResultScreen(p1, "P1", 20_000),
      waitForResultScreen(p2, "P2", 20_000),
    ]);

    if (res1 && res2) {
      pass("Both on result screen");
      if ((res1 === "WON" && res2 === "LOST") || (res1 === "LOST" && res2 === "WON")) {
        pass("Results consistent");
      } else {
        fail(`Inconsistent: P1=${res1} P2=${res2}`);
        errors.push("Inconsistent results");
      }
    } else {
      fail("Result screen not reached by both players");
      errors.push("Result screen missing");
    }

    // ═══ COINS ═══
    await p1.waitForTimeout(500);
    const p1End = await getCoins(p1);
    const p2End = await getCoins(p2);
    log(`Coins — P1: ${p1Start}→${p1End} (${p1End - p1Start >= 0 ? "+" : ""}${p1End - p1Start}), P2: ${p2Start}→${p2End} (${p2End - p2Start >= 0 ? "+" : ""}${p2End - p2Start})`);

    const winnerLabel = res1 === "WON" ? "P1" : "P2";
    const winnerDelta = winnerLabel === "P1" ? (p1End - p1Start) : (p2End - p2Start);
    if (winnerDelta > 0) pass(`${winnerLabel} (winner) gained ${winnerDelta} coins`);
    else if (res1 || res2) { fail(`Winner coin delta: ${winnerDelta}`); errors.push("Winner coins wrong"); }

    // ═══ REMATCH BUTTON ═══
    for (const [pg, lbl] of [[p1, "P1"], [p2, "P2"]]) {
      const vis = await pg.locator("button", { hasText: "Rematch" }).isVisible().catch(() => false);
      if (vis) pass(`${lbl}: Rematch button visible`);
      else warn(`${lbl}: Rematch button not visible`);
    }

    // ═══ DISCONNECT TEST ═══
    log("═══ Disconnect test: winner exits ═══");
    const winnerPage = res1 === "WON" ? p1 : p2;
    const loserPage = res1 === "WON" ? p2 : p1;
    const wLbl = res1 === "WON" ? "P1" : "P2";
    const lLbl = res1 === "WON" ? "P2" : "P1";

    const exitBtn = winnerPage.locator("button", { hasText: "Back to Menu" });
    if (await exitBtn.isVisible().catch(() => false)) {
      await exitBtn.click();
      log(`${wLbl} exited`);
    }

    await loserPage.waitForTimeout(3000);
    const falseDisc = await loserPage.locator("text=Opponent Left").isVisible().catch(() => false);
    if (falseDisc) {
      fail(`${lLbl} sees "Opponent Left" — BUG`);
      errors.push("False disconnect");
    } else {
      pass(`${lLbl} stays on result — no false disconnect`);
    }

    const loserExit = loserPage.locator("button", { hasText: "Back to Menu" });
    if (await loserExit.isVisible().catch(() => false)) {
      await loserExit.click();
      await loserPage.waitForTimeout(1000);
    }

    // ═══ DUEL HISTORY ═══
    log("═══ Duel History check (waiting 5s for Firebase writes) ═══");
    await p1.waitForTimeout(5000);
    await checkDuelHistory(p1, "P1");
    await checkDuelHistory(p2, "P2");

  } catch (err) {
    fail(`Fatal: ${err.message}`);
    errors.push(`Fatal: ${err.message}`);
  }

  // Summary
  console.log("\n" + "=".repeat(62));
  if (errors.length === 0) {
    pass(`ALL ${C.bold}CHECKS PASSED${C.r}${C.grn}`);
  } else {
    fail(`${errors.length} error(s):`);
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }
  console.log("=".repeat(62) + "\n");

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
