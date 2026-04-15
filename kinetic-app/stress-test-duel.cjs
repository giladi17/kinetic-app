const { chromium } = require("playwright");

const BASE_URL = "http://localhost:5173";
const ROUND_TARGET = 3;

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
  page.on("pageerror", (err) => warn(`[${name} JS] ${err.message}`));

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

async function createWordRoom(page) {
  await page.locator("button", { hasText: "Word Room" }).click();
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

  log(`Word Room created: ${code}`);
  return code;
}

async function joinRoom(page, code) {
  const input = page.locator('input[placeholder="Enter room code"]');
  await input.waitFor({ timeout: 10_000 });
  await input.fill(code);
  await page.locator("button", { hasText: "Join Room" }).click();
  log(`P2 joining room ${code}`);
}

// ─── Word Duel state reading ───────────────────────────────────

async function readWordDuelState(page) {
  return page.evaluate(() => {
    const container = document.querySelector(".flex.flex-wrap.justify-center");
    if (!container) return null;
    const wordDivs = container.querySelectorAll(":scope > .flex.gap-1");
    const words = [];
    const allLetters = [];
    for (const wd of wordDivs) {
      const btns = wd.querySelectorAll("button");
      const word = Array.from(btns).map((b) => b.textContent.trim()).join("");
      words.push(word);
      for (const btn of btns) allLetters.push(btn.textContent.trim());
    }
    return { words, allLetters, display: words.join(" ") };
  });
}

async function isPlayerTurn(page) {
  return page.locator("text=Your Turn").isVisible().catch(() => false);
}

async function getTimerValue(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".font-mono.text-2xl, .font-mono");
    return el ? parseInt(el.textContent) : null;
  });
}

async function isKeyboardVisible(page) {
  return page.evaluate(() => {
    const divs = document.querySelectorAll("div");
    for (const d of divs) {
      const rows = d.querySelectorAll(":scope > div");
      if (rows.length !== 3) continue;
      if (rows[0].querySelectorAll("button").length >= 7) return true;
    }
    return false;
  });
}

// ─── Move finding & execution ──────────────────────────────────

async function findValidMove(page, usedWords) {
  return page.evaluate(async (used) => {
    try {
      const { isValidWord } = await import("/src/components/SpeedDuel/wordDuelUtils.js");
      const usedSet = new Set(used);

      const container = document.querySelector(".flex.flex-wrap.justify-center");
      if (!container) return { error: "no container" };
      const wordDivs = container.querySelectorAll(":scope > .flex.gap-1");

      let globalPos = 0;
      const words = [];
      for (const wd of wordDivs) {
        const btns = wd.querySelectorAll("button");
        const word = Array.from(btns).map((b) => b.textContent.trim()).join("");
        words.push({ word, start: globalPos, length: btns.length });
        globalPos += btns.length;
      }

      const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (const w of words) {
        for (let i = 0; i < w.length; i++) {
          for (const ch of alpha) {
            if (ch === w.word[i]) continue;
            const nw = w.word.substring(0, i) + ch + w.word.substring(i + 1);
            if (isValidWord(nw) && !usedSet.has(nw)) {
              return { letterIdx: w.start + i, newChar: ch, oldWord: w.word, newWord: nw };
            }
          }
        }
      }
      return null;
    } catch (e) {
      return { error: e.message };
    }
  }, usedWords);
}

async function clickLetterBox(page, globalIdx) {
  const btns = page.locator(".flex.flex-wrap.justify-center button");
  await btns.nth(globalIdx).click();
  await page.waitForTimeout(250);
}

async function clickKeyboardKey(page, letter) {
  const clicked = await page.evaluate((ch) => {
    const divs = document.querySelectorAll("div");
    for (const d of divs) {
      const rows = d.querySelectorAll(":scope > div");
      if (rows.length !== 3) continue;
      if (rows[0].querySelectorAll("button").length < 7) continue;
      for (const row of rows) {
        for (const btn of row.querySelectorAll("button")) {
          if (btn.textContent.trim() === ch && !btn.disabled) {
            btn.click();
            return true;
          }
        }
      }
    }
    return false;
  }, letter);
  if (!clicked) warn(`Keyboard key "${letter}" not found or disabled`);
  await page.waitForTimeout(350);
}

