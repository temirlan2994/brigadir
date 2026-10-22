import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { useActiveObject, useObject } from '../lib/hooks';
import { useObjectSummary } from '../lib/summary';
import { formatMoney, somsToTyiyn, tyiynToSomsInput } from '../core/format';
import { addReceipt, hardDelete, todayStr } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumPadPanel } from '../components/NumPadPanel';
import { AmountHero } from '../components/AmountHero';
import { Segmented } from '../components/Segmented';
import { DatePick } from '../components/DatePick';
import type { PayMethod } from '../db/types';

// «Получил от заказчика»: оплата или аванс; если есть график — подсказка, какую часть ждём
export function ReceiptNew() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const activeObject = useActiveObject();
  const paramObject = useObject(params.get('objectId') ?? undefined);
  const object = paramObject ?? activeObject;
  const s = useObjectSummary(object?.id);

  const [amount, setAmount] = useState('');
  // Подставленная сумма выделена: первая цифра её заменит
  const [fresh, setFresh] = useState(false);
  const [kind, setKind] = useState<'payment' | 'advance'>('payment');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');

  // Часть графика: та, что выбрали «Получил» в графике, иначе следующая неоплаченная
  const partId = params.get('partId');
  const expected = (partId ? s.statuses.find((x) => x.part.id === partId) : undefined) ?? s.next;
  const suggestion = expected && expected.left > 0 ? expected : undefined;

  function applySuggestion() {
    if (!suggestion) return;
    setAmount(tyiynToSomsInput(suggestion.left));
    setFresh(true);
    setKind(suggestion.part.trigger === 'start' ? 'advance' : 'payment');
    if (!note.trim()) setNote(suggestion.part.title);
  }

  // Пришли из графика по конкретной части — сразу её сумма
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || !partId || !suggestion) return;
    applied.current = true;
    applySuggestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId, suggestion]);

  const savingRef = useRef(false);

  async function save() {
    const tyiyn = somsToTyiyn(amount);
    if (tyiyn <= 0 || !object || savingRef.current) return;
    savingRef.current = true;
    try {
      const row = await addReceipt({ objectId: object.id, date, amount: tyiyn, method, kind, note: note.trim() || undefined });
      navigate(-1);
      toast.show(t('common.saved'), () => hardDelete('receipts', row.id));
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScreenHeader title={t('receipt.title')} sub={object?.customerName ?? object?.name} />
      <div className="flex flex-1 flex-col gap-3 px-4 pt-1">
        <AmountHero label={t('common.sum')} value={amount} suffix="сом" fresh={fresh} />
        {suggestion && (
          <button
            type="button"
            className="flex min-h-[52px] items-center justify-between gap-2 rounded-[16px] bg-[#fff6d6] px-4 text-left"
            onClick={applySuggestion}
            data-testid="receipt-suggestion"
          >
            <span className="min-w-0 text-[15px] font-semibold text-[#7a5a00]">
              {t('plan.expect', { title: suggestion.part.title, sum: formatMoney(suggestion.left) })}
            </span>
            <span className="shrink-0 rounded-[10px] bg-white px-3 py-1.5 text-[14px] font-bold">{t('plan.insert')}</span>
          </button>
        )}
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
          value={amount}
          onChange={setAmount}
          fresh={fresh}
          onFreshUsed={() => setFresh(false)}
          action={{ label: t('common.save'), onClick: () => void save(), disabled: somsToTyiyn(amount) <= 0 || !object, testId: 'save-receipt' }}
        />
      </div>
    </div>
  );
}
