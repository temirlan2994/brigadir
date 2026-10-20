import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useAdjustments, useExpenses, usePayouts, useReceipts, useWorkers } from '../lib/hooks';
import { formatMoney, somsToTyiyn, tyiynToSomsInput } from '../core/format';
import {
  restore, softDelete, updateAdjustment, updateExpense, updatePayout, updateReceipt,
} from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumSheet } from '../components/NumSheet';
import { DatePick } from '../components/DatePick';

type TableName = 'payout' | 'expense' | 'receipt' | 'adjustment';
const DB_TABLE: Record<TableName, 'payouts' | 'expenses' | 'receipts' | 'adjustments'> = {
  payout: 'payouts', expense: 'expenses', receipt: 'receipts', adjustment: 'adjustments',
};

// Карточка выдачи, расхода, поступления или корректировки: правка и удаление
export function RecordCard() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const { table = '', id = '' } = useParams<{ table: TableName; id: string }>();
  const payouts = usePayouts();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const adjustments = useAdjustments();
  const workers = useWorkers();
  const [editAmount, setEditAmount] = useState(false);

  const kind = table as TableName;
  const row =
    kind === 'payout' ? payouts.find((r) => r.id === id)
    : kind === 'expense' ? expenses.find((r) => r.id === id)
    : kind === 'receipt' ? receipts.find((r) => r.id === id)
    : adjustments.find((r) => r.id === id);

  if (!row) return <ScreenHeader title="" />;

  const title =
    kind === 'payout' ? t('feed.payout')
    : kind === 'expense' ? t('feed.expense')
    : kind === 'receipt' ? t('feed.receipt')
    : t('feed.adjustment');

  const subtitle =
    kind === 'payout' ? workers.find((w) => w.id === (row as { workerId: string }).workerId)?.name ?? ''
    : kind === 'expense' ? t(`expense.${(row as { category: string }).category}`)
    : kind === 'adjustment' ? t(`adjustment.${(row as { kind: string }).kind}`)
    : '';

  async function patch(data: Record<string, unknown>) {
    if (kind === 'payout') await updatePayout(id, data);
    else if (kind === 'expense') await updateExpense(id, data);
    else if (kind === 'receipt') await updateReceipt(id, data);
    else await updateAdjustment(id, data);
  }

  async function remove() {
    await softDelete(DB_TABLE[kind], id);
    navigate(-1);
    toast.show(t('common.deleted'), () => restore(DB_TABLE[kind], id));
  }

  const payoutKindLabel = kind === 'payout'
    ? t((row as { kind: string }).kind === 'advance' ? 'payout.kindAdvance'
      : (row as { kind: string }).kind === 'deduction' ? 'payout.kindDeduction' : 'payout.kindPayout')
    : '';

  const methodLabel = 'method' in row
    ? t((row as { method: string }).method === 'cash' ? 'payout.cash' : 'payout.transfer')
    : '';

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-slate-50 pb-6">
      <ScreenHeader title={title} />

      {row.deletedAt && (
        <div className="mx-4 rounded-xl bg-slate-200 px-4 py-3 text-[16px]">
          {t('common.deletedMark')}
          <button className="ml-3 font-semibold text-orange-600" onClick={() => void restore(DB_TABLE[kind], id)}>
            {t('common.restore')}
          </button>
        </div>
      )}

      <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm">
        {subtitle && <p className="text-[18px] font-semibold">{subtitle}</p>}
        {payoutKindLabel && <p className="text-[15px] text-slate-500">{payoutKindLabel}</p>}
        {methodLabel && <p className="text-[15px] text-slate-500">{methodLabel}</p>}
        <button className="mt-1 text-[30px] font-bold" onClick={() => setEditAmount(true)}>
          {formatMoney(row.amount)}
        </button>
        <p className="text-[14px] text-slate-500">{formatDateShort(row.date, lang)}</p>
        {row.note && <p className="mt-2 text-[15px] text-slate-600">{row.note}</p>}
      </div>

      <div className="mx-4">
        <DatePick value={row.date} onChange={(d) => void patch({ date: d })} />
      </div>

      <input
        className="mx-4 min-h-[56px] rounded-2xl border border-slate-200 px-3 text-[18px]"
        placeholder={t('common.note')}
        defaultValue={row.note ?? ''}
        onBlur={(e) => void patch({ note: e.target.value.trim() || undefined })}
      />

      {!row.deletedAt && (
        <button className="mx-4 min-h-[48px] rounded-2xl text-[16px] text-red-600" onClick={() => void remove()}>
          {t('common.delete')}
        </button>
      )}

      {editAmount && (
        <NumSheet
          title={t('common.sum')}
          initial={tyiynToSomsInput(row.amount)}
          onClose={() => setEditAmount(false)}
          onSave={(v) => {
            const tyiyn = somsToTyiyn(v);
            if (tyiyn > 0) void patch({ amount: tyiyn });
          }}
        />
      )}
    </div>
  );
}