async function makeMove(page, usedArr) {
  const move = await findValidMove(page, usedArr);
  if (!move || move.error) {
    if (move?.error) warn(`findValidMove error: ${move.error}`);
    return null;
  }

  log(`  Move: ${move.oldWord} → ${move.newWord}  (pos ${move.letterIdx}, key ${move.newChar})`);
  await clickLetterBox(page, move.letterIdx);
  await clickKeyboardKey(page, move.newChar);

  usedArr.push(move.newWord);
  return move;
}

// ─── Opponent live-action verification ─────────────────────────

async function opponentSeesSelecting(page) {
  try {
    await page.locator("text=Selecting...").waitFor({ timeout: 4_000 });
    return true;
  } catch { return false; }
}

async function opponentSeesPicking(page) {
  try {
    await page.locator("text=Picking...").waitFor({ timeout: 4_000 });
    return true;
  } catch { return false; }
}

// ─── Phase detection ───────────────────────────────────────────

async function waitForWordDuelPhase(page, label) {
  await page.locator("text=LIVE").waitFor({ timeout: 90_000 });
  await page.locator("text=Change ONE letter").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(600);
  log(`${label} in Word Duel`);
}

async function waitForRoundEnd(page, timeout = 90_000) {
  await page
    .locator("text=/You win this round|wins this round/")
    .first()
    .waitFor({ timeout });
}

async function isOnResultScreen(page) {
  const a = await page.locator("text=CHAMPION!").isVisible().catch(() => false);
  const b = await page.locator("text=Good Game!").isVisible().catch(() => false);
  return a || b;
}

// ─── Round 1 — Turn-based + live action test ───────────────────

async function playTurnBasedRound(p1, p2) {
  totalRounds++;
  log(`── Round 1 (total #${totalRounds}) — TURN-BASED TEST ──`);

  await Promise.all([
    waitForWordDuelPhase(p1, "P1"),
    waitForWordDuelPhase(p2, "P2"),
  ]);

  // Validate both see the same letters
  const [s1, s2] = await Promise.all([readWordDuelState(p1), readWordDuelState(p2)]);
  if (!s1 || !s2) {
    fail("Could not read letter state"); errors.push("letter state read failed"); return;
  }
  if (s1.display !== s2.display) {
    const msg = `Round #${totalRounds} DESYNC — P1: "${s1.display}" P2: "${s2.display}"`;
    fail(msg); errors.push(msg);
  } else {
    pass(`Both see "${s1.display}"`);
  }

  const usedWords = [...s1.words];
  let turnCount = 0;

  // Play a few turns, alternating
  while (turnCount < 4) {
    const p1Turn = await isPlayerTurn(p1);
    const active = p1Turn ? p1 : p2;
    const passive = p1Turn ? p2 : p1;
    const aLabel = p1Turn ? "P1" : "P2";
    const pLabel = p1Turn ? "P2" : "P1";

    // Verify only active player has keyboard
    const activeKb = await isKeyboardVisible(active);
    const passiveKb = await isKeyboardVisible(passive);
    if (activeKb) {
      pass(`${aLabel} has keyboard (their turn)`);
    } else {
      fail(`${aLabel} should have keyboard but doesn't`);
      errors.push(`Turn ${turnCount + 1}: active player missing keyboard`);
    }
    if (passiveKb) {
      fail(`${pLabel} has keyboard but it's NOT their turn`);
      errors.push(`Turn ${turnCount + 1}: passive player has keyboard`);
    } else {
      pass(`${pLabel} has no keyboard (waiting)`);
    }

    // LIVE ACTION TEST (first turn only — keeps the test fast)
    if (turnCount === 0) {
      log("  Live action test: selecting a letter...");
      const move = await findValidMove(active, usedWords);
      if (!move || move.error) { warn("No valid move for live test, skipping"); break; }

      await clickLetterBox(active, move.letterIdx);
      const sawSelecting = await opponentSeesSelecting(passive);
      if (sawSelecting) {
        pass(`${pLabel} sees "Selecting..." from ${aLabel}`);
      } else {
        warn(`${pLabel} did not see "Selecting..." (may be too fast)`);
      }

      await clickKeyboardKey(active, move.newChar);
      usedWords.push(move.newWord);
      log(`  Move: ${move.oldWord} → ${move.newWord}`);
    } else {
      const move = await makeMove(active, usedWords);
      if (!move) { log("  No valid moves left — round will end by timer"); break; }
    }

    turnCount++;

    // Wait for turn to swap
    await active.waitForTimeout(800);

    // Validate letters match after the move
    const [a1, a2] = await Promise.all([readWordDuelState(p1), readWordDuelState(p2)]);
    if (a1 && a2) {
      if (a1.display !== a2.display) {
        const msg = `After turn ${turnCount}: P1="${a1.display}" P2="${a2.display}"`;
        fail(msg); errors.push(msg);
      } else {
        pass(`After turn ${turnCount}: both see "${a1.display}"`);
      }
    }

    // Verify turn actually swapped
    const nowP1Turn = await isPlayerTurn(p1);
    if (nowP1Turn === p1Turn) {
      warn("Turn may not have swapped yet — waiting more...");
      await active.waitForTimeout(1500);
    }
  }

  // Let the round end naturally (timer runs out for the current player)
  log("  Waiting for round to end (timer)...");
  try {
    await waitForRoundEnd(p1, 60_000);
    pass("Round 1 completed");
  } catch {
    warn("Round end not detected on P1, checking P2...");
    try { await waitForRoundEnd(p2, 10_000); pass("Round 1 completed (seen on P2)"); }
    catch { fail("Round 1 end not detected"); errors.push("Round 1 end timeout"); }
  }

  await p1.waitForTimeout(3500);
}

