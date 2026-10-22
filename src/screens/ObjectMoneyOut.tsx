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
import { Card, FeedItem, KvRow, SectionTitle } from '../components/ui';

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
          <FeedItem
            key={e.id}
            tagKind="exp"
            tagLabel={t('feed.expense')}
            title={t(`expense.${e.category}`)}
            sub={[formatDateShort(e.date, lang), e.note].filter(Boolean).join(' · ')}
            amount={`−${formatMoney(e.amount)}`}
            tone="out"
            onClick={() => navigate(`/record/expense/${e.id}`)}
          />
        ))}
        {myExpenses.length === 0 && <p className="px-1 text-[14px] text-slate-400">{t('common.empty')}</p>}

        <SectionTitle>{t('objectOut.payouts')}</SectionTitle>
        {objPayouts.map((p) => (
          <FeedItem
            key={p.id}
            tagKind={p.kind === 'deduction' ? 'grey' : 'pay'}
            tagLabel={t(p.kind === 'advance' ? 'feed.advance' : p.kind === 'deduction' ? 'feed.deduction' : 'feed.payout')}
            title={workerName(p.workerId)}
            sub={[formatDateShort(p.date, lang), p.note].filter(Boolean).join(' · ')}
            amount={`−${formatMoney(p.amount)}`}
            tone="out"
            onClick={() => navigate(`/record/payout/${p.id}`)}
          />
        ))}
        {objPayouts.length === 0 && <p className="px-1 text-[14px] text-slate-400">{t('common.empty')}</p>}

        {customerExpenses.length > 0 && (
          <>
            <SectionTitle>{t('money.customerExpenses')}</SectionTitle>
            {customerExpenses.map((e) => (
              <FeedItem
                key={e.id}
                tagKind="grey"
                tagLabel={t('feed.expense')}
                title={t(`expense.${e.category}`)}
                sub={[formatDateShort(e.date, lang), e.note].filter(Boolean).join(' · ')}
                amount={formatMoney(e.amount)}
                tone="muted"
                onClick={() => navigate(`/record/expense/${e.id}`)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
