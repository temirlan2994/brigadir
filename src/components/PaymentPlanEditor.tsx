import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useT, formatDateShort, useLangStore } from '../i18n';
import { formatMoney, formatPercent, parseDecimal, somsToTyiyn, tyiynToSomsInput } from '../core/format';
import { checkPlan, withPercentAmounts } from '../core/plan';
import { uid } from '../db/repo';
import { NumField } from './NumField';
import { Segmented } from './Segmented';
import { Chips, FieldLabel } from './ui';
import type { ActsEvery, PaymentPlan, PartTrigger, PlanPart } from '../db/types';

export const EMPTY_PLAN: PaymentPlan = { basis: 'volume', splitBy: 'amount', parts: [] };

const PRESETS: number[][] = [[30, 70], [30, 40, 30], [50, 50], [25, 25, 25, 25]];

// Ввод процента и суммы в поле — строкой; в плане — числа
const pctInput = (p: number | undefined) => (p === undefined ? '' : formatPercent(p));
const sumInput = (m: number | undefined) => (m ? tyiynToSomsInput(m) : '');

function partTitle(t: (k: string, p?: Record<string, string | number>) => string, i: number, n: number): string {
  if (i === 0) return t('pay.defaultAdvance');
  if (i === n - 1) return t('pay.defaultFinal');
  return t('pay.defaultStage', { n: i });
}

// Части по процентам: первая — аванс сразу, остальные — после этапов
function presetParts(t: Parameters<typeof partTitle>[0], percents: number[]): PlanPart[] {
  return percents.map((percent, i) => ({
    id: uid(), title: partTitle(t, i, percents.length), percent, amount: 0,
    trigger: i === 0 ? 'start' : 'stage',
  }));
}

// Сумма процентов ровно 100 после округления до десятых: разницу забирает последняя часть
function percentsFromAmounts(parts: PlanPart[], total: number): PlanPart[] {
  if (!total) return parts.map((p) => ({ ...p, percent: undefined }));
  const out = parts.map((p) => ({ ...p, percent: Math.round((p.amount / total) * 1000) / 10 }));
  const sum = out.reduce((s, p) => s + (p.percent ?? 0), 0);
  const fullySplit = parts.reduce((s, p) => s + p.amount, 0) === total;
  if (out.length > 0 && fullySplit) {
    const last = out[out.length - 1];
    last.percent = Math.round(((last.percent ?? 0) + 100 - sum) * 10) / 10;
  }
  return out;
}

