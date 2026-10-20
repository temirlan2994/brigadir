// Скриншоты всех экранов с демо-данными, 390 × 844 → screenshots/*.png
import { test, expect, type Page } from '@playwright/test';
import { loadDemo, typeNum } from './helpers';

test.use({ viewport: { width: 390, height: 844 } });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `screenshots/${name}.png` });
}

test('скриншоты всех экранов', async ({ page }) => {
  test.setTimeout(180_000);

  // Главная пустая
  await page.goto('/#/');
  await expect(page.getByTestId('start-clean')).toBeVisible();
  await shot(page, '01-glavnaya-pustaya');

  // Демо-данные
  await loadDemo(page);
  await shot(page, '02-glavnaya');

  // Мастер по шагам
  await page.getByTestId('btn-work').click();
  await shot(page, '03-master-1-chto-sdelali');
  await page.getByTestId('wt-Сварка').click();
  await typeNum(page, '1200');
  await shot(page, '04-master-2-skolko');
  await page.getByTestId('next-2').click();
  await shot(page, '05-master-3-kto-rabotal');
  await page.getByTestId('next-3').click();
  await shot(page, '06-master-4-prover');

  // Выдача
  await page.goto('/#/payout/new');
  await shot(page, '07-vydacha-vybor');
  await page.getByTestId('pick-Азамат').click();
  await typeNum(page, '5000');
  await shot(page, '08-vydacha-summa');

  // Расход
  await page.goto('/#/expense/new');
  await shot(page, '09-rashod-kategorii');
  await page.getByTestId('cat-transport').click();
  await typeNum(page, '3000');
  await shot(page, '10-rashod-summa');

  // Поступление и приёмка
  await page.goto('/#/receipt/new');
  await shot(page, '11-postuplenie');
  await page.getByTestId('to-accept').click();
  await shot(page, '12-priyomka');

  // Рабочие и карточка с выпиской
  await page.goto('/#/workers');
  await shot(page, '13-rabochie');
  await page.getByTestId('worker-card-Азамат').click();
  await shot(page, '14-kartochka-rabochego');

  // Работы
  await page.goto('/#/works');
  await shot(page, '15-raboty');

  // Деньги
  await page.goto('/#/money');
  await shot(page, '16-dengi');

  // Акт
  await page.goto('/#/act');
  await shot(page, '17-akt');

  // Настройки
  await page.goto('/#/settings');
  await shot(page, '18-nastroyki');
});
