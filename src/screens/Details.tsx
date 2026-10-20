import { useNavigate, useParams } from 'react-router-dom';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useHomeSummary, wtLabel } from '../lib/summary';
import { useWorkers, useWorkTypes } from '../lib/hooks';
import { activeEntries, notDeleted, payoutsFromCash, workerBalance } from '../core/calc';
import { formatMoney, formatQuantity } from '../core/format';
import { ScreenHeader } from '../components/ScreenHeader';

// Любое число на главной раскрывается в список записей, из которых оно сложилось
export function Details() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const { metric = '' } = useParams();
  const sum = useHomeSummary();
  const workers = useWorkers();
  const workTypes = useWorkTypes();

  const row = (label: string, value: string, cls = '') => (
    <div className={`flex justify-between py-1.5 text-[16px] ${cls}`}>
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );

  const titles: Record<string, string> = {
    owed: t('home.owedToMe'),
    workers: t('home.owedToWorkers'),
    free: t('home.free'),
    profit: t('profit.title'),
  };

  const acceptedEntries = sum.objEntries.filter((e) => e.accepted);

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-slate-50 pb-6">
      <ScreenHeader title={titles[metric] ?? ''} />

      {metric === 'owed' && (
        <>
          <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm">
            {row(t('details.accepted'), formatMoney(acceptedEntries.reduce((s, e) => s + e.customerTotal, 0)))}
            {row(t('details.receipts'), `−${formatMoney(sum.objReceipts.filter((r) => !r.deletedAt).reduce((s, r) => s + r.amount, 0))}`)}
            {row(t('details.adjustments'), `−${formatMoney(sum.objAdjustments.filter((a) => !a.deletedAt).reduce((s, a) => s + a.amount, 0))}`)}
            {row(t('home.owedToMe'), formatMoney(sum.owedToMe), 'border-t border-slate-100 pt-2 text-[18px]')}
            {row(t('details.notAccepted'), formatMoney(sum.done - acceptedEntries.reduce((s, e) => s + e.customerTotal, 0)), 'text-slate-400')}
          </div>
          <div className="mx-4 flex flex-col gap-1.5">
            {acceptedEntries.map((e) => (
              <button key={e.id} className="flex justify-between rounded-xl bg-white px-3 py-2 text-[15px]" onClick={() => navigate(`/works/${e.id}`)}>
                <span>{wtLabel(workTypes.find((w) => w.id === e.workTypeId), lang)} · {formatQuantity(e.quantity)} {e.unit}</span>
                <span className="font-semibold">{formatMoney(e.customerTotal)}</span>
              </button>
            ))}
            {notDeleted(sum.objReceipts).map((r) => (
              <button key={r.id} className="flex justify-between rounded-xl bg-white px-3 py-2 text-[15px]" onClick={() => navigate(`/record/receipt/${r.id}`)}>
                <span>{t('feed.receipt')} · {formatDateShort(r.date, lang)}</span>
                <span className="font-semibold text-money-in">−{formatMoney(r.amount)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {metric === 'workers' && (
        <div className="mx-4 flex flex-col gap-1.5">
          {workers.map((w) => {
            const b = workerBalance(activeEntries(sum.entries), sum.payouts, w.id);
            if (b <= 0) return null;
            return (
              <button key={w.id} className="flex justify-between rounded-xl bg-white px-3 py-2.5 text-[16px]" onClick={() => navigate(`/workers/${w.id}`)}>
                <span>{w.name}</span>
                <span className="font-semibold text-money-out">{formatMoney(b)}</span>
              </button>
            );
          })}
          <div className="rounded-xl bg-white px-3 py-2.5">
            {row(t('home.owedToWorkers'), formatMoney(sum.owed), 'text-[18px]')}
            {sum.overruns > 0 && row(t('home.advanceOverruns'), formatMoney(sum.overruns), 'text-slate-400')}
          </div>
        </div>
      )}

      {metric === 'free' && (
        <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm">
          {row(t('details.openingCash'), formatMoney(sum.settings.openingCash))}
          {row(t('money.received'), `+${formatMoney(notDeleted(sum.receipts).reduce((s, r) => s + r.amount, 0))}`)}
          {row(t('details.payouts'), `−${formatMoney(payoutsFromCash(sum.payouts))}`)}
          {row(t('details.expenses'), `−${formatMoney(sum.expenses.filter((e) => !e.deletedAt && e.paidBy === 'contractor').reduce((s, e) => s + e.amount, 0))}`)}
          {row(t('details.cash'), formatMoney(sum.cash), 'border-t border-slate-100 pt-2')}
          {row(t('home.owedToWorkers'), `−${formatMoney(sum.owed)}`)}
          {row(t('home.free'), formatMoney(sum.free), 'border-t border-slate-100 pt-2 text-[18px]')}
        </div>
      )}

      {metric === 'profit' && (
        <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm">
          {row(t('profit.done'), formatMoney(sum.done))}
          {row(t('profit.workers'), `−${formatMoney(sum.workersSum)}`)}
          {row(t('profit.expenses'), `−${formatMoney(sum.contractorExp)}`)}
          {row(t('profit.tax'), `−${formatMoney(sum.tax)}`)}
          {row(`${t('profit.title')}`, formatMoney(sum.profit), 'border-t border-slate-100 pt-2 text-[18px]')}
          <p className="pt-1 text-[13px] text-slate-400">{t('profit.forecast')}</p>
        </div>
      )}
    </div>
  );
}
