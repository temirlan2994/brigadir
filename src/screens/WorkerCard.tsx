import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useT, useLangStore, formatDateShort, translate } from '../i18n';
import { useEntries, usePayouts, useWorkers, useWorkTypes } from '../lib/hooks';
import {
  activeEntries, accruedForWorker, paidToWorker, withheldFromWorker, workerBalance, notDeleted,
} from '../core/calc';
import { formatMoney, formatMoneyExact, formatQuantity } from '../core/format';
import { updateWorker, nowIso } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { WorkerCircle } from '../components/WorkerCircle';
import { wtLabel } from '../lib/summary';

// Карточка рабочего: суммы, история, выписка
export function WorkerCard() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const { id = '' } = useParams();
  const workers = useWorkers();
  const entries = useEntries();
  const payouts = usePayouts();
  const workTypes = useWorkTypes();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', specialty: '', phone: '' });

  const worker = workers.find((w) => w.id === id);
  if (!worker) return <ScreenHeader title="" />;

  const active = activeEntries(entries);
  const accrued = accruedForWorker(active, id);
  const paid = paidToWorker(payouts, id);
  const withheld = withheldFromWorker(payouts, id);
  const balance = workerBalance(active, payouts, id);

  // История: начисления и выплаты по датам
  interface HistoryRow { date: string; createdAt: string; label: string; amount: string; tone: string }
  const history: HistoryRow[] = [];
  for (const e of active) {
    const share = e.shares.find((s) => s.workerId === id);
    if (!share) continue;
    const wt = workTypes.find((w) => w.id === e.workTypeId);
    history.push({
      date: e.date, createdAt: e.createdAt,
      label: `${wtLabel(wt, lang)} · ${formatQuantity(e.quantity)} ${e.unit}`,
      amount: `+${formatMoney(share.amount)}`, tone: 'text-money-in',
    });
  }
  for (const p of notDeleted(payouts).filter((p) => p.workerId === id)) {
    const key = p.kind === 'advance' ? 'feed.advance' : p.kind === 'deduction' ? 'feed.deduction' : 'feed.payout';
    history.push({
      date: p.date, createdAt: p.createdAt, label: t(key),
      amount: `−${formatMoney(p.amount)}`, tone: 'text-money-out',
    });
  }
  history.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));

  // Текст выписки на русском
  function statementText(): string {
    const rows = history.slice().reverse();
    const from = rows[0]?.date;
    const to = rows[rows.length - 1]?.date;
    const lines: string[] = [worker!.name];
    if (from && to) lines.push(translate('ru', 'statement.period', { from: formatDateShort(from, 'ru'), to: formatDateShort(to, 'ru') }));
    lines.push('', `${translate('ru', 'statement.works')}:`);
    for (const e of active) {
      const share = e.shares.find((s) => s.workerId === id);
      if (!share) continue;
      const wt = workTypes.find((w) => w.id === e.workTypeId);
      lines.push(`${formatDateShort(e.date, 'ru')} — ${wtLabel(wt, 'ru')}, ${formatQuantity(e.quantity)} ${e.unit} — ${formatMoneyExact(share.amount)}`);
    }
    lines.push('', `${translate('ru', 'statement.payouts')}:`);
    for (const p of notDeleted(payouts).filter((x) => x.workerId === id && x.kind !== 'deduction')) {
      lines.push(`${formatDateShort(p.date, 'ru')} — ${translate('ru', p.kind === 'advance' ? 'feed.advance' : 'feed.payout')} — ${formatMoneyExact(p.amount)}`);
    }
    const deductions = notDeleted(payouts).filter((x) => x.workerId === id && x.kind === 'deduction');
    if (deductions.length > 0) {
      lines.push('', `${translate('ru', 'statement.deductions')}:`);
      for (const p of deductions) lines.push(`${formatDateShort(p.date, 'ru')} — ${formatMoneyExact(p.amount)}`);
    }
    lines.push('', translate('ru', 'statement.totalLeft', { sum: formatMoneyExact(balance) }));
    return lines.join('\n');
  }

  async function sendStatement() {
    const text = statementText();
    const digits = (worker!.phone ?? '').replace(/\D/g, '');
    if (digits) {
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      await navigator.clipboard.writeText(text);
      toast.show(t('common.copied'));
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-6">
      <ScreenHeader
        title={worker.name}
        right={
          <button className="min-h-[48px] px-2 text-[16px] text-orange-600" onClick={() => {
            setForm({ name: worker.name, specialty: worker.specialty ?? '', phone: worker.phone ?? '' });
            setEditing(true);
          }}>
            {t('common.edit')}
          </button>
        }
      />

      <div className="flex items-center gap-3 px-4 py-3">
        <WorkerCircle worker={worker} size={56} />
        <div>
          <p className="text-[20px] font-bold">{worker.name}</p>
          {worker.specialty && <p className="text-[14px] text-slate-500">{worker.specialty}</p>}
          {worker.phone && <p className="text-[14px] text-slate-500">{worker.phone}</p>}
        </div>
      </div>

      <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex justify-between py-1 text-[16px]"><span className="text-slate-600">{t('workers.accrued')}</span><span className="font-semibold">{formatMoney(accrued)}</span></div>
        <div className="flex justify-between py-1 text-[16px]"><span className="text-slate-600">{t('workers.paid')}</span><span className="font-semibold">{formatMoney(paid)}</span></div>
        <div className="flex justify-between py-1 text-[16px]"><span className="text-slate-600">{t('workers.withheld')}</span><span className="font-semibold">{formatMoney(withheld)}</span></div>
        <div className="flex justify-between border-t border-slate-100 py-1 pt-2 text-[18px]">
          <span>{t('workers.left')}</span>
          <span className={`font-bold ${balance > 0 ? 'text-money-out' : ''}`} data-testid="worker-balance">{formatMoney(balance)}</span>
        </div>
      </div>

      <div className="flex gap-2 px-4 py-3">
        <button
          className="min-h-[64px] flex-1 rounded-2xl bg-orange-500 text-[18px] font-semibold text-white"
          onClick={() => navigate(`/payout/new?workerId=${worker.id}`)}
        >
          {t('workers.pay')}
        </button>
        <button
          className="min-h-[64px] flex-1 rounded-2xl bg-slate-100 text-[18px] font-semibold"
          onClick={() => void sendStatement()}
          data-testid="statement"
        >
          {t('workers.statement')}
        </button>
      </div>

      <div className="flex flex-col gap-1.5 px-4">
        {history.map((h, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
            <span className="flex-1 truncate text-[15px]">{h.label}</span>
            <span className="px-2 text-[13px] text-slate-400">{formatDateShort(h.date, lang)}</span>
            <span className={`text-[15px] font-semibold ${h.tone}`}>{h.amount}</span>
          </div>
        ))}
      </div>

      <button
        className="mx-4 mt-4 min-h-[48px] rounded-xl text-[16px] text-slate-500"
        onClick={() => {
          void updateWorker(worker.id, { archivedAt: worker.archivedAt ? undefined : nowIso() });
          navigate(-1);
        }}
      >
        {worker.archivedAt ? t('workers.unarchive') : t('workers.archive')}
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setEditing(false)}>
          <div className="flex w-full max-w-[430px] flex-col gap-2 rounded-t-3xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <input className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]" placeholder={t('workers.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]" placeholder={t('workers.specialty')} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
            <input className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]" placeholder={t('workers.phone')} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <button
              className="min-h-[56px] rounded-xl bg-orange-500 text-[18px] font-semibold text-white disabled:opacity-40"
              disabled={!form.name.trim()}
              onClick={() => {
                void updateWorker(worker.id, {
                  name: form.name.trim(),
                  specialty: form.specialty.trim() || undefined,
                  phone: form.phone.trim() || undefined,
                });
                setEditing(false);
              }}
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
