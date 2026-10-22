import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, FileText, Send } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useObjectSummary, wtLabel } from '../lib/summary';
import { useWorkTypes, useWorkers } from '../lib/hooks';
import { formatMoney, formatQuantity, parseDecimal } from '../core/format';
import { acceptWorkEntries, acceptWorkEntryPartially, unacceptWorkEntry } from '../db/repo';
import { customerReportText, sendText } from '../lib/report';
import { useToast } from '../state/toast';
import { useView } from '../state/view';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { NumField } from '../components/NumField';
import { PlanSchedule } from '../components/PlanSchedule';
import { CustomerModeButton } from '../components/CustomerModeButton';
import type { WorkEntry } from '../db/types';

// Сдача заказчику: галочки «принято», частичная приёмка, акт, отчёт в WhatsApp
export function Handover() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const { id = '' } = useParams();
  const s = useObjectSummary(id);
  const workTypes = useWorkTypes();
  const workers = useWorkers();
  const customerMode = useView((v) => v.customerMode);
  const [tab, setTab] = useState<'pending' | 'accepted'>('pending');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Частичная приёмка: сколько приняли — печатается прямо под строкой работы
  const [partial, setPartial] = useState<{ id: string; value: string } | null>(null);

  // В «не принято» и то, что принято частично: остаток ещё надо сдать
  const remainder = (e: WorkEntry) => e.customerTotal - (e.accepted ? (e.acceptedTotal ?? e.customerTotal) : 0);
  const pending = s.unacceptedEntries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const accepted = s.active
    .filter((e) => e.accepted)
    .sort((a, b) => b.date.localeCompare(a.date));
  const list = tab === 'pending' ? pending : accepted;

  const selectedSum = pending.filter((e) => checked.has(e.id)).reduce((sum, e) => sum + remainder(e), 0);

  function toggle(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  }

  async function acceptSelected() {
    const ids = [...checked];
    // Запоминаем, что было принято частично, чтобы «Отменить» вернуло именно это
    const before = pending.filter((e) => ids.includes(e.id)).map((e) => ({
      id: e.id, partialQty: e.accepted ? e.acceptedQuantity : undefined, note: e.acceptNote,
    }));
    await acceptWorkEntries(ids);
    setChecked(new Set());
    toast.show(t('common.saved'), async () => {
      for (const b of before) {
        if (b.partialQty !== undefined) await acceptWorkEntryPartially(b.id, b.partialQty, b.note);
        else await unacceptWorkEntry(b.id);
      }
    });
  }

  async function report() {
    if (!s.object) return;
    const res = await sendText(s.object.customerPhone, customerReportText(s.object, s.active, workTypes));
    if (res === 'copied') toast.show(t('common.copied'));
              else if (res === 'failed') toast.show(t('common.copyFailed'));
  }

  const row = (e: WorkEntry) => {
    const wt = workTypes.find((w) => w.id === e.workTypeId);
    const names = e.shares.map((x) => workers.find((w) => w.id === x.workerId)?.name).filter(Boolean).join(', ');
    const isPartial = e.accepted && e.acceptedQuantity !== undefined && e.acceptedQuantity < e.quantity;
    const editing = partial?.id === e.id;
    return (
      <div key={e.id} className="rounded-[16px] bg-white px-3.5 py-3 shadow-card">
      <div className="flex items-center gap-3">
        {tab === 'pending' ? (
          <button
            aria-label={t('works.accept')}
            data-testid={`check-${e.id}`}
            onClick={() => toggle(e.id)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${checked.has(e.id) ? 'border-ink bg-ink text-white' : 'border-slate-300'}`}
          >
            {checked.has(e.id) && <Check size={18} strokeWidth={3} aria-hidden="true" />}
          </button>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e6f4ea] text-money-in"><Check size={18} strokeWidth={3} aria-hidden="true" /></span>
        )}
        <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/works/${e.id}`)}>
          <span className="block truncate text-[16px] font-semibold">{wtLabel(wt, lang)} · {formatQuantity(e.quantity)} {e.unit}</span>
          <span className="block truncate text-[13px] font-medium text-slate-500">
            {formatDateShort(e.date, lang)}{!customerMode && names ? ` · ${names}` : ''}
            {isPartial ? ` · ${t('handover.partOf', { a: formatQuantity(e.acceptedQuantity!), q: formatQuantity(e.quantity) })}` : ''}
          </span>
        </button>
        <span className="text-right">
          <span className="block text-[16px] font-extrabold">
            {formatMoney(tab === 'pending' ? remainder(e) : (isPartial ? (e.acceptedTotal ?? e.customerTotal) : e.customerTotal))}
          </span>
          {tab === 'pending' && !editing && (
            <button
              className="text-[12px] font-bold text-slate-500 underline"
              onClick={() => setPartial({ id: e.id, value: String(e.acceptedQuantity ?? e.quantity).replace('.', ',') })}
              data-testid={`partial-${e.id}`}
            >
              {t('handover.acceptPart')}
            </button>
          )}
        </span>
      </div>
      {editing && partial && (
        <div className="mt-2.5 border-t border-[#f0ece3] pt-2.5">
          <NumField
            label={t('handover.partialTitle', { q: formatQuantity(e.quantity), unit: e.unit })}
            value={partial.value}
            onChange={(v) => setPartial({ id: e.id, value: v })}
            onCommit={(v, reason) => {
              // Поле исчезает вместе с экраном — убирать его самим не нужно
              if (reason === 'unmount') return;
              setPartial(null);
              if (reason !== 'done') return;
              void acceptWorkEntryPartially(e.id, parseDecimal(v)).then(() => toast.show(t('common.saved')));
            }}
            suffix={e.unit}
            autoOpen
            hint={t('handover.partialHint')}
            testId={`partial-input-${e.id}`}
          />
        </div>
      )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScreenHeader title={t('object.handover')} sub={s.object?.name} right={<CustomerModeButton />} />
      <div className="flex flex-1 flex-col gap-3 px-4">
        {/* Общая сумма по договору: сдают этапы, их части становятся «к оплате». Объёмы тут не принимают */}
        {s.fixed && s.object && (
          <>
            <p className="px-1 text-[14px] text-slate-500">{t('plan.stagesHint')}</p>
            <PlanSchedule object={s.object} statuses={s.statuses} received={s.received} done={s.done} readOnly={customerMode} />
          </>
        )}
        {!s.fixed && (
        <>
        <div className="flex gap-2">
          <button className={`min-h-[44px] rounded-full px-4 text-[14px] font-bold ${tab === 'pending' ? 'bg-accent' : 'bg-[#ece8df] text-slate-600'}`} onClick={() => setTab('pending')}>
            {t('handover.pending')} · {pending.length}
          </button>
          <button className={`min-h-[44px] rounded-full px-4 text-[14px] font-bold ${tab === 'accepted' ? 'bg-accent' : 'bg-[#ece8df] text-slate-600'}`} onClick={() => setTab('accepted')} data-testid="tab-accepted">
            {t('handover.accepted')} · {accepted.length}
          </button>
        </div>
        {tab === 'pending' && pending.length > 0 && (
          <p className="px-1 text-[14px] text-slate-500">{t('handover.hint')}</p>
        )}
        <div className="flex flex-col gap-2 pb-2">
          {list.map(row)}
          {list.length === 0 && <p className="py-6 text-center text-[16px] text-slate-400">{tab === 'pending' ? t('handover.nothingPending') : t('handover.nothingAccepted')}</p>}
        </div>
        </>
        )}

        <div className="sticky bottom-0 z-20 -mx-4 mt-auto rounded-t-[24px] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(31,41,55,.08)]">
          {tab === 'pending' && !s.fixed && (
            <>
              <div className="flex items-baseline justify-between pb-2">
                <span className="text-[14px] font-semibold text-slate-500">{t('handover.selected', { n: checked.size })}</span>
                <span className="text-[24px] font-extrabold">{formatMoney(selectedSum)}</span>
              </div>
              <BigButton label={t('handover.acceptSelected')} disabled={checked.size === 0} onClick={() => void acceptSelected()} testId="accept-selected" />
            </>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <BigButton label={t('handover.buildAct')} tone="neutral" icon={<FileText size={20} aria-hidden="true" />} onClick={() => navigate(`/act?objectId=${id}`)} testId="to-act" />
            <BigButton label={t('handover.report')} tone="neutral" icon={<Send size={20} aria-hidden="true" />} onClick={() => void report()} testId="customer-report" />
          </div>
        </div>
      </div>

    </div>
  );
}