// Блок «Как платит заказчик»: за объёмы (с авансом) или общая сумма частями
export function PaymentPlanEditor({ plan, onChange, received, onReceived }: {
  plan: PaymentPlan;
  onChange: (plan: PaymentPlan) => void;
  received?: string[]; // в мастере: какие авансы уже на руках
  onReceived?: (ids: string[]) => void;
}) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const fixed = plan.basis === 'fixed';
  const total = plan.total ?? 0;
  const update = (next: PaymentPlan) => onChange(withPercentAmounts(next));

  // Пока поле открыто, держим набранную строку как есть: «33,» не должно схлопнуться в «33»
  const [raw, setRaw] = useState<Record<string, string>>({});
  function num(key: string, stored: string, onValue: (v: string) => void) {
    return {
      value: raw[key] ?? stored,
      onChange: (v: string) => { setRaw((r) => ({ ...r, [key]: v })); onValue(v); },
      onCommit: () => setRaw((r) => { const next = { ...r }; delete next[key]; return next; }),
    };
  }

  function switchBasis(basis: PaymentPlan['basis']) {
    if (basis === plan.basis) return;
    if (basis === 'fixed') {
      const advance = plan.parts.find((p) => p.trigger === 'start');
      const parts = advance && advance.percent !== undefined
        ? [{ ...advance }, { id: uid(), title: t('pay.defaultFinal'), percent: Math.max(0, 100 - advance.percent), amount: 0, trigger: 'stage' as PartTrigger }]
        : presetParts(t, [30, 70]);
      update({ ...plan, basis, splitBy: 'percent', parts });
    } else {
      const advance = plan.parts.find((p) => p.trigger === 'start');
      update({
        ...plan, basis,
        splitBy: advance?.percent !== undefined ? 'percent' : 'amount',
        parts: advance ? [{ ...advance, title: t('pay.defaultAdvance') }] : [],
      });
    }
  }

  function setTotal(v: string) {
    update({ ...plan, total: somsToTyiyn(v) || undefined });
  }

  function patchPart(id: string, patch: Partial<PlanPart>) {
    update({ ...plan, parts: plan.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }

  function toggleReceived(id: string) {
    if (!received || !onReceived) return;
    onReceived(received.includes(id) ? received.filter((x) => x !== id) : [...received, id]);
  }

  const receivedBox = (part: PlanPart) => received && onReceived && part.trigger === 'start' && (
    <label className="flex min-h-[44px] items-center gap-2.5 px-1 text-[15px] font-semibold">
      <input
        type="checkbox"
        className="h-6 w-6 accent-[#17191c]"
        checked={received.includes(part.id)}
        onChange={() => toggleReceived(part.id)}
        data-testid={`received-${part.id}`}
      />
      {t('pay.advanceReceived')}
    </label>
  );

  // --- За объёмы: смета (не обязательно), аванс, как часто по актам ---
  if (!fixed) {
    const advance = plan.parts.find((p) => p.trigger === 'start');
    const mode: 'none' | 'percent' | 'amount' = !advance ? 'none' : advance.percent !== undefined ? 'percent' : 'amount';

    function setMode(m: typeof mode) {
      if (m === mode) return;
      if (m === 'none') { update({ ...plan, parts: [] }); return; }
      const base: PlanPart = advance ?? { id: uid(), title: t('pay.defaultAdvance'), amount: 0, trigger: 'start' };
      const part = m === 'percent'
        ? { ...base, percent: total && base.amount ? Math.round((base.amount / total) * 1000) / 10 : 30 }
        : { ...base, percent: undefined };
      update({ ...plan, splitBy: m === 'percent' ? 'percent' : 'amount', parts: [part] });
    }

    return (
      <div className="flex flex-col gap-3">
        <Segmented
          options={[{ value: 'volume', label: t('pay.basisVolume') }, { value: 'fixed', label: t('pay.basisFixed') }]}
          value={plan.basis}
          onChange={switchBasis}
          testIdPrefix="basis"
        />
        <p className="px-1 text-[14px] leading-relaxed text-slate-600">{t('pay.basisVolumeHint')}</p>

        <NumField
          label={t('pay.estimate')}
          {...num('total', sumInput(plan.total), setTotal)}
          suffix="сом"
          placeholder={t('common.optional')}
          hint={t('pay.estimateHint')}
          testId="plan-total"
        />

        <div>
          <FieldLabel>{t('pay.advance')}</FieldLabel>
          <Segmented
            options={[
              { value: 'none', label: t('pay.advanceNone') },
              { value: 'percent', label: t('pay.advancePercent') },
              { value: 'amount', label: t('pay.advanceSum') },
            ]}
            value={mode}
            onChange={setMode}
            testIdPrefix="advance-mode"
          />
          <p className="px-1 pt-1.5 text-[13px] leading-snug text-slate-500">{t('pay.advanceHint')}</p>
        </div>

        {advance && mode === 'percent' && (
          <NumField
            label={t('pay.advancePercentField')}
            {...num(`p${advance.id}`, pctInput(advance.percent), (v) => patchPart(advance.id, { percent: Math.min(100, parseDecimal(v)) }))}
            suffix="%"
            decimals={1}
            maxDigits={4}
            hint={total > 0 ? t('pay.advanceEquals', { sum: formatMoney(advance.amount) }) : t('pay.needEstimate')}
            testId="advance-percent"
          />
        )}
        {advance && mode === 'amount' && (
          <NumField
            label={t('pay.advanceSumField')}
            {...num(`a${advance.id}`, sumInput(advance.amount), (v) => patchPart(advance.id, { amount: somsToTyiyn(v) }))}
            suffix="сом"
            hint={total > 0 && advance.amount > 0 ? t('pay.advanceIsPercent', { p: formatPercent((advance.amount / total) * 100) }) : undefined}
            testId="advance-amount"
          />
        )}
        {advance && receivedBox(advance)}

        <div>
          <FieldLabel>{t('pay.actsEvery')}</FieldLabel>
          <Chips<ActsEvery>
            options={(['week', 'twoWeeks', 'month', 'handover'] as ActsEvery[]).map((v) => ({ value: v, label: t(`pay.every.${v}`) }))}
            value={plan.actsEvery}
            onChange={(v) => update({ ...plan, actsEvery: v })}
            testIdPrefix="every"
          />
        </div>
      </div>
    );
  }

  // --- Общая сумма: делим на части в процентах или суммами ---
  const check = checkPlan(plan);
  const byPercent = plan.splitBy === 'percent';

  function setSplit(splitBy: PaymentPlan['splitBy']) {
    if (splitBy === plan.splitBy) return;
    if (splitBy === 'amount') update({ ...plan, splitBy, parts: plan.parts.map((p) => ({ ...p, percent: undefined })) });
    else update({ ...plan, splitBy, parts: percentsFromAmounts(plan.parts, total) });
  }

  function addPart() {
    const left = byPercent ? Math.max(0, Math.round((100 - check.percent) * 10) / 10) : undefined;
    const part: PlanPart = {
      id: uid(), title: t('pay.defaultStage', { n: plan.parts.length }), amount: byPercent ? 0 : Math.max(0, check.left),
      percent: left, trigger: 'stage',
    };
    update({ ...plan, parts: [...plan.parts, part] });
  }

  function putRest() {
    const last = plan.parts[plan.parts.length - 1];
    if (!last) return;
    if (byPercent) patchPart(last.id, { percent: Math.round(((last.percent ?? 0) + 100 - check.percent) * 10) / 10 });
    else patchPart(last.id, { amount: last.amount + check.left });
  }

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        options={[{ value: 'volume', label: t('pay.basisVolume') }, { value: 'fixed', label: t('pay.basisFixed') }]}
        value={plan.basis}
        onChange={switchBasis}
        testIdPrefix="basis"
      />
      <p className="px-1 text-[14px] leading-relaxed text-slate-600">{t('pay.basisFixedHint')}</p>

      <NumField label={t('pay.total')} {...num('total', sumInput(plan.total), setTotal)} suffix="сом" placeholder="0" testId="plan-total" />

      <div>
        <FieldLabel>{t('pay.splitBy')}</FieldLabel>
        <Segmented
          options={[{ value: 'percent', label: t('pay.splitPercent') }, { value: 'amount', label: t('pay.splitAmount') }]}
          value={plan.splitBy}
          onChange={setSplit}
          testIdPrefix="split"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="px-1 text-[13px] font-bold text-slate-500">{t('pay.presets')}</span>
        {PRESETS.map((ps) => (
          <button
            key={ps.join('-')}
            type="button"
            className="min-h-[40px] rounded-full bg-white px-3 text-[14px] font-bold shadow-card"
            onClick={() => {
              const parts = presetParts(t, ps);
              if (byPercent) update({ ...plan, parts });
              else {
                const withAmounts = withPercentAmounts({ ...plan, splitBy: 'percent', parts }).parts;
                update({ ...plan, parts: withAmounts.map((p) => ({ ...p, percent: undefined })) });
              }
            }}
            data-testid={`preset-${ps.join('-')}`}
          >
            {ps.join(' / ')}
          </button>
        ))}
      </div>

      {plan.parts.map((part, i) => (
        <div key={part.id} className="flex flex-col gap-2 rounded-[18px] bg-white p-3 shadow-card" data-testid={`part-${i}`}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-extrabold uppercase tracking-wide text-slate-500">{t('pay.part', { n: i + 1 })}</span>
            {plan.parts.length > 1 && (
              <button
                type="button"
                aria-label={t('pay.removePart')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 active:bg-paper"
                onClick={() => update({ ...plan, parts: plan.parts.filter((p) => p.id !== part.id) })}
              >
                <X size={20} aria-hidden="true" />
              </button>
            )}
          </div>
          <label className="block rounded-[14px] border-[1.5px] border-line px-3 py-2 focus-within:border-ink">
            <span className="block text-[12px] font-semibold text-slate-500">{t('pay.partTitle')}</span>
            <input
              className="w-full bg-transparent text-[17px] font-semibold outline-none"
              value={part.title}
              onChange={(e) => patchPart(part.id, { title: e.target.value })}
              data-testid={`part-title-${i}`}
            />
          </label>
          <div className="grid grid-cols-2 items-center gap-2">
            {byPercent ? (
              <>
                <NumField
                  label={t('pay.partPercent')}
                  keypadLabel={`${part.title} — ${t('pay.partPercent')}`}
                  {...num(`p${part.id}`, pctInput(part.percent), (v) => patchPart(part.id, { percent: parseDecimal(v) }))}
                  suffix="%"
                  decimals={1}
                  maxDigits={4}
                  testId={`part-percent-${i}`}
                />
                <span className="text-right text-[18px] font-extrabold" data-testid={`part-amount-${i}`}>
                  {total > 0 ? formatMoney(part.amount) : '—'}
                </span>
              </>
            ) : (
              <>
                <NumField
                  label={t('pay.partAmount')}
                  keypadLabel={`${part.title} — ${t('pay.partAmount')}`}
                  {...num(`a${part.id}`, sumInput(part.amount), (v) => patchPart(part.id, { amount: somsToTyiyn(v) }))}
                  suffix="сом"
                  testId={`part-sum-${i}`}
                />
                <span className="text-right text-[18px] font-extrabold text-slate-500">
                  {total > 0 ? `${formatPercent((part.amount / total) * 100)} %` : '—'}
                </span>
              </>
            )}
          </div>
          <Segmented<PartTrigger>
            options={[
              { value: 'start', label: t('pay.trigger.start') },
              { value: 'stage', label: t('pay.trigger.stage') },
              { value: 'date', label: t('pay.trigger.date') },
            ]}
            testIdPrefix={`trigger-${i}`}
            value={part.trigger}
            onChange={(v) => patchPart(part.id, { trigger: v })}
          />
          {part.trigger === 'date' && (
            <label className="relative block rounded-[14px] border-[1.5px] border-line px-3 py-2">
              <span className="block text-[12px] font-semibold text-slate-500">{t('pay.dueDate')}</span>
              <span className="block text-[17px] font-semibold">{part.dueDate ? formatDateShort(part.dueDate, lang) : t('common.pickDate')}</span>
              <input
                type="date"
                aria-label={t('pay.dueDate')}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                value={part.dueDate ?? ''}
                onChange={(e) => patchPart(part.id, { dueDate: e.target.value || undefined })}
              />
            </label>
          )}
          {receivedBox(part)}
        </div>
      ))}

      <button
        type="button"
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-dashed border-slate-300 text-[16px] font-bold text-slate-600"
        onClick={addPart}
        data-testid="part-add"
      >
        <Plus size={20} aria-hidden="true" />
        {t('pay.addPart')}
      </button>

      <div
        className={`rounded-[16px] px-4 py-3 text-[15px] font-bold ${check.ok ? 'bg-[#e6f4ea] text-money-in' : 'bg-[#fde8e8] text-money-out'}`}
        data-testid="plan-check"
      >
        {total <= 0 ? t('pay.needTotal')
          : check.ok ? (
            <span className="flex items-center gap-2"><Check size={18} strokeWidth={3} aria-hidden="true" />{t('pay.sumOk', { sum: formatMoney(check.sum) })}</span>
          )
          : check.left > 0 ? t('pay.sumLeft', { sum: formatMoney(check.left), p: formatPercent(100 - check.percent) })
          : t('pay.sumOver', { sum: formatMoney(-check.left), p: formatPercent(check.percent - 100) })}
        {total > 0 && !check.ok && plan.parts.length > 0 && (
          <button type="button" className="mt-2 block min-h-[40px] rounded-[12px] bg-white px-3 text-[14px] font-bold text-ink" onClick={putRest} data-testid="put-rest">
            {t('pay.putRest')}
          </button>
        )}
      </div>
    </div>
  );
}
