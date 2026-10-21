import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { formatMoney } from '../core/format';
import { useEntries, useObjects, useReceipts, useAdjustments, useSettings, useExpenses, byObject } from '../lib/hooks';
import {
  activeEntries, doneTotal, acceptedTotal, customerOwes, notDeleted, objectStage,
  receiptsTotal, workersTotalSum, contractorExpensesTotal, taxAmount, firstEntryDate,
} from '../core/calc';
import { todayStr } from '../db/repo';
import { Card, Pill, StageStrip } from '../components/ui';
import { BigButton } from '../components/BigButton';

// Объекты: стадия каждого, что сделано и сколько должны; «Взял новый объект»
export function Objects() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const settings = useSettings();
  const objects = useObjects();
  const entries = useEntries();
  const receipts = useReceipts();
  const adjustments = useAdjustments();
  const expenses = useExpenses();

  const all = activeEntries(entries);
  const open = objects.filter((o) => !o.closedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const closed = objects.filter((o) => o.closedAt).sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));

  function stats(o: { id: string; closedAt?: string }) {
    const act = byObject(all, o.id);
    const rec = notDeleted(byObject(receipts, o.id));
    const adj = notDeleted(byObject(adjustments, o.id));
    const done = doneTotal(act);
    const tax = taxAmount(settings.taxMode, settings.taxPercent, settings.taxFixedMonthly, done, firstEntryDate(act), todayStr());
    // Факт по деньгам: что заплатил заказчик минус бригада, расходы и налог
    const result = receiptsTotal(rec) - workersTotalSum(act) - contractorExpensesTotal(byObject(expenses, o.id)) - tax;
    return {
      done, accepted: acceptedTotal(act), owed: customerOwes(act, rec, adj),
      stage: objectStage(o, act, rec), result,
    };
  }

  return (
    <div className="flex min-h-screen flex-col px-4 pb-4">
      <h1 className="py-4 text-[24px] font-extrabold">{t('nav.objects')}</h1>
      <div className="flex flex-col gap-3">
        {open.map((o) => {
          const s = stats(o);
          const isActive = o.id === settings.activeObjectId;
          return (
            <Card key={o.id} onClick={() => navigate(`/objects/${o.id}`)} testId={`object-${o.name}`} className={isActive ? 'ring-2 ring-accent' : ''}>
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-[19px] font-extrabold">{o.name}</span>
                  <span className="block truncate text-[13px] font-medium text-slate-500">
                    {o.customerName ? `${o.customerName} · ` : ''}{t('objects.since', { date: formatDateShort(o.createdAt.slice(0, 10), lang) })}
                  </span>
                </span>
                {isActive && <Pill tone="yellow">{t('objects.current')}</Pill>}
              </span>
              <span className="mt-3 block"><StageStrip stage={s.stage} /></span>
              <span className="mt-3 flex justify-between">
                <span><span className="block text-[13px] font-medium text-slate-500">{t('objects.done')}</span><span className="block text-[18px] font-extrabold">{formatMoney(s.done)}</span></span>
                <span><span className="block text-[13px] font-medium text-slate-500">{t('objects.accepted')}</span><span className="block text-[18px] font-extrabold">{formatMoney(s.accepted)}</span></span>
                <span className="text-right"><span className="block text-[13px] font-medium text-slate-500">{t('objects.owed')}</span><span className={`block text-[18px] font-extrabold ${s.owed > 0 ? 'text-money-in' : ''}`}>{formatMoney(Math.max(0, s.owed))}</span></span>
              </span>
            </Card>
          );
        })}

        {closed.map((o) => {
          const s = stats(o);
          return (
            <Card key={o.id} onClick={() => navigate(`/objects/${o.id}/result`)} className="opacity-80">
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-[18px] font-extrabold">{o.name}</span>
                  <span className="block text-[13px] font-medium text-slate-500">{t('objects.closedOn', { date: formatDateShort((o.closedAt ?? '').slice(0, 10), lang) })}</span>
                </span>
                <Pill tone={s.result >= 0 ? 'green' : 'red'}>{t('objects.earned', { sum: formatMoney(s.result) })}</Pill>
              </span>
            </Card>
          );
        })}

        {objects.length === 0 && (
          <p className="py-6 text-center text-[16px] text-slate-500">{t('objects.empty')}</p>
        )}
      </div>

      <div className="sticky bottom-[88px] mt-auto pt-4">
        <BigButton label={t('objects.new')} icon={<Plus size={24} strokeWidth={2.6} aria-hidden="true" />} onClick={() => navigate('/objects/new')} testId="new-object" />
      </div>
    </div>
  );
}
