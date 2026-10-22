import { useNavigate } from 'react-router-dom';
import { Plus, UsersRound } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { formatMoney, groupDigits } from '../core/format';
import { useEntries, useObjects, useReceipts, useAdjustments, useSettings, useExpenses, useCounterparties, byObject } from '../lib/hooks';
import {
  activeEntries, doneTotal, acceptedTotal, notDeleted,
  receiptsTotal, workersTotalSum, contractorExpensesTotal, taxAmount, firstEntryDate,
} from '../core/calc';
import { customerOwesByPlan, dueTotal, isFixed, objectStageByPlan, revenueBase } from '../core/plan';
import { todayStr } from '../db/repo';
import { Card, Pill, StageStrip } from '../components/ui';
import { BigButton } from '../components/BigButton';
import type { SiteObject } from '../db/types';

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
  const counterparties = useCounterparties();

  const all = activeEntries(entries);
  const today = todayStr();
  const open = objects.filter((o) => !o.closedAt && !o.archivedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const closed = objects.filter((o) => o.closedAt || o.archivedAt).sort((a, b) => (b.closedAt ?? b.archivedAt ?? '').localeCompare(a.closedAt ?? a.archivedAt ?? ''));

  function stats(o: SiteObject) {
    const act = byObject(all, o.id);
    const rec = notDeleted(byObject(receipts, o.id));
    const adj = notDeleted(byObject(adjustments, o.id));
    const plan = o.payment;
    const done = doneTotal(act);
    const received = receiptsTotal(rec);
    // У закрытого объекта налог заморожен датой закрытия и считается от полученных денег
    const until = o.closedAt ? o.closedAt.slice(0, 10) : today;
    const tax = taxAmount(settings.taxMode, settings.taxPercent, settings.taxFixedMonthly, received, firstEntryDate(act), until);
    const result = received - workersTotalSum(act) - contractorExpensesTotal(byObject(expenses, o.id)) - tax;
    const fixed = isFixed(plan);
    return {
      fixed,
      // По общей сумме: договор / сдано этапов; по объёмам: сделано / принято
      first: fixed ? revenueBase(plan, done) : done,
      second: fixed ? dueTotal(plan.parts, today) : acceptedTotal(act),
      owed: customerOwesByPlan(plan, act, rec, adj, today),
      stage: objectStageByPlan(o, plan, act, rec, today), result,
    };
  }

  return (
    <div className="flex min-h-screen flex-col px-4 pb-4">
      <div className="flex items-center justify-between gap-2 py-4">
        <h1 className="text-[24px] font-extrabold">{t('nav.objects')}</h1>
        <button
          className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[14px] font-bold shadow-card"
          onClick={() => navigate('/counterparties')}
          data-testid="to-counterparties"
        >
          <UsersRound size={18} aria-hidden="true" />
          {t('cp.title')}{counterparties.length > 0 ? ` · ${counterparties.length}` : ''}
        </button>
      </div>
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
              <span className="mt-3 grid grid-cols-3 gap-2">
                <span className="min-w-0"><span className="block text-[12px] font-medium text-slate-500">{s.fixed ? t('plan.contract') : t('objects.done')}</span><span className="block truncate text-[15px] font-extrabold">{groupDigits(Math.round(s.first / 100))}</span></span>
                <span className="min-w-0 text-center"><span className="block text-[12px] font-medium text-slate-500">{s.fixed ? t('plan.handedShort') : t('objects.accepted')}</span><span className="block truncate text-[15px] font-extrabold">{groupDigits(Math.round(s.second / 100))}</span></span>
                <span className="min-w-0 text-right"><span className="block text-[12px] font-medium text-slate-500">{t('objects.owed')}</span><span className={`block truncate text-[15px] font-extrabold ${s.owed > 0 ? 'text-money-in' : ''}`}>{groupDigits(Math.round(Math.max(0, s.owed) / 100))}</span></span>
              </span>
            </Card>
          );
        })}

        {closed.map((o) => {
          const s = stats(o);
          return (
            <Card key={o.id} onClick={() => navigate(`/objects/${o.id}`)} testId={`object-${o.name}`} className="opacity-80">
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-[18px] font-extrabold">{o.name}</span>
                  <span className="block text-[13px] font-medium text-slate-500">
                    {o.closedAt ? t('objects.closedOn', { date: formatDateShort(o.closedAt.slice(0, 10), lang) }) : t('settings.archivedMark')}
                  </span>
                </span>
                {o.closedAt && (
                  <Pill tone={s.result >= 0 ? 'green' : 'red'}>
                    {s.result >= 0 ? t('objects.earned', { sum: formatMoney(s.result) }) : t('objects.lost', { sum: formatMoney(-s.result) })}
                  </Pill>
                )}
              </span>
            </Card>
          );
        })}

        {objects.length === 0 && (
          <p className="py-6 text-center text-[16px] text-slate-500">{t('objects.empty')}</p>
        )}
      </div>

      <div className="sticky bottom-[calc(88px+env(safe-area-inset-bottom))] mt-auto pt-4">
        <BigButton label={t('objects.new')} icon={<Plus size={24} strokeWidth={2.6} aria-hidden="true" />} onClick={() => navigate('/objects/new')} testId="new-object" />
      </div>
    </div>
  );
}
