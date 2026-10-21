import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { useActiveObject } from '../lib/hooks';
import { somsToTyiyn } from '../core/format';
import { addReceipt, hardDelete, todayStr } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumPadPanel } from '../components/NumPadPanel';
import { Segmented } from '../components/Segmented';
import { DatePick } from '../components/DatePick';
import type { PayMethod } from '../db/types';

// «Получил от заказчика»
export function ReceiptNew() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const activeObject = useActiveObject();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');

  async function save() {
    const tyiyn = somsToTyiyn(amount);
    if (tyiyn <= 0 || !activeObject) return;
    const row = await addReceipt({
      objectId: activeObject.id, date, amount: tyiyn,
      method, note: note.trim() || undefined,
    });
    navigate(-1);
    toast.show(t('common.saved'), () => hardDelete('receipts', row.id));
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ScreenHeader title={t('receipt.title')} />
      <div className="flex flex-1 flex-col gap-3 px-4 pt-2">
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
          className="min-h-[56px] w-full rounded-2xl border border-slate-200 px-3 text-[18px]"
          placeholder={t('common.note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button className="min-h-[56px] rounded-2xl bg-slate-100 px-3 text-[16px]" onClick={() => navigate('/accept')} data-testid="to-accept">
          {t('receipt.markAccepted')}
        </button>
        <button className="min-h-[56px] rounded-2xl bg-slate-100 px-3 text-[16px]" onClick={() => navigate('/adjustment/new')} data-testid="to-adjustment">
          {t('receipt.adjustmentButton')}
        </button>

        <NumPadPanel
          label={t('common.sum')}
          value={amount}
          onChange={setAmount}
          action={{ label: t('common.save'), onClick: () => void save(), disabled: somsToTyiyn(amount) <= 0, testId: 'save-receipt' }}
        />
      </div>
    </div>
  );
}
