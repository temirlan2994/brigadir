// Ядро расчётов. Чистые функции: без React и без базы.
// Все деньги — целые тыйыны. Функции принимают массивы записей и дату today.
import type {
  WorkEntry, Payout, Expense, Receipt, CustomerAdjustment, Money, TaxMode,
  CashMove, ObjectStage,
} from '../db/types';

export interface Deletable { deletedAt?: string }

// Записи без мягкого удаления
export function notDeleted<T extends Deletable>(rows: T[]): T[] {
  return rows.filter((r) => !r.deletedAt);
}

// Активная запись: не удалена и не заменена новой версией
export function activeEntries(entries: WorkEntry[]): WorkEntry[] {
  const superseded = new Set<string>();
  for (const e of entries) {
    if (e.supersedesId && !e.deletedAt) superseded.add(e.supersedesId);
  }
  return entries.filter((e) => !e.deletedAt && !superseded.has(e.id));
}

// Итоги строки: округление до тыйына
export function lineTotals(quantity: number, customerPrice: Money, workerPrice: Money) {
  return {
    customerTotal: Math.round(quantity * customerPrice),
    workersTotal: Math.round(quantity * workerPrice),
  };
}

// Выполнено
export function doneTotal(active: WorkEntry[]): Money {
  return active.reduce((s, e) => s + e.customerTotal, 0);
}

// Принято (при частичной приёмке — принятая часть)
export function acceptedTotal(active: WorkEntry[]): Money {
  return active
    .filter((e) => e.accepted)
    .reduce((s, e) => s + (e.acceptedTotal ?? e.customerTotal), 0);
}

// Не принято
export function notAcceptedTotal(active: WorkEntry[]): Money {
  return doneTotal(active) - acceptedTotal(active);
}

// Рабочим всего (по активным записям)
export function workersTotalSum(active: WorkEntry[]): Money {
  return active.reduce((s, e) => s + e.workersTotal, 0);
}

// Поступило от заказчика
export function receiptsTotal(receipts: Receipt[]): Money {
  return notDeleted(receipts).reduce((s, r) => s + r.amount, 0);
}

// Корректировки заказчика
export function adjustmentsTotal(adjustments: CustomerAdjustment[]): Money {
  return notDeleted(adjustments).reduce((s, a) => s + a.amount, 0);
}

// Мне должны = Принято − Поступило − Корректировки
export function customerOwes(
  active: WorkEntry[], receipts: Receipt[], adjustments: CustomerAdjustment[],
): Money {
  return acceptedTotal(active) - receiptsTotal(receipts) - adjustmentsTotal(adjustments);
}

// Начислено рабочему
export function accruedForWorker(active: WorkEntry[], workerId: string): Money {
  let sum = 0;
  for (const e of active) {
    for (const s of e.shares) if (s.workerId === workerId) sum += s.amount;
  }
  return sum;
}

// Выдано рабочему (выплаты и авансы)
export function paidToWorker(payouts: Payout[], workerId: string): Money {
  return notDeleted(payouts)
    .filter((p) => p.workerId === workerId && p.kind !== 'deduction')
    .reduce((s, p) => s + p.amount, 0);
}

// Удержано с рабочего
export function withheldFromWorker(payouts: Payout[], workerId: string): Money {
  return notDeleted(payouts)
    .filter((p) => p.workerId === workerId && p.kind === 'deduction')
    .reduce((s, p) => s + p.amount, 0);
}

// Баланс рабочего = Начислено − Выдано − Удержано
export function workerBalance(active: WorkEntry[], payouts: Payout[], workerId: string): Money {
  return accruedForWorker(active, workerId)
    - paidToWorker(payouts, workerId)
    - withheldFromWorker(payouts, workerId);
}

// Все рабочие, встречающиеся в записях и выплатах
export function workerIdsInvolved(active: WorkEntry[], payouts: Payout[]): string[] {
  const ids = new Set<string>();
  for (const e of active) for (const s of e.shares) ids.add(s.workerId);
  for (const p of notDeleted(payouts)) ids.add(p.workerId);
  return [...ids];
}

// Я должен рабочим = Σ положительных балансов
export function owedToWorkers(active: WorkEntry[], payouts: Payout[]): Money {
  return workerIdsInvolved(active, payouts)
    .map((id) => workerBalance(active, payouts, id))
    .filter((b) => b > 0)
    .reduce((s, b) => s + b, 0);
}

