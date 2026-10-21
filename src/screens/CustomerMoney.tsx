import { useNavigate, useParams } from 'react-router-dom';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useObjectSummary } from '../lib/summary';
import { formatMoney } from '../core/format';
import { useView } from '../state/view';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { Card, KvRow, SectionTitle, Tag } from '../components/ui';
import { CustomerModeButton } from '../components/CustomerModeButton';

// Деньги заказчика: аванс, поступления, удержания, «заказчик должен»
export function CustomerMoney() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const s = useObjectSummary(id);
  const customerMode = useView((v) => v.customerMode);

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader title={t('object.customerMoney')} sub={s.object?.customerName ?? s.object?.name} right={<CustomerModeButton />} />
      <div className="flex flex-col gap-3 px-4">
        <Card>
          <KvRow label={t('object.acceptedByCustomer')} value={formatMoney(s.accepted)} />
          <KvRow label={t('object.customerPaid')} value={formatMoney(s.received)} tone="in" />
          {s.withheld > 0 && <KvRow label={t('object.withheld')} value={`−${formatMoney(s.withheld)}`} tone="out" />}
          {s.advanceLeft > 0
            ? <KvRow label={t('object.advanceLeft')} value={formatMoney(s.advanceLeft)} strong />
            : <KvRow label={t('object.customerOwes')} value={formatMoney(s.owedToMe)} strong tone="in" />}
          {!customerMode && <KvRow label={t('object.notHanded')} value={formatMoney(s.notAccepted)} />}
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <BigButton label={t('customerMoney.received')} onClick={() => navigate(`/receipt/new?objectId=${id}`)} testId="btn-receipt" />
          <BigButton label={t('customerMoney.withhold')} tone="neutral" onClick={() => navigate(`/adjustment/new?objectId=${id}`)} testId="btn-adjustment" />
        </div>

        <SectionTitle>{t('details.receipts')}</SectionTitle>
        {s.objReceipts.slice().sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
          <button key={r.id} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 text-left shadow-card" onClick={() => navigate(`/record/receipt/${r.id}`)}>
            <Tag kind="rec" label={t(r.kind === 'advance' ? 'feed.customerAdvance' : 'feed.receipt')} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold">{t(r.method === 'cash' ? 'payout.cash' : 'payout.transfer')}</span>
              <span className="block text-[13px] font-medium text-slate-500">{formatDateShort(r.date, lang)}{r.note ? ` · ${r.note}` : ''}</span>
            </span>
            <span className="text-[17px] font-extrabold text-money-in">+{formatMoney(r.amount)}</span>
          </button>
        ))}
        {s.objReceipts.length === 0 && <p className="px-1 text-[14px] text-slate-400">{t('common.empty')}</p>}

        <SectionTitle>{t('details.adjustments')}</SectionTitle>
        {s.objAdjustments.slice().sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
          <button key={a.id} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 text-left shadow-card" onClick={() => navigate(`/record/adjustment/${a.id}`)}>
            <Tag kind="grey" label={t(`adjustment.${a.kind}`)} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-slate-500">{formatDateShort(a.date, lang)}{a.note ? ` · ${a.note}` : ''}</span>
            </span>
            <span className="text-[17px] font-extrabold">−{formatMoney(a.amount)}</span>
          </button>
        ))}
        {s.objAdjustments.length === 0 && <p className="px-1 text-[14px] text-slate-400">{t('customerMoney.noWithholds')}</p>}
      </div>
    </div>
  );
}
