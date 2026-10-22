// Тексты для WhatsApp: отчёт заказчику и выписка рабочему. Всегда на русском.
import { translate, formatDateShort } from '../i18n';
import { formatMoneyExact, formatQuantity } from '../core/format';
import { formatPhone, phoneDigits } from '../core/phone';
import { isFixed, partsSum, type PartStatus } from '../core/plan';
import type { Counterparty, SiteObject, WorkEntry, WorkType } from '../db/types';

const ru = (key: string, params?: Record<string, string | number>) => translate('ru', key, params);

// Отчёт по общей сумме: этапы договора и их статус, объёмы — без цен
// (зелёные цены у таких объектов только для своего расчёта)
function fixedReportText(object: SiteObject, entries: WorkEntry[], workTypes: WorkType[], statuses: PartStatus[]): string {
  const plan = object.payment!;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const lines: string[] = [ru('report.title', { object: object.name })];
  lines.push(ru('report.contract', { sum: formatMoneyExact(plan.total ?? partsSum(plan.parts)) }), '', ru('report.stages'));
  for (const s of statuses) {
    const state = s.state === 'paid' ? ru('report.stage.paid')
      : s.state === 'partial' ? ru('report.stage.partial', { paid: formatMoneyExact(s.paid), sum: formatMoneyExact(s.part.amount) })
      : s.due ? ru('report.stage.due') : ru('report.stage.waiting');
    lines.push(`${s.part.title} — ${formatMoneyExact(s.part.amount)} — ${state}`);
  }
  if (sorted.length > 0) {
    lines.push('', ru('report.done'));
    lines.push(ru('statement.period', {
      from: formatDateShort(sorted[0].date, 'ru'),
      to: formatDateShort(sorted[sorted.length - 1].date, 'ru'),
    }));
    const byType = new Map<string, { qty: number; unit: string; name: string }>();
    for (const e of sorted) {
      const row = byType.get(e.workTypeId) ?? { qty: 0, unit: e.unit, name: workTypes.find((w) => w.id === e.workTypeId)?.nameRu ?? '' };
      row.qty += e.quantity;
      byType.set(e.workTypeId, row);
    }
    for (const row of byType.values()) lines.push(`${row.name}: ${formatQuantity(Math.round(row.qty * 100) / 100)} ${row.unit}`);
  }
  const photos = sorted.reduce((n, e) => n + e.photoIds.length, 0);
  if (photos > 0) lines.push('', ru('report.photos', { n: photos }));
  return lines.join('\n');
}

// Сводка объёмов по видам работ за период: что сделано, что принято, фото
export function customerReportText(
  object: SiteObject, entries: WorkEntry[], workTypes: WorkType[], statuses: PartStatus[] = [],
): string {
  if (isFixed(object.payment)) return fixedReportText(object, entries, workTypes, statuses);
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const lines: string[] = [ru('report.title', { object: object.name })];
  if (sorted.length > 0) {
    lines.push(ru('statement.period', {
      from: formatDateShort(sorted[0].date, 'ru'),
      to: formatDateShort(sorted[sorted.length - 1].date, 'ru'),
    }));
  }
  lines.push('');
  const byType = new Map<string, { qty: number; accepted: number; sum: number; unit: string; name: string }>();
  let photos = 0;
  for (const e of sorted) {
    const wt = workTypes.find((w) => w.id === e.workTypeId);
    const key = e.workTypeId;
    const row = byType.get(key) ?? { qty: 0, accepted: 0, sum: 0, unit: e.unit, name: wt?.nameRu ?? '' };
    row.qty += e.quantity;
    row.accepted += e.accepted ? (e.acceptedQuantity ?? e.quantity) : 0;
    row.sum += e.customerTotal;
    byType.set(key, row);
    photos += e.photoIds.length;
  }
  for (const row of byType.values()) {
    lines.push(`${row.name}: ${formatQuantity(Math.round(row.qty * 100) / 100)} ${row.unit} — ${formatMoneyExact(row.sum)}`
      + (row.accepted < row.qty ? ` (${ru('report.acceptedOf', { a: formatQuantity(Math.round(row.accepted * 100) / 100), q: formatQuantity(Math.round(row.qty * 100) / 100) })})` : ''));
  }
  lines.push('');
  lines.push(ru('report.byDays'));
  for (const e of sorted) {
    const wt = workTypes.find((w) => w.id === e.workTypeId);
    lines.push(`${formatDateShort(e.date, 'ru')} — ${wt?.nameRu ?? ''} ${formatQuantity(e.quantity)} ${e.unit}${e.accepted ? ' ✓' : ''}`);
  }
  if (photos > 0) {
    lines.push('');
    lines.push(ru('report.photos', { n: photos }));
  }
  return lines.join('\n');
}

// Реквизиты заказчика для акта: имя, ИНН, адрес, телефон
export function customerLines(object: SiteObject, cp: Counterparty | undefined): string[] {
  const name = cp?.name ?? object.customerName;
  if (!name) return [];
  const lines = [`${ru('act.customer')}: ${name}`];
  if (cp?.inn) lines.push(`${ru('cp.inn')}: ${cp.inn}`);
  if (cp?.address) lines.push(`${ru('cp.address')}: ${cp.address}`);
  const phone = formatPhone(cp?.phone ?? object.customerPhone);
  if (phone) lines.push(`${ru('cp.phone')}: ${phone}`);
  return lines;
}

// Акт текстом — для телефона, где печати нет. Строки — объёмы или сданные этапы
export function actText(
  object: SiteObject,
  cp: Counterparty | undefined,
  rows: { name: string; unit?: string; qty?: number; price?: number; total: number }[],
  total: number,
): string {
  const lines: string[] = [ru('act.title'), `${ru('act.object')}: ${object.name}`, ...customerLines(object, cp)];
  lines.push('');
  for (const r of rows) {
    lines.push(r.qty !== undefined && r.price !== undefined
      ? `${r.name} — ${formatQuantity(r.qty)} ${r.unit ?? ''} × ${formatMoneyExact(r.price)} = ${formatMoneyExact(r.total)}`
      : `${r.name} — ${formatMoneyExact(r.total)}`);
  }
  lines.push('');
  lines.push(`${ru('act.total')}: ${formatMoneyExact(total)}`);
  return lines.join('\n');
}

// Открыть WhatsApp с текстом, если есть номер; иначе — скопировать
export async function sendText(phone: string | undefined, text: string): Promise<'whatsapp' | 'copied' | 'failed'> {
  const digits = phoneDigits(phone);
  if (digits) {
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank');
    return 'whatsapp';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
