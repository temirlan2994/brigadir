// Экспорт JSON → удаление всех данных → импорт → числа те же.
import { test, expect } from '@playwright/test';
import { loadDemo } from './helpers';

test('экспорт и импорт JSON восстанавливают данные один в один', async ({ page }) => {
  await loadDemo(page);
  const owed = await page.getByTestId('owed-to-me').textContent();
  const owedWorkers = await page.getByTestId('owed-to-workers').textContent();
  const free = await page.getByTestId('free-cash').textContent();

  // Скачать JSON
  await page.goto('/#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-json').click();
  const download = await downloadPromise;
  const filePath = await download.path();

  // Удалить все данные (двойное подтверждение со словом «удалить»)
  await page.getByTestId('wipe-all').click();
  await page.getByTestId('wipe-word').fill('удалить');
  await page.getByTestId('wipe-confirm').click();
  await page.goto('/#/');
  await expect(page.getByTestId('start-clean')).toBeVisible();

  // Импорт
  await page.goto('/#/settings');
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('upload-json-input').setInputFiles(filePath!);
  await expect(page.getByText('Данные загружены')).toBeVisible();

  // Три числа на главной те же
  await page.goto('/#/');
  await expect(page.getByTestId('owed-to-me')).toHaveText(owed!);
  await expect(page.getByTestId('owed-to-workers')).toHaveText(owedWorkers!);
  await expect(page.getByTestId('free-cash')).toHaveText(free!);
});
