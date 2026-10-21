// Сводные числа: главная «Сегодня», объект, лента записей.
import {
  activeEntries, customerOwes, owedToWorkers, advanceOverruns, cashBalance,
  freeCash, doneTotal, acceptedTotal, workersTotalSum, contractorExpensesTotal, taxAmount,
  firstEntryDate, profitForecast, notDeleted, receiptsTotal, adjustmentsTotal,
  customerAdvanceLeft, objectStage,
} from '../core/calc';
import { todayStr } from '../db/repo';
import {
  byObject, useAdjustments, useEntries, useExpenses, usePayouts,
  useReceipts, useSettings, useActiveObject, useWorkers, useWorkTypes, useCashMoves, useObjects,
} from './hooks';
import type { Lang, Money, SiteObject } from '../db/types';
import { translate, formatDateShort } from '../i18n';
import { formatMoney, formatQuantity } from '../core/format';

export function wtLabel(wt: { nameRu: string; nameKy: string } | undefined, lang: Lang): string {
  if (!wt) return '';
  return lang === 'ky' && wt.nameKy ? wt.nameKy : wt.nameRu;
}

// Числа для «Сегодня»: касса и долг бригаде — по всем объектам, заказчик — по активному
export function useHomeSummary() {
  const settings = useSettings();
  const activeObject = useActiveObject();
  const entries = useEntries();
  const payouts = usePayouts();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const adjustments = useAdjustments();
  const moves = useCashMoves();

  const allActive = activeEntries(entries);
  const objEntries = byObject(allActive, activeObject?.id);
  const objReceipts = byObject(receipts, activeObject?.id);
  const objAdjustments = byObject(adjustments, activeObject?.id);

  const owedToMe = customerOwes(objEntries, objReceipts, objAdjustments);
  const owed = owedToWorkers(allActive, payouts);
  const overruns = advanceOverruns(allActive, payouts);
  const cash = cashBalance(settings.openingCash, receipts, payouts, expenses, moves);
  const free = freeCash(cash, owed);
  const done = doneTotal(objEntries);
  const notAccepted = done - acceptedTotal(objEntries);

  return {
    settings, activeObject, entries, payouts, expenses, receipts, adjustments, moves,
    allActive, objEntries, owedToMe, advanceLeft: customerAdvanceLeft(owedToMe),
    owed, overruns, cash, free, done, notAccepted,
    todayEntries: objEntries.filter((e) => e.date === todayStr()),
  };
}

// Сводка по одному объекту
export function useObjectSummary(objectId: string | undefined) {
  const settings = useSettings();
  const objects = useObjects();
  const entries = useEntries();
  const payouts = usePayouts();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const adjustments = useAdjustments();
  const object = objects.find((o) => o.id === objectId);

  const active = byObject(activeEntries(entries), objectId);
  const objReceipts = notDeleted(byObject(receipts, objectId));
  const objAdjustments = notDeleted(byObject(adjustments, objectId));
  const objExpenses = byObject(expenses, objectId);

  const done = doneTotal(active);
  const accepted = acceptedTotal(active);
  const notAccepted = done - accepted;
  const received = receiptsTotal(objReceipts);
  const withheld = adjustmentsTotal(objAdjustments);
  const owedToMe = customerOwes(active, objReceipts, objAdjustments);
  const workersSum = workersTotalSum(active);
  const contractorExp = contractorExpensesTotal(objExpenses);
  const tax = taxAmount(
    settings.taxMode, settings.taxPercent, settings.taxFixedMonthly,
    done, firstEntryDate(active), todayStr(),
  );
  const profit = profitForecast(done, workersSum, contractorExp, tax);
  // Факт по деньгам: что заплатил заказчик минус бригада, расходы и налог
  const profitFact = received - workersSum - contractorExp - tax;
  const stage = object ? objectStage(object, active, objReceipts) : 'taken';
  const unacceptedEntries = active.filter((e) => !e.accepted || (e.acceptedQuantity !== undefined && e.acceptedQuantity < e.quantity));

  return {
    object, settings, active, objReceipts, objAdjustments, objExpenses, payouts,
    done, accepted, notAccepted, received, withheld, owedToMe,
    advanceLeft: customerAdvanceLeft(owedToMe),
    workersSum, contractorExp, tax, profit, profitFact, stage, unacceptedEntries,
  };
}

export function objectStageOf(object: SiteObject, entriesAll: ReturnType<typeof useEntries>, receiptsAll: ReturnType<typeof useReceipts>) {
  return objectStage(object, byObject(activeEntries(entriesAll), object.id), notDeleted(byObject(receiptsAll, object.id)));
}

