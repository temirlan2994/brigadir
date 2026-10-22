import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { somsToTyiyn } from '../core/format';
import { addCashMove, hardDelete, todayStr } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumPadPanel } from '../components/NumPadPanel';
import { Segmented } from '../components/Segmented';
import { DatePick } from '../components/DatePick';

// Взял себе / вложил свои — чтобы касса совпадала с карманом
export function CashMoveNew() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [kind, setKind] = useState<'draw' | 'contribution'>(params.get('kind') === 'contribution' ? 'contribution' : 'draw');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');

  const savingRef = useRef(false);

  async function save() {
    const tyiyn = somsToTyiyn(amount);
    if (tyiyn <= 0 || savingRef.current) return;
    savingRef.current = true;
    try {
      const row = await addCashMove({ date, kind, amount: tyiyn, note: note.trim() || undefined });
      navigate(-1);
      toast.show(t('common.saved'), () => hardDelete('cashMoves', row.id));
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScreenHeader title={t(kind === 'draw' ? 'cash.drawTitle' : 'cash.contributionTitle')} />
      <div className="flex flex-1 flex-col gap-3 px-4 pt-1">
        <Segmented
          options={[
            { value: 'draw', label: t('cash.drawTitle') },
            { value: 'contribution', label: t('cash.contributionTitle') },
          ]}
          value={kind}
          onChange={setKind}
        />
        <p className="px-1 text-[14px] text-slate-500">{t(kind === 'draw' ? 'cash.drawHint' : 'cash.contributionHint')}</p>
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
          action={{ label: t('common.save'), onClick: () => void save(), disabled: somsToTyiyn(amount) <= 0, testId: 'save-cashmove' }}
        />
      </div>
    </div>
  );
}
