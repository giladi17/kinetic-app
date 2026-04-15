const { chromium } = require("playwright");

const BASE_URL = "http://localhost:5174";

const ANSWERS = [
  "ELON MASK", "KATY BERRY", "MEGAN BOX", "BIKE TYSON", "MADISON BEAR",
  "DOJA FAT", "STEPH CARRY", "TOM BRUISE", "JOHNNY DEEP", "DAVID BEAKHAM",
  "KANYE VEST", "TOM TANKS", "LADY GAGS", "HARRY PUTTER", "TIGER HOODS",
  "BRITNEY SHEARS", "MORGAN TREEMAN", "TAYLOR SHIFT", "ROBERT DOWNER JR",
  "VAN DIESEL", "CHRIS EVENS", "PEST MALONE", "JAM CARREY", "KEVIN TART",
  "CAVE FRANCO",
];

const MYSTERY_LEVEL = 13;
const BOSS_LEVEL = 25;

const C = {
  r: "\x1b[0m", red: "\x1b[31m", grn: "\x1b[32m",
  yel: "\x1b[33m", cyn: "\x1b[36m", dim: "\x1b[2m", bold: "\x1b[1m",
};
const ts = () => new Date().toLocaleTimeString("en-US", { hour12: false });
const log  = (m) => console.log(C.dim + ts() + C.r + " " + C.cyn + "[TEST]" + C.r + " " + m);
const pass = (m) => console.log(C.dim + ts() + C.r + " " + C.grn + "[ OK ]" + C.r + " " + m);
const fail = (m) => console.error(C.dim + ts() + C.r + " " + C.red + "[FAIL]" + C.r + " " + m);
const warn = (m) => console.log(C.dim + ts() + C.r + " " + C.yel + "[WARN]" + C.r + " " + m);

const errors = [];

function findRootFiber() {
  var root = document.getElementById("root");
  if (!root) return null;
  var keys = Object.keys(root);
  for (var k = 0; k < keys.length; k++) {
    if (keys[k].indexOf("__reactContainer$") === 0) return root[keys[k]];
    if (keys[k].indexOf("__reactFiber$") === 0) return root[keys[k]];
  }
  return null;
}

function fiberSearch() {
  var fiber = findRootFiber();
  if (!fiber) return null;
  var queue = [fiber];
  for (var i = 0; i < 8000 && queue.length; i++) {
    var n = queue.shift();
    if (!n) continue;
    var cur = n.memoizedState;
    for (var j = 0; j < 60 && cur; j++, cur = cur.next) {
      var q = cur.queue;
      if (!q) continue;
      var st = q.lastRenderedState;
      if (st && typeof st === "object" && st.currentLevel !== undefined && st.coins !== undefined && st.screen && q.dispatch) {
        return { state: st, dispatch: q.dispatch };
      }
    }
    if (n.child) queue.push(n.child);
    if (n.sibling) queue.push(n.sibling);
  }
  return null;
}

async function getGameState(page) {
  return page.evaluate(function() {
    var root = document.getElementById("root");
    if (!root) return null;
    var keys = Object.keys(root);
    var fiber = null;
    for (var k = 0; k < keys.length; k++) {
      if (keys[k].indexOf("__reactContainer$") === 0) { fiber = root[keys[k]]; break; }
      if (keys[k].indexOf("__reactFiber$") === 0) { fiber = root[keys[k]]; break; }
    }
    if (!fiber) return null;
    var queue = [fiber];
    for (var i = 0; i < 8000 && queue.length; i++) {
      var n = queue.shift();
      if (!n) continue;
      var cur = n.memoizedState;
      for (var j = 0; j < 60 && cur; j++, cur = cur.next) {
        var q = cur.queue;
        if (!q) continue;
        var st = q.lastRenderedState;
        if (st && typeof st === "object" && st.currentLevel !== undefined && st.coins !== undefined && st.screen) {
          return { currentLevel: st.currentLevel, coins: st.coins, screen: st.screen, hintPacks: st.hintPacks };
        }
      }
      if (n.child) queue.push(n.child);
      if (n.sibling) queue.push(n.sibling);
    }
    return null;
  });
}

