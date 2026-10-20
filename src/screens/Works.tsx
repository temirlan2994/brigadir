import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useEntries, useObjects, useWorkTypes, useSettings } from '../lib/hooks';
import { activeEntries } from '../core/calc';
import { formatMoney, formatQuantity } from '../core/format';
import { Segmented } from '../components/Segmented';
import { wtLabel } from '../lib/summary';

const PAGE = 50;

// Работы: записи по дням, свежие сверху, фильтры
export function Works() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const entries = useEntries();
  const objects = useObjects();
  const workTypes = useWorkTypes();
  const settings = useSettings();

  const [objectId, setObjectId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [status, setStatus] = useState<'all' | 'notAccepted' | 'accepted'>('all');
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    let rows = activeEntries(entries);
    const obj = objectId || settings.activeObjectId;
    if (obj && objectId !== 'all') rows = rows.filter((e) => e.objectId === obj);
    if (typeId) rows = rows.filter((e) => e.workTypeId === typeId);
    if (status === 'accepted') rows = rows.filter((e) => e.accepted);
    if (status === 'notAccepted') rows = rows.filter((e) => !e.accepted);
    return rows.sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }, [entries, objectId, typeId, status, settings.activeObjectId]);

  const visible = filtered.slice(0, limit);

  // Группировка по дням
  const groups: { date: string; rows: typeof visible }[] = [];
  for (const e of visible) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.rows.push(e);
    else groups.push({ date: e.date, rows: [e] });
  }

  const select = 'min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-2 text-[16px]';

  return (
    <div className="px-4">
      <h1 className="py-4 text-[22px] font-bold">{t('nav.works')}</h1>

      <div className="flex gap-2 pb-2">
        <select className={select} aria-label={t('works.filterObject')} value={objectId} onChange={(e) => setObjectId(e.target.value)}>
          <option value="">{t('works.filterObject')}</option>
          <option value="all">{t('common.all')}</option>
          {objects.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className={select} aria-label={t('works.filterType')} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          <option value="">{t('works.filterType')}</option>
          {workTypes.map((w) => <option key={w.id} value={w.id}>{wtLabel(w, lang)}</option>)}
        </select>
      </div>
      <Segmented
        options={[
          { value: 'all', label: t('common.all') },
          { value: 'notAccepted', label: t('works.statusNotAccepted') },
          { value: 'accepted', label: t('works.statusAccepted') },
        ]}
        value={status}
        onChange={setStatus}
      />

      <div className="flex flex-col gap-2 py-3">
        {groups.map((g) => (
          <div key={g.date}>
            <p className="pb-1 pt-2 text-[14px] font-semibold text-slate-500">{formatDateShort(g.date, lang)}</p>
            <div className="flex flex-col gap-1.5">
              {g.rows.map((e) => {
                const wt = workTypes.find((w) => w.id === e.workTypeId);
                return (
                  <button
                    key={e.id}
                    className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-left shadow-sm"
                    onClick={() => navigate(`/works/${e.id}`)}
                  >
                    <span className="flex-1">
                      <span className="block text-[16px] font-medium">{wtLabel(wt, lang)} · {formatQuantity(e.quantity)} {e.unit}</span>
                      <span className="block text-[14px] text-slate-500">
                        {formatMoney(e.customerTotal)} / {formatMoney(e.workersTotal)}
                      </span>
                    </span>
                    {e.accepted && (
                      <span className="flex items-center gap-1 rounded-lg bg-green-100 px-2 py-0.5 text-[13px] text-green-800">
                        <Check size={14} aria-hidden="true" />
                        {t('works.statusAccepted')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-[16px] text-slate-400">{t('works.emptyList')}</p>
        )}
        {filtered.length > limit && (
          <button className="min-h-[56px] rounded-2xl bg-slate-100 text-[16px]" onClick={() => setLimit(limit + PAGE)}>
            {t('works.showMore')}
          </button>
        )}
      </div>
    </div>
  );
}
