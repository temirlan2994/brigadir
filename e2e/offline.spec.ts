// Офлайн: после первой загрузки приложение полностью работает без сети.
import { test, expect } from '@playwright/test';
import { startWithObject, recordWelding } from './helpers';

test('офлайн: перезагрузка и запись работы без сети', async ({ page, context }) => {
  await startWithObject(page, ['Азамат']);

  await page.goto('/#/');
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg?.active;
  }, undefined, { timeout: 15_000 });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('btn-work')).toBeVisible();

  await recordWelding(page, ['Азамат']);
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');

  await context.setOffline(false);
  await page.reload();
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');
});
