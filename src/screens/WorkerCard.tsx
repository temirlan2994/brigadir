import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useT, useLangStore, formatDateShort, translate } from '../i18n';
import { useEntries, usePayouts, useWorkers, useWorkTypes } from '../lib/hooks';
import {
  activeEntries, accruedForWorker, paidToWorker, withheldFromWorker, workerBalance, notDeleted,
} from '../core/calc';
import { formatMoney, formatMoneyExact, formatQuantity, groupDigits } from '../core/format';
import { updateWorker, nowIso } from '../db/repo';
import { sendText } from '../lib/report';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { Card, SectionTitle, TextField } from '../components/ui';
import { wtLabel } from '../lib/summary';

// Рабочий: осталось выдать, по дням, «Выдать», «Выписка»
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

  interface HistoryRow { date: string; createdAt: string; label: string; sub: string; amount: string; tone: string }
  const history: HistoryRow[] = [];
  for (const e of active) {
    const share = e.shares.find((s) => s.workerId === id);
    if (!share) continue;
    const wt = workTypes.find((w) => w.id === e.workTypeId);
    const others = e.shares.filter((s) => s.workerId !== id).map((s) => workers.find((w) => w.id === s.workerId)?.name).filter(Boolean);
    history.push({
      date: e.date, createdAt: e.createdAt,
      label: `${wtLabel(wt, lang)} · ${formatQuantity(e.quantity)} ${e.unit}`,
      sub: others.length > 0 ? t('worker.with', { names: others.join(', ') }) : '',
      amount: `+${formatMoney(share.amount)}`, tone: 'text-money-in',
    });
  }
  for (const p of notDeleted(payouts).filter((p) => p.workerId === id)) {
    const key = p.kind === 'advance' ? 'feed.advance' : p.kind === 'deduction' ? 'feed.deduction' : 'feed.payout';
    history.push({
      date: p.date, createdAt: p.createdAt, label: t(key),
      sub: [t(p.method === 'cash' ? 'payout.cash' : 'payout.transfer'), p.note].filter(Boolean).join(' · '),
      amount: `−${formatMoney(p.amount)}`, tone: 'text-money-out',
    });
  }
  history.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));

  // Текст выписки на русском: только то, что касается рабочего
  function statementText(): string {
    const rows = history.slice().reverse();
    const from = rows[0]?.date;
    const to = rows[rows.length - 1]?.date;
    const lines: string[] = [worker!.name];
    if (from && to) lines.push(translate('ru', 'statement.period', { from: formatDateShort(from, 'ru'), to: formatDateShort(to, 'ru') }));
    lines.push('', `${translate('ru', 'statement.works')}:`);
    for (const e of active.slice().sort((a, b) => a.date.localeCompare(b.date))) {
      const share = e.shares.find((s) => s.workerId === id);
      if (!share) continue;
      const wt = workTypes.find((w) => w.id === e.workTypeId);
      lines.push(`${formatDateShort(e.date, 'ru')} — ${wt?.nameRu ?? ''}, ${formatQuantity(e.quantity)} ${e.unit} — ${formatMoneyExact(share.amount)}`);
    }
    lines.push('', `${translate('ru', 'statement.payouts')}:`);
    for (const p of notDeleted(payouts).filter((x) => x.workerId === id && x.kind !== 'deduction').sort((a, b) => a.date.localeCompare(b.date))) {
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
    const res = await sendText(worker!.phone, statementText());
    if (res === 'copied') toast.show(t('common.copied'));
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader
        title={worker.name}
        sub={[worker.specialty, worker.phone].filter(Boolean).join(' · ') || undefined}
        right={
          <button className="min-h-[44px] rounded-full bg-white px-3 text-[13px] font-bold shadow-card" onClick={() => {
            setForm({ name: worker.name, specialty: worker.specialty ?? '', phone: worker.phone ?? '' });
            setEditing(true);
          }}>
            {t('common.edit')}
          </button>
        }
      />

      <div className="flex flex-col gap-3 px-4">
        <Card>
          <span className="block text-[14px] font-medium text-slate-500">{balance >= 0 ? t('workers.leftToPayTitle') : t('workers.advanceOverTitle')}</span>
          <span className={`block text-[40px] font-black leading-none tracking-tight ${balance > 0 ? 'text-money-out' : ''}`} data-testid="worker-balance">
            {formatMoney(Math.abs(balance))}
          </span>
          <span className="mt-3 grid grid-cols-3 gap-2">
            <span className="min-w-0"><span className="block text-[12px] font-medium text-slate-500">{t('workers.earned')}</span><span className="block truncate text-[15px] font-extrabold">{groupDigits(Math.round(accrued / 100))}</span></span>
            <span className="min-w-0 text-center"><span className="block text-[12px] font-medium text-slate-500">{t('workers.got')}</span><span className="block truncate text-[15px] font-extrabold">{groupDigits(Math.round(paid / 100))}</span></span>
            <span className="min-w-0 text-right"><span className="block text-[12px] font-medium text-slate-500">{t('workers.withheld')}</span><span className="block truncate text-[15px] font-extrabold">{groupDigits(Math.round(withheld / 100))}</span></span>
          </span>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <BigButton label={t('workers.pay')} tone="dark" onClick={() => navigate(`/payout/new?workerId=${worker.id}`)} />
          <BigButton label={t('workers.statement')} tone="neutral" icon={<Send size={20} className="text-money-in" aria-hidden="true" />} onClick={() => void sendStatement()} testId="statement" />
        </div>

        <SectionTitle>{t('worker.byDays')}</SectionTitle>
        <div className="flex flex-col gap-2">
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 shadow-card">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold">{h.label}</span>
                <span className="block truncate text-[13px] font-medium text-slate-500">{formatDateShort(h.date, lang)}{h.sub ? ` · ${h.sub}` : ''}</span>
              </span>
              <span className={`text-[17px] font-extrabold ${h.tone}`}>{h.amount}</span>
            </div>
          ))}
          {history.length === 0 && <p className="py-4 text-center text-[15px] text-slate-400">{t('common.empty')}</p>}
        </div>

        <button
          className="mt-2 min-h-[44px] text-[15px] font-semibold text-slate-500"
          onClick={() => {
            void updateWorker(worker.id, { archivedAt: worker.archivedAt ? undefined : nowIso() });
            navigate(-1);
          }}
        >
          {worker.archivedAt ? t('workers.unarchive') : t('workers.archive')}
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setEditing(false)}>
          <div className="flex w-full max-w-[430px] flex-col gap-2 rounded-t-[28px] bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <TextField label={t('workers.name')} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <TextField label={t('workers.specialty')} value={form.specialty} onChange={(v) => setForm({ ...form, specialty: v })} />
            <TextField label={t('workers.phone')} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} inputMode="tel" />
            <BigButton
              label={t('common.save')}
              tone="dark"
              disabled={!form.name.trim()}
              onClick={() => {
                void updateWorker(worker.id, {
                  name: form.name.trim(),
                  specialty: form.specialty.trim() || undefined,
                  phone: form.phone.trim() || undefined,
                });
                setEditing(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
