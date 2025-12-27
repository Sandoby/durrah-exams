// Puppeteer script to generate screenshots of main pages with default data
// Usage: npm install puppeteer && node generate-mockup-screenshots.cjs

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const baseUrl = 'http://localhost:5173';
const pages = [
  { name: 'kids-landing', url: `${baseUrl}/kids-landing` },
  { name: 'dashboard', url: `${baseUrl}/dashboard` },
  { name: 'exam-editor', url: `${baseUrl}/exam-editor` },
  { name: 'exam-analytics', url: `${baseUrl}/exam-analytics` },
  { name: 'exam-view', url: `${baseUrl}/exam-view` },
  { name: 'kids-exam-view', url: `${baseUrl}/kids-exam-view` },
  { name: 'student-portal', url: `${baseUrl}/student-portal` },
];

const outputDir = path.join(__dirname, 'public', 'mockups');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const p of pages) {
    try {
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.setViewport({ width: 1280, height: 800 });
      const filePath = path.join(outputDir, `${p.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Screenshot saved: ${filePath}`);
    } catch (err) {
      console.error(`Failed to screenshot ${p.url}:`, err);
    }
  }

  await browser.close();
})();
