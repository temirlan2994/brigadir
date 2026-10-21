import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useAdjustments, useCashMoves, useExpenses, usePayouts, useReceipts, useWorkers } from '../lib/hooks';
import { formatMoney, somsToTyiyn, tyiynToSomsInput } from '../core/format';
import {
  restore, softDelete, updateAdjustment, updateCashMove, updateExpense, updatePayout, updateReceipt,
} from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumSheet } from '../components/NumSheet';
import { DatePick } from '../components/DatePick';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/ui';

type TableName = 'payout' | 'expense' | 'receipt' | 'adjustment' | 'cashMove';
const DB_TABLE: Record<TableName, 'payouts' | 'expenses' | 'receipts' | 'adjustments' | 'cashMoves'> = {
  payout: 'payouts', expense: 'expenses', receipt: 'receipts', adjustment: 'adjustments', cashMove: 'cashMoves',
};

// Карточка выдачи, расхода, поступления, корректировки или личного движения: правка и удаление
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
  const moves = useCashMoves();
  const workers = useWorkers();
  const [editAmount, setEditAmount] = useState(false);

  const kind = table as TableName;
  const row =
    kind === 'payout' ? payouts.find((r) => r.id === id)
    : kind === 'expense' ? expenses.find((r) => r.id === id)
    : kind === 'receipt' ? receipts.find((r) => r.id === id)
    : kind === 'adjustment' ? adjustments.find((r) => r.id === id)
    : moves.find((r) => r.id === id);

  if (!row) return <ScreenHeader title="" />;

  const title =
    kind === 'payout' ? t('feed.payout')
    : kind === 'expense' ? t('feed.expense')
    : kind === 'receipt' ? t((row as { kind?: string }).kind === 'advance' ? 'feed.customerAdvance' : 'feed.receipt')
    : kind === 'adjustment' ? t('feed.adjustment')
    : t((row as { kind: string }).kind === 'draw' ? 'cash.drawTitle' : 'cash.contributionTitle');

  const subtitle =
    kind === 'payout' ? workers.find((w) => w.id === (row as { workerId: string }).workerId)?.name ?? ''
    : kind === 'expense' ? t(`expense.${(row as { category: string }).category}`)
    : kind === 'adjustment' ? t(`adjustment.${(row as { kind: string }).kind}`)
    : '';

  async function patch(data: Record<string, unknown>) {
    if (kind === 'payout') await updatePayout(id, data);
    else if (kind === 'expense') await updateExpense(id, data);
    else if (kind === 'receipt') await updateReceipt(id, data);
    else if (kind === 'adjustment') await updateAdjustment(id, data);
    else await updateCashMove(id, data);
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
    <div className="flex min-h-screen flex-col gap-3 bg-paper pb-6">
      <ScreenHeader title={title} sub={subtitle || undefined} />

      {row.deletedAt && (
        <div className="mx-4 flex items-center justify-between rounded-[14px] bg-[#ece8df] px-4 py-3 text-[15px] font-semibold">
          {t('common.deletedMark')}
          <button className="font-bold underline" onClick={() => void restore(DB_TABLE[kind], id)}>{t('common.restore')}</button>
        </div>
      )}

      <div className="mx-4">
        <Card>
          {payoutKindLabel && <p className="text-[14px] font-medium text-slate-500">{payoutKindLabel}{methodLabel ? ` · ${methodLabel}` : ''}</p>}
          {!payoutKindLabel && methodLabel && <p className="text-[14px] font-medium text-slate-500">{methodLabel}</p>}
          <button className="mt-1 block text-[36px] font-black tracking-tight" onClick={() => setEditAmount(true)} data-testid="edit-amount">
            {formatMoney(row.amount)}
          </button>
          <p className="text-[14px] font-medium text-slate-500">{formatDateShort(row.date, lang)}</p>
          {row.note && <p className="mt-2 text-[15px] text-slate-700">{row.note}</p>}
        </Card>
      </div>

      <div className="mx-4">
        <DatePick value={row.date} onChange={(d) => void patch({ date: d })} />
      </div>

      <input
        className="mx-4 min-h-[56px] rounded-[16px] border-[1.5px] border-line bg-white px-3.5 text-[17px] font-medium"
        placeholder={t('common.note')}
        defaultValue={row.note ?? ''}
        onBlur={(e) => void patch({ note: e.target.value.trim() || undefined })}
      />

      {!row.deletedAt && (
        <div className="mx-4 mt-auto">
          <BigButton label={t('common.delete')} tone="neutral" onClick={() => void remove()} />
        </div>
      )}

      {editAmount && (
        <NumSheet
          title={t('common.sum')}
          initial={tyiynToSomsInput(row.amount)}
          onClose={() => setEditAmount(false)}
          onSave={(v) => { const tyiyn = somsToTyiyn(v); if (tyiyn > 0) void patch({ amount: tyiyn }); }}
        />
      )}
    </div>
  );
}