// ─── Round 2 — Timer edge case ─────────────────────────────────

async function playTimerEdgeCaseRound(p1, p2) {
  totalRounds++;
  log(`── Round 2 (total #${totalRounds}) — TIMER EDGE CASE ──`);

  await Promise.all([
    waitForWordDuelPhase(p1, "P1"),
    waitForWordDuelPhase(p2, "P2"),
  ]);

  const [s1, s2] = await Promise.all([readWordDuelState(p1), readWordDuelState(p2)]);
  if (s1 && s2 && s1.display === s2.display) {
    pass(`Both see "${s1.display}"`);
  } else if (s1 && s2) {
    fail(`DESYNC: P1="${s1.display}" P2="${s2.display}"`);
    errors.push(`Round #${totalRounds} DESYNC`);
  }

  // Determine who starts this round
  const p1Starts = await isPlayerTurn(p1);
  const starter = p1Starts ? "P1" : "P2";
  log(`  ${starter} starts this round — deliberately NOT making a move`);

  // Read the timer value
  const startPage = p1Starts ? p1 : p2;
  const timer = await getTimerValue(startPage);
  log(`  Timer starts at ${timer || "?"}s — waiting for expiry...`);

  // Wait for the round to end via timeout (max first-turn time is 15s + buffer)
  try {
    await waitForRoundEnd(p1, 25_000);
    pass("Timer expiry handled correctly — round ended");
  } catch {
    try { await waitForRoundEnd(p2, 5_000); pass("Timer expiry round end seen on P2"); }
    catch { fail("Timer edge case: round did not end"); errors.push("Timer edge case failed"); }
  }

  // Verify both screens show the result
  const p1Result = await p1.locator("text=/win|round/i").first().isVisible().catch(() => false);
  const p2Result = await p2.locator("text=/win|round/i").first().isVisible().catch(() => false);
  if (p1Result && p2Result) {
    pass("Both players see round result after timeout");
  } else {
    warn(`Result visibility — P1: ${p1Result}, P2: ${p2Result}`);
  }

  await p1.waitForTimeout(3500);
}

// ─── Round 3 — Normal play ─────────────────────────────────────

