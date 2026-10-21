// Контрольные примеры из ТЗ (раздел 9) + полное покрытие ядра.
import { describe, it, expect } from 'vitest';
import {
  notDeleted, activeEntries, lineTotals, doneTotal, acceptedTotal, notAcceptedTotal,
  workersTotalSum, receiptsTotal, adjustmentsTotal, customerOwes, accruedForWorker,
  paidToWorker, withheldFromWorker, workerBalance, workerIdsInvolved, owedToWorkers,
  advanceOverruns, contractorExpensesTotal, payoutsFromCash, cashBalance, freeCash,
  monthsInclusive, taxAmount, firstEntryDate, profitForecast, splitShares, calcArea,
  cashMovesNet, customerAdvanceLeft, objectStage,
} from './calc';
import type { WorkEntry, Payout, Expense, Receipt, CustomerAdjustment, Share, CashMove } from '../db/types';

// Сом → тыйын, для читаемости тестов
const som = (n: number) => Math.round(n * 100);

let seq = 0;
function entry(over: Partial<WorkEntry> = {}): WorkEntry {
  seq += 1;
  const quantity = over.quantity ?? 1;
  const customerPrice = over.customerPrice ?? 0;
  const workerPrice = over.workerPrice ?? 0;
  const totals = lineTotals(quantity, customerPrice, workerPrice);
  return {
    id: `e${seq}`, objectId: 'o1', workTypeId: 'w1', date: '2026-10-01',
    quantity, unit: 'м²', customerPrice, workerPrice,
    customerTotal: totals.customerTotal, workersTotal: totals.workersTotal,
    shares: [], splitMode: 'equal', photoIds: [], accepted: false,
    createdAt: '2026-10-01T10:00:00Z', version: 1,
    ...over,
  };
}

function payout(over: Partial<Payout> = {}): Payout {
  seq += 1;
  return {
    id: `p${seq}`, workerId: 'w1', date: '2026-10-01', amount: 0,
    method: 'cash', kind: 'payout', createdAt: '2026-10-01T10:00:00Z',
    ...over,
  };
}

function expense(over: Partial<Expense> = {}): Expense {
  seq += 1;
  return {
    id: `x${seq}`, objectId: 'o1', date: '2026-10-01', category: 'transport',
    amount: 0, paidBy: 'contractor', photoIds: [], createdAt: '2026-10-01T10:00:00Z',
    ...over,
  };
}

function receipt(over: Partial<Receipt> = {}): Receipt {
  seq += 1;
  return {
    id: `r${seq}`, objectId: 'o1', date: '2026-10-01', amount: 0,
    method: 'cash', createdAt: '2026-10-01T10:00:00Z',
    ...over,
  };
}

function adjustment(over: Partial<CustomerAdjustment> = {}): CustomerAdjustment {
  seq += 1;
  return {
    id: `a${seq}`, objectId: 'o1', date: '2026-10-01', kind: 'retention',
    amount: 0, createdAt: '2026-10-01T10:00:00Z',
    ...over,
  };
}

describe('Кладка: стена 10×3, проём 2 м², цены 600/400', () => {
  it('площадь 28 м², заказчику 16 800, рабочим 11 200, разница 5 600', () => {
    const area = calcArea(10, 3, [2]);
    expect(area).toBe(28);
    const t = lineTotals(area, som(600), som(400));
    expect(t.customerTotal).toBe(som(16_800));
    expect(t.workersTotal).toBe(som(11_200));
    expect(t.customerTotal - t.workersTotal).toBe(som(5_600));
  });

  it('площадь округляется до 0,01', () => {
    expect(calcArea(3.33, 2.5, [0.515])).toBe(7.81);
    expect(calcArea(2, 2, [])).toBe(4);
  });
});

