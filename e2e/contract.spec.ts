// Заказчик-контрагент, телефон с кодом страны, блок оплаты и ввод цифр прямо в поле.
import { test, expect, type Page } from '@playwright/test';
import { createCounterparty, startWithObject, typeNum } from './helpers';

// Мастер до шага «Как платит заказчик?»
async function toPaymentStep(page: Page, name = 'Дом Акматова') {
  await page.goto('/#/');
  await page.getByTestId('start-new-object').click();
  await page.getByTestId('obj-name').fill(name);
  await createCounterparty(page, 'Асан Акматов', '700123456');
  await page.getByTestId('obj-next-1').click();
}

// С шага оплаты — до конца мастера с одним бригадиром
async function finishWizard(page: Page, worker = 'Азамат') {
  await page.getByTestId('obj-next-2').click();
  await page.getByTestId('obj-next-3').click();
  await page.getByTestId('team-name').fill(worker);
  await page.getByTestId('obj-finish').click();
  await expect(page.getByTestId('btn-work')).toBeVisible();
}

test('телефон: +996 уже стоит, номер пишется после кода, флаг меняет страну', async ({ page }) => {
  await page.goto('/#/');
  await page.getByTestId('start-new-object').click();
  await page.getByTestId('cp-new').click();
  await page.getByTestId('cp-name').fill('Асан');
  await expect(page.getByTestId('cp-phone-country')).toContainText('+996');
  await page.getByTestId('cp-phone').fill('700123456');
  await expect(page.getByTestId('cp-phone')).toHaveValue('700 123 456');

  // Другая страна: тап по флагу → Казахстан
  await page.getByTestId('cp-phone-country').click();
  await page.getByTestId('country-KZ').click();
  await expect(page.getByTestId('cp-phone-country')).toContainText('+7');
  await expect(page.getByTestId('cp-phone')).toHaveValue('700 123 45 6');

  // Вставили номер целиком — страна угадалась сама
  await page.getByTestId('cp-phone').fill('0555 12 34 56');
  await expect(page.getByTestId('cp-phone-country')).toContainText('+7');
  await page.getByTestId('cp-phone').fill('+996 555 12 34 56');
  await expect(page.getByTestId('cp-phone-country')).toContainText('+996');
  await expect(page.getByTestId('cp-phone')).toHaveValue('555 123 456');

  await page.getByTestId('cp-save').click();
  await expect(page.getByTestId('cp-selected')).toContainText('+996 555 123 456');
});

test('контрагент сохраняется: для второго объекта его просто выбирают', async ({ page }) => {
  await startWithObject(page, ['Азамат']);
  await page.goto('/#/objects/new');
  await page.getByTestId('obj-name').fill('Склад');
  await page.getByTestId('cp-pick').click();
  await page.getByTestId('cp-option-СтройКом').click();
  await expect(page.getByTestId('cp-selected')).toContainText('СтройКом');
  await page.getByTestId('obj-next-1').click();
  await finishWizard(page, 'Нурлан');

  await page.goto('/#/counterparties');
  await expect(page.getByTestId('cp-row-СтройКом')).toContainText('объектов: 2');
  await page.getByTestId('cp-row-СтройКом').click();
  await expect(page.getByText('Склад')).toBeVisible();
  await expect(page.getByText('БЦ «Триумф»')).toBeVisible();
});

