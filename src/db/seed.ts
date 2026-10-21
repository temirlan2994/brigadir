// Справочник видов работ (seed) и демо-данные «Загрузить пример».
import { db } from './db';
import {
  addObject, addPayout, addExpense, addReceipt, addWorker, addWorkEntry,
  todayStr, uid, updateSettings, getSettings, upsertRate, acceptWorkEntries,
} from './repo';
import { splitShares } from '../core/calc';
import { lineTotals } from '../core/calc';
import type { CalcKind, Money, Unit, Worker, WorkType } from './types';

interface WorkTypeSeed {
  nameRu: string; nameKy: string; icon: string; unit: Unit; calc: CalcKind;
  customerPrice: number; workerPrice: number; favorite: boolean;
}

// Цены — примеры в сомах за единицу, редактируются в расценках объекта
export const WORK_TYPE_SEED: WorkTypeSeed[] = [
  { nameRu: 'Кладка', nameKy: 'Кыш кынуу', icon: 'brick-wall', unit: 'м²', calc: 'area', customerPrice: 600, workerPrice: 400, favorite: true },
  { nameRu: 'Сварка', nameKy: 'Ширетүү', icon: 'welding-mask', unit: 'кг', calc: 'none', customerPrice: 65, workerPrice: 45, favorite: true },
  { nameRu: 'Бетон', nameKy: 'Бетон', icon: 'mixer', unit: 'м³', calc: 'none', customerPrice: 2500, workerPrice: 1600, favorite: true },
  { nameRu: 'Арматура', nameKy: 'Арматура', icon: 'rebar', unit: 'кг', calc: 'none', customerPrice: 25, workerPrice: 16, favorite: false },
  { nameRu: 'Штукатурка', nameKy: 'Шыбоо', icon: 'trowel', unit: 'м²', calc: 'area', customerPrice: 350, workerPrice: 230, favorite: true },
  { nameRu: 'Шпаклёвка и покраска', nameKy: 'Шпаклёвка жана сырдоо', icon: 'roller', unit: 'м²', calc: 'area', customerPrice: 250, workerPrice: 160, favorite: false },
  { nameRu: 'Плитка', nameKy: 'Плитка', icon: 'tiles', unit: 'м²', calc: 'area', customerPrice: 900, workerPrice: 600, favorite: false },
  { nameRu: 'Гипсокартон', nameKy: 'Гипсокартон', icon: 'drywall', unit: 'м²', calc: 'area', customerPrice: 500, workerPrice: 330, favorite: false },
  { nameRu: 'Электрика', nameKy: 'Электрика', icon: 'bolt', unit: 'точка', calc: 'none', customerPrice: 450, workerPrice: 300, favorite: true },
  { nameRu: 'Сантехника', nameKy: 'Сантехника', icon: 'pipe-tap', unit: 'точка', calc: 'none', customerPrice: 600, workerPrice: 400, favorite: true },
  { nameRu: 'Стяжка', nameKy: 'Стяжка', icon: 'screed', unit: 'м²', calc: 'area', customerPrice: 300, workerPrice: 200, favorite: false },
  { nameRu: 'Фасад', nameKy: 'Фасад', icon: 'facade', unit: 'м²', calc: 'area', customerPrice: 700, workerPrice: 450, favorite: false },
  { nameRu: 'Кровля', nameKy: 'Чатыр жабуу', icon: 'roof', unit: 'м²', calc: 'area', customerPrice: 600, workerPrice: 400, favorite: false },
  { nameRu: 'Демонтаж', nameKy: 'Демонтаж', icon: 'sledgehammer', unit: 'м²', calc: 'area', customerPrice: 200, workerPrice: 140, favorite: false },
  { nameRu: 'Земляные работы', nameKy: 'Жер иштери', icon: 'shovel', unit: 'м³', calc: 'none', customerPrice: 400, workerPrice: 260, favorite: false },
  { nameRu: 'Окна и двери', nameKy: 'Терезе жана эшик', icon: 'window', unit: 'шт.', calc: 'none', customerPrice: 1500, workerPrice: 1000, favorite: false },
  { nameRu: 'Разнорабочий', nameKy: 'Кара жумушчу', icon: 'hardhat', unit: 'смена', calc: 'none', customerPrice: 2000, workerPrice: 1500, favorite: false },
];

