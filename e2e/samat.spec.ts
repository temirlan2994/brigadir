// Сквозной сценарий «Самат» по пути бригадира: взял объект → бригада → работа → сдача → деньги.
import { test, expect } from '@playwright/test';
import { startWithObject, recordWelding, typeNum } from './helpers';

test('сценарий «Самат»: от нового объекта до кассы 37 000', async ({ page }) => {
  await startWithObject(page, ['Азамат', 'Нурлан']);

  // Сварка 1 200 кг, цены 65/45 из мастера объекта, поровну
  await recordWelding(page, ['Азамат', 'Нурлан']);
  await expect(page.getByTestId('owed-to-me')).toContainText('0 сом');
  await expect(page.getByTestId('not-handed')).toContainText('78 000 сом');
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');

  // Сдача заказчику: принять работу → заказчик должен 78 000
  await page.getByTestId('not-handed').click();
  await page.locator('[data-testid^="check-"]').first().click();
  await expect(page.getByText('Выбрано 1')).toBeVisible();
  await page.getByTestId('accept-selected').click();
  await expect(page.getByText('Не принято · 0')).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByTestId('owed-to-me')).toContainText('78 000 сом');

  // Выдать Азамату 10 000 → бригаде должен 44 000
  await page.getByTestId('btn-payout').click();
  await page.getByTestId('pick-Азамат').click();
  await typeNum(page, '10000');
  await page.getByTestId('save-payout').click();
  await expect(page.getByTestId('owed-to-workers')).toContainText('44 000 сом');

  // Получить 50 000 → заказчик должен 28 000, свободно −4 000, «не хватает»
  await page.getByTestId('btn-receipt').click();
  await typeNum(page, '50000');
  await page.getByTestId('save-receipt').click();
  await expect(page.getByTestId('owed-to-me')).toContainText('28 000 сом');
  await expect(page.getByTestId('free-cash')).toContainText('−4 000 сом');
  await expect(page.getByTestId('free-cash')).toContainText('не хватает');

  // Касса 40 000
  await page.getByTestId('tab-cash').click();
  await expect(page.getByTestId('cash-value')).toContainText('40 000 сом');

  // Потратить 3 000 на транспорт → касса 37 000
  await page.getByTestId('tab-today').click();
  await page.getByTestId('btn-expense').click();
  await page.getByTestId('cat-transport').click();
  await typeNum(page, '3000');
  await page.getByTestId('save-expense').click();
  await expect(page.getByTestId('btn-work')).toBeVisible();
  await page.getByTestId('tab-cash').click();
  await expect(page.getByTestId('cash-value')).toContainText('37 000 сом');

  // Взял себе 7 000 → касса 30 000
  await page.getByTestId('btn-draw').click();
  await typeNum(page, '7000');
  await page.getByTestId('save-cashmove').click();
  await expect(page.getByTestId('cash-value')).toContainText('30 000 сом');
});

test('частичная приёмка: принято 1 000 из 1 200 кг', async ({ page }) => {
  await startWithObject(page, ['Азамат']);
  await recordWelding(page, ['Азамат']);
  await page.getByTestId('not-handed').click();
  await page.locator('[data-testid^="partial-"]').first().click();
  for (let i = 0; i < 6; i++) await page.locator('[data-key="erase"]').last().click();
  await typeNum(page, '1000');
  await page.getByRole('button', { name: 'Готово' }).click();
  // Остаток 200 кг (13 000) ждёт приёмки, принято 65 000
  await expect(page.getByText('принято 1 000 из 1 200')).toBeVisible();
  await page.goto('/#/');
  await expect(page.getByTestId('owed-to-me')).toContainText('65 000 сом');
  await expect(page.getByTestId('not-handed')).toContainText('13 000 сом');
});

test('аванс заказчика: показывается остаток аванса, а не долг', async ({ page }) => {
  await startWithObject(page, ['Азамат']);
  await page.getByTestId('btn-receipt').click();
  await page.getByRole('button', { name: 'Аванс' }).click();
  await typeNum(page, '50000');
  await page.getByTestId('save-receipt').click();
  await expect(page.getByTestId('owed-to-me')).toContainText('Аванс: отработать');
  await expect(page.getByTestId('owed-to-me')).toContainText('50 000 сом');
});

test('«Как вчера» повторяет последнюю запись за два нажатия', async ({ page }) => {
  await startWithObject(page, ['Азамат']);
  await recordWelding(page, ['Азамат']);
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');
  await page.getByTestId('btn-work').click();
  await page.getByTestId('like-yesterday').click();
  await page.getByTestId('save-work').click();
  await expect(page.getByTestId('owed-to-workers')).toContainText('108 000 сом');
});

test('перезагрузка страницы сохраняет все данные', async ({ page }) => {
  await startWithObject(page, ['Азамат']);
  await recordWelding(page, ['Азамат']);
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');
  await page.reload();
  await expect(page.getByTestId('owed-to-workers')).toContainText('54 000 сом');
});

test('закрытие объекта показывает итог', async ({ page }) => {
  await startWithObject(page, ['Азамат']);
  await recordWelding(page, ['Азамат']);
  await page.getByTestId('tab-objects').click();
  await page.getByTestId('object-БЦ «Триумф»').click();
  await page.getByTestId('menu-result').click();
  await page.getByTestId('to-close').click();
  await page.getByTestId('close-confirm').click();
  await expect(page.getByText('Заработал на объекте')).toBeVisible();
  await page.goto('/#/objects');
  await expect(page.getByText('закрыт')).toBeVisible();
});
