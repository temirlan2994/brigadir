import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useT } from '../i18n';
import { useEntries, usePayouts, useWorkers } from '../lib/hooks';
import { activeEntries, workerBalance, owedToWorkers } from '../core/calc';
import { formatMoney } from '../core/format';
import { addWorker } from '../db/repo';
import { WorkerCircle } from '../components/WorkerCircle';
import { BigButton } from '../components/BigButton';
import { DarkCard, TextField } from '../components/ui';

// Бригада: кому сколько должен; «Рассчитаться»; добавить человека
export function Team() {
  const t = useT();
  const navigate = useNavigate();
  const workers = useWorkers();
  const entries = useEntries();
  const payouts = usePayouts();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const active = activeEntries(entries);
  const alive = workers.filter((w) => !w.archivedAt);
  const archived = workers.filter((w) => w.archivedAt);
  const owed = owedToWorkers(active, payouts);

  function balanceWord(b: number): { text: string; cls: string } {
    if (b > 0) return { text: t('workers.leftToPay'), cls: 'text-money-out' };
    if (b < 0) return { text: t('workers.advanceOver'), cls: 'text-slate-500' };
    return { text: t('workers.settled'), cls: 'text-slate-500' };
  }

  async function saveWorker() {
    const n = name.trim();
    if (!n) return;
    await addWorker(n, specialty.trim() || undefined);
    setName('');
    setSpecialty('');
    setAdding(false);
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex items-baseline justify-between py-4">
        <h1 className="text-[24px] font-extrabold">{t('nav.team')}</h1>
        <span className="text-[14px] font-medium text-slate-500">{t('team.count', { n: alive.length })}</span>
      </div>

      <div className="flex flex-col gap-3">
        {alive.length > 0 && (
          <DarkCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[14px] font-medium text-white/65">{t('today.oweTeam')}</span>
                <span className="mt-1 block text-[34px] font-black leading-none" data-testid="owed-to-workers">{formatMoney(owed)}</span>
              </div>
              <button className="min-h-[48px] rounded-[14px] bg-accent px-4 text-[15px] font-bold text-ink" onClick={() => navigate('/payout/new')} data-testid="btn-payout">
                {t('team.settle')}
              </button>
            </div>
          </DarkCard>
        )}

        {alive.map((w) => {
          const b = workerBalance(active, payouts, w.id);
          const word = balanceWord(b);
          return (
            <button
              key={w.id}
              data-testid={`worker-card-${w.name}`}
              className="flex min-h-[72px] items-center gap-3 rounded-[18px] bg-white px-4 py-3 shadow-card"
              onClick={() => navigate(`/team/${w.id}`)}
            >
              <WorkerCircle worker={w} size={46} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[17px] font-bold">{w.name}</span>
                {w.specialty && <span className="block text-[13px] font-medium text-slate-500">{w.specialty}</span>}
              </span>
              <span className="text-right">
                <span className={`block text-[19px] font-extrabold ${word.cls}`}>{formatMoney(Math.abs(b))}</span>
                <span className="block text-[12px] font-medium text-slate-500">{word.text}</span>
              </span>
            </button>
          );
        })}

        {alive.length === 0 && !adding && (
          <p className="py-6 text-center text-[16px] text-slate-500">{t('workers.emptyList')}</p>
        )}

        {adding ? (
          <div className="flex flex-col gap-2 rounded-[18px] bg-white p-3 shadow-card">
            <TextField label={t('workers.name')} value={name} onChange={setName} autoFocus testId="worker-name-input" />
            <TextField label={t('workers.specialty')} value={specialty} onChange={setSpecialty} />
            <BigButton label={t('common.save')} tone="dark" disabled={!name.trim()} onClick={() => void saveWorker()} testId="worker-save" />
          </div>
        ) : (
          <BigButton label={t('team.add')} tone="neutral" icon={<Plus size={20} aria-hidden="true" />} onClick={() => setAdding(true)} testId="worker-add" />
        )}

        {archived.length > 0 && (
          <div className="pt-2">
            <button className="min-h-[44px] text-[15px] font-semibold text-slate-500" onClick={() => setShowArchived(!showArchived)}>
              {t('workers.archived')} ({archived.length})
            </button>
            {showArchived && archived.map((w) => (
              <button key={w.id} className="mt-2 flex min-h-[60px] w-full items-center gap-3 rounded-[16px] bg-[#ece8df] px-4 opacity-80" onClick={() => navigate(`/team/${w.id}`)}>
                <WorkerCircle worker={w} size={38} />
                <span className="flex-1 text-left text-[16px] font-semibold">{w.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
