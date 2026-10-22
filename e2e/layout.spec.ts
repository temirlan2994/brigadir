// Нет горизонтального скролла на ширинах 360 и 430.
import { test, expect } from '@playwright/test';
import { loadDemo } from './helpers';

const SCREENS = ['/#/', '/#/objects', '/#/team', '/#/cash', '/#/settings', '/#/work/new', '/#/objects/new', '/#/attendance', '/#/counterparties', '/#/receipt/new'];

for (const width of [360, 430]) {
  test(`нет горизонтального скролла на ширине ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await loadDemo(page);
    // Экраны объекта — по ссылке из списка
    await page.goto('/#/objects');
    const href = await page.getByTestId('object-БЦ «Триумф»').evaluate(() => window.location.hash);
    expect(href).toContain('objects');
    for (const url of SCREENS) {
      await page.goto(url);
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement!;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflow, `горизонтальный скролл на ${url}`).toBeLessThanOrEqual(0);
    }
    await page.goto('/#/objects');
    await page.getByTestId('object-БЦ «Триумф»').click();
    for (const testId of ['menu-works', 'menu-handover', 'menu-money', 'menu-contract', 'menu-prices', 'menu-result']) {
      await page.getByTestId(testId).click();
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement!;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflow, `горизонтальный скролл на ${testId}`).toBeLessThanOrEqual(0);
      await page.goBack();
    }
  });
}