describe('Сварка: 1 200 кг, цены 65/45', () => {
  const e = entry({ quantity: 1200, customerPrice: som(65), workerPrice: som(45), unit: 'кг' });

  it('заказчику 78 000, рабочим 54 000, разница 24 000', () => {
    expect(e.customerTotal).toBe(som(78_000));
    expect(e.workersTotal).toBe(som(54_000));
    expect(e.customerTotal - e.workersTotal).toBe(som(24_000));
  });

  it('расход 3 000, налог 4% = 3 120 → прибыль 17 880', () => {
    const active = [e];
    const done = doneTotal(active);
    const tax = taxAmount('percent', 4, 0, done, firstEntryDate(active), '2026-10-20');
    expect(tax).toBe(som(3_120));
    const profit = profitForecast(done, workersTotalSum(active), som(3_000), tax);
    expect(profit).toBe(som(17_880));
  });
});

describe('splitShares: деление суммы бригады', () => {
  it('100 000 сом, веса 10,10,5,5 → 33 333,33 / 33 333,33 / 16 666,67 / 16 666,67', () => {
    const parts = splitShares(som(100_000), [10, 10, 5, 5]);
    expect(parts).toEqual([3_333_333, 3_333_333, 1_666_667, 1_666_667]);
    expect(parts.reduce((s, p) => s + p, 0)).toBe(som(100_000));
  });

  it('100 сом, веса 1,1,1 → 33,34 / 33,33 / 33,33', () => {
    const parts = splitShares(som(100), [1, 1, 1]);
    expect(parts).toEqual([3_334, 3_333, 3_333]);
    expect(parts.reduce((s, p) => s + p, 0)).toBe(som(100));
  });

  it('ровное деление без остатка', () => {
    expect(splitShares(som(100), [1, 1])).toEqual([5_000, 5_000]);
  });

  it('пустые веса и нулевые веса → нули', () => {
    expect(splitShares(som(100), [])).toEqual([]);
    expect(splitShares(som(100), [0, 0])).toEqual([0, 0]);
  });
});

describe('Баланс рабочего', () => {
  const shares: Share[] = [{ workerId: 'A', weight: 1, amount: som(68_000) }];
  const active = [entry({ shares })];

  it('начислено 68 000, аванс 15 000, выплата 20 000 → осталось 33 000', () => {
    const pays = [
      payout({ workerId: 'A', kind: 'advance', amount: som(15_000) }),
      payout({ workerId: 'A', kind: 'payout', amount: som(20_000) }),
    ];
    expect(accruedForWorker(active, 'A')).toBe(som(68_000));
    expect(paidToWorker(pays, 'A')).toBe(som(35_000));
    expect(workerBalance(active, pays, 'A')).toBe(som(33_000));
    expect(owedToWorkers(active, pays)).toBe(som(33_000));
    expect(advanceOverruns(active, pays)).toBe(0);
  });

  it('ещё выдача 40 000 → баланс −7 000, в «я должен» не входит, перебор 7 000', () => {
    const pays = [
      payout({ workerId: 'A', kind: 'advance', amount: som(15_000) }),
      payout({ workerId: 'A', kind: 'payout', amount: som(20_000) }),
      payout({ workerId: 'A', kind: 'payout', amount: som(40_000) }),
    ];
    expect(workerBalance(active, pays, 'A')).toBe(som(-7_000));
    expect(owedToWorkers(active, pays)).toBe(0);
    expect(advanceOverruns(active, pays)).toBe(som(7_000));
  });

  it('удержание уменьшает баланс и не трогает «выдано»', () => {
    const pays = [
      payout({ workerId: 'A', kind: 'deduction', amount: som(5_000) }),
      payout({ workerId: 'B', kind: 'payout', amount: som(1_000) }),
      payout({ workerId: 'A', kind: 'payout', amount: som(2_000), deletedAt: 'x' }),
    ];
    expect(withheldFromWorker(pays, 'A')).toBe(som(5_000));
    expect(paidToWorker(pays, 'A')).toBe(0);
    expect(workerBalance(active, pays, 'A')).toBe(som(63_000));
    expect(workerIdsInvolved(active, pays).sort()).toEqual(['A', 'B']);
  });
});

