import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT, useLangStore, formatDateShort, translate } from '../i18n';
import {
  useAdjustments, useEntries, useExpenses, useObjects, usePayouts,
  useReceipts, useSettings, useWorkers, useWorkTypes,
} from '../lib/hooks';
import { useHomeSummary, wtLabel } from '../lib/summary';
import { activeEntries, notDeleted } from '../core/calc';
import { formatMoney } from '../core/format';
import { todayStr } from '../db/repo';
import { toCsv, downloadText } from '../lib/files';
import { Segmented } from '../components/Segmented';

type Period = 'thisMonth' | 'lastMonth' | 'all' | 'custom';

function monthRange(offset: number): { from: string; to: string } {
  const d = new Date();
  const first = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
  const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { from: fmt(first), to: fmt(last) };
}

// Деньги: касса, поступления, расходы, прибыль, CSV и акт
export function Money() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const sum = useHomeSummary();
  const settings = useSettings();
  const objects = useObjects();
  const entries = useEntries();
  const payouts = usePayouts();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const adjustments = useAdjustments();
  const workers = useWorkers();
  const workTypes = useWorkTypes();

  const [objectId, setObjectId] = useState('');
  const [period, setPeriod] = useState<Period>('thisMonth');
  const [customFrom, setCustomFrom] = useState(monthRange(0).from);
  const [customTo, setCustomTo] = useState(todayStr());

  const range = useMemo(() => {
    if (period === 'thisMonth') return monthRange(0);
    if (period === 'lastMonth') return monthRange(-1);
    if (period === 'custom') return { from: customFrom, to: customTo };
    return { from: '0000-01-01', to: '9999-12-31' };
  }, [period, customFrom, customTo]);

  const objFilter = objectId || settings.activeObjectId;
  const inScope = <T extends { date: string; objectId?: string }>(rows: T[]) =>
    rows.filter((r) =>
      (objectId === 'all' || r.objectId === objFilter)
      && r.date >= range.from && r.date <= range.to);

  const periodReceipts = inScope(notDeleted(receipts));
  const periodExpenses = inScope(notDeleted(expenses));
  const periodAdjustments = inScope(notDeleted(adjustments));
  const customerExpenses = periodExpenses.filter((e) => e.paidBy === 'customer');

  function exportCsv() {
    const act = activeEntries(entries);
    const soms = (tyiyn: number) => (tyiyn / 100).toFixed(2).replace('.', ',');
    const wtName = (id: string) => wtLabel(workTypes.find((w) => w.id === id), lang);
    const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? '';
    const objName = (id?: string) => objects.find((o) => o.id === id)?.name ?? '';
    const L = (key: string) => translate(lang, key);

    downloadText('raboty.csv', toCsv(
      [L('common.date'), L('common.object'), L('works.filterType'), L('works.quantity'), L('settings.unit'), L('wizard.customerPrice'), L('wizard.workerPrice'), L('wizard.customerTotal'), L('wizard.workersTotal'), L('works.statusAccepted'), L('common.note')],
      act.map((e) => [e.date, objName(e.objectId), wtName(e.workTypeId), String(e.quantity).replace('.', ','), e.unit, soms(e.customerPrice), soms(e.workerPrice), soms(e.customerTotal), soms(e.workersTotal), e.accepted ? '1' : '0', e.note ?? '']),
    ), 'text/csv;charset=utf-8');

    downloadText('vydachi.csv', toCsv(
      [L('common.date'), L('common.object'), L('workers.name'), L('common.sum'), L('adjustment.kind'), L('common.method'), L('common.note')],
      notDeleted(payouts).map((p) => [p.date, objName(p.objectId), workerName(p.workerId), soms(p.amount), L(p.kind === 'advance' ? 'feed.advance' : p.kind === 'deduction' ? 'feed.deduction' : 'feed.payout'), L(p.method === 'cash' ? 'payout.cash' : 'payout.transfer'), p.note ?? '']),
    ), 'text/csv;charset=utf-8');

    downloadText('rashody.csv', toCsv(
      [L('common.date'), L('common.object'), L('expense.pickCategory'), L('common.sum'), L('expense.whoPays'), L('common.note')],
      notDeleted(expenses).map((e) => [e.date, objName(e.objectId), L(`expense.${e.category}`), soms(e.amount), e.paidBy === 'contractor' ? L('expense.me') : L('expense.customer'), e.note ?? '']),
    ), 'text/csv;charset=utf-8');

    downloadText('postupleniya.csv', toCsv(
      [L('common.date'), L('common.object'), L('common.sum'), L('common.method'), L('common.note')],
      notDeleted(receipts).map((r) => [r.date, objName(r.objectId), soms(r.amount), L(r.method === 'cash' ? 'payout.cash' : 'payout.transfer'), r.note ?? '']),
    ), 'text/csv;charset=utf-8');

    downloadText('korrektirovki.csv', toCsv(
      [L('common.date'), L('common.object'), L('adjustment.kind'), L('common.sum'), L('common.note')],
      notDeleted(adjustments).map((a) => [a.date, objName(a.objectId), L(`adjustment.${a.kind}`), soms(a.amount), a.note ?? '']),
    ), 'text/csv;charset=utf-8');
  }

  const listRow = (key: string, to: string, label: string, date: string, amount: string, cls: string) => (
    <button key={key} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-[15px]" onClick={() => navigate(to)}>
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="px-2 text-[13px] text-slate-400">{formatDateShort(date, lang)}</span>
      <span className={`font-semibold ${cls}`}>{amount}</span>
    </button>
  );

  return (
    <div className="px-4 pb-6">
      <h1 className="py-4 text-[22px] font-bold">{t('nav.money')}</h1>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <button className="flex w-full justify-between py-1 text-[18px]" onClick={() => navigate('/details/free')}>
          <span className="text-slate-600">{t('money.cash')}</span>
          <span className="font-bold" data-testid="cash-value">{formatMoney(sum.cash)}</span>
        </button>
        <div className="flex justify-between py-1 text-[16px]">
          <span className="text-slate-600">{t('money.received')}</span>
          <span className="font-semibold text-money-in">{formatMoney(periodReceipts.reduce((s, r) => s + r.amount, 0))}</span>
        </div>
        <div className="flex justify-between py-1 text-[16px]">
          <span className="text-slate-600">{t('money.expenses')}</span>
          <span className="font-semibold text-money-out">{formatMoney(periodExpenses.filter((e) => e.paidBy === 'contractor').reduce((s, e) => s + e.amount, 0))}</span>
        </div>
        <button className="flex w-full justify-between py-1 text-[16px]" onClick={() => navigate('/details/profit')}>
          <span className="text-slate-600">{t('money.profit')}</span>
          <span className="font-semibold">{formatMoney(sum.profit)}</span>
        </button>
      </div>

      <div className="flex gap-2 py-3">
        <select className="min-h-[48px] w-0 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-2 text-[16px]" aria-label={t('works.filterObject')} value={objectId} onChange={(e) => setObjectId(e.target.value)}>
          <option value="">{t('works.filterObject')}</option>
          <option value="all">{t('common.all')}</option>
          {objects.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <Segmented
        options={[
          { value: 'thisMonth', label: t('money.thisMonth') },
          { value: 'lastMonth', label: t('money.lastMonth') },
          { value: 'all', label: t('money.allTime') },
        ]}
        value={period === 'custom' ? 'all' : period}
        onChange={(v) => setPeriod(v)}
      />
      <div className="flex items-center gap-2 py-2">
        <input type="date" className="min-h-[44px] w-0 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-2 text-[15px]" aria-label={t('common.date')} value={period === 'custom' ? customFrom : range.from === '0000-01-01' ? '' : range.from} onChange={(e) => { setCustomFrom(e.target.value); setPeriod('custom'); }} />
        <span className="text-slate-400">—</span>
        <input type="date" className="min-h-[44px] w-0 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-2 text-[15px]" aria-label={t('common.date')} value={period === 'custom' ? customTo : range.to === '9999-12-31' ? '' : range.to} onChange={(e) => { setCustomTo(e.target.value); setPeriod('custom'); }} />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="pt-2 text-[14px] font-semibold text-slate-500">{t('details.receipts')}</p>
        {periodReceipts.map((r) => listRow(r.id, `/record/receipt/${r.id}`, t(r.method === 'cash' ? 'payout.cash' : 'payout.transfer'), r.date, `+${formatMoney(r.amount)}`, 'text-money-in'))}
        {periodReceipts.length === 0 && <p className="text-[14px] text-slate-400">{t('common.empty')}</p>}

        <p className="pt-2 text-[14px] font-semibold text-slate-500">{t('money.expenses')}</p>
        {periodExpenses.filter((e) => e.paidBy === 'contractor').map((e) => listRow(e.id, `/record/expense/${e.id}`, t(`expense.${e.category}`), e.date, `−${formatMoney(e.amount)}`, 'text-money-out'))}

        {customerExpenses.length > 0 && (
          <>
            <p className="pt-2 text-[14px] font-semibold text-slate-500">{t('money.customerExpenses')}</p>
            {customerExpenses.map((e) => listRow(e.id, `/record/expense/${e.id}`, t(`expense.${e.category}`), e.date, formatMoney(e.amount), 'text-slate-500'))}
          </>
        )}

        <p className="pt-2 text-[14px] font-semibold text-slate-500">{t('details.adjustments')}</p>
        {periodAdjustments.map((a) => listRow(a.id, `/record/adjustment/${a.id}`, t(`adjustment.${a.kind}`), a.date, `−${formatMoney(a.amount)}`, 'text-slate-600'))}
        {periodAdjustments.length === 0 && <p className="text-[14px] text-slate-400">{t('common.empty')}</p>}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button className="min-h-[56px] rounded-2xl bg-slate-100 text-[17px] font-semibold" onClick={exportCsv} data-testid="export-csv">
          {t('money.exportCsv')}
        </button>
        <button className="min-h-[56px] rounded-2xl bg-slate-100 text-[17px] font-semibold" onClick={() => navigate('/act')} data-testid="to-act">
          {t('money.act')}
        </button>
      </div>
    </div>
  );
}