// Пиктограммы, доступные для своих видов работ
export const CUSTOM_ICONS = [
  'brick-wall', 'welding-mask', 'mixer', 'rebar', 'trowel', 'roller', 'tiles', 'drywall',
  'bolt', 'pipe-tap', 'screed', 'facade', 'roof', 'sledgehammer', 'shovel', 'window', 'hardhat',
  'box', 'bucket', 'tape-measure', 'hammer', 'brush', 'gear',
];

const som = (n: number): Money => Math.round(n * 100);

// Первый запуск: настройки и справочник видов работ
export async function ensureSeeded(): Promise<void> {
  const settings = await db.settings.get('main');
  if (!settings) {
    await db.settings.put({
      id: 'main', lang: 'ru', taxMode: 'none', taxPercent: 4,
      taxFixedMonthly: 0, openingCash: 0, activeObjectId: '',
    });
  }
  const count = await db.workTypes.count();
  if (count === 0) {
    await db.workTypes.bulkAdd(WORK_TYPE_SEED.map((s, i): WorkType => ({
      id: uid(), nameRu: s.nameRu, nameKy: s.nameKy, icon: s.icon,
      unit: s.unit, calc: s.calc, isFavorite: s.favorite, sortOrder: i,
    })));
  }
}

// Расценки объекта из примеров справочника
export async function seedRatesForObject(objectId: string): Promise<void> {
  const types = await db.workTypes.toArray();
  for (const t of types) {
    const s = WORK_TYPE_SEED.find((x) => x.nameRu === t.nameRu);
    if (s) await upsertRate(objectId, t.id, som(s.customerPrice), som(s.workerPrice));
  }
}

interface DemoEntry {
  daysAgo: number; workType: string; quantity: number;
  workers: Worker[]; accepted: boolean;
}