describe('Долг заказчика', () => {
  const active = [
    entry({ quantity: 1, customerPrice: som(100_000), workerPrice: 0, accepted: true }),
    entry({ quantity: 1, customerPrice: som(50_000), workerPrice: 0 }),
  ];

  it('выполнено 150 000, принято 100 000, поступило 60 000 → должны 40 000, не принято 50 000', () => {
    const rec = [receipt({ amount: som(60_000) })];
    expect(doneTotal(active)).toBe(som(150_000));
    expect(acceptedTotal(active)).toBe(som(100_000));
    expect(notAcceptedTotal(active)).toBe(som(50_000));
    expect(customerOwes(active, rec, [])).toBe(som(40_000));
  });

  it('удержание 5 000 → мне должны 35 000', () => {
    const rec = [receipt({ amount: som(60_000) })];
    const adj = [adjustment({ amount: som(5_000) })];
    expect(adjustmentsTotal(adj)).toBe(som(5_000));
    expect(customerOwes(active, rec, adj)).toBe(som(35_000));
  });
});

describe('Касса и свободно', () => {
  it('0 + 300 000 − 250 000 − 100 000 = −50 000', () => {
    const rec = [receipt({ amount: som(300_000) })];
    const pays = [payout({ amount: som(250_000) })];
    const exps = [expense({ amount: som(100_000) })];
    expect(cashBalance(0, rec, pays, exps)).toBe(som(-50_000));
  });

  it('расход 20 000 paidBy=customer кассу и прибыль не меняет', () => {
    const exps = [
      expense({ amount: som(100_000) }),
      expense({ amount: som(20_000), paidBy: 'customer' }),
      expense({ amount: som(7_000), deletedAt: 'x' }),
    ];
    expect(contractorExpensesTotal(exps)).toBe(som(100_000));
    expect(cashBalance(0, [], [], exps)).toBe(som(-100_000));
  });

  it('удержание не выходит из кассы; свободно = касса − я должен', () => {
    const pays = [
      payout({ amount: som(10_000), kind: 'payout' }),
      payout({ amount: som(5_000), kind: 'deduction' }),
      payout({ amount: som(2_000), kind: 'advance', deletedAt: 'x' }),
    ];
    expect(payoutsFromCash(pays)).toBe(som(10_000));
    expect(freeCash(som(40_000), som(44_000))).toBe(som(-4_000));
  });
});

describe('Снимок цен', () => {
  it('изменение расценки не меняет старую запись, новая берёт новую цену', () => {
    const oldEntry = entry({ quantity: 10, customerPrice: som(600), workerPrice: som(400) });
    // расценка объекта изменилась: 700/450 — старая запись хранит свой снимок
    const newEntry = entry({ quantity: 10, customerPrice: som(700), workerPrice: som(450) });
    expect(oldEntry.customerTotal).toBe(som(6_000));
    expect(newEntry.customerTotal).toBe(som(7_000));
    expect(doneTotal([oldEntry, newEntry])).toBe(som(13_000));
  });
});

describe('Версии и мягкое удаление', () => {
  it('правка создаёт версию 2, суммы только по ней', () => {
    const v1 = entry({ quantity: 100, customerPrice: som(65), workerPrice: som(45) });
    const v2 = entry({
      quantity: 120, customerPrice: som(65), workerPrice: som(45),
      version: 2, supersedesId: v1.id,
    });
    const act = activeEntries([v1, v2]);
    expect(act).toEqual([v2]);
    expect(doneTotal(act)).toBe(som(7_800));
  });

  it('удаление новой версии возвращает старую в активные', () => {
    const v1 = entry({ quantity: 100, customerPrice: som(65), workerPrice: som(45) });
    const v2 = entry({ version: 2, supersedesId: v1.id, deletedAt: 'x' });
    expect(activeEntries([v1, v2])).toEqual([v1]);
  });

  it('мягкое удаление исключает запись, восстановление возвращает', () => {
    const e1 = entry({ quantity: 1, customerPrice: som(1_000), workerPrice: 0 });
    const deleted = { ...e1, deletedAt: '2026-10-02T10:00:00Z' };
    expect(doneTotal(activeEntries([deleted]))).toBe(0);
    const restored = { ...deleted, deletedAt: undefined };
    expect(doneTotal(activeEntries([restored]))).toBe(som(1_000));
    expect(notDeleted([deleted])).toEqual([]);
  });
});

