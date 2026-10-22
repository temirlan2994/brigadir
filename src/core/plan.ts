// График оплаты: части договора, что наступило, что получено, сколько должен заказчик.
// Чистые функции. Деньги — целые тыйыны.
import type {
  CustomerAdjustment, Money, ObjectStage, PaymentPlan, PlanPart, Receipt, WorkEntry,
} from '../db/types';
import { acceptedTotal, adjustmentsTotal, objectStage, receiptsTotal, splitShares } from './calc';

export function isFixed(plan: PaymentPlan | undefined): plan is PaymentPlan & { basis: 'fixed' } {
  return plan?.basis === 'fixed';
}

// Суммы частей из процентов. При Σ = 100 % части в сумме дают ровно total;
// круглая сумма договора делится до сома
export function amountsFromPercents(total: Money, percents: number[]): Money[] {
  const sum = percents.reduce((s, p) => s + p, 0);
  const wholeSoms = total % 100 === 0;
  const unit = wholeSoms ? 100 : 1;
  if (Math.abs(sum - 100) < 1e-9) {
    return splitShares(total / unit, percents).map((x) => x * unit);
  }
  return percents.map((p) => Math.round((total / unit) * p / 100) * unit);
}

// Доли частей из сумм — точные, без округления: обратный пересчёт в суммы
// возвращает те же деньги до тыйына (на экране доля округляется до десятых)
export function percentsFromAmounts(parts: PlanPart[], total: Money): PlanPart[] {
  if (!total) return parts.map((p) => ({ ...p, percent: undefined }));
  return parts.map((p) => ({ ...p, percent: (p.amount / total) * 100 }));
}

// Пересчёт сумм частей после правки процентов или общей суммы
export function withPercentAmounts(plan: PaymentPlan): PaymentPlan {
  if (plan.splitBy !== 'percent' || !plan.total) return plan;
  const amounts = amountsFromPercents(plan.total, plan.parts.map((p) => p.percent ?? 0));
  return { ...plan, parts: plan.parts.map((p, i) => ({ ...p, amount: amounts[i] })) };
}

export function partsSum(parts: PlanPart[]): Money {
  return parts.reduce((s, p) => s + p.amount, 0);
}

export function percentsSum(parts: PlanPart[]): number {
  return Math.round(parts.reduce((s, p) => s + (p.percent ?? 0), 0) * 10) / 10;
}

export interface PlanCheck {
  sum: Money; // сколько распределено по частям
  left: Money; // сколько ещё не распределено (минус — распределено лишнее)
  percent: number;
  ok: boolean;
}

// Сходится ли разбивка: по общей сумме части должны давать ровно сумму договора
export function checkPlan(plan: PaymentPlan): PlanCheck {
  const sum = partsSum(plan.parts);
  const percent = percentsSum(plan.parts);
  if (!isFixed(plan)) return { sum, left: 0, percent, ok: true };
  const total = plan.total ?? 0;
  const left = total - sum;
  const ok = total > 0 && plan.parts.length > 0 && left === 0
    && (plan.splitBy === 'amount' || percent === 100);
  return { sum, left, percent, ok };
}

// Часть к оплате: аванс — сразу, этап — когда отмечен сданным, дата — когда наступила
export function partDue(part: PlanPart, today: string): boolean {
  if (part.trigger === 'start' || part.doneAt) return true;
  return part.trigger === 'date' && !!part.dueDate && part.dueDate <= today;
}

export function dueTotal(parts: PlanPart[], today: string): Money {
  return parts.filter((p) => partDue(p, today)).reduce((s, p) => s + p.amount, 0);
}

export interface PartStatus {
  part: PlanPart;
  paid: Money;
  left: Money;
  due: boolean;
  overdue: boolean;
  state: 'paid' | 'partial' | 'due' | 'waiting';
}

// Полученные деньги закрывают части по порядку: сначала аванс, потом этапы
export function planStatus(parts: PlanPart[], received: Money, today: string): PartStatus[] {
  let pool = Math.max(0, received);
  return parts.map((part) => {
    const paid = Math.min(part.amount, pool);
    pool -= paid;
    const left = part.amount - paid;
    const due = partDue(part, today);
    const overdue = left > 0 && !!part.dueDate && part.dueDate < today;
    const state = left === 0 ? 'paid' : paid > 0 ? 'partial' : due ? 'due' : 'waiting';
    return { part, paid, left, due, overdue, state };
  });
}

// Какую часть заказчик должен закрыть следующей
export function nextPart(statuses: PartStatus[]): PartStatus | undefined {
  return statuses.find((s) => s.left > 0);
}

// Заказчик должен: по общей сумме — наступившие части, по объёмам — принятое; минус деньги и удержания
export function customerOwesByPlan(
  plan: PaymentPlan | undefined, active: WorkEntry[], receipts: Receipt[],
  adjustments: CustomerAdjustment[], today: string,
): Money {
  const base = isFixed(plan) ? dueTotal(plan.parts, today) : acceptedTotal(active);
  return base - receiptsTotal(receipts) - adjustmentsTotal(adjustments);
}

// Сколько всего заработать у заказчика: сумма договора или сделанное по ценам
export function revenueBase(plan: PaymentPlan | undefined, done: Money): Money {
  return isFixed(plan) ? (plan.total ?? partsSum(plan.parts)) : done;
}

// Сданные этапы (аванс не считается)
export function stagesHanded(parts: PlanPart[], today: string): number {
  return parts.filter((p) => p.trigger !== 'start' && partDue(p, today)).length;
}

// Стадия объекта: по общей сумме «сдаём» начинается со сданного этапа
export function objectStageByPlan(
  obj: { closedAt?: string }, plan: PaymentPlan | undefined, active: WorkEntry[],
  receipts: Receipt[], today: string,
): ObjectStage {
  if (!isFixed(plan) || obj.closedAt) return objectStage(obj, active, receipts);
  if (stagesHanded(plan.parts, today) === 0) return active.length === 0 ? 'taken' : 'working';
  return receiptsTotal(receipts) > 0 ? 'getting' : 'handing';
}
