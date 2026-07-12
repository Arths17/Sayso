const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 30000 }).catch(()=>{});
  await page.waitForTimeout(1500);
  const fonts = await page.evaluate(() => {
    const arr = [];
    document.fonts.forEach(f => arr.push(`${f.family} ${f.weight} ${f.status}`));
    return arr;
  });
  console.log(fonts.join('\n'));
})();
