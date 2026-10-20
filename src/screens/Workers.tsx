import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { useEntries, usePayouts, useWorkers } from '../lib/hooks';
import { activeEntries, workerBalance } from '../core/calc';
import { formatMoney } from '../core/format';
import { addWorker } from '../db/repo';
import { WorkerCircle } from '../components/WorkerCircle';

// Рабочие: карточки с балансом и словом
export function Workers() {
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

  function balanceWord(b: number): { text: string; cls: string } {
    if (b > 0) return { text: t('workers.oweHim'), cls: 'text-money-out' };
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
    <div className="px-4">
      <h1 className="py-4 text-[22px] font-bold">{t('workers.title')}</h1>

      <div className="flex flex-col gap-2">
        {alive.map((w) => {
          const b = workerBalance(active, payouts, w.id);
          const word = balanceWord(b);
          return (
            <button
              key={w.id}
              data-testid={`worker-card-${w.name}`}
              className="flex min-h-[72px] items-center gap-3 rounded-2xl bg-white px-4 py-2 shadow-sm"
              onClick={() => navigate(`/workers/${w.id}`)}
            >
              <WorkerCircle worker={w} size={48} />
              <span className="flex-1 text-left">
                <span className="block text-[18px] font-semibold">{w.name}</span>
                {w.specialty && <span className="block text-[14px] text-slate-500">{w.specialty}</span>}
              </span>
              <span className="text-right">
                <span className={`block text-[20px] font-bold ${word.cls}`}>{formatMoney(Math.abs(b))}</span>
                <span className="block text-[13px] text-slate-500">{word.text}</span>
              </span>
            </button>
          );
        })}
        {alive.length === 0 && !adding && (
          <p className="py-6 text-center text-[16px] text-slate-400">{t('workers.emptyList')}</p>
        )}
      </div>

      {adding ? (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <input
            autoFocus
            data-testid="worker-name-input"
            className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]"
            placeholder={t('workers.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]"
            placeholder={t('workers.specialty')}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
          <button
            data-testid="worker-save"
            className="min-h-[56px] rounded-xl bg-orange-500 text-[18px] font-semibold text-white disabled:opacity-40"
            disabled={!name.trim()}
            onClick={() => void saveWorker()}
          >
            {t('common.save')}
          </button>
        </div>
      ) : (
        <button
          data-testid="worker-add"
          className="mt-3 min-h-[64px] w-full rounded-2xl bg-orange-500 text-[20px] font-semibold text-white"
          onClick={() => setAdding(true)}
        >
          {t('workers.add')}
        </button>
      )}

      {archived.length > 0 && (
        <div className="mt-4 pb-4">
          <button className="min-h-[48px] text-[16px] text-slate-500" onClick={() => setShowArchived(!showArchived)}>
            {t('workers.archived')} ({archived.length})
          </button>
          {showArchived && archived.map((w) => (
            <button
              key={w.id}
              className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2 opacity-70"
              onClick={() => navigate(`/workers/${w.id}`)}
            >
              <WorkerCircle worker={w} size={40} />
              <span className="flex-1 text-left text-[16px]">{w.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
