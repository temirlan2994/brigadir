import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useObjectSummary } from '../lib/summary';
import { usePayouts, useWorkers, byObject } from '../lib/hooks';
import { notDeleted, payoutsFromCash } from '../core/calc';
import { formatMoney } from '../core/format';
import { updateSettings } from '../db/repo';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { Card, KvRow, SectionTitle, Tag } from '../components/ui';

// Мои расходы и выдачи по этому объекту — вторая половина PNL
export function ObjectMoneyOut() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const s = useObjectSummary(id);
  const payoutsAll = usePayouts();
  const workers = useWorkers();
  const o = s.object;
  if (!o) return <ScreenHeader title="" />;

  const expenses = notDeleted(s.objExpenses);
  const myExpenses = expenses.filter((e) => e.paidBy === 'contractor').sort((a, b) => b.date.localeCompare(a.date));
  const customerExpenses = expenses.filter((e) => e.paidBy === 'customer').sort((a, b) => b.date.localeCompare(a.date));
  const objPayouts = notDeleted(byObject(payoutsAll, id)).sort((a, b) => b.date.localeCompare(a.date));
  const payoutsSum = payoutsFromCash(objPayouts);
  const workerName = (wid: string) => workers.find((w) => w.id === wid)?.name ?? '';

  const canWrite = !o.closedAt && !o.archivedAt;

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader title={t('object.myMoney')} sub={o.name} />
      <div className="flex flex-col gap-3 px-4">
        <Card>
          <KvRow label={t('objectOut.myExpenses')} value={`−${formatMoney(s.contractorExp)}`} tone="out" />
          <KvRow label={t('objectOut.paidTeam')} value={`−${formatMoney(payoutsSum)}`} tone="out" />
          <KvRow label={t('objectOut.accruedTeam')} value={formatMoney(s.workersSum)} />
          {customerExpenses.length > 0 && (
            <KvRow label={t('money.customerExpenses')} value={formatMoney(customerExpenses.reduce((a, e) => a + e.amount, 0))} />
          )}
        </Card>

        {canWrite && (
          <div className="grid grid-cols-2 gap-2">
            <BigButton
              label={t('today.spent')}
              tone="dark"
              icon={<Plus size={20} aria-hidden="true" />}
              onClick={() => { void updateSettings({ activeObjectId: o.id }); navigate('/expense/new'); }}
            />
            <BigButton
              label={t('today.paid')}
              tone="neutral"
              icon={<Plus size={20} aria-hidden="true" />}
              onClick={() => { void updateSettings({ activeObjectId: o.id }); navigate('/payout/new'); }}
            />
          </div>
        )}

        <SectionTitle>{t('objectOut.myExpenses')}</SectionTitle>
        {myExpenses.map((e) => (
          <button key={e.id} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 text-left shadow-card" onClick={() => navigate(`/record/expense/${e.id}`)}>
            <Tag kind="exp" label={t('feed.expense')} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold">{t(`expense.${e.category}`)}</span>
              <span className="block text-[13px] font-medium text-slate-500">{formatDateShort(e.date, lang)}{e.note ? ` · ${e.note}` : ''}</span>
            </span>
            <span className="text-[17px] font-extrabold text-money-out">−{formatMoney(e.amount)}</span>
          </button>
        ))}
        {myExpenses.length === 0 && <p className="px-1 text-[14px] text-slate-400">{t('common.empty')}</p>}

        <SectionTitle>{t('objectOut.payouts')}</SectionTitle>
        {objPayouts.map((p) => (
          <button key={p.id} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 text-left shadow-card" onClick={() => navigate(`/record/payout/${p.id}`)}>
            <Tag kind={p.kind === 'deduction' ? 'grey' : 'pay'} label={t(p.kind === 'advance' ? 'feed.advance' : p.kind === 'deduction' ? 'feed.deduction' : 'feed.payout')} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold">{workerName(p.workerId)}</span>
              <span className="block text-[13px] font-medium text-slate-500">{formatDateShort(p.date, lang)}</span>
            </span>
            <span className="text-[17px] font-extrabold text-money-out">−{formatMoney(p.amount)}</span>
          </button>
        ))}
        {objPayouts.length === 0 && <p className="px-1 text-[14px] text-slate-400">{t('common.empty')}</p>}

        {customerExpenses.length > 0 && (
          <>
            <SectionTitle>{t('money.customerExpenses')}</SectionTitle>
            {customerExpenses.map((e) => (
              <button key={e.id} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 text-left shadow-card" onClick={() => navigate(`/record/expense/${e.id}`)}>
                <Tag kind="grey" label={t('feed.expense')} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{t(`expense.${e.category}`)}</span>
                  <span className="block text-[13px] font-medium text-slate-500">{formatDateShort(e.date, lang)}</span>
                </span>
                <span className="text-[17px] font-extrabold text-slate-500">{formatMoney(e.amount)}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
