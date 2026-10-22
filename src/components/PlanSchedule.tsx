import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { formatMoney, formatPercent } from '../core/format';
import { isFixed, type PartStatus } from '../core/plan';
import { nowIso, updateObject } from '../db/repo';
import { useToast } from '../state/toast';
import { Card, Pill } from './ui';
import type { SiteObject } from '../db/types';

// Отметить этап сданным (или снять отметку): его часть становится «к оплате»
export async function markStage(object: SiteObject, partId: string, done: boolean) {
  if (!object.payment) return;
  await updateObject(object.id, {
    payment: {
      ...object.payment,
      parts: object.payment.parts.map((p) => (p.id === partId ? { ...p, doneAt: done ? nowIso() : undefined } : p)),
    },
  });
}

// График оплаты: части договора по порядку, что получено, что к оплате, что ждёт этапа
export function PlanSchedule({ object, statuses, received, withheld = 0, done, readOnly }: {
  object: SiteObject;
  statuses: PartStatus[];
  received: number;
  withheld?: number; // удержания и штрафы тоже закрывают части графика
  done: number; // сделано по ценам — для сметы
  readOnly?: boolean;
}) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const plan = object.payment;
  if (!plan) return null;
  const fixed = isFixed(plan);
  const total = plan.total ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round(((fixed ? received + withheld : done) / total) * 100)) : 0;
  const left = Math.max(0, total - received - withheld);
  const open = !object.closedAt && !object.archivedAt && !readOnly;

  async function toggle(s: PartStatus) {
    const mark = !s.part.doneAt;
    await markStage(object, s.part.id, mark);
    toast.show(mark ? t('plan.markedDone', { title: s.part.title }) : t('common.saved'));
  }

  function stateLabel(s: PartStatus): { text: string; tone: 'green' | 'yellow' | 'grey' | 'red' } {
    if (s.state === 'paid') return { text: t('plan.state.paid'), tone: 'green' };
    if (s.overdue) return { text: t('plan.overdue', { date: formatDateShort(s.part.dueDate!, lang) }), tone: 'red' };
    if (s.state === 'partial') return { text: t('plan.state.partial', { paid: formatMoney(s.paid) }), tone: 'yellow' };
    if (s.state === 'due') return { text: t('plan.state.due'), tone: 'yellow' };
    if (s.part.trigger === 'date' && s.part.dueDate) return { text: t('plan.state.waitingDate', { date: formatDateShort(s.part.dueDate, lang) }), tone: 'grey' };
    return { text: t('plan.state.waiting'), tone: 'grey' };
  }

  return (
    <Card className="flex flex-col gap-3" testId="plan-schedule">
      <div>
        <span className="block text-[14px] font-medium text-slate-500">
          {fixed ? t('plan.contract') : t('plan.byVolume')}
          {!fixed && plan.actsEvery ? ` · ${t(`pay.every.${plan.actsEvery}`).toLowerCase()}` : ''}
        </span>
        {total > 0 && (
          <>
            <span className="block text-[24px] font-black tracking-tight">{formatMoney(total)}</span>
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[#ece8df]">
              <span className="block h-full rounded-full bg-money-in" style={{ width: `${progress}%` }} />
            </span>
            <span className="mt-1 block text-[13px] font-medium text-slate-500">
              {fixed
                ? (withheld > 0
                  ? t('plan.receivedWithheldOf', { got: formatMoney(received), w: formatMoney(withheld), left: formatMoney(left) })
                  : t('plan.receivedOf', { got: formatMoney(received), left: formatMoney(left) }))
                : t('plan.estimateDone', { p: formatPercent(total > 0 ? (done / total) * 100 : 0) })}
            </span>
          </>
        )}
      </div>

      {statuses.map((s, i) => {
        const label = stateLabel(s);
        return (
          <div key={s.part.id} className="border-t border-[#f0ece3] pt-3" data-testid={`plan-part-${i}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-[16px] font-bold">{s.part.title}</span>
                <span className="block text-[13px] font-medium text-slate-500">
                  {[s.part.percent !== undefined ? `${formatPercent(s.part.percent)} %` : undefined, t(`pay.trigger.${s.part.trigger}`)].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[17px] font-extrabold">{formatMoney(s.part.amount)}</span>
                <Pill tone={label.tone}>{s.state === 'paid' && <Check size={13} strokeWidth={3} aria-hidden="true" />}{label.text}</Pill>
              </span>
            </div>
            {open && (s.part.trigger === 'stage' || (s.due && s.left > 0)) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {s.part.trigger === 'stage' && s.state !== 'paid' && (
                  <button
                    type="button"
                    className={`min-h-[44px] rounded-[12px] px-3.5 text-[14px] font-bold ${s.part.doneAt ? 'bg-paper text-slate-600' : 'bg-dark text-white'}`}
                    onClick={() => void toggle(s)}
                    data-testid={`stage-done-${i}`}
                  >
                    {s.part.doneAt ? t('plan.unmarkDone') : t('plan.markDone')}
                  </button>
                )}
                {s.due && s.left > 0 && (
                  <button
                    type="button"
                    className="min-h-[44px] rounded-[12px] bg-accent px-3.5 text-[14px] font-bold text-ink"
                    onClick={() => navigate(`/receipt/new?objectId=${object.id}&partId=${s.part.id}`)}
                    data-testid={`plan-receive-${i}`}
                  >
                    {t('plan.receive', { sum: formatMoney(s.left) })}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {statuses.length === 0 && !fixed && (
        <p className="text-[14px] text-slate-500">{t('plan.noAdvance')}</p>
      )}
    </Card>
  );
}
