import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useObjectSummary, wtLabel } from '../lib/summary';
import { useWorkTypes, useWorkers } from '../lib/hooks';
import { formatMoney, formatQuantity } from '../core/format';
import { useView } from '../state/view';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { CustomerModeButton } from '../components/CustomerModeButton';

const PAGE = 50;

// Журнал работ объекта по дням
export function ObjectWorks() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const s = useObjectSummary(id);
  const workTypes = useWorkTypes();
  const workers = useWorkers();
  const customerMode = useView((v) => v.customerMode);
  const [status, setStatus] = useState<'all' | 'notAccepted' | 'accepted'>('all');
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    let list = s.active;
    if (status === 'accepted') list = list.filter((e) => e.accepted);
    if (status === 'notAccepted') list = list.filter((e) => !e.accepted);
    return [...list].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }, [s.active, status]);

  const visible = rows.slice(0, limit);
  const groups: { date: string; rows: typeof visible }[] = [];
  for (const e of visible) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.rows.push(e);
    else groups.push({ date: e.date, rows: [e] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader title={t('object.works')} sub={s.object?.name} right={<CustomerModeButton />} />
      <div className="flex flex-col gap-3 px-4">
        <Segmented
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'notAccepted', label: t('works.statusNotAccepted') },
            { value: 'accepted', label: t('works.statusAccepted') },
          ]}
          value={status}
          onChange={setStatus}
        />
        {groups.map((g) => (
          <div key={g.date} className="flex flex-col gap-2">
            <p className="px-1 pt-1 text-[13px] font-extrabold uppercase tracking-wider text-slate-500">{formatDateShort(g.date, lang)}</p>
            {g.rows.map((e) => {
              const wt = workTypes.find((w) => w.id === e.workTypeId);
              const names = e.shares.map((x) => workers.find((w) => w.id === x.workerId)?.name).filter(Boolean).join(', ');
              return (
                <button key={e.id} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 text-left shadow-card" onClick={() => navigate(`/works/${e.id}`)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">{wtLabel(wt, lang)} · {formatQuantity(e.quantity)} {e.unit}</span>
                    <span className="block truncate text-[13px] font-medium text-slate-500">
                      {customerMode ? names : `${formatMoney(e.customerTotal)} / ${formatMoney(e.workersTotal)}${names ? ` · ${names}` : ''}`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[16px] font-extrabold">{formatMoney(e.customerTotal)}</span>
                    {e.accepted && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-money-in">
                        <Check size={14} aria-hidden="true" />
                        {e.acceptedQuantity !== undefined && e.acceptedQuantity < e.quantity
                          ? t('handover.partOf', { a: formatQuantity(e.acceptedQuantity), q: formatQuantity(e.quantity) })
                          : t('works.statusAccepted')}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-[16px] text-slate-400">{t('works.emptyList')}</p>}
        {rows.length > limit && (
          <button className="min-h-[52px] rounded-[16px] bg-white text-[16px] font-semibold shadow-card" onClick={() => setLimit(limit + PAGE)}>
            {t('works.showMore')}
          </button>
        )}
      </div>
    </div>
  );
}
