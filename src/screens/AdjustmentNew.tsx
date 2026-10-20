import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { useActiveObject } from '../lib/hooks';
import { somsToTyiyn } from '../core/format';
import { addAdjustment, hardDelete, todayStr } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumPad } from '../components/NumPad';
import { BigButton } from '../components/BigButton';
import { Segmented } from '../components/Segmented';
import { DatePick } from '../components/DatePick';
import type { AdjustmentKind } from '../db/types';

// Удержание, штраф или взаимозачёт заказчика
export function AdjustmentNew() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const activeObject = useActiveObject();

  const [kind, setKind] = useState<AdjustmentKind>('retention');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');

  async function save() {
    const tyiyn = somsToTyiyn(amount);
    if (tyiyn <= 0 || !activeObject) return;
    const row = await addAdjustment({
      objectId: activeObject.id, date, kind, amount: tyiyn,
      note: note.trim() || undefined,
    });
    navigate(-1);
    toast.show(t('common.saved'), () => hardDelete('adjustments', row.id));
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ScreenHeader title={t('receipt.adjustmentButton')} />
      <div className="flex flex-1 flex-col gap-3 px-4 pb-6 pt-2">
        <p className="text-center">
          <span className="text-[36px] font-bold">{amount || '0'}</span>
          <span className="ml-2 text-[20px] text-slate-500">{t('common.sum')}</span>
        </p>

        <div>
          <p className="pb-1 text-[14px] text-slate-500">{t('adjustment.kind')}</p>
          <Segmented
            options={[
              { value: 'retention', label: t('adjustment.retention') },
              { value: 'penalty', label: t('adjustment.penalty') },
              { value: 'offset', label: t('adjustment.offset') },
              { value: 'other', label: t('adjustment.other') },
            ]}
            value={kind}
            onChange={setKind}
          />
        </div>

        <DatePick value={date} onChange={setDate} />
        <input
          className="min-h-[56px] w-full rounded-2xl border border-slate-200 px-3 text-[18px]"
          placeholder={t('common.note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-auto">
          <NumPad value={amount} onChange={setAmount} />
          <div className="mt-3">
            <BigButton label={t('common.save')} disabled={somsToTyiyn(amount) <= 0} onClick={() => void save()} testId="save-adjustment" />
          </div>
        </div>
      </div>
    </div>
  );
}