// Демо-данные: объект БЦ «Триумф», 4 рабочих, 12 записей за две недели,
// плюс закрытый объект «Склад, Кант» с итогом
export async function loadDemo(): Promise<void> {
  const obj = await addObject('БЦ «Триумф»', 'СтройКом', { paymentTerms: 'По акту, раз в неделю' });
  await seedRatesForObject(obj.id);

  const azamat = await addWorker('Азамат', 'сварщик');
  const nurlan = await addWorker('Нурлан', 'сварщик');
  const bakyt = await addWorker('Бакыт', 'каменщик');
  const erlan = await addWorker('Эрлан', 'разнорабочий');

  const types = await db.workTypes.toArray();
  const byName = (name: string) => types.find((t) => t.nameRu === name)!;

  const rows: DemoEntry[] = [
    { daysAgo: 13, workType: 'Сварка', quantity: 300, workers: [azamat, nurlan], accepted: true },
    { daysAgo: 12, workType: 'Кладка', quantity: 20, workers: [bakyt], accepted: true },
    { daysAgo: 11, workType: 'Разнорабочий', quantity: 2, workers: [erlan], accepted: true },
    { daysAgo: 10, workType: 'Сварка', quantity: 450, workers: [azamat, nurlan], accepted: true },
    { daysAgo: 9, workType: 'Кладка', quantity: 25, workers: [bakyt], accepted: true },
    { daysAgo: 8, workType: 'Разнорабочий', quantity: 1, workers: [erlan], accepted: true },
    { daysAgo: 6, workType: 'Сварка', quantity: 500, workers: [azamat, nurlan], accepted: false },
    { daysAgo: 5, workType: 'Кладка', quantity: 18, workers: [bakyt], accepted: false },
    { daysAgo: 4, workType: 'Разнорабочий', quantity: 2, workers: [erlan], accepted: false },
    { daysAgo: 3, workType: 'Сварка', quantity: 400, workers: [azamat, nurlan], accepted: false },
    { daysAgo: 2, workType: 'Кладка', quantity: 22, workers: [bakyt], accepted: false },
    { daysAgo: 1, workType: 'Разнорабочий', quantity: 1, workers: [erlan], accepted: false },
  ];

  const acceptedIds: string[] = [];
  for (const row of rows) {
    const wt = byName(row.workType);
    const seed = WORK_TYPE_SEED.find((s) => s.nameRu === wt.nameRu)!;
    const customerPrice = som(seed.customerPrice);
    const workerPrice = som(seed.workerPrice);
    const totals = lineTotals(row.quantity, customerPrice, workerPrice);
    const weights = row.workers.map(() => 1);
    const amounts = splitShares(totals.workersTotal, weights);
    const entry = await addWorkEntry({
      objectId: obj.id, workTypeId: wt.id, date: todayStr(-row.daysAgo),
      quantity: row.quantity, unit: wt.unit, customerPrice, workerPrice,
      customerTotal: totals.customerTotal, workersTotal: totals.workersTotal,
      shares: row.workers.map((w, i) => ({ workerId: w.id, weight: 1, amount: amounts[i] })),
      splitMode: 'equal', photoIds: [], accepted: false,
    });
    if (row.accepted) acceptedIds.push(entry.id);
  }
  await acceptWorkEntries(acceptedIds);

  const payouts: [Worker, number, 'payout' | 'advance', number][] = [
    [azamat, 5_000, 'advance', 9],
    [azamat, 15_000, 'payout', 6],
    [nurlan, 12_000, 'payout', 6],
    [bakyt, 10_000, 'payout', 6],
    [erlan, 3_000, 'advance', 4],
    [bakyt, 5_000, 'advance', 2],
  ];
  for (const [worker, amount, kind, daysAgo] of payouts) {
    await addPayout({
      objectId: obj.id, workerId: worker.id, date: todayStr(-daysAgo),
      amount: som(amount), method: 'cash', kind,
    });
  }

  const expenses: [Money, 'transport' | 'fuel' | 'tools' | 'food', number][] = [
    [som(3_000), 'transport', 10],
    [som(2_500), 'fuel', 7],
    [som(4_000), 'tools', 5],
    [som(2_000), 'food', 2],
  ];
  for (const [amount, category, daysAgo] of expenses) {
    await addExpense({
      objectId: obj.id, date: todayStr(-daysAgo), category,
      amount, paidBy: 'contractor', photoIds: [],
    });
  }

  await addReceipt({ objectId: obj.id, date: todayStr(-7), amount: som(40_000), method: 'transfer', kind: 'payment' });
  await addReceipt({ objectId: obj.id, date: todayStr(-3), amount: som(20_000), method: 'cash', kind: 'payment' });

  // Закрытый объект: кладка 100 м² принята и оплачена, бригада рассчитана
  const closed = await addObject('Склад, Кант', 'Частник', {
    paymentTerms: 'Наличными после приёмки',
    closedAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  });
  await seedRatesForObject(closed.id);
  const kladka = byName('Кладка');
  const closedTotals = lineTotals(100, som(600), som(400));
  const closedEntry = await addWorkEntry({
    objectId: closed.id, workTypeId: kladka.id, date: todayStr(-40),
    quantity: 100, unit: kladka.unit, customerPrice: som(600), workerPrice: som(400),
    customerTotal: closedTotals.customerTotal, workersTotal: closedTotals.workersTotal,
    shares: [{ workerId: bakyt.id, weight: 1, amount: closedTotals.workersTotal }],
    splitMode: 'equal', photoIds: [], accepted: false,
  });
  await acceptWorkEntries([closedEntry.id]);
  await addReceipt({ objectId: closed.id, date: todayStr(-32), amount: som(60_000), method: 'cash', kind: 'payment' });
  await addPayout({ objectId: closed.id, workerId: bakyt.id, date: todayStr(-31), amount: som(40_000), method: 'cash', kind: 'payout' });
  await addExpense({ objectId: closed.id, date: todayStr(-35), category: 'transport', amount: som(4_000), paidBy: 'contractor', photoIds: [] });

  // Начальный остаток кассы, чтобы «Свободно» было положительным
  const settings = await getSettings();
  await updateSettings({
    activeObjectId: obj.id,
    openingCash: settings.openingCash > 0 ? settings.openingCash : som(150_000),
  });
}