// Переборы авансов = Σ |отрицательных балансов|
export function advanceOverruns(active: WorkEntry[], payouts: Payout[]): Money {
  return workerIdsInvolved(active, payouts)
    .map((id) => workerBalance(active, payouts, id))
    .filter((b) => b < 0)
    .reduce((s, b) => s - b, 0);
}

// Расходы подрядчика (paidBy = contractor)
export function contractorExpensesTotal(expenses: Expense[]): Money {
  return notDeleted(expenses)
    .filter((e) => e.paidBy === 'contractor')
    .reduce((s, e) => s + e.amount, 0);
}

// Выдачи из кассы (payout и advance)
export function payoutsFromCash(payouts: Payout[]): Money {
  return notDeleted(payouts)
    .filter((p) => p.kind !== 'deduction')
    .reduce((s, p) => s + p.amount, 0);
}

// Личные движения: вложил свои (+) и взял себе (−)
export function cashMovesNet(moves: CashMove[]): Money {
  return notDeleted(moves).reduce((s, m) => s + (m.kind === 'contribution' ? m.amount : -m.amount), 0);
}

// Касса = начальный остаток + поступило − выдано − расходы подрядчика ± личные движения
export function cashBalance(
  openingCash: Money, receipts: Receipt[], payouts: Payout[], expenses: Expense[],
  moves: CashMove[] = [],
): Money {
  return openingCash + receiptsTotal(receipts)
    - payoutsFromCash(payouts) - contractorExpensesTotal(expenses) + cashMovesNet(moves);
}

// Свободно = Касса − Я должен рабочим
export function freeCash(cash: Money, owed: Money): Money {
  return cash - owed;
}

// Аванс заказчика, который ещё надо отработать (когда поступило больше принятого)
export function customerAdvanceLeft(owed: Money): Money {
  return owed < 0 ? -owed : 0;
}

// Стадия объекта по тому, что уже произошло
export function objectStage(
  obj: { closedAt?: string }, active: WorkEntry[], receipts: Receipt[],
): ObjectStage {
  if (obj.closedAt) return 'closed';
  if (active.length === 0) return 'taken';
  const accepted = acceptedTotal(active);
  if (accepted > 0 && receiptsTotal(receipts) > 0) return 'getting';
  if (accepted > 0) return 'handing';
  return 'working';
}

// Календарные месяцы от месяца from до месяца to включительно (минимум 1)
export function monthsInclusive(from: string, to: string): number {
  const fy = Number(from.slice(0, 4));
  const fm = Number(from.slice(5, 7));
  const ty = Number(to.slice(0, 4));
  const tm = Number(to.slice(5, 7));
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
}

// Налог по режиму
export function taxAmount(
  mode: TaxMode, taxPercent: number, taxFixedMonthly: Money,
  done: Money, firstEntryDate: string | undefined, today: string,
): Money {
  if (mode === 'percent') return Math.round((done * taxPercent) / 100);
  if (mode === 'fixedMonthly') {
    if (!firstEntryDate) return 0;
    return taxFixedMonthly * monthsInclusive(firstEntryDate, today);
  }
  return 0;
}

// Дата первой активной записи (для налога fixedMonthly)
export function firstEntryDate(active: WorkEntry[]): string | undefined {
  let min: string | undefined;
  for (const e of active) if (!min || e.date < min) min = e.date;
  return min;
}

// Прибыль (прогноз) = Выполнено − Рабочим − Расходы подрядчика − Налог
export function profitForecast(
  done: Money, workersTotal: Money, contractorExpenses: Money, tax: Money,
): Money {
  return done - workersTotal - contractorExpenses - tax;
}

// Деление суммы бригады по весам, метод наибольших остатков.
// Σ результата всегда равна total; при равных остатках тыйын достаётся первым в списке.
export function splitShares(total: Money, weights: number[]): Money[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (weights.length === 0 || totalWeight <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / totalWeight);
  const base = exact.map((v) => Math.floor(v));
  let rest = total - base.reduce((s, v) => s + v, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0; k++, rest--) base[order[k % order.length].i] += 1;
  return base;
}

// Мини-калькулятор площади: длина × высота − Σ проёмов, до 0,01 м²
export function calcArea(length: number, height: number, openings: number[]): number {
  const area = length * height - openings.reduce((s, o) => s + o, 0);
  return Math.round(area * 100) / 100;
}
