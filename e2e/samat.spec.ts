// Сквозной сценарий «Самат» из ТЗ (раздел 9).
import { test, expect } from '@playwright/test';
import { startClean, addWorker, recordWelding, typeNum } from './helpers';

test('сценарий «Самат»: от чистого запуска до кассы 37 000', async ({ page }) => {
  // Чистый запуск
  await startClean(page);

  // Добавить рабочих
  await addWorker(page, 'Азамат');
  await addWorker(page, 'Нурлан');

  // Записать Сварка 1 200 кг, цены 65/45, поровну
  await recordWelding(page, ['Азамат', 'Нурлан']);

  // Работа не принята → «Мне должны 0», запись в ленте
  await expect(page.getByTestId('owed-to-me')).toContainText('0 сом');
  await expect(page.getByTestId('feed')).toContainText('Сварка · 1 200 кг');
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');

  // Принять работу → «Мне должны 78 000»
  await page.getByTestId('btn-receipt').click();
  await page.getByTestId('to-accept').click();
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByTestId('accept-selected').click();
  await page.goto('/#/');
  await expect(page.getByTestId('owed-to-me')).toContainText('78 000 сом');

  // Выдать Азамату 10 000 → «Я должен рабочим 44 000»
  await page.getByTestId('btn-payout').click();
  await page.getByTestId('pick-Азамат').click();
  await typeNum(page, '10000');
  await page.getByTestId('save-payout').click();
  await expect(page.getByTestId('owed-to-workers')).toContainText('44 000 сом');

  // Получить от заказчика 50 000 → «Мне должны 28 000», «Свободно −4 000», красный баннер
  await page.getByTestId('btn-receipt').click();
  await typeNum(page, '50000');
  await page.getByTestId('save-receipt').click();
  await expect(page.getByTestId('owed-to-me')).toContainText('28 000 сом');
  await expect(page.getByTestId('free-cash')).toContainText('−4 000 сом');
  await expect(page.getByTestId('not-enough-banner')).toBeVisible();

  // Касса 40 000
  await page.goto('/#/money');
  await expect(page.getByTestId('cash-value')).toContainText('40 000 сом');

  // Потратить 3 000 на транспорт → касса 37 000
  await page.goto('/#/');
  await page.getByTestId('btn-expense').click();
  await page.getByTestId('cat-transport').click();
  await typeNum(page, '3000');
  await page.getByTestId('save-expense').click();
  await page.goto('/#/money');
  await expect(page.getByTestId('cash-value')).toContainText('37 000 сом');
});

test('«Как вчера» повторяет последнюю запись за два нажатия', async ({ page }) => {
  await startClean(page);
  await addWorker(page, 'Азамат');
  await recordWelding(page, ['Азамат']);
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');

  // Нажатие 1: «Как вчера» → сразу шаг «Проверь»; нажатие 2: «Сохранить»
  await page.getByTestId('btn-work').click();
  await page.getByTestId('like-yesterday').click();
  await page.getByTestId('save-work').click();

  // Запись удвоилась
  await expect(page.getByTestId('owed-to-workers')).toContainText('108 000 сом');
});

test('перезагрузка страницы сохраняет все данные', async ({ page }) => {
  await startClean(page);
  await addWorker(page, 'Азамат');
  await recordWelding(page, ['Азамат']);
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');

  await page.reload();
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');
  await expect(page.getByTestId('feed')).toContainText('Сварка · 1 200 кг');
});
