/**
 * WhoOops! Images & Clue Text Test
 * Tests: AI-generated images, clue text, answer visibility
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
    console.log("Navigating to http://localhost:5173/");
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle", timeout: 10000 });

    // Clear localStorage for fresh start
    console.log("Clearing localStorage and reloading...");
    await page.evaluate(() => {
      localStorage.clear();
      location.reload();
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // 1. Tutorial step 1 - photo + clue "Elon in the COVID-19 🦠"
    console.log("1. Tutorial step 1 - screenshot");
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "01-tutorial-step1.png") });

    const tutorialImg = await page.locator('img[alt="Mystery celebrity"]').first();
    const imgSrc = await tutorialImg.getAttribute("src").catch(() => null);
    const imgNaturalWidth = await tutorialImg.evaluate((el) => el.naturalWidth).catch(() => 0);
    const clueText = await page.locator('p.italic').first().textContent().catch(() => "");
    console.log("   Image src:", imgSrc, "| naturalWidth:", imgNaturalWidth, "| clue:", clueText?.trim());

    // 2. Wait for auto-advance, click A, click Let's Play
    console.log("2. Waiting 2.5s for auto-advance...");
    await page.waitForTimeout(2600);
    await page.click('button:has-text("A")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Let\'s Play")');
    await page.waitForTimeout(600);

    // 3. Main game screen - Level 1
    console.log("3. Game screen Level 1 - screenshot");
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "02-game-level1.png") });

    const gameImg = await page.locator("main img").first();
    const gameImgSrc = await gameImg.getAttribute("src").catch(() => null);
    const gameImgWidth = await gameImg.evaluate((el) => el.naturalWidth).catch(() => 0);
    const gameClue = await page.locator("main p.italic").first().textContent().catch(() => "");
    const answerVisible = await page.locator("main").evaluate((el) => el.textContent?.includes("ELON MASK") ?? false);
    const answerOverlay = await page.locator('[class*="bg-black/50"]').filter({ hasText: "ELON MASK" }).isVisible().catch(() => false);
    console.log("   Game image src:", gameImgSrc, "| naturalWidth:", gameImgWidth);
    console.log("   Clue text:", gameClue?.trim());
    console.log("   Answer visible (before win):", answerVisible, "| Answer overlay:", answerOverlay);

    // 4. Spell ELON MASK, screenshot win state
    console.log("4. Spelling ELON MASK...");
    for (const letter of ELON_MASK_LETTERS) {
      const btn = page.locator("button").filter({ hasText: new RegExp(`^${letter}$`) }).first();
      await btn.click();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "03-win-state.png") });

    const winAnswerVisible = await page.locator("main").evaluate((el) => el.textContent?.includes("ELON MASK") ?? false);
    const winAnswerOverlay = await page.locator('[class*="bg-black/50"]').filter({ hasText: "ELON MASK" }).isVisible().catch(() => false);
    console.log("   Answer visible (after win):", winAnswerVisible, "| Answer overlay:", winAnswerOverlay);

    // 5. Click Next Level, screenshot Level 2
    console.log("5. Clicking Next Level...");
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Next Level")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "04-level2.png") });

    const level2Content = await page.locator("main").textContent().catch(() => "");
    const level2HasEmoji = level2Content?.includes("🍓") ?? false;
    const level2Clue = await page.locator("main p.italic").first().textContent().catch(() => "");
    console.log("   Level 2 has strawberry emoji:", level2HasEmoji);
    console.log("   Level 2 clue:", level2Clue?.trim());

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
