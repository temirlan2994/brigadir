// Сводные числа главной и ленты записей.
import {
  activeEntries, customerOwes, owedToWorkers, advanceOverruns, cashBalance,
  freeCash, doneTotal, workersTotalSum, contractorExpensesTotal, taxAmount,
  firstEntryDate, profitForecast, notDeleted,
} from '../core/calc';
import { todayStr } from '../db/repo';
import {
  byObject, useAdjustments, useEntries, useExpenses, usePayouts,
  useReceipts, useSettings, useActiveObject, useWorkers, useWorkTypes,
} from './hooks';
import type { Lang, Money } from '../db/types';
import { translate, formatDateShort } from '../i18n';
import { formatMoney, formatQuantity } from '../core/format';

export function wtLabel(wt: { nameRu: string; nameKy: string } | undefined, lang: Lang): string {
  if (!wt) return '';
  return lang === 'ky' && wt.nameKy ? wt.nameKy : wt.nameRu;
}

export function useHomeSummary() {
  const settings = useSettings();
  const activeObject = useActiveObject();
  const entries = useEntries();
  const payouts = usePayouts();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const adjustments = useAdjustments();

  const allActive = activeEntries(entries);
  const objEntries = byObject(allActive, activeObject?.id);
  const objReceipts = byObject(receipts, activeObject?.id);
  const objAdjustments = byObject(adjustments, activeObject?.id);
  const objExpenses = byObject(expenses, activeObject?.id);

  // «Мне должны» — по активному объекту; касса и долг рабочим — по всем объектам
  const owedToMe = customerOwes(objEntries, objReceipts, objAdjustments);
  const owed = owedToWorkers(allActive, payouts);
  const overruns = advanceOverruns(allActive, payouts);
  const cash = cashBalance(settings.openingCash, receipts, payouts, expenses);
  const free = freeCash(cash, owed);

  const done = doneTotal(objEntries);
  const workersSum = workersTotalSum(objEntries);
  const contractorExp = contractorExpensesTotal(objExpenses);
  const tax = taxAmount(
    settings.taxMode, settings.taxPercent, settings.taxFixedMonthly,
    done, firstEntryDate(objEntries), todayStr(),
  );
  const profit = profitForecast(done, workersSum, contractorExp, tax);

  return {
    settings, activeObject, entries, payouts, expenses, receipts, adjustments,
    allActive, objEntries, objReceipts, objAdjustments, objExpenses,
    owedToMe, owed, overruns, cash, free, done, workersSum, contractorExp, tax, profit,
  };
}

export interface FeedRow {
  key: string;
  to: string;
  date: string;
  createdAt: string;
  typeKey: string; // ключ словаря метки типа
  tone: 'in' | 'out' | 'plain';
  title: string;
  amountText: string;
}

// Лента последних записей всех типов, свежие сверху
export function useFeed(limit = 20): FeedRow[] {
  const lang = useSettingsLang();
  const entries = useEntries();
  const payouts = usePayouts();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const adjustments = useAdjustments();
  const workers = useWorkers();
  const workTypes = useWorkTypes();

  const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? '';
  const rows: FeedRow[] = [];

  for (const e of activeEntries(entries)) {
    const wt = workTypes.find((w) => w.id === e.workTypeId);
    rows.push({
      key: `w${e.id}`, to: `/works/${e.id}`, date: e.date, createdAt: e.createdAt,
      typeKey: 'feed.work', tone: 'plain',
      title: `${wtLabel(wt, lang)} · ${formatQuantity(e.quantity)} ${e.unit}`,
      amountText: formatMoney(e.customerTotal),
    });
  }
  for (const p of notDeleted(payouts)) {
    const typeKey = p.kind === 'advance' ? 'feed.advance' : p.kind === 'deduction' ? 'feed.deduction' : 'feed.payout';
    rows.push({
      key: `p${p.id}`, to: `/record/payout/${p.id}`, date: p.date, createdAt: p.createdAt,
      typeKey, tone: p.kind === 'deduction' ? 'plain' : 'out',
      title: workerName(p.workerId),
      amountText: `−${formatMoney(p.amount)}`,
    });
  }
  for (const x of notDeleted(expenses)) {
    rows.push({
      key: `x${x.id}`, to: `/record/expense/${x.id}`, date: x.date, createdAt: x.createdAt,
      typeKey: 'feed.expense', tone: 'out',
      title: translate(lang, `expense.${x.category}`),
      amountText: `−${formatMoney(x.amount)}`,
    });
  }
  for (const r of notDeleted(receipts)) {
    rows.push({
      key: `r${r.id}`, to: `/record/receipt/${r.id}`, date: r.date, createdAt: r.createdAt,
      typeKey: 'feed.receipt', tone: 'in',
      title: translate(lang, r.method === 'cash' ? 'payout.cash' : 'payout.transfer'),
      amountText: `+${formatMoney(r.amount)}`,
    });
  }
  for (const a of notDeleted(adjustments)) {
    rows.push({
      key: `a${a.id}`, to: `/record/adjustment/${a.id}`, date: a.date, createdAt: a.createdAt,
      typeKey: 'feed.adjustment', tone: 'plain',
      title: translate(lang, `adjustment.${a.kind}`),
      amountText: `−${formatMoney(a.amount)}`,
    });
  }

  rows.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  return rows.slice(0, limit);
}

function useSettingsLang(): Lang {
  return useSettings().lang;
}

export function feedDateLabel(date: string, lang: Lang): string {
  return formatDateShort(date, lang);
}

export function moneyTone(value: Money): string {
  if (value > 0) return 'text-money-in';
  if (value < 0) return 'text-money-out';
  return 'text-slate-900';
}
