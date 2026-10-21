// Экспорт JSON → удаление всех данных → импорт → числа те же.
import { test, expect } from '@playwright/test';
import { loadDemo, DEMO } from './helpers';

test('экспорт и импорт JSON восстанавливают данные один в один', async ({ page }) => {
  await loadDemo(page);

  await page.goto('/#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-json').click();
  const download = await downloadPromise;
  const filePath = await download.path();

  await page.getByTestId('wipe-all').click();
  await page.getByTestId('wipe-word').fill('удалить');
  await page.getByTestId('wipe-confirm').click();
  await page.goto('/#/');
  await expect(page.getByTestId('start-new-object')).toBeVisible();

  await page.goto('/#/settings');
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('upload-json-input').setInputFiles(filePath!);
  await expect(page.getByText('Данные загружены')).toBeVisible();

  await page.goto('/#/');
  await expect(page.getByTestId('owed-to-me')).toContainText(DEMO.owedToMe);
  await expect(page.getByTestId('owed-to-workers')).toContainText(DEMO.owedToWorkers);
  await expect(page.getByTestId('free-cash')).toContainText(DEMO.free);
});
