// Общие шаги e2e: новый объект через мастер, бригада, запись работы, демо.
import { expect, type Page } from '@playwright/test';

// Касса демо: 150 000 + 60 000 − 50 000 − 11 500 (Триумф) + 60 000 − 40 000 − 4 000 (закрытый склад) = 164 500
export const DEMO = {
  owedToMe: '21 750 сом',
  owedToWorkers: '67 250 сом',
  free: '97 250 сом',
};

export async function typeNum(page: Page, digits: string) {
  for (const d of digits) {
    await page.locator(`[data-key="${d}"]`).first().click();
  }
}

// Чистый запуск: мастер «Взял объект» с бригадой из указанных имён
export async function startWithObject(page: Page, workers: string[]) {
  await page.goto('/#/');
  await page.getByTestId('start-new-object').click();
  await page.getByTestId('obj-name').fill('БЦ «Триумф»');
  await page.getByTestId('obj-customer').fill('СтройКом');
  await page.getByTestId('obj-next-1').click();
  await page.getByTestId('obj-next-2').click();
  for (let i = 0; i < workers.length; i++) {
    await page.getByTestId('team-name').fill(workers[i]);
    if (i < workers.length - 1) await page.getByTestId('team-add').click();
  }
  await page.getByTestId('obj-finish').click();
  await expect(page.getByTestId('btn-work')).toBeVisible();
}

// Записать Сварку 1200 кг на указанных рабочих (поровну)
export async function recordWelding(page: Page, workers: string[]) {
  await page.goto('/#/');
  await page.getByTestId('btn-work').click();
  await page.getByTestId('wt-Сварка').click();
  await typeNum(page, '1200');
  await page.getByTestId('next-2').click();
  for (const name of workers) {
    const btn = page.getByTestId(`worker-${name}`);
    if (!(await btn.getAttribute('class'))?.includes('amber')) {
      await btn.click();
    }
  }
  await page.getByTestId('next-3').click();
  await page.getByTestId('save-work').click();
  await expect(page.getByTestId('free-cash')).toBeVisible();
}

export async function loadDemo(page: Page) {
  await page.goto('/#/');
  // Холодный старт сервера предпросмотра бывает долгим — ждём кнопку дольше обычного
  await expect(page.getByTestId('load-demo')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('load-demo').click();
  await expect(page.getByTestId('owed-to-me')).toContainText(DEMO.owedToMe);
  await expect(page.getByTestId('owed-to-workers')).toContainText(DEMO.owedToWorkers);
  await expect(page.getByTestId('free-cash')).toContainText(DEMO.free);
}
