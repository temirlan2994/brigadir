// Нет горизонтального скролла на ширинах 360 и 430.
import { test, expect } from '@playwright/test';
import { loadDemo } from './helpers';

const SCREENS = ['/#/', '/#/works', '/#/workers', '/#/money', '/#/settings', '/#/work/new', '/#/act'];

for (const width of [360, 430]) {
  test(`нет горизонтального скролла на ширине ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await loadDemo(page);
    for (const url of SCREENS) {
      await page.goto(url);
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement!;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflow, `горизонтальный скролл на ${url}`).toBeLessThanOrEqual(0);
    }
  });
}
