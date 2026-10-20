// Офлайн: после первой загрузки приложение полностью работает без сети.
import { test, expect } from '@playwright/test';
import { startClean, addWorker, recordWelding } from './helpers';

test('офлайн: перезагрузка и запись работы без сети', async ({ page, context }) => {
  await startClean(page);
  await addWorker(page, 'Азамат');

  // Дождаться активации service worker
  await page.goto('/#/');
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg?.active;
  }, undefined, { timeout: 15_000 });

  // Выключить сеть и перезагрузить
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('btn-work')).toBeVisible();

  // Запись работы сохраняется офлайн
  await recordWelding(page, ['Азамат']);
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');

  // Сеть вернулась — данные на месте
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');
});
