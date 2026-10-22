import { useMemo, useState } from 'react';
import { Plus, Search, UserRoundSearch } from 'lucide-react';
import { useT } from '../i18n';
import { useCounterparties, useObjects } from '../lib/hooks';
import { formatPhone } from '../core/phone';
import { Sheet } from './Sheet';
import { BigButton } from './BigButton';
import { CounterpartySheet } from './CounterpartySheet';
import { FieldLabel, Initials } from './ui';
import type { Counterparty } from '../db/types';

// Список контрагентов для выбора: поиск, «создать нового»
export function CounterpartyListSheet({ onPick, onNew, onClose }: {
  onPick: (cp: Counterparty) => void;
  onNew: (name: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const all = useCounterparties().filter((c) => !c.archivedAt);
  const objects = useObjects();
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    const digits = q.replace(/\D/g, '');
    return all.filter((c) => c.name.toLowerCase().includes(q)
      || (c.contactName ?? '').toLowerCase().includes(q)
      || (digits.length >= 3 && (c.phone ?? '').includes(digits)));
  }, [all, query]);

  return (
    <Sheet onClose={onClose} title={t('cp.listTitle')} testId="cp-list">
      <BigButton label={t('cp.create')} tone="dark" icon={<Plus size={20} aria-hidden="true" />} onClick={() => onNew(query.trim())} testId="cp-list-new" />
      {all.length > 4 && (
        <label className="flex min-h-[52px] items-center gap-2 rounded-[14px] border-[1.5px] border-line px-3">
          <Search size={18} className="text-slate-400" aria-hidden="true" />
          <input className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" placeholder={t('cp.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}
      <div className="flex flex-col">
        {list.map((c) => {
          const n = objects.filter((o) => o.counterpartyId === c.id).length;
          return (
            <button key={c.id} className="flex min-h-[64px] items-center gap-3 border-b border-[#f0ece3] px-1 py-2 text-left" onClick={() => onPick(c)} data-testid={`cp-option-${c.name}`}>
              <Initials name={c.name} size={42} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-bold">{c.name}</span>
                <span className="block truncate text-[13px] font-medium text-slate-500">
                  {[c.contactName, formatPhone(c.phone), n > 0 ? t('cp.objectsCount', { n }) : undefined].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          );
        })}
        {all.length === 0 && <p className="py-6 text-center text-[15px] text-slate-400">{t('cp.empty')}</p>}
      </div>
    </Sheet>
  );
}

// Заказчик объекта: карточка выбранного или две кнопки — «Выбрать контрагента» и «Создать контрагента»
export function CounterpartyPicker({ value, onChange, label }: {
  value: string | undefined;
  onChange: (cp: Counterparty | undefined) => void;
  label?: string;
}) {
  const t = useT();
  const counterparties = useCounterparties();
  const cp = counterparties.find((c) => c.id === value);
  const [mode, setMode] = useState<null | 'list' | 'new' | 'edit'>(null);
  const [newName, setNewName] = useState('');

  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      {cp ? (
        <div className="rounded-[18px] border-[1.5px] border-ink bg-white p-3" data-testid="cp-selected">
          <div className="flex items-center gap-3">
            <Initials name={cp.name} size={44} dark />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[18px] font-extrabold">{cp.name}</span>
              <span className="block truncate text-[13px] font-medium text-slate-500">
                {[t(cp.kind === 'company' ? 'cp.company' : 'cp.person'), cp.contactName, formatPhone(cp.phone)].filter(Boolean).join(' · ')}
              </span>
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button type="button" className="min-h-[44px] rounded-[12px] bg-paper text-[15px] font-bold" onClick={() => setMode('edit')} data-testid="cp-edit">
              {t('cp.edit')}
            </button>
            <button type="button" className="min-h-[44px] rounded-[12px] bg-paper text-[15px] font-bold" onClick={() => setMode('list')} data-testid="cp-change">
              {t('cp.change')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-[16px] border-[1.5px] border-line bg-white px-2 text-[15px] font-bold leading-tight"
            onClick={() => setMode('list')}
            data-testid="cp-pick"
          >
            <UserRoundSearch size={20} aria-hidden="true" />
            {t('cp.pick')}
          </button>
          <button
            type="button"
            className="flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-[16px] bg-dark px-2 text-[15px] font-bold leading-tight text-white"
            onClick={() => { setNewName(''); setMode('new'); }}
            data-testid="cp-new"
          >
            <Plus size={20} aria-hidden="true" />
            {t('cp.create')}
          </button>
        </div>
      )}

      {mode === 'list' && (
        <CounterpartyListSheet
          onPick={(c) => { onChange(c); setMode(null); }}
          onNew={(name) => { setNewName(name); setMode('new'); }}
          onClose={() => setMode(null)}
        />
      )}
      {mode === 'new' && (
        <CounterpartySheet initialName={newName} onClose={() => setMode(null)} onSaved={(c) => { onChange(c); setMode(null); }} />
      )}
      {mode === 'edit' && cp && (
        <CounterpartySheet initial={cp} onClose={() => setMode(null)} onSaved={(c) => { onChange(c); setMode(null); }} />
      )}
    </div>
  );
}
