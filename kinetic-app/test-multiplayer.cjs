const { chromium } = require('playwright');

(async () => {
  // הפעלת דפדפן עם הגדרות "אנושיות" יותר
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized'] // פתיחה במסך מלא
  });

  // יצירת הקשר (Context) עם הגדרות דפדפן רגיל
  const context1 = await browser.newContext({
    viewport: null // מבטל את ההגבלה של הגובה/רוחב
  });
  const page1 = await context1.newPage();
  await page1.goto('http://localhost:5173'); 

  const context2 = await browser.newContext({
    viewport: null
  });
  const page2 = await context2.newPage();
  await page2.goto('http://localhost:5173');

  console.log('--- החלונות נפתחו במצב רגיל ---');
})();