test('общая сумма 30/40/30: аванс получен, этап сдан — заказчик должен 600 000', async ({ page }) => {
  await toPaymentStep(page);
  await page.getByTestId('basis-fixed').click();
  await page.getByTestId('plan-total').click();
  await typeNum(page, '1500000');
  // Цифры печатаются прямо в поле
  await expect(page.getByTestId('plan-total')).toContainText('1 500 000 сом');
  await page.getByTestId('keypad-done').click();
  await page.getByTestId('preset-30-40-30').click();
  await expect(page.getByTestId('part-amount-0')).toHaveText('450 000 сом');
  await expect(page.getByTestId('part-amount-1')).toHaveText('600 000 сом');
  await expect(page.getByTestId('plan-check')).toContainText('Всё распределено');
  await page.locator('[data-testid^="received-"]').first().check();
  await finishWizard(page);

  // Аванс в кассе, долга нет, по договору не сдано 1 050 000
  await expect(page.getByTestId('owed-to-me')).toContainText('0 сом');
  await expect(page.getByTestId('not-handed')).toContainText('1 050 000 сом');
  await expect(page.getByTestId('free-cash')).toContainText('450 000 сом');

  // Сдали коробку → её часть к оплате
  await page.getByTestId('not-handed').click();
  await page.getByTestId('stage-done-1').click();
  await page.goto('/#/');
  await expect(page.getByTestId('owed-to-me')).toContainText('600 000 сом');

  // «Получил» из графика подставляет сумму этапа
  await page.getByTestId('owed-to-me').click();
  await page.getByTestId('plan-receive-1').click();
  await expect(page.getByTestId('amount-field')).toContainText('600 000');
  await page.getByTestId('save-receipt').click();
  // Дождаться возврата в «Деньги заказчика», иначе переход «назад» догонит goto
  await expect(page.getByTestId('plan-schedule')).toContainText('получено 1 050 000 сом');
  await page.goto('/#/');
  await expect(page.getByTestId('owed-to-me')).toContainText('0 сом');
  await expect(page.getByTestId('free-cash')).toContainText('1 050 000 сом');
});

test('разбивка не сходится — «Дальше» закрыт, «Добавить разницу» чинит', async ({ page }) => {
  await toPaymentStep(page);
  await page.getByTestId('basis-fixed').click();
  await page.getByTestId('plan-total').click();
  await typeNum(page, '1000000');
  // «Дальше» на нампаде — к доле первой части, потом второй
  await page.getByTestId('keypad-next').click();
  await page.getByTestId('keypad-next').click();
  await typeNum(page, '60');
  await page.getByTestId('keypad-done').click();
  await expect(page.getByTestId('plan-check')).toContainText('Не распределено: 100 000 сом');
  await expect(page.getByTestId('obj-next-2')).toBeDisabled();
  await page.getByTestId('put-rest').click();
  await expect(page.getByTestId('plan-check')).toContainText('Всё распределено');
  await expect(page.getByTestId('obj-next-2')).toBeEnabled();
});

test('аванс за объёмы: 30 % от сметы, уже получен — «аванс: отработать»', async ({ page }) => {
  await toPaymentStep(page);
  await page.getByTestId('plan-total').click();
  await typeNum(page, '600000');
  await page.getByTestId('keypad-done').click();
  await page.getByTestId('advance-mode-percent').click();
  await expect(page.getByText('Это 180 000 сом')).toBeVisible();
  await page.locator('[data-testid^="received-"]').first().check();
  await page.getByTestId('every-week').click();
  await finishWizard(page);
  await expect(page.getByTestId('owed-to-me')).toContainText('Аванс: отработать');
  await expect(page.getByTestId('owed-to-me')).toContainText('180 000 сом');
});

test('число в поле: печатается на месте, старое значение заменяется первой цифрой', async ({ page }) => {
  await startWithObject(page, ['Азамат']);
  await page.goto('/#/settings');
  await page.getByTestId('opening-cash').click();
  await typeNum(page, '25000');
  await expect(page.getByTestId('opening-cash')).toContainText('25 000 сом');
  await page.getByTestId('keypad-done').click();
  // Снова тап: 25 000 выделено, первая цифра заменяет
  await page.getByTestId('opening-cash').click();
  await typeNum(page, '3');
  await expect(page.getByTestId('opening-cash')).toContainText('3 сом');
  await page.getByTestId('keypad-done').click();
  await page.goto('/#/');
  await expect(page.getByTestId('free-cash')).toContainText('3 сом');
});
