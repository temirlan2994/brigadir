import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useEntries, useWorkers, useWorkTypes } from '../lib/hooks';
import { formatMoney, formatQuantity } from '../core/format';
import { acceptWorkEntries, restore, softDelete, unacceptWorkEntry } from '../db/repo';
import { db } from '../db/db';
import { useToast } from '../state/toast';
import { useView } from '../state/view';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { Card, KvRow, Pill } from '../components/ui';
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
  const customerMode = useView((v) => v.customerMode);
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
  const isPartial = entry.accepted && entry.acceptedQuantity !== undefined && entry.acceptedQuantity < entry.quantity;

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
    <div className="flex min-h-screen flex-col gap-3 bg-paper pb-6">
      <ScreenHeader title={wtLabel(wt, lang)} sub={`${formatDateShort(entry.date, lang)} · ${t('works.version', { n: entry.version })}`} />

      {entry.deletedAt && (
        <div className="mx-4 flex items-center justify-between rounded-[14px] bg-[#ece8df] px-4 py-3 text-[15px] font-semibold">
          {t('common.deletedMark')}
          <button className="font-bold underline" onClick={() => void restore('workEntries', entry.id)}>{t('common.restore')}</button>
        </div>
      )}
      {supersededBy && (
        <button className="mx-4 rounded-[14px] bg-[#fff1d6] px-4 py-3 text-left text-[15px] font-semibold text-[#92400e]" onClick={() => navigate(`/works/${supersededBy.id}`, { replace: true })}>
          {t('works.newerVersion', { n: supersededBy.version })} →
        </button>
      )}

      <div className="mx-4 flex flex-col gap-3">
        <Card>
          <p className="text-[32px] font-black tracking-tight">{formatQuantity(entry.quantity)} <span className="text-[20px] font-bold text-slate-500">{entry.unit}</span></p>
          <KvRow label={t('wizard.customerTotal')} value={formatMoney(entry.customerTotal)} tone="in" />
          {!customerMode && <KvRow label={t('wizard.workersTotal')} value={formatMoney(entry.workersTotal)} tone="out" />}
          {!customerMode && <KvRow label={t('wizard.diff')} value={formatMoney(entry.customerTotal - entry.workersTotal)} strong />}
          <div className="pt-2">
            {entry.accepted ? (
              <Pill tone="green"><Check size={14} aria-hidden="true" /> {isPartial ? t('handover.partOf', { a: formatQuantity(entry.acceptedQuantity!), q: formatQuantity(entry.quantity) }) : t('works.statusAccepted')}</Pill>
            ) : (
              <Pill tone="grey">{t('works.statusNotAccepted')}</Pill>
            )}
          </div>
          {entry.note && <p className="mt-2 text-[15px] text-slate-700">{entry.note}</p>}
          {entry.acceptNote && <p className="mt-1 text-[14px] text-slate-500">{entry.acceptNote}</p>}
        </Card>

        {!customerMode && (
          <Card>
            <p className="pb-1 text-[13px] font-semibold text-slate-500">{t('wizard.whoHowMuch')}</p>
            {entry.shares.map((s) => (
              <div key={s.workerId} className="flex justify-between py-1 text-[16px]">
                <span className="font-semibold">{workers.find((w) => w.id === s.workerId)?.name}</span>
                <span className="font-bold">{formatMoney(s.amount)}</span>
              </div>
            ))}
          </Card>
        )}

        {photoUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photoUrls.map((u, i) => <img key={i} src={u} alt={t('common.photo')} className="h-24 w-24 rounded-[14px] object-cover" />)}
          </div>
        )}

        {!entry.deletedAt && !supersededBy && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <BigButton label={t('common.edit')} tone="dark" onClick={() => navigate('/work/new', { state: { editId: entry.id } })} testId="edit-entry" />
              <BigButton
                label={entry.accepted ? t('works.unaccept') : t('works.accept')}
                tone="neutral"
                onClick={() => { if (entry.accepted) void unacceptWorkEntry(entry.id); else void acceptWorkEntries([entry.id]); }}
                testId="toggle-accept"
              />
            </div>
            <button className="min-h-[44px] text-[15px] font-semibold text-money-out" onClick={() => void remove()} data-testid="delete-entry">
              {t('common.delete')}
            </button>
          </div>
        )}

        {versions.length > 0 && (
          <div>
            <button className="min-h-[44px] text-[14px] font-semibold text-slate-500" onClick={() => setShowVersions(!showVersions)}>
              {t('works.versions')} ({versions.length})
            </button>
            {showVersions && versions.map((v) => (
              <div key={v.id} className="mt-1 flex justify-between rounded-[12px] bg-[#ece8df] px-3 py-2 text-[14px] opacity-80">
                <span>{t('works.version', { n: v.version })} · {formatQuantity(v.quantity)} {v.unit}</span>
                <span>{formatMoney(v.customerTotal)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
