import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useAdjustments, useCashMoves, useExpenses, usePayouts, useReceipts, useWorkers } from '../lib/hooks';
import { somsToTyiyn, tyiynToSomsInput } from '../core/format';
import {
  restore, softDelete, updateAdjustment, updateCashMove, updateExpense, updatePayout, updateReceipt,
} from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumField } from '../components/NumField';
import { DatePick } from '../components/DatePick';
import { BigButton } from '../components/BigButton';
import { Segmented } from '../components/Segmented';
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
  // Сумма правится прямо в карточке: пока поле открыто — набранная строка, иначе из базы
  const [amountDraft, setAmountDraft] = useState<string | null>(null);
  const amountRef = useRef<{ open: () => void }>(null);

  const kind = table as TableName;
  const row =
    kind === 'payout' ? payouts.find((r) => r.id === id)
    : kind === 'expense' ? expenses.find((r) => r.id === id)
    : kind === 'receipt' ? receipts.find((r) => r.id === id)
    : kind === 'adjustment' ? adjustments.find((r) => r.id === id)
    : moves.find((r) => r.id === id);

  async function patch(data: Record<string, unknown>) {
    if (kind === 'payout') await updatePayout(id, data);
    else if (kind === 'expense') await updateExpense(id, data);
    else if (kind === 'receipt') await updateReceipt(id, data);
    else if (kind === 'adjustment') await updateAdjustment(id, data);
    else await updateCashMove(id, data);
  }

  // Заметка сохраняется на лету: системный «Назад» не даёт onBlur на телефоне
  const [note, setNote] = useState<string | null>(null);
  const noteRef = useRef<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const patchRef = useRef(patch);
  patchRef.current = patch;
  function onNoteChange(v: string) {
    setNote(v);
    noteRef.current = v;
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      noteRef.current = null;
      void patchRef.current({ note: v.trim() || undefined });
    }, 600);
  }
  useEffect(() => () => {
    clearTimeout(noteTimer.current);
    if (noteRef.current !== null) {
      void patchRef.current({ note: noteRef.current.trim() || undefined });
    }
  }, []);

  const removingRef = useRef(false);

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

  async function remove() {
    if (removingRef.current) return;
    removingRef.current = true;
    try {
      // Недописанная заметка не должна лечь поверх удалённой записи
      clearTimeout(noteTimer.current);
      noteRef.current = null;
      await softDelete(DB_TABLE[kind], id);
      navigate(-1);
      toast.show(t('common.deleted'), () => restore(DB_TABLE[kind], id));
    } finally {
      removingRef.current = false;
    }
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
          <NumField
            ref={amountRef}
            variant="hero"
            label={t('common.sum')}
            value={amountDraft ?? tyiynToSomsInput(row.amount)}
            onChange={setAmountDraft}
            onCommit={(v) => {
              setAmountDraft(null);
              const tyiyn = somsToTyiyn(v);
              if (tyiyn > 0 && tyiyn !== row.amount) void patch({ amount: tyiyn });
            }}
            suffix="сом"
            className="-mx-2 mt-1"
            testId="edit-amount"
          />
          <p className="text-[14px] font-medium text-slate-500">{formatDateShort(row.date, lang)}</p>
          {row.note && <p className="mt-2 text-[15px] text-slate-700">{row.note}</p>}
        </Card>
      </div>

      <div className="mx-4">
        <DatePick value={row.date} onChange={(d) => void patch({ date: d })} />
      </div>

      {/* Тип и способ меняются прямо здесь */}
      {kind === 'payout' && (
        <div className="mx-4 flex flex-col gap-2">
          <Segmented
            options={[
              { value: 'payout', label: t('payout.kindPayout') },
              { value: 'advance', label: t('payout.kindAdvance') },
              { value: 'deduction', label: t('payout.kindDeduction') },
            ]}
            value={(row as { kind: 'payout' | 'advance' | 'deduction' }).kind}
            onChange={(v) => void patch({ kind: v })}
          />
          <Segmented
            options={[{ value: 'cash', label: t('payout.cash') }, { value: 'transfer', label: t('payout.transfer') }]}
            value={(row as { method: 'cash' | 'transfer' }).method}
            onChange={(v) => void patch({ method: v })}
          />
        </div>
      )}
      {kind === 'receipt' && (
        <div className="mx-4 flex flex-col gap-2">
          <Segmented
            options={[{ value: 'payment', label: t('receipt.kindPayment') }, { value: 'advance', label: t('receipt.kindAdvance') }]}
            value={((row as { kind?: 'payment' | 'advance' }).kind ?? 'payment')}
            onChange={(v) => void patch({ kind: v })}
          />
          <Segmented
            options={[{ value: 'cash', label: t('payout.cash') }, { value: 'transfer', label: t('payout.transfer') }]}
            value={(row as { method: 'cash' | 'transfer' }).method}
            onChange={(v) => void patch({ method: v })}
          />
        </div>
      )}
      {kind === 'adjustment' && (
        <div className="mx-4">
          <Segmented
            options={[
              { value: 'retention', label: t('adjustment.retention') },
              { value: 'penalty', label: t('adjustment.penalty') },
              { value: 'offset', label: t('adjustment.offset') },
              { value: 'other', label: t('adjustment.other') },
            ]}
            value={(row as { kind: 'retention' | 'penalty' | 'offset' | 'other' }).kind}
            onChange={(v) => void patch({ kind: v })}
          />
        </div>
      )}
      {kind === 'expense' && (
        <div className="mx-4">
          <Segmented
            options={[{ value: 'contractor', label: t('expense.me') }, { value: 'customer', label: t('expense.customer') }]}
            value={(row as { paidBy: 'contractor' | 'customer' }).paidBy}
            onChange={(v) => void patch({ paidBy: v })}
          />
        </div>
      )}

      <div className="mx-4">
        <BigButton label={t('record.editAmount')} tone="neutral" onClick={() => amountRef.current?.open()} testId="edit-amount-btn" />
      </div>

      <input
        className="mx-4 min-h-[56px] rounded-[16px] border-[1.5px] border-line bg-white px-3.5 text-[17px] font-medium"
        placeholder={t('common.note')}
        value={note ?? row.note ?? ''}
        onChange={(e) => onNoteChange(e.target.value)}
      />

      {!row.deletedAt && (
        <div className="mx-4 mt-auto">
          <BigButton label={t('common.delete')} tone="neutral" onClick={() => void remove()} />
        </div>
      )}

    </div>
  );
}
