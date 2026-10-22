// Тесты графика оплаты: проценты, проверка разбивки, части к оплате, долг заказчика.
import { describe, it, expect } from 'vitest';
import {
  amountsFromPercents, checkPlan, customerOwesByPlan, dueTotal, isFixed, nextPart,
  objectStageByPlan, partDue, partsSum, percentsSum, planStatus, revenueBase,
  stagesHanded, withPercentAmounts,
} from './plan';
import type { PaymentPlan, PlanPart, Receipt, WorkEntry, CustomerAdjustment } from '../db/types';

const som = (n: number) => n * 100;
const TODAY = '2026-10-22';

function part(p: Partial<PlanPart>): PlanPart {
  return { id: p.title ?? 'x', title: 'Часть', amount: 0, trigger: 'stage', ...p };
}

function fixed(parts: PlanPart[], total = som(1_500_000), splitBy: 'percent' | 'amount' = 'percent'): PaymentPlan {
  return { basis: 'fixed', total, splitBy, parts };
}

function receipt(amount: number): Receipt {
  return { id: `r${amount}`, objectId: 'o', date: TODAY, amount, method: 'cash', createdAt: TODAY };
}

function entry(customerTotal: number, accepted: boolean): WorkEntry {
  return {
    id: `e${customerTotal}`, objectId: 'o', workTypeId: 'w', date: TODAY, quantity: 1, unit: 'м²',
    customerPrice: customerTotal, workerPrice: 0, customerTotal, workersTotal: 0, shares: [],
    splitMode: 'equal', photoIds: [], accepted, createdAt: TODAY, version: 1,
  };
}

const adjustment = (amount: number): CustomerAdjustment => ({
  id: 'a', objectId: 'o', date: TODAY, kind: 'retention', amount, createdAt: TODAY,
});

describe('amountsFromPercents', () => {
  it('30/40/30 от 1 500 000 — ровно до сома', () => {
    expect(amountsFromPercents(som(1_500_000), [30, 40, 30])).toEqual([som(450_000), som(600_000), som(450_000)]);
  });

  it('три равные трети: остаток сома уходит первой части, сумма сходится', () => {
    const parts = amountsFromPercents(som(1_000_000), [100 / 3, 100 / 3, 100 / 3]);
    expect(parts.reduce((s, x) => s + x, 0)).toBe(som(1_000_000));
    expect(parts[0]).toBe(som(333_334));
  });

  it('сумма с тыйынами делится до тыйына', () => {
    const parts = amountsFromPercents(1_001, [50, 50]);
    expect(parts).toEqual([501, 500]);
  });

  it('проценты не до 100 — каждая часть отдельно', () => {
    expect(amountsFromPercents(som(1_000_000), [30, 40])).toEqual([som(300_000), som(400_000)]);
    expect(amountsFromPercents(1_001, [10])).toEqual([100]);
  });
});

describe('withPercentAmounts', () => {
  it('пересчитывает суммы из процентов', () => {
    const plan = withPercentAmounts(fixed([part({ percent: 30 }), part({ percent: 70 })]));
    expect(plan.parts.map((p) => p.amount)).toEqual([som(450_000), som(1_050_000)]);
  });

  it('части без процента считаются нулём', () => {
    const plan = withPercentAmounts(fixed([part({}), part({ percent: 100 })]));
    expect(plan.parts.map((p) => p.amount)).toEqual([0, som(1_500_000)]);
  });

  it('суммами или без общей суммы — ничего не трогает', () => {
    const byAmount = fixed([part({ amount: 5 })], som(10), 'amount');
    expect(withPercentAmounts(byAmount)).toBe(byAmount);
    const noTotal: PaymentPlan = { basis: 'fixed', splitBy: 'percent', parts: [part({ percent: 50, amount: 7 })] };
    expect(withPercentAmounts(noTotal)).toBe(noTotal);
  });
});

describe('checkPlan', () => {
  it('сходится: 100 % и вся сумма', () => {
    const plan = withPercentAmounts(fixed([part({ percent: 30 }), part({ percent: 70 })]));
    expect(checkPlan(plan)).toEqual({ sum: som(1_500_000), left: 0, percent: 100, ok: true });
  });

  it('не хватает 10 %', () => {
    const plan = withPercentAmounts(fixed([part({ percent: 30 }), part({ percent: 60 })]));
    const c = checkPlan(plan);
    expect(c.ok).toBe(false);
    expect(c.left).toBe(som(150_000));
    expect(c.percent).toBe(90);
  });

  it('суммами: лишнее распределено', () => {
    const plan = fixed([part({ amount: som(1_000_000) }), part({ amount: som(600_000) })], som(1_500_000), 'amount');
    const c = checkPlan(plan);
    expect(c.ok).toBe(false);
    expect(c.left).toBe(-som(100_000));
  });

  it('суммами ровно — сходится без процентов', () => {
    const plan = fixed([part({ amount: som(500_000) }), part({ amount: som(1_000_000) })], som(1_500_000), 'amount');
    expect(checkPlan(plan).ok).toBe(true);
  });

  it('без суммы договора или без частей — не сходится', () => {
    expect(checkPlan(fixed([part({ amount: 0 })], 0, 'amount')).ok).toBe(false);
    expect(checkPlan({ basis: 'fixed', splitBy: 'amount', parts: [] }).ok).toBe(false);
  });

  it('по объёмам разбивка не обязательна', () => {
    const plan: PaymentPlan = { basis: 'volume', splitBy: 'amount', parts: [part({ trigger: 'start', amount: som(50_000) })] };
    expect(checkPlan(plan)).toEqual({ sum: som(50_000), left: 0, percent: 0, ok: true });
  });
});