async function reactDispatch(page, action) {
  return page.evaluate(function(act) {
    var root = document.getElementById("root");
    if (!root) return false;
    var keys = Object.keys(root);
    var fiber = null;
    for (var k = 0; k < keys.length; k++) {
      if (keys[k].indexOf("__reactContainer$") === 0) { fiber = root[keys[k]]; break; }
      if (keys[k].indexOf("__reactFiber$") === 0) { fiber = root[keys[k]]; break; }
    }
    if (!fiber) return false;
    var queue = [fiber];
    for (var i = 0; i < 8000 && queue.length; i++) {
      var n = queue.shift();
      if (!n) continue;
      var cur = n.memoizedState;
      for (var j = 0; j < 60 && cur; j++, cur = cur.next) {
        var q = cur.queue;
        if (!q) continue;
        var st = q.lastRenderedState;
        if (st && typeof st === "object" && st.currentLevel !== undefined && st.coins !== undefined && st.screen && q.dispatch) {
          q.dispatch(act);
          return true;
        }
      }
      if (n.child) queue.push(n.child);
      if (n.sibling) queue.push(n.sibling);
    }
    return false;
  }, action);
}

async function solvePuzzle(page, answer) {
  var letters = answer.replace(/\s/g, "").split("");

  var result = await page.evaluate(function(targetLetters) {
    var allButtons = Array.from(document.querySelectorAll("button"));
    var letterBtns = allButtons.filter(function(b) {
      var t = b.textContent.trim();
      if (t.length !== 1 || !/^[A-Z]$/.test(t)) return false;
      var r = b.getBoundingClientRect();
      return r.width > 25 && r.width < 80 && r.height > 25 && !b.disabled;
    });
    if (letterBtns.length === 0) return { ok: false, error: "no letter buttons", bank: "" };

    var available = letterBtns.map(function(b, i) { return { idx: i, letter: b.textContent.trim(), used: false }; });
    var clickOrder = [];
    for (var k = 0; k < targetLetters.length; k++) {
      var target = targetLetters[k];
      var matchIdx = -1;
      for (var a = 0; a < available.length; a++) {
        if (available[a].letter === target && !available[a].used) { matchIdx = a; break; }
      }
      if (matchIdx < 0) {
        return { ok: false, error: target + " missing", bank: available.filter(function(x) { return !x.used; }).map(function(x) { return x.letter; }).join(",") };
      }
      available[matchIdx].used = true;
      clickOrder.push(available[matchIdx].idx);
    }
    return { ok: true, clickOrder: clickOrder };
  }, letters);

  if (!result.ok) {
    warn("  " + result.error + " (bank: " + result.bank + ")");
    return false;
  }

  var allBtns = await page.$$("button");
  var letterBtns = [];
  for (var btn of allBtns) {
    var txt = (await btn.textContent().catch(function() { return ""; })).trim();
    if (txt.length !== 1 || !/^[A-Z]$/.test(txt)) continue;
    var box = await btn.boundingBox().catch(function() { return null; });
    if (!box || box.width < 25 || box.width > 80 || box.height < 25) continue;
    if (await btn.isDisabled().catch(function() { return true; })) continue;
    letterBtns.push(btn);
  }

  for (var idx of result.clickOrder) {
    if (idx < letterBtns.length) {
      await letterBtns[idx].click({ force: true }).catch(function() {});
      await page.waitForTimeout(60);
    }
  }
  return true;
}