describe('Налог', () => {
  it('none → 0', () => {
    expect(taxAmount('none', 4, som(3_000), som(100_000), '2026-09-15', '2026-10-20')).toBe(0);
  });

  it('fixedMonthly: 3 000 в месяц, 15 сентября — 20 октября → 2 месяца → 6 000', () => {
    expect(monthsInclusive('2026-09-15', '2026-10-20')).toBe(2);
    expect(taxAmount('fixedMonthly', 0, som(3_000), 0, '2026-09-15', '2026-10-20')).toBe(som(6_000));
  });

  it('fixedMonthly: минимум 1 месяц, без записей → 0', () => {
    expect(monthsInclusive('2026-10-05', '2026-10-20')).toBe(1);
    expect(monthsInclusive('2026-11-05', '2026-10-20')).toBe(1);
    expect(monthsInclusive('2025-12-15', '2026-01-10')).toBe(2);
    expect(taxAmount('fixedMonthly', 0, som(3_000), 0, undefined, '2026-10-20')).toBe(0);
  });

  it('первая дата записей — минимальная', () => {
    const a = entry({ date: '2026-09-15' });
    const b = entry({ date: '2026-09-01' });
    expect(firstEntryDate([a, b])).toBe('2026-09-01');
    expect(firstEntryDate([])).toBeUndefined();
  });
});

describe('Поступления', () => {
  it('сумма без удалённых', () => {
    const rec = [receipt({ amount: som(10_000) }), receipt({ amount: som(5_000), deletedAt: 'x' })];
    expect(receiptsTotal(rec)).toBe(som(10_000));
  });
});

describe('Частичная приёмка', () => {
  it('принято 450 из 500 кг → принято 29 250, не принято 3 250', () => {
    const e = entry({
      quantity: 500, customerPrice: som(65), workerPrice: som(45), unit: 'кг',
      accepted: true, acceptedQuantity: 450, acceptedTotal: som(29_250),
    });
    expect(doneTotal([e])).toBe(som(32_500));
    expect(acceptedTotal([e])).toBe(som(29_250));
    expect(notAcceptedTotal([e])).toBe(som(3_250));
  });
});

describe('Аванс заказчика', () => {
  it('поступило больше принятого → остаток аванса, долга нет', () => {
    const active = [entry({ quantity: 1, customerPrice: som(30_000), workerPrice: 0, accepted: true })];
    const owed = customerOwes(active, [receipt({ amount: som(50_000), kind: 'advance' })], []);
    expect(owed).toBe(som(-20_000));
    expect(customerAdvanceLeft(owed)).toBe(som(20_000));
    expect(customerAdvanceLeft(som(5_000))).toBe(0);
  });
});

describe('Личные движения кассы', () => {
  const move = (over: Partial<CashMove>): CashMove => ({
    id: 'm', date: '2026-10-01', kind: 'draw', amount: 0, createdAt: 'x', ...over,
  });

  it('взял себе уменьшает кассу, вложил свои увеличивает, удалённые не считаются', () => {
    const moves = [
      move({ kind: 'draw', amount: som(20_000) }),
      move({ kind: 'contribution', amount: som(50_000) }),
      move({ kind: 'draw', amount: som(7_000), deletedAt: 'x' }),
    ];
    expect(cashMovesNet(moves)).toBe(som(30_000));
    expect(cashBalance(0, [], [], [], moves)).toBe(som(30_000));
    expect(cashBalance(som(1_000), [], [], [])).toBe(som(1_000));
  });
});

describe('Стадия объекта', () => {
  it('взял → работаем → сдаём → получаем → закрыл', () => {
    const obj = {};
    expect(objectStage(obj, [], [])).toBe('taken');
    const work = entry({ quantity: 1, customerPrice: som(1_000), workerPrice: 0 });
    expect(objectStage(obj, [work], [])).toBe('working');
    const acc = { ...work, accepted: true };
    expect(objectStage(obj, [acc], [])).toBe('handing');
    expect(objectStage(obj, [acc], [receipt({ amount: som(500) })])).toBe('getting');
    expect(objectStage(obj, [work], [receipt({ amount: som(500) })])).toBe('working');
    expect(objectStage({ closedAt: 'x' }, [acc], [])).toBe('closed');
  });
});
