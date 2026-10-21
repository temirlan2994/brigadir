// Снимает макеты экранов и карту в PNG: node design/shoot.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, 'png');
mkdirSync(out, { recursive: true });

const names = {
  s01: '01-vzyal-obekt', s02: '02-ceny', s03: '03-brigada-start', s04: '04-segodnya',
  s05: '05-zapisat-rabotu', s06: '06-obekty', s07: '07-obekt', s08: '08-sdacha',
  s09: '09-brigada', s10: '10-rabochiy', s11: '11-kassa', s12: '12-itog-obekta',
};

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1400, height: 1000 } });

await page.goto(pathToFileURL(join(dir, 'mockups.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
for (const [id, name] of Object.entries(names)) {
  await page.locator(`#${id}`).screenshot({ path: join(out, `${name}.png`) });
}

await page.setViewportSize({ width: 1600, height: 1200 });
await page.goto(pathToFileURL(join(dir, 'map.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await page.locator('#map').screenshot({ path: join(out, '00-karta.png') });

await browser.close();
console.log('done');
