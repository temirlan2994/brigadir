// Тексты для WhatsApp: отчёт заказчику и выписка рабочему. Всегда на русском.
import { translate, formatDateShort } from '../i18n';
import { formatMoneyExact, formatQuantity } from '../core/format';
import type { SiteObject, WorkEntry, WorkType } from '../db/types';

const ru = (key: string, params?: Record<string, string | number>) => translate('ru', key, params);

// Сводка объёмов по видам работ за период: что сделано, что принято, фото
export function customerReportText(object: SiteObject, entries: WorkEntry[], workTypes: WorkType[]): string {
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

// Открыть WhatsApp с текстом, если есть номер; иначе — скопировать
export async function sendText(phone: string | undefined, text: string): Promise<'whatsapp' | 'copied'> {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits) {
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank');
    return 'whatsapp';
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
