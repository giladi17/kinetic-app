/**
 * WhoOops! Comprehensive Test Script
 * Tests: initial screen, tutorial/game, spelling ELON MASK, win screen,
 * next level, coin shop, settings.
 */
import { chromium } from "playwright";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const SCREENSHOTS_DIR = join(process.cwd(), "test-screenshots");
const ELON_MASK_LETTERS = ["E", "L", "O", "N", "M", "A", "S", "K"];

async function main() {
  const errors = [];
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error" || type === "warning") {
      errors.push(`[${type}] ${text}`);
    }
  });

  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));

  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  try {
    console.log("1. Navigating to http://localhost:5173/");
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle", timeout: 10000 });

    // Reset state for consistent test: Level 1, tutorial may or may not show
    await page.evaluate(() => {
      localStorage.setItem("whooops_current_level", "1");
      localStorage.setItem("whooops_tutorial_seen", "false");
      location.reload();
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // 1. Screenshot whatever appears first
    console.log("1. Screenshot of initial screen");
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "01-initial-screen.png") });

    // 2. If tutorial shows, click through it
    const tutorialVisible = await page.locator('text="How does it work?"').isVisible().catch(() => false);
    if (tutorialVisible) {
      console.log("2. Tutorial visible - clicking through...");
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(400);
      await page.click('button:has-text("A")');
      await page.waitForTimeout(1000);
      await page.click('button:has-text("Let\'s Play")');
      await page.waitForTimeout(500);
    } else {
      console.log("2. Game screen visible - skipping tutorial");
    }

    // 3. Spell ELON MASK - click E, L, O, N, M, A, S, K in order
    console.log("3. Spelling ELON MASK...");
    for (let i = 0; i < ELON_MASK_LETTERS.length; i++) {
      const letter = ELON_MASK_LETTERS[i];
      const btn = page.locator("button.w-11").filter({ hasText: new RegExp(`^${letter}$`) }).first();
      await btn.click();
      await page.waitForTimeout(120);

      if (i === 2) {
        console.log("   Screenshot after 3 letters (E,L,O)");
        await page.screenshot({ path: join(SCREENSHOTS_DIR, "02-letters-partial.png") });
      }
    }

    await page.waitForTimeout(1800); // Wait for win confetti animation

    // 4. Win screen with confetti
    console.log("4. Win screen screenshot");
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "03-win-screen.png") });

    // 5. Click Next Level
    console.log("5. Clicking Next Level");
    await page.click('button:has-text("Next Level")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "04-level-2.png") });

    // 6. Click coins button to open Coin Shop
    console.log("6. Opening Coin Shop");
    await page.click('button:has-text("🪙")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "05-coin-shop.png") });

    // 7. Close shop, click settings gear
    console.log("7. Closing shop, opening Settings");
    await page.click('button:has-text("✕")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("⚙️")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "06-settings.png") });

    console.log("\nScreenshots saved to:", SCREENSHOTS_DIR);
    if (errors.length > 0) {
      console.log("\n--- Console/Page errors ---");
      errors.forEach((e) => console.log(e));
    }
  } catch (err) {
    console.error("Test failed:", err.message);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "error-state.png") });
    throw err;
  } finally {
    await browser.close();
  }
}

main();
