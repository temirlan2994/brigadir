import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { useActiveObject, useEntries, usePayouts, useWorkers } from '../lib/hooks';
import { activeEntries, workerBalance } from '../core/calc';
import { formatMoney, somsToTyiyn, tyiynToSomsInput } from '../core/format';
import { addPayout, hardDelete, todayStr } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumPad } from '../components/NumPad';
import { BigButton } from '../components/BigButton';
import { Segmented } from '../components/Segmented';
import { DatePick } from '../components/DatePick';
import { WorkerCircle } from '../components/WorkerCircle';
import type { PayoutKind, PayMethod } from '../db/types';

// «Выдал рабочим»: выбор рабочего → сумма
export function PayoutNew() {
  const t = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const workers = useWorkers();
  const entries = useEntries();
  const payouts = usePayouts();
  const activeObject = useActiveObject();

  const [workerId, setWorkerId] = useState(params.get('workerId') ?? '');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<PayoutKind>('payout');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');

  const active = activeEntries(entries);
  const worker = workers.find((w) => w.id === workerId);
  const balance = workerId ? workerBalance(active, payouts, workerId) : 0;

  async function save() {
    const tyiyn = somsToTyiyn(amount);
    if (!workerId || tyiyn <= 0) return;
    const row = await addPayout({
      objectId: activeObject?.id, workerId, date, amount: tyiyn,
      method, kind, note: note.trim() || undefined,
    });
    navigate(-1);
    toast.show(t('common.saved'), () => hardDelete('payouts', row.id));
  }

  if (!workerId) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <ScreenHeader title={t('payout.pickWorker')} />
        <div className="flex flex-col gap-2 px-4 py-3">
          {workers.filter((w) => !w.archivedAt).map((w) => {
            const b = workerBalance(active, payouts, w.id);
            return (
              <button
                key={w.id}
                data-testid={`pick-${w.name}`}
                className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-white px-4 shadow-sm"
                onClick={() => setWorkerId(w.id)}
              >
                <WorkerCircle worker={w} size={44} />
                <span className="flex-1 text-left text-[18px]">{w.name}</span>
                <span className={`text-[18px] font-semibold ${b > 0 ? 'text-money-out' : 'text-slate-500'}`}>
                  {formatMoney(b)}
                </span>
              </button>
            );
          })}
          {workers.length === 0 && (
            <p className="py-6 text-center text-[16px] text-slate-400">{t('workers.emptyList')}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ScreenHeader title={`${t('home.paidWorkers')} · ${worker?.name ?? ''}`} onBack={() => (params.get('workerId') ? navigate(-1) : setWorkerId(''))} />
      <div className="flex flex-1 flex-col gap-3 px-4 pb-6 pt-2">
        <p className="text-center">
          <span className="text-[36px] font-bold" data-testid="payout-amount">{amount || '0'}</span>
          <span className="ml-2 text-[20px] text-slate-500">{t('common.sum')}</span>
        </p>

        {balance > 0 && (
          <button
            data-testid="pay-all"
            className="min-h-[48px] rounded-xl bg-slate-100 px-3 text-[16px]"
            onClick={() => setAmount(tyiynToSomsInput(balance))}
          >
            {t('payout.payAll')} · {formatMoney(balance)}
          </button>
        )}

        <Segmented
          options={[
            { value: 'payout', label: t('payout.kindPayout') },
            { value: 'advance', label: t('payout.kindAdvance') },
            { value: 'deduction', label: t('payout.kindDeduction') },
          ]}
          value={kind}
          onChange={setKind}
        />
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
        <div className="mt-auto">
          <NumPad value={amount} onChange={setAmount} />
          <div className="mt-3">
            <BigButton label={t('common.save')} disabled={somsToTyiyn(amount) <= 0} onClick={() => void save()} testId="save-payout" />
          </div>
        </div>
      </div>
    </div>
  );
}
