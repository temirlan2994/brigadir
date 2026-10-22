// Короткие подписи графика оплаты для шапок и списков.
import { translate } from '../i18n';
import { formatMoney } from '../core/format';
import { partsSum } from '../core/plan';
import type { Lang, PaymentPlan } from '../db/types';

export function planSummary(plan: PaymentPlan | undefined, lang: Lang): string {
  if (!plan) return '';
  if (plan.basis === 'fixed') {
    return translate(lang, 'plan.summaryFixed', { sum: formatMoney(plan.total ?? partsSum(plan.parts)), n: plan.parts.length });
  }
  const bits = [translate(lang, 'plan.summaryVolume')];
  const advance = plan.parts.find((p) => p.trigger === 'start');
  if (advance && advance.amount > 0) bits.push(translate(lang, 'plan.summaryAdvance', { sum: formatMoney(advance.amount) }));
  if (plan.actsEvery) bits.push(translate(lang, `pay.every.${plan.actsEvery}`).toLowerCase());
  return bits.join(' · ');
}