describe('части к оплате', () => {
  it('аванс — сразу; этап — после отметки; дата — когда наступила', () => {
    expect(partDue(part({ trigger: 'start' }), TODAY)).toBe(true);
    expect(partDue(part({ trigger: 'stage' }), TODAY)).toBe(false);
    expect(partDue(part({ trigger: 'stage', doneAt: TODAY }), TODAY)).toBe(true);
    expect(partDue(part({ trigger: 'date', dueDate: '2026-10-22' }), TODAY)).toBe(true);
    expect(partDue(part({ trigger: 'date', dueDate: '2026-11-01' }), TODAY)).toBe(false);
    expect(partDue(part({ trigger: 'date' }), TODAY)).toBe(false);
  });

  it('сумма наступивших частей и сданные этапы', () => {
    const parts = [
      part({ trigger: 'start', amount: som(450_000) }),
      part({ trigger: 'stage', amount: som(600_000), doneAt: TODAY }),
      part({ trigger: 'stage', amount: som(450_000) }),
    ];
    expect(dueTotal(parts, TODAY)).toBe(som(1_050_000));
    expect(stagesHanded(parts, TODAY)).toBe(1);
    expect(partsSum(parts)).toBe(som(1_500_000));
    expect(percentsSum(parts)).toBe(0);
  });
});

describe('planStatus', () => {
  const parts = [
    part({ title: 'Аванс', trigger: 'start', amount: som(450_000) }),
    part({ title: 'Коробка', trigger: 'stage', amount: som(600_000), doneAt: TODAY }),
    part({ title: 'Сдача', trigger: 'date', amount: som(450_000), dueDate: '2026-10-01' }),
    part({ title: 'Гарантия', trigger: 'stage', amount: som(100_000) }),
  ];

  it('деньги закрывают части по порядку', () => {
    const st = planStatus(parts, som(700_000), TODAY);
    expect(st.map((s) => s.state)).toEqual(['paid', 'partial', 'due', 'waiting']);
    expect(st[1].paid).toBe(som(250_000));
    expect(st[1].left).toBe(som(350_000));
    expect(st[2].overdue).toBe(true);
    expect(st[0].overdue).toBe(false);
    expect(nextPart(st)?.part.title).toBe('Коробка');
  });

  it('всё оплачено — следующей части нет; минус не ломает', () => {
    expect(nextPart(planStatus(parts, som(5_000_000), TODAY))).toBeUndefined();
    expect(planStatus(parts, -5, TODAY)[0].paid).toBe(0);
  });
});

describe('customerOwesByPlan', () => {
  const entries = [entry(som(100_000), true), entry(som(50_000), false)];

  it('по объёмам: принятое минус получено и удержано', () => {
    const owes = customerOwesByPlan(undefined, entries, [receipt(som(30_000))], [adjustment(som(5_000))], TODAY);
    expect(owes).toBe(som(65_000));
  });

  it('по общей сумме: наступившие части минус получено', () => {
    const plan = fixed([
      part({ trigger: 'start', amount: som(450_000) }),
      part({ trigger: 'stage', amount: som(1_050_000) }),
    ], som(1_500_000), 'amount');
    expect(customerOwesByPlan(plan, entries, [receipt(som(400_000))], [], TODAY)).toBe(som(50_000));
    expect(isFixed(plan)).toBe(true);
    expect(isFixed(undefined)).toBe(false);
  });
});

describe('revenueBase', () => {
  it('договор — сумма договора или частей; объёмы — сделанное', () => {
    expect(revenueBase(fixed([], som(900)), som(5))).toBe(som(900));
    expect(revenueBase({ basis: 'fixed', splitBy: 'amount', parts: [part({ amount: som(70) })] }, som(5))).toBe(som(70));
    expect(revenueBase(undefined, som(5))).toBe(som(5));
  });
});

describe('objectStageByPlan', () => {
  const plan = fixed([part({ trigger: 'start', amount: 1 }), part({ trigger: 'stage', amount: 2 })]);
  const handed = fixed([part({ trigger: 'start', amount: 1 }), part({ trigger: 'stage', amount: 2, doneAt: TODAY })]);

  it('по объёмам и закрытый — как обычно', () => {
    expect(objectStageByPlan({}, undefined, [], [], TODAY)).toBe('taken');
    expect(objectStageByPlan({ closedAt: TODAY }, plan, [], [], TODAY)).toBe('closed');
  });

  it('общая сумма: взял → работаем → сдаём → получаем', () => {
    expect(objectStageByPlan({}, plan, [], [], TODAY)).toBe('taken');
    expect(objectStageByPlan({}, plan, [entry(1, false)], [], TODAY)).toBe('working');
    expect(objectStageByPlan({}, handed, [entry(1, false)], [], TODAY)).toBe('handing');
    expect(objectStageByPlan({}, handed, [entry(1, false)], [receipt(1)], TODAY)).toBe('getting');
  });
});