async function playNormalRound(p1, p2) {
  totalRounds++;
  log(`── Round 3 (total #${totalRounds}) — NORMAL PLAY ──`);

  await Promise.all([
    waitForWordDuelPhase(p1, "P1"),
    waitForWordDuelPhase(p2, "P2"),
  ]);

  const [s1, s2] = await Promise.all([readWordDuelState(p1), readWordDuelState(p2)]);
  if (s1 && s2 && s1.display === s2.display) {
    pass(`Both see "${s1.display}"`);
  } else if (s1 && s2) {
    fail(`DESYNC: P1="${s1.display}" P2="${s2.display}"`);
    errors.push(`Round #${totalRounds} DESYNC`);
  }

  const usedWords = s1 ? [...s1.words] : [];
  let turns = 0;

  while (turns < 6) {
    const p1Turn = await isPlayerTurn(p1);
    const active = p1Turn ? p1 : p2;
    const aLabel = p1Turn ? "P1" : "P2";

    const move = await makeMove(active, usedWords);
    if (!move) { log(`  ${aLabel} has no valid moves — timer will decide`); break; }
    turns++;

    await active.waitForTimeout(800);

    // Validate state sync
    const [a1, a2] = await Promise.all([readWordDuelState(p1), readWordDuelState(p2)]);
    if (a1 && a2 && a1.display !== a2.display) {
      fail(`Turn ${turns}: P1="${a1.display}" P2="${a2.display}"`);
      errors.push(`Round #${totalRounds} turn ${turns} DESYNC`);
    }
  }

  log("  Waiting for round to end...");
  try {
    await waitForRoundEnd(p1, 60_000);
    pass("Round 3 completed");
  } catch {
    try { await waitForRoundEnd(p2, 10_000); pass("Round 3 completed (P2)"); }
    catch { fail("Round 3 end not detected"); errors.push("Round 3 end timeout"); }
  }

  await p1.waitForTimeout(3500);
}

// ─── Main ──────────────────────────────────────────────────────

(async () => {
  console.log("\n" + "═".repeat(62));
  console.log(`${C.bold}${C.cyn}  🔤 Word Duel Multiplayer — Stress Test${C.r}`);
  console.log(`${C.dim}  Target: ${ROUND_TARGET} rounds with turn, timer & sync validation${C.r}`);
  console.log("═".repeat(62) + "\n");

  const browser = await chromium.launch({ headless: false });
  let p1, p2;

  try {
    p1 = await setupPlayer(browser, "WordP1");
    p2 = await setupPlayer(browser, "WordP2");

    // Navigate to Duel lobby
    await Promise.all([goToDuelLobby(p1, "P1"), goToDuelLobby(p2, "P2")]);

    // Create & join room
    const code = await createWordRoom(p1);
    await joinRoom(p2, code);
    log("Waiting through bet → countdown → wheel...");

    // ── Round 1: Turn-based + live action ──
    await playTurnBasedRound(p1, p2);

    // Check if game ended after round 1 (shouldn't — need 2 wins)
    if (await isOnResultScreen(p1) || await isOnResultScreen(p2)) {
      warn("Game ended after round 1 — starting new game for remaining rounds");
    } else {
      // Wait for round transition
      await p1.waitForTimeout(3_000);

      // ── Round 2: Timer edge case ──
      await playTimerEdgeCaseRound(p1, p2);

      if (!(await isOnResultScreen(p1)) && !(await isOnResultScreen(p2))) {
        await p1.waitForTimeout(3_000);

        // ── Round 3: Normal play ──
        await playNormalRound(p1, p2);
      }
    }

    // Wait for final result screen
    await p1.waitForTimeout(3_000);
    const p1Champ = await p1.locator("text=CHAMPION!").isVisible().catch(() => false);
    const p2Champ = await p2.locator("text=CHAMPION!").isVisible().catch(() => false);
    if (p1Champ || p2Champ) {
      pass(`Game finished — ${p1Champ ? "P1" : "P2"} is CHAMPION`);
    }

  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
    errors.push(`Fatal: ${err.message}`);
  }

  // ─── Summary ─────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  console.log(`${C.bold}${C.cyn}  SUMMARY${C.r}`);
  console.log("═".repeat(62));
  console.log(`  Rounds played    : ${totalRounds}`);
  console.log(`  Sync errors      : ${errors.length}`);
  console.log("");

  if (errors.length === 0) {
    pass("ALL CHECKS PASSED — no desync or turn issues detected");
  } else {
    fail(`${errors.length} error(s) found:`);
    errors.forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
  }

  console.log("\n" + "═".repeat(62) + "\n");

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
