import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { formatMoney } from '../core/format';
import { useObjectSummary } from '../lib/summary';
import { updateObject, updateSettings } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { Card, KvRow, MenuRow, Pill, StageStrip } from '../components/ui';

// Объект: стадия, сводка по заказчику и разделы вдоль пути
export function ObjectScreen() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const { id = '' } = useParams();
  const s = useObjectSummary(id);
  const o = s.object;
  if (!o) return <ScreenHeader title="" />;

  const isActive = s.settings.activeObjectId === o.id;
  const lastDate = s.active.map((e) => e.date).sort().pop();

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-4">
      <ScreenHeader
        title={o.name}
        sub={[o.customerName, o.paymentTerms].filter(Boolean).join(' · ') || undefined}
        right={!isActive && !o.closedAt && !o.archivedAt ? (
          <button className="min-h-[44px] rounded-full bg-accent px-3 text-[13px] font-bold" onClick={() => void updateSettings({ activeObjectId: o.id })} data-testid="make-active">
            {t('objects.makeCurrent')}
          </button>
        ) : isActive ? <Pill tone="yellow">{t('objects.current')}</Pill> : undefined}
      />
      <div className="flex flex-1 flex-col gap-3 px-4">
        <StageStrip stage={s.stage} />

        <Card>
          <KvRow label={t('object.doneAll')} value={formatMoney(s.done)} />
          <KvRow label={t('object.acceptedByCustomer')} value={formatMoney(s.accepted)} />
          <KvRow label={t('object.notHanded')} value={formatMoney(s.notAccepted)} />
          <KvRow label={t('object.customerPaid')} value={formatMoney(s.received)} tone="in" />
          {s.withheld > 0 && <KvRow label={t('object.withheld')} value={`−${formatMoney(s.withheld)}`} tone="out" />}
          {s.advanceLeft > 0
            ? <KvRow label={t('object.advanceLeft')} value={formatMoney(s.advanceLeft)} strong />
            : <KvRow label={t('object.customerOwes')} value={formatMoney(s.owedToMe)} strong tone="in" />}
        </Card>

        <MenuRow icon="hammer" title={t('object.works')} sub={t('object.worksSub', { n: s.active.length, date: lastDate ? formatDateShort(lastDate, lang) : '—' })} onClick={() => navigate(`/objects/${o.id}/works`)} testId="menu-works" />
        <MenuRow icon="clip" title={t('object.handover')} sub={t('object.handoverSub', { n: s.unacceptedEntries.length })} onClick={() => navigate(`/objects/${o.id}/handover`)} testId="menu-handover" />
        <MenuRow icon="sack" title={t('object.customerMoney')} sub={t('object.customerMoneySub', { n: s.objReceipts.length, w: s.objAdjustments.length })} onClick={() => navigate(`/objects/${o.id}/money`)} testId="menu-money" />
        <MenuRow icon="truck" title={t('object.myMoney')} sub={t('object.myMoneySub', { e: formatMoney(s.contractorExp), p: formatMoney(s.workersSum) })} onClick={() => navigate(`/objects/${o.id}/expenses`)} testId="menu-expenses" />
        <MenuRow icon="tag" title={t('object.prices')} sub={o.customerName ?? t('newObject.customer')} onClick={() => navigate(`/objects/${o.id}/prices`)} testId="menu-prices" />
        <MenuRow
          icon="flag"
          title={t('object.result')}
          sub={o.closedAt
            ? (s.profitFact >= 0 ? t('object.resultClosed', { sum: formatMoney(s.profitFact) }) : t('objects.lost', { sum: formatMoney(-s.profitFact) }))
            : t('object.resultForecast', { sum: formatMoney(s.profit) })}
          onClick={() => navigate(`/objects/${o.id}/result`)}
          testId="menu-result"
        />

        {!o.closedAt && !o.archivedAt ? (
          <div className="sticky bottom-0 mt-auto bg-paper pt-3">
            <BigButton
              label={t('today.recordWork')}
              tone="dark"
              icon={<Plus size={24} strokeWidth={2.6} aria-hidden="true" />}
              onClick={() => { void updateSettings({ activeObjectId: o.id }); navigate('/work/new'); }}
            />
          </div>
        ) : (
          <div className="sticky bottom-0 mt-auto bg-paper pt-3">
            <BigButton
              label={o.closedAt ? t('object.reopen') : t('workers.unarchive')}
              tone="dark"
              testId="reopen-object"
              onClick={() => {
                void (async () => {
                  await updateObject(o.id, o.closedAt ? { closedAt: undefined } : { archivedAt: undefined });
                  // Снова открытый объект сразу становится текущим
                  await updateSettings({ activeObjectId: o.id });
                  toast.show(t('common.saved'));
                })();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