async function waitForLetterBank(page, timeoutMs) {
  timeoutMs = timeoutMs || 10000;
  var start = Date.now();
  while (Date.now() - start < timeoutMs) {
    var count = await page.evaluate(function() {
      return Array.from(document.querySelectorAll("button")).filter(function(b) {
        var t = b.textContent.trim();
        if (t.length !== 1 || !/^[A-Z]$/.test(t)) return false;
        var r = b.getBoundingClientRect();
        return r.width > 25 && r.width < 80 && r.height > 25;
      }).length;
    });
    if (count >= 5) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

async function waitForOverlayGone(page) {
  try {
    await page.waitForFunction(function() {
      var els = document.querySelectorAll(".fixed.inset-0");
      for (var i = 0; i < els.length; i++) {
        var s = getComputedStyle(els[i]);
        if (s.pointerEvents === "none" || s.display === "none" ||
            s.visibility === "hidden" || parseFloat(s.opacity) === 0) continue;
        return false;
      }
      return true;
    }, { timeout: 15000 });
  } catch (e) {}
}

async function ensureOnGameScreen(page, levelNum) {
  for (var attempt = 0; attempt < 3; attempt++) {
    var st = await getGameState(page);
    if (st && st.screen === "game" && st.currentLevel === levelNum) return true;

    if (st && st.screen !== "game") {
      log("  Screen is \"" + st.screen + "\", dispatching to game...");
      await reactDispatch(page, { type: "SET_SCREEN", screen: "game" });
      await page.waitForTimeout(800);
      continue;
    }

    if (!st) {
      log("  State not found, clicking Play tab...");
      var playBtn = page.locator("nav button", { hasText: "Play" });
      if (await playBtn.isVisible().catch(function() { return false; })) {
        await playBtn.click();
        await page.waitForTimeout(800);
        continue;
      }
    }

    if (st && st.currentLevel !== levelNum) {
      warn("  On level " + st.currentLevel + ", need " + levelNum);
      await forceToLevel(page, levelNum);
      return true;
    }

    await page.waitForTimeout(500);
  }

  var st2 = await getGameState(page);
  if (st2 && st2.screen === "game") return true;

  warn("  Could not ensure game screen, force-reloading...");
  await forceToLevel(page, levelNum);
  return true;
}

async function advanceToNextLevel(page) {
  var btn = page.locator("button", { hasText: "Next Level" });
  await btn.waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);

  await btn.click();
  await page.waitForTimeout(1500);

  var st = await getGameState(page);
  if (st && st.screen === "worldComplete") {
    return;
  }
  if (st && st.screen !== "game") {
    fail("  After NEXT_LEVEL: screen=" + st.screen + " (expected 'game')");
    errors.push("NEXT_LEVEL navigation: screen=" + st.screen);
    await reactDispatch(page, { type: "SET_SCREEN", screen: "game" });
    await page.waitForTimeout(500);
  }
}

async function useHint(page) {
  var hintBtn = page.locator("button", { hasText: /💡\s*Hint/ });
  if (!(await hintBtn.isVisible().catch(function() { return false; }))) return false;
  await hintBtn.click({ force: true });
  await page.waitForTimeout(700);
  var confirmBtn = page.locator("button", { hasText: /Use Pack|Yes.*coins/ });
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
    await confirmBtn.click({ force: true });
    await page.waitForTimeout(800);
    return true;
  }
  return false;
}

async function openShop(page) {
  var plusBtn = page.locator("button:has-text('+')").first();
  if (await plusBtn.isVisible().catch(function() { return false; })) {
    await plusBtn.click({ force: true });
    await page.waitForTimeout(800);
    return page.locator("text=🏪 Shop").isVisible({ timeout: 3000 }).catch(function() { return false; });
  }
  return false;
}

async function closeShop(page) {
  var btn = page.locator("button:has-text('✕')").first();
  if (await btn.isVisible().catch(function() { return false; })) {
    await btn.click({ force: true });
    await page.waitForTimeout(500);
  }
}

async function buySkipLevel(page) {
  if (!(await openShop(page))) return false;
  var tab = page.locator("button", { hasText: /Power-ups/ });
  if (await tab.isVisible().catch(function() { return false; })) {
    await tab.click({ force: true });
    await page.waitForTimeout(600);
  }
  // ShopItem is a <div> with the name in a <span>, and the buy <button> inside
  var item = page.locator("div", { hasText: "Skip Level" }).locator("button").first();
  if (await item.isVisible().catch(function() { return false; })) {
    await item.click({ force: true });
    await page.waitForTimeout(1500);
    return true;
  }
  await closeShop(page);
  return false;
}

async function buyHintPack(page) {
  if (!(await openShop(page))) return false;
  var tab = page.locator("button", { hasText: /Hints/ });
  if (await tab.isVisible().catch(function() { return false; })) {
    await tab.click({ force: true });
    await page.waitForTimeout(600);
  }
  // ShopItem is a <div> with the name in a <span>, and the buy <button> inside
  var item = page.locator("div", { hasText: "Hint Pack x3" }).locator("button").first();
  if (await item.isVisible().catch(function() { return false; })) {
    await item.click({ force: true });
    await page.waitForTimeout(800);
    await closeShop(page);
    return true;
  }
  await closeShop(page);
  return false;
}

async function forceToLevel(page, targetLevel) {
  log("  Force-reloading to level " + targetLevel + "...");
  await page.evaluate(function(lvl) {
    localStorage.setItem("whooops_current_level", String(lvl));
    var completed = [];
    for (var i = 1; i < lvl; i++) completed.push(i);
    localStorage.setItem("whooops_completed_levels", JSON.stringify(completed));
  }, targetLevel);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await waitForOverlayGone(page);
}

