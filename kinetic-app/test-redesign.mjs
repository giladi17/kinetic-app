/**
 * WhoOops! Redesign Test Script
 * Tests: new color scheme, tutorial auto-advance, layout order,
 * IAP items, settings options.
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

    await page.evaluate(() => {
      localStorage.setItem("whooops_current_level", "1");
      localStorage.setItem("whooops_tutorial_seen", "false");
      location.reload();
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // 1. Screenshot whatever appears first
    console.log("1. Screenshot of initial screen");
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "01-initial.png") });

    // 2. If tutorial: wait 2.5s for auto-advance to step 2, verify Skip Tutorial, screenshot
    const tutorialVisible = await page.locator('text="How does it work?"').isVisible().catch(() => false);
    if (tutorialVisible) {
      console.log("2. Waiting 2.5s for step 1 to auto-advance to step 2...");
      await page.waitForTimeout(2600);

      const skipLink = await page.getByText(/Skip Tutorial/).isVisible().catch(() => false);
      console.log("   Skip Tutorial link visible:", skipLink);

      console.log("   Screenshot of step 2");
      await page.screenshot({ path: join(SCREENSHOTS_DIR, "02-tutorial-step2.png") });

      // 3. Click A button, wait for step 3
      console.log("3. Clicking A button...");
      await page.click('button:has-text("A")');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, "03-tutorial-step3.png") });

      // 4. Click Let's Play!
      console.log("4. Clicking Let's Play!");
      await page.click('button:has-text("Let\'s Play")');
      await page.waitForTimeout(600);
    } else {
      console.log("2-4. Game screen shown directly, skipping tutorial");
    }

    // 5. Game screen - verify layout: Image → Letter Boxes → Hint/Help → Letter Bank
    console.log("5. Game screen - spelling ELON MASK...");
    const layoutOrder = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return null;
      const container = main.querySelector(":scope > div");
      const children = container ? Array.from(container.children) : [];
      return children.map((el) => ({
        tag: el.tagName,
        class: el.className?.slice(0, 80) || "",
        text: el.textContent?.slice(0, 80) || "",
      }));
    });
    console.log("   Layout structure:", JSON.stringify(layoutOrder, null, 2).slice(0, 600));

    for (let i = 0; i < ELON_MASK_LETTERS.length; i++) {
      const letter = ELON_MASK_LETTERS[i];
      const btn = page.locator("button").filter({ hasText: new RegExp(`^${letter}$`) }).first();
      await btn.click();
      await page.waitForTimeout(120);
    }

    console.log("   Screenshot after winning");
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "05-after-win.png") });

    // 6. Wait ~3s for win animation, screenshot, verify Next Level is purple
    console.log("6. Waiting 3s for win animation...");
    await page.waitForTimeout(3200);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "06-win-screen.png") });

    const nextBtn = await page.locator('button:has-text("Next Level")');
    const nextBtnClass = await nextBtn.getAttribute("class").catch(() => "");
    console.log("   Next Level button classes:", nextBtnClass);
    const isPurple = nextBtnClass?.includes("bg-primary") ?? false;
    console.log("   Next Level is purple (bg-primary):", isPurple);

    // 7. Click Next Level, open coin shop
    console.log("7. Clicking Next Level, opening Coin Shop");
    await page.click('button:has-text("Next Level")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("🪙")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "07-coin-shop.png") });

    const shopText = await page.locator('[class*="Coin Shop"]').first().evaluate((el) => el.textContent).catch(() => "");
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasStarter = bodyText.includes("Starter Pack");
    const has500 = bodyText.includes("500 Coins");
    const has1500 = bodyText.includes("1,500 Coins");
    const has4000 = bodyText.includes("4,000 Coins");
    const hasVIP = bodyText.includes("VIP Pass");
    const hasRemoveAds = bodyText.includes("Remove Ads");
    console.log("   IAP items - Starter Pack:", hasStarter, "500:", has500, "1,500:", has1500, "4,000:", has4000, "VIP:", hasVIP, "Remove Ads:", hasRemoveAds);

    // 8. Close shop, open settings
    console.log("8. Closing shop, opening Settings");
    await page.click('button:has-text("✕")');
    await page.waitForTimeout(400);
    await page.locator("div.flex.items-center.justify-between").first().locator("button").nth(1).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "08-settings.png") });

    const settingsText = await page.evaluate(() => document.body.innerText);
    const hasSound = settingsText.includes("Sound");
    const hasVibration = settingsText.includes("Vibration");
    const hasCreateLevel = settingsText.includes("Create a Level");
    const hasHowToPlay = settingsText.includes("How to Play");
    const hasPrivacy = settingsText.includes("Privacy Policy");
    const hasContact = settingsText.includes("Contact Us");
    const hasRate = settingsText.includes("Rate the App");
    const hasReset = settingsText.includes("Reset Progress");
    console.log("   Settings - Sound:", hasSound, "Vibration:", hasVibration, "Create:", hasCreateLevel, "How to Play:", hasHowToPlay, "Privacy:", hasPrivacy, "Contact:", hasContact, "Rate:", hasRate, "Reset:", hasReset);

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