export interface FeedRow {
  key: string;
  to: string;
  date: string;
  createdAt: string;
  typeKey: string; // ключ словаря метки типа
  tagKind: 'work' | 'pay' | 'exp' | 'rec' | 'grey';
  tone: 'in' | 'out' | 'plain';
  title: string;
  sub?: string;
  amountText: string;
}

// Лента записей объекта (или всех), свежие сверху
export function useFeed(limit = 20, objectId?: string): FeedRow[] {
  const lang = useSettings().lang;
  const entries = useEntries();
  const payouts = usePayouts();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const adjustments = useAdjustments();
  const moves = useCashMoves();
  const workers = useWorkers();
  const workTypes = useWorkTypes();

  const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? '';
  const rows: FeedRow[] = [];

  for (const e of byObject(activeEntries(entries), objectId)) {
    const wt = workTypes.find((w) => w.id === e.workTypeId);
    rows.push({
      key: `w${e.id}`, to: `/works/${e.id}`, date: e.date, createdAt: e.createdAt,
      typeKey: 'feed.work', tagKind: 'work', tone: 'plain',
      title: `${wtLabel(wt, lang)} · ${formatQuantity(e.quantity)} ${e.unit}`,
      sub: e.shares.map((s) => workerName(s.workerId)).filter(Boolean).join(', '),
      amountText: formatMoney(e.customerTotal),
    });
  }
  for (const p of notDeleted(byObject(payouts, objectId))) {
    const typeKey = p.kind === 'advance' ? 'feed.advance' : p.kind === 'deduction' ? 'feed.deduction' : 'feed.payout';
    rows.push({
      key: `p${p.id}`, to: `/record/payout/${p.id}`, date: p.date, createdAt: p.createdAt,
      typeKey, tagKind: p.kind === 'deduction' ? 'grey' : 'pay', tone: p.kind === 'deduction' ? 'plain' : 'out',
      title: workerName(p.workerId),
      sub: translate(lang, p.method === 'cash' ? 'payout.cash' : 'payout.transfer'),
      amountText: `−${formatMoney(p.amount)}`,
    });
  }
  for (const x of notDeleted(byObject(expenses, objectId))) {
    rows.push({
      key: `x${x.id}`, to: `/record/expense/${x.id}`, date: x.date, createdAt: x.createdAt,
      typeKey: 'feed.expense', tagKind: 'exp', tone: 'out',
      title: translate(lang, `expense.${x.category}`),
      sub: x.paidBy === 'customer' ? translate(lang, 'expense.customerPaid') : undefined,
      amountText: `−${formatMoney(x.amount)}`,
    });
  }
  for (const r of notDeleted(byObject(receipts, objectId))) {
    rows.push({
      key: `r${r.id}`, to: `/record/receipt/${r.id}`, date: r.date, createdAt: r.createdAt,
      typeKey: r.kind === 'advance' ? 'feed.customerAdvance' : 'feed.receipt', tagKind: 'rec', tone: 'in',
      title: translate(lang, r.method === 'cash' ? 'payout.cash' : 'payout.transfer'),
      amountText: `+${formatMoney(r.amount)}`,
    });
  }
  for (const a of notDeleted(byObject(adjustments, objectId))) {
    rows.push({
      key: `a${a.id}`, to: `/record/adjustment/${a.id}`, date: a.date, createdAt: a.createdAt,
      typeKey: 'feed.adjustment', tagKind: 'grey', tone: 'plain',
      title: translate(lang, `adjustment.${a.kind}`),
      amountText: `−${formatMoney(a.amount)}`,
    });
  }
  if (!objectId) {
    for (const m of notDeleted(moves)) {
      rows.push({
        key: `m${m.id}`, to: `/record/cashMove/${m.id}`, date: m.date, createdAt: m.createdAt,
        typeKey: m.kind === 'draw' ? 'feed.draw' : 'feed.contribution', tagKind: m.kind === 'draw' ? 'pay' : 'rec',
        tone: m.kind === 'draw' ? 'out' : 'in',
        title: translate(lang, m.kind === 'draw' ? 'cash.drawTitle' : 'cash.contributionTitle'),
        sub: m.note,
        amountText: `${m.kind === 'draw' ? '−' : '+'}${formatMoney(m.amount)}`,
      });
    }
  }

  rows.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  return rows.slice(0, limit);
}

export function feedDateLabel(date: string, lang: Lang): string {
  return formatDateShort(date, lang);
}

export function moneyTone(value: Money): string {
  if (value > 0) return 'text-money-in';
  if (value < 0) return 'text-money-out';
  return 'text-ink';
}
