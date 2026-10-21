import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { useActiveObject, useObject } from '../lib/hooks';
import { somsToTyiyn } from '../core/format';
import { addReceipt, hardDelete, todayStr } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumPadPanel } from '../components/NumPadPanel';
import { Segmented } from '../components/Segmented';
import { DatePick } from '../components/DatePick';
import type { PayMethod } from '../db/types';

// «Получил от заказчика»: оплата по акту или аванс
export function ReceiptNew() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const activeObject = useActiveObject();
  const paramObject = useObject(params.get('objectId') ?? undefined);
  const object = paramObject ?? activeObject;

  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'payment' | 'advance'>('payment');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');

  async function save() {
    const tyiyn = somsToTyiyn(amount);
    if (tyiyn <= 0 || !object) return;
    const row = await addReceipt({ objectId: object.id, date, amount: tyiyn, method, kind, note: note.trim() || undefined });
    navigate(-1);
    toast.show(t('common.saved'), () => hardDelete('receipts', row.id));
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScreenHeader title={t('receipt.title')} sub={object?.customerName ?? object?.name} />
      <div className="flex flex-1 flex-col gap-3 px-4 pt-1">
        <Segmented
          options={[
            { value: 'payment', label: t('receipt.kindPayment') },
            { value: 'advance', label: t('receipt.kindAdvance') },
          ]}
          value={kind}
          onChange={setKind}
        />
        {kind === 'advance' && <p className="px-1 text-[14px] text-slate-500">{t('receipt.advanceHint')}</p>}
        <Segmented
          options={[
            { value: 'cash', label: t('payout.cash') },
            { value: 'transfer', label: t('payout.transfer') },
          ]}
          value={method}
          onChange={setMethod}
        />
        <DatePick value={date} onChange={setDate} />
        <input
          className="min-h-[56px] w-full rounded-[16px] border-[1.5px] border-line bg-white px-3.5 text-[17px] font-medium"
          placeholder={t('common.note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <NumPadPanel
          label={t('common.sum')}
          value={amount}
          onChange={setAmount}
          action={{ label: t('common.save'), onClick: () => void save(), disabled: somsToTyiyn(amount) <= 0 || !object, testId: 'save-receipt' }}
        />
      </div>
    </div>
  );
}
