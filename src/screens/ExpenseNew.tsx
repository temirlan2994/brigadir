import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { useActiveObject } from '../lib/hooks';
import { somsToTyiyn } from '../core/format';
import { addExpense, hardDelete, todayStr } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumPadPanel } from '../components/NumPadPanel';
import { AmountHero } from '../components/AmountHero';
import { Segmented } from '../components/Segmented';
import { DatePick } from '../components/DatePick';
import { Tile } from '../components/Tile';
import { PhotoPicker } from '../components/PhotoPicker';
import { EXPENSE_ICONS } from '../icons';
import type { ExpenseCategory } from '../db/types';

const CATEGORIES: ExpenseCategory[] = ['transport', 'fuel', 'tools', 'food', 'housing', 'materials', 'rent', 'other'];

// «Потратил»: категория → сумма
export function ExpenseNew() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const activeObject = useActiveObject();

  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<'contractor' | 'customer'>('contractor');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [photoIds, setPhotoIds] = useState<string[]>([]);

  const savingRef = useRef(false);

  async function save() {
    const tyiyn = somsToTyiyn(amount);
    if (!category || tyiyn <= 0 || !activeObject || savingRef.current) return;
    savingRef.current = true;
    try {
      const row = await addExpense({
        objectId: activeObject.id, date, category, amount: tyiyn,
        paidBy, note: note.trim() || undefined, photoIds,
      });
      navigate(-1);
      toast.show(t('common.saved'), () => hardDelete('expenses', row.id));
    } finally {
      savingRef.current = false;
    }
  }

  if (!category) {
    return (
      <div className="flex min-h-screen flex-col bg-paper">
        <ScreenHeader title={t('expense.pickCategory')} />
        <div className="grid grid-cols-2 gap-3 px-4 py-3">
          {CATEGORIES.map((c) => (
            <Tile key={c} icon={EXPENSE_ICONS[c]} label={t(`expense.${c}`)} onClick={() => setCategory(c)} testId={`cat-${c}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScreenHeader title={`${t('home.spent')} · ${t(`expense.${category}`)}`} onBack={() => setCategory('')} />
      <div className="flex flex-1 flex-col gap-3 px-4 pt-2">
        <AmountHero label={t('common.sum')} value={amount} suffix="сом" />
        <div>
          <p className="pb-1 text-[14px] text-slate-500">{t('expense.whoPays')}</p>
          <Segmented
            options={[
              { value: 'contractor', label: t('expense.me') },
              { value: 'customer', label: t('expense.customer') },
            ]}
            value={paidBy}
            onChange={setPaidBy}
          />
          {paidBy === 'customer' && (
            <p className="pt-1 text-[14px] text-slate-500">{t('expense.customerHint')}</p>
          )}
        </div>

        <DatePick value={date} onChange={setDate} />
        <PhotoPicker photoIds={photoIds} onChange={setPhotoIds} label={t('expense.receiptPhoto')} />
        <input
          className="min-h-[56px] w-full rounded-2xl border border-slate-200 px-3 text-[18px]"
          placeholder={t('common.note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <NumPadPanel
          value={amount}
          onChange={setAmount}
          action={{ label: t('common.save'), onClick: () => void save(), disabled: somsToTyiyn(amount) <= 0 || !activeObject, testId: 'save-expense' }}
        />
      </div>
    </div>
  );
}
