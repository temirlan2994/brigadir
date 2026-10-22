import { useNavigate, useParams } from 'react-router-dom';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useObjectSummary } from '../lib/summary';
import { formatMoney } from '../core/format';
import { useView } from '../state/view';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { PlanSchedule } from '../components/PlanSchedule';
import { Card, FeedItem, KvRow, SectionTitle } from '../components/ui';
import { CustomerModeButton } from '../components/CustomerModeButton';

// Деньги заказчика: график оплаты, поступления, удержания, «заказчик должен»
export function CustomerMoney() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const s = useObjectSummary(id);
  const customerMode = useView((v) => v.customerMode);
  const showPlan = s.object?.payment && (s.fixed || s.statuses.length > 0 || s.object.payment.actsEvery || s.object.payment.total);

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader title={t('object.customerMoney')} sub={s.object?.customerName ?? s.object?.name} right={<CustomerModeButton />} />
      <div className="flex flex-col gap-3 px-4">
        <Card>
          {s.fixed
            ? <KvRow label={t('plan.handedStages')} value={formatMoney(s.dueSum)} />
            : <KvRow label={t('object.acceptedByCustomer')} value={formatMoney(s.accepted)} />}
          <KvRow label={t('object.customerPaid')} value={formatMoney(s.received)} tone="in" />
          {s.withheld > 0 && <KvRow label={t('object.withheld')} value={`−${formatMoney(s.withheld)}`} tone="out" />}
          {s.advanceLeft > 0
            ? <KvRow label={s.fixed ? t('plan.paidAhead') : t('object.advanceLeft')} value={formatMoney(s.advanceLeft)} strong />
            : <KvRow label={t('object.customerOwes')} value={formatMoney(s.owedToMe)} strong tone="in" />}
          {!customerMode && !s.fixed && <KvRow label={t('object.notHanded')} value={formatMoney(s.notAccepted)} />}
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <BigButton label={t('customerMoney.received')} onClick={() => navigate(`/receipt/new?objectId=${id}`)} testId="btn-receipt" />
          <BigButton label={t('customerMoney.withhold')} tone="neutral" onClick={() => navigate(`/adjustment/new?objectId=${id}`)} testId="btn-adjustment" />
        </div>

        {showPlan && s.object && (
          <>
            <SectionTitle>{t('plan.schedule')}</SectionTitle>
            <PlanSchedule object={s.object} statuses={s.statuses} received={s.received} withheld={s.withheld} done={s.done} readOnly={customerMode} />
          </>
        )}

        <SectionTitle>{t('details.receipts')}</SectionTitle>
        {s.objReceipts.slice().sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
          <FeedItem
            key={r.id}
            tagKind="rec"
            tagLabel={t(r.kind === 'advance' ? 'feed.customerAdvance' : 'feed.receipt')}
            title={t(r.method === 'cash' ? 'payout.cash' : 'payout.transfer')}
            sub={[formatDateShort(r.date, lang), r.note].filter(Boolean).join(' · ')}
            amount={`+${formatMoney(r.amount)}`}
            tone="in"
            onClick={() => navigate(`/record/receipt/${r.id}`)}
          />
        ))}
        {s.objReceipts.length === 0 && <p className="px-1 text-[14px] text-slate-400">{t('common.empty')}</p>}

        <SectionTitle>{t('details.adjustments')}</SectionTitle>
        {s.objAdjustments.slice().sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
          <FeedItem
            key={a.id}
            tagKind="grey"
            tagLabel={t('feed.adjustment')}
            title={t(`adjustment.${a.kind}`)}
            sub={[formatDateShort(a.date, lang), a.note].filter(Boolean).join(' · ')}
            amount={`−${formatMoney(a.amount)}`}
            onClick={() => navigate(`/record/adjustment/${a.id}`)}
          />
        ))}
        {s.objAdjustments.length === 0 && <p className="px-1 text-[14px] text-slate-400">{t('customerMoney.noWithholds')}</p>}
      </div>
    </div>
  );
}
