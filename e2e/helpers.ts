// Общие шаги e2e: чистый запуск, добавление рабочих, запись работы.
import { expect, type Page } from '@playwright/test';

export async function startClean(page: Page) {
  await page.goto('/#/');
  await page.getByTestId('start-clean').click();
  await expect(page.getByTestId('btn-work')).toBeVisible();
}

export async function addWorker(page: Page, name: string) {
  await page.goto('/#/workers');
  await page.getByTestId('worker-add').click();
  await page.getByTestId('worker-name-input').fill(name);
  await page.getByTestId('worker-save').click();
  await expect(page.getByTestId(`worker-card-${name}`)).toBeVisible();
}

export async function typeNum(page: Page, digits: string) {
  for (const d of digits) {
    await page.locator(`[data-key="${d}"]`).first().click();
  }
}

// Записать Сварку 1200 кг на всех отмеченных по умолчанию + указанных рабочих
export async function recordWelding(page: Page, workers: string[]) {
  await page.goto('/#/');
  await page.getByTestId('btn-work').click();
  await page.getByTestId('wt-Сварка').click();
  await typeNum(page, '1200');
  await page.getByTestId('next-2').click();
  for (const name of workers) {
    const btn = page.getByTestId(`worker-${name}`);
    // отметить, если ещё не выбран
    if (!(await btn.getAttribute('class'))?.includes('orange')) {
      await btn.click();
    }
  }
  await page.getByTestId('next-3').click();
  await page.getByTestId('save-work').click();
  await expect(page.getByTestId('owed-to-me')).toBeVisible();
}

export async function loadDemo(page: Page) {
  await page.goto('/#/');
  await page.getByTestId('load-demo').click();
  await expect(page.getByTestId('owed-to-me')).toBeVisible();
}

export function somText(amount: string) {
  return `${amount} сом`;
}
