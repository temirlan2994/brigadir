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

  await page.goto('/#/');
  await expect(page.getByTestId('start-new-object')).toBeVisible();
  await shot(page, '01-privet');

  await page.getByTestId('start-new-object').click();
  await page.getByTestId('obj-name').fill('Дом Акматова');
  await page.getByTestId('cp-new').click();
  await page.getByTestId('cp-person').click();
  await page.getByTestId('cp-name').fill('Асан Акматов');
  await page.getByTestId('cp-phone').fill('700123456');
  await shot(page, '02a-novyy-kontragent');
  await page.getByTestId('cp-phone-country').click();
  await shot(page, '02b-kod-strany');
  await page.getByTestId('country-KG').click();
  await page.getByTestId('cp-save').click();
  await shot(page, '02-vzyal-obekt');
  await page.getByTestId('obj-next-1').click();
  await page.getByTestId('basis-fixed').click();
  await page.getByTestId('plan-total').click();
  await typeNum(page, '1500000');
  await shot(page, '03a-summa-v-pole');
  await page.getByTestId('keypad-done').click();
  await page.getByTestId('preset-30-40-30').click();
  await shot(page, '03b-oplata-chastyami');
  await page.getByTestId('obj-next-2').click();
  await shot(page, '03-ceny');
  await page.getByTestId('obj-next-3').click();
  await page.getByTestId('team-name').fill('Асан');
  await page.getByTestId('team-headcount').click();
  await typeNum(page, '5');
  await page.getByTestId('keypad-done').click();
  await shot(page, '04-brigada-start');
  await page.goto('/#/');

  await loadDemo(page);
  await shot(page, '05-segodnya');

  await page.getByTestId('btn-work').click();
  await shot(page, '06-master-1-chto-sdelali');
  await page.getByTestId('wt-Сварка').click();
  await typeNum(page, '1200');
  await shot(page, '07-master-2-skolko');
  await page.getByTestId('next-2').click();
  for (const name of ['Азамат', 'Нурлан']) {
    const btn = page.getByTestId(`worker-${name}`);
    if (!(await btn.getAttribute('class'))?.includes('amber')) await btn.click();
  }
  await expect(page.getByTestId('worker-Азамат')).toHaveClass(/amber/);
  await shot(page, '08-master-3-kto-rabotal');
  await page.getByTestId('next-3').click();
  await shot(page, '09-master-4-prover');

  await page.goto('/#/payout/new');
  await shot(page, '10-vydacha-vybor');
  await page.getByTestId('pick-Азамат').click();
  await typeNum(page, '5000');
  await shot(page, '11-vydacha-summa');

  await page.goto('/#/expense/new');
  await shot(page, '12-rashod-kategorii');
  await page.getByTestId('cat-transport').click();
  await typeNum(page, '3000');
  await shot(page, '13-rashod-summa');

  await page.goto('/#/objects');
  await shot(page, '14-obekty');
  await page.getByTestId('object-БЦ «Триумф»').click();
  await shot(page, '15-obekt');
  await page.getByTestId('menu-handover').click();
  await shot(page, '16-sdacha');
  await page.goBack();
  await page.getByTestId('menu-money').click();
  await shot(page, '17-dengi-zakazchika');
  await page.goBack();
  await page.getByTestId('menu-prices').click();
  await shot(page, '18-ceny-i-zakazchik');
  await page.goBack();
  await page.getByTestId('menu-contract').click();
  await shot(page, '18a-zakazchik-i-oplata');
  await page.goBack();
  await page.getByTestId('menu-result').click();
  await shot(page, '19-itog-obekta');
  await page.goBack();
  await page.getByTestId('menu-works').click();
  await shot(page, '20-raboty');

  await page.goto('/#/team');
  await shot(page, '21-brigada');
  await page.getByTestId('worker-card-Азамат').click();
  await shot(page, '22-rabochiy');

  await page.goto('/#/cash');
  await shot(page, '23-kassa');

  await page.goto('/#/attendance');
  await shot(page, '24-kto-vyshel');

  await page.goto('/#/act');
  await shot(page, '25-akt');

  await page.goto('/#/settings');
  await shot(page, '26-nastroyki');

  await page.goto('/#/counterparties');
  await shot(page, '27-kontragenty');
  await page.getByTestId('cp-row-СтройКом').click();
  await shot(page, '28-kontragent');
});
