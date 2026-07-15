import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
await page.goto('http://127.0.0.1:4174/TimeSheet/');
await page.waitForTimeout(500);
await page.screenshot({ path: process.env.SCRATCH + '/snitch-hover.png' });
await page.waitForTimeout(1150); // ~1.65s: mid-flight with sparkles
await page.screenshot({ path: process.env.SCRATCH + '/snitch-fly.png' });
await page.waitForTimeout(1300); // after intro: app visible
await page.screenshot({ path: process.env.SCRATCH + '/app-themed.png' });
await browser.close();
