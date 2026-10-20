import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useEntries, useWorkers, useWorkTypes } from '../lib/hooks';
import { formatMoney, formatQuantity } from '../core/format';
import { acceptWorkEntries, restore, softDelete, unacceptWorkEntry } from '../db/repo';
import { db } from '../db/db';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { wtLabel } from '../lib/summary';
import type { WorkEntry } from '../db/types';

// Карточка записи работы: правка, удаление, приёмка, фото, история версий
export function WorkEntryCard() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const { id = '' } = useParams();
  const entries = useEntries();
  const workTypes = useWorkTypes();
  const workers = useWorkers();
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const entry = entries.find((e) => e.id === id);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!entry) return;
      const urls: string[] = [];
      for (const pid of entry.photoIds) {
        const photo = await db.photos.get(pid);
        if (photo) urls.push(URL.createObjectURL(photo.blob));
      }
      if (!cancelled) setPhotoUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [entry]);

  if (!entry) return <ScreenHeader title="" />;

  const wt = workTypes.find((w) => w.id === entry.workTypeId);
  const supersededBy = entries.find((e) => e.supersedesId === entry.id && !e.deletedAt);

  // Цепочка версий вниз от текущей
  const versions: WorkEntry[] = [];
  let cursor: WorkEntry | undefined = entry;
  while (cursor?.supersedesId) {
    cursor = entries.find((e) => e.id === cursor!.supersedesId);
    if (cursor) versions.push(cursor);
  }

  async function remove() {
    await softDelete('workEntries', entry!.id);
    navigate(-1);
    toast.show(t('common.deleted'), () => restore('workEntries', entry!.id));
  }

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-slate-50 pb-6">
      <ScreenHeader title={wtLabel(wt, lang)} />

      {entry.deletedAt && (
        <div className="mx-4 rounded-xl bg-slate-200 px-4 py-3 text-[16px]">
          {t('common.deletedMark')}
          <button className="ml-3 font-semibold text-orange-600" onClick={() => void restore('workEntries', entry.id)}>
            {t('common.restore')}
          </button>
        </div>
      )}
      {supersededBy && (
        <button className="mx-4 rounded-xl bg-amber-100 px-4 py-3 text-left text-[15px]" onClick={() => navigate(`/works/${supersededBy.id}`, { replace: true })}>
          {t('works.version', { n: supersededBy.version })} →
        </button>
      )}

      <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[22px] font-bold">{formatQuantity(entry.quantity)} {entry.unit}</p>
        <p className="text-[14px] text-slate-500">{formatDateShort(entry.date, lang)} · {t('works.version', { n: entry.version })}</p>
        <div className="mt-2 flex justify-between text-[16px]">
          <span className="text-slate-600">{t('wizard.customerTotal')}</span>
          <span className="font-semibold text-money-in">{formatMoney(entry.customerTotal)}</span>
        </div>
        <div className="flex justify-between text-[16px]">
          <span className="text-slate-600">{t('wizard.workersTotal')}</span>
          <span className="font-semibold text-money-out">{formatMoney(entry.workersTotal)}</span>
        </div>
        <div className="flex justify-between text-[16px]">
          <span className="text-slate-600">{t('wizard.diff')}</span>
          <span className="font-semibold">{formatMoney(entry.customerTotal - entry.workersTotal)}</span>
        </div>
        {entry.accepted && (
          <p className="mt-2 flex items-center gap-1 text-[15px] text-green-700">
            <Check size={16} aria-hidden="true" /> {t('works.statusAccepted')}
          </p>
        )}
        {entry.note && <p className="mt-2 text-[15px] text-slate-600">{entry.note}</p>}
      </div>

      <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="pb-1 text-[14px] text-slate-500">{t('wizard.whoHowMuch')}</p>
        {entry.shares.map((s) => (
          <div key={s.workerId} className="flex justify-between py-1 text-[16px]">
            <span>{workers.find((w) => w.id === s.workerId)?.name}</span>
            <span className="font-semibold">{formatMoney(s.amount)}</span>
          </div>
        ))}
      </div>

      {photoUrls.length > 0 && (
        <div className="mx-4 flex flex-wrap gap-2">
          {photoUrls.map((u, i) => <img key={i} src={u} alt={t('common.photo')} className="h-24 w-24 rounded-xl object-cover" />)}
        </div>
      )}

      {!entry.deletedAt && !supersededBy && (
        <div className="mx-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              className="min-h-[56px] flex-1 rounded-2xl bg-orange-500 text-[17px] font-semibold text-white"
              onClick={() => navigate('/work/new', { state: { editId: entry.id } })}
              data-testid="edit-entry"
            >
              {t('common.edit')}
            </button>
            <button
              className="min-h-[56px] flex-1 rounded-2xl bg-slate-100 text-[17px] font-semibold"
              onClick={() => {
                if (entry.accepted) void unacceptWorkEntry(entry.id);
                else void acceptWorkEntries([entry.id]);
              }}
              data-testid="toggle-accept"
            >
              {entry.accepted ? t('works.unaccept') : t('works.accept')}
            </button>
          </div>
          <button className="min-h-[48px] rounded-2xl text-[16px] text-red-600" onClick={() => void remove()} data-testid="delete-entry">
            {t('common.delete')}
          </button>
        </div>
      )}

      {versions.length > 0 && (
        <div className="mx-4">
          <button className="min-h-[48px] text-[15px] text-slate-500" onClick={() => setShowVersions(!showVersions)}>
            {t('works.versions')} ({versions.length})
          </button>
          {showVersions && versions.map((v) => (
            <div key={v.id} className="flex justify-between rounded-xl bg-slate-100 px-3 py-2 text-[15px] opacity-80">
              <span>{t('works.version', { n: v.version })} · {formatQuantity(v.quantity)} {v.unit}</span>
              <span>{formatMoney(v.customerTotal)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