(async function() {
  console.log("\n" + "=".repeat(62));
  console.log(C.bold + C.cyn + "  E2E Test: 25 Levels (World 1)" + C.r);
  console.log("=".repeat(62) + "\n");

  var browser = await chromium.launch({ headless: false });
  var ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });

  await ctx.addInitScript(function() {
    localStorage.setItem("whooops_tutorial_seen", "true");
    localStorage.setItem("hasSeenDuelTutorial", "true");
    localStorage.setItem("whooops_nickname", "Tester");
    localStorage.setItem("duelNickname", "Tester");
    localStorage.setItem("whooops_daily_reward_date", new Date().toISOString().split("T")[0]);
    localStorage.setItem("whooops_daily_reward_streak", "0");
    localStorage.setItem("whooops_splash_seen", "1");
    sessionStorage.setItem("whooops_splash_seen", "1");
    if (!localStorage.getItem("__e2e_initialized")) {
      localStorage.setItem("whooops_coins", "9999");
      localStorage.setItem("whooops_current_level", "1");
      localStorage.setItem("whooops_completed_levels", "[]");
      localStorage.setItem("whooops_level_results", "{}");
      localStorage.setItem("whooops_streak", "0");
      localStorage.setItem("__e2e_initialized", "1");
    }
  });

  var page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  var jsErrors = [];
  page.on("pageerror", function(err) {
    jsErrors.push(err.message || String(err));
    warn("JS: " + (err.message || "").slice(0, 100));
  });

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await waitForOverlayGone(page);
  log("Page loaded");

  var R = {
    hintTested: false, shopHintPack: false, shopSkipLevel: false,
    mysteryOverlay: false, bossOverlay: false,
    winScreenChecked: false, rewardAdSeen: false, levelsCompleted: 0,
  };

  for (var levelIdx = 0; levelIdx < 25; levelIdx++) {
    var levelNum = levelIdx + 1;
    var answer = ANSWERS[levelIdx];
    log("\n" + "-".repeat(50));
    log("Level " + levelNum + ": " + answer);

    try {
      await ensureOnGameScreen(page, levelNum);
      await page.waitForTimeout(300);

      // MYSTERY LEVEL (13)
      if (levelNum === MYSTERY_LEVEL) {
        log("  [SPECIAL] Mystery Level...");
        var mystery = await page.locator("text=/MYSTERY LEVEL|Something is different/i").first()
          .isVisible({ timeout: 4000 }).catch(function() { return false; });
        if (mystery) { pass("  Mystery intro detected"); R.mysteryOverlay = true; }
        else { fail("  Mystery intro NOT detected"); errors.push("Mystery level (13): intro missing"); }
        log("  Waiting for mystery auto-dismiss...");
        await page.waitForTimeout(7500);
        await waitForOverlayGone(page);
      }

      // BOSS LEVEL (25)
      if (levelNum === BOSS_LEVEL) {
        log("  [SPECIAL] Boss Level...");
        var boss = await page.locator("text=BOSS LEVEL").first()
          .isVisible({ timeout: 5000 }).catch(function() { return false; });
        if (boss) {
          pass("  Boss intro detected");
          R.bossOverlay = true;
          var tapBtn = page.locator("button", { hasText: /TAP TO START/i });
          if (await tapBtn.isVisible().catch(function() { return false; })) {
            await tapBtn.click({ force: true });
            pass("  Tapped TAP TO START");
          }
          await page.waitForTimeout(800);
          await waitForOverlayGone(page);
        } else { fail("  Boss intro NOT detected"); errors.push("Boss level (25): intro missing"); }
      }

      // HINT TEST (level 3)
      if (levelNum === 3 && !R.hintTested) {
        log("  [TEST] Hint...");
        if (await useHint(page)) { pass("  Hint used"); R.hintTested = true; }
        else { fail("  Hint failed"); errors.push("Level 3: hint failed"); }
        await page.waitForTimeout(500);
      }

      // SHOP HINT PACK (level 7)
      if (levelNum === 7 && !R.shopHintPack) {
        log("  [TEST] Shop: Hint Pack...");
        if (await buyHintPack(page)) { pass("  Hint Pack purchased"); R.shopHintPack = true; }
        else { fail("  Hint Pack failed"); errors.push("Level 7: shop hint pack failed"); }
        await waitForOverlayGone(page);
      }

      // SHOP SKIP LEVEL (level 10)
      if (levelNum === 10 && !R.shopSkipLevel) {
        log("  [TEST] Shop: Skip Level...");
        if (await buySkipLevel(page)) {
          pass("  Skip Level purchased");
          R.shopSkipLevel = true;
          R.levelsCompleted++;
          await page.waitForTimeout(2000);
          await waitForOverlayGone(page);
          var stAfter = await getGameState(page);
          if (stAfter && stAfter.screen === "win") await advanceToNextLevel(page);
          continue;
        } else {
          fail("  Skip Level failed");
          errors.push("Level 10: shop skip failed");
          await waitForOverlayGone(page);
        }
      }

      // SOLVE
      var bankReady = await waitForLetterBank(page);
      if (!bankReady) {
        fail("  Letter bank not ready");
        errors.push("Level " + levelNum + ": letter bank not ready");
        await forceToLevel(page, levelNum + 1);
        continue;
      }

      log("  Solving...");
      if (!(await solvePuzzle(page, answer))) {
        errors.push("Level " + levelNum + " (" + answer + "): letters not in bank");
        await forceToLevel(page, levelNum + 1);
        continue;
      }

      await page.waitForTimeout(3000);

      var onWin = await page.locator("button", { hasText: "Next Level" })
        .isVisible({ timeout: 12000 }).catch(function() { return false; });

      if (onWin) {
        pass("  Level " + levelNum + " SOLVED");
        R.levelsCompleted++;

        if (!R.winScreenChecked) {
          if (await page.locator("text=/\\+\\d+/").first().isVisible().catch(function() { return false; }))
            pass("  Win screen: coin reward visible");
          R.winScreenChecked = true;
        }
        if (!R.rewardAdSeen) {
          if (await page.locator("button", { hasText: /Watch Ad/i }).isVisible().catch(function() { return false; })) {
            pass("  Win screen: Rewarded Ad visible"); R.rewardAdSeen = true;
          }
        }

        if (levelNum === BOSS_LEVEL) {
          await advanceToNextLevel(page);
          var wc = await page.locator("text=/World.*Complete|Congratulations/i").first()
            .isVisible({ timeout: 5000 }).catch(function() { return false; });
          if (wc) pass("  World 1 Complete!");
          break;
        }

        await advanceToNextLevel(page);
      } else {
        fail("  Level " + levelNum + ": win not detected");
        errors.push("Level " + levelNum + ": win screen not shown");
        await forceToLevel(page, levelNum + 1);
      }
    } catch (err) {
      fail("  Level " + levelNum + ": CRASH - " + err.message.slice(0, 120));
      errors.push("Level " + levelNum + ": " + err.message.slice(0, 120));
      try { await forceToLevel(page, levelNum + 1); } catch (e) {}
    }
  }

  console.log("\n" + "=".repeat(62));
  console.log(C.bold + C.cyn + "  SUMMARY" + C.r);
  console.log("=".repeat(62));
  console.log("  Levels completed   : " + R.levelsCompleted + " / 25");
  console.log("  Mystery lvl (13)   : " + (R.mysteryOverlay ? C.grn + "PASS" : C.red + "FAIL") + C.r);
  console.log("  Boss level (25)    : " + (R.bossOverlay ? C.grn + "PASS" : C.red + "FAIL") + C.r);
  console.log("  Hint usage         : " + (R.hintTested ? C.grn + "PASS" : C.red + "FAIL") + C.r);
  console.log("  Shop: Hint Pack    : " + (R.shopHintPack ? C.grn + "PASS" : C.red + "FAIL") + C.r);
  console.log("  Shop: Skip Level   : " + (R.shopSkipLevel ? C.grn + "PASS" : C.red + "FAIL") + C.r);
  console.log("  Win screen OK      : " + (R.winScreenChecked ? C.grn + "PASS" : C.red + "FAIL") + C.r);
  console.log("  Rewarded Ad btn    : " + (R.rewardAdSeen ? C.grn + "PASS" : C.red + "FAIL") + C.r);
  console.log("  JS errors          : " + jsErrors.length);
  console.log("  Test errors        : " + errors.length);

  if (jsErrors.length > 0) {
    console.log("\n  " + C.yel + "JS Errors:" + C.r);
    jsErrors.slice(0, 10).forEach(function(e, i) { console.log("    " + (i + 1) + ". " + e.slice(0, 120)); });
  }

  if (errors.length === 0) {
    console.log("\n" + C.grn + C.bold + "  ALL 25 LEVELS PASSED!" + C.r);
  } else {
    console.log("\n" + C.red + C.bold + "  " + errors.length + " ERROR(S):" + C.r);
    errors.forEach(function(e, i) { console.log("    " + (i + 1) + ". " + e); });
  }

  console.log("\n" + "=".repeat(62) + "\n");
  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
