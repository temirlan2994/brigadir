import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Star, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { useT, useLangStore } from '../i18n';
import { useObjects, useSettings, useWorkTypes } from '../lib/hooks';
import { db } from '../db/db';
import {
  addObject, addWorkType, nowIso, updateObject, updateSettings,
  updateWorkType, upsertRate, wipeAll,
} from '../db/repo';
import { ensureSeeded, loadDemo, seedRatesForObject, startFresh, CUSTOM_ICONS } from '../db/seed';
import { exportBackup, importBackup, isBackupFile } from '../db/backup';
import { downloadText } from '../lib/files';
import { somsToTyiyn, tyiynToSomsInput, parseDecimal } from '../core/format';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { NumSheet } from '../components/NumSheet';
import { Icon } from '../icons';
import { wtLabel } from '../lib/summary';
import type { Unit } from '../db/types';

const UNITS: Unit[] = ['м²', 'м³', 'кг', 'т', 'пог. м', 'шт.', 'точка', 'смена', 'час', 'рейс'];

// Настройки: объекты, виды работ, расценки, язык, налог, копия
export function SettingsScreen() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const toast = useToast();
  const settings = useSettings();
  const objects = useObjects();
  const workTypes = useWorkTypes();
  const rates = useLiveQuery(
    () => db.rates.where('objectId').equals(settings.activeObjectId).toArray(),
    [settings.activeObjectId],
  ) ?? [];

  const [objForm, setObjForm] = useState<{ id?: string; name: string; customerName: string } | null>(null);
  const [wtForm, setWtForm] = useState<{ nameRu: string; nameKy: string; icon: string; unit: Unit; area: boolean } | null>(null);
  const [numSheet, setNumSheet] = useState<{ title: string; initial: string; save: (v: string) => void } | null>(null);
  const [withPhotos, setWithPhotos] = useState(false);
  const [wipeInput, setWipeInput] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const section = 'mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm';
  const h2 = 'pb-2 text-[16px] font-bold text-slate-700';
  const enabledTypes = workTypes.filter((w) => !w.archivedAt);

  async function saveObject() {
    if (!objForm) return;
    const name = objForm.name.trim();
    if (!name) return;
    if (objForm.id) {
      await updateObject(objForm.id, { name, customerName: objForm.customerName.trim() || undefined });
    } else {
      const obj = await addObject(name, objForm.customerName.trim() || undefined);
      await seedRatesForObject(obj.id);
      await updateSettings({ activeObjectId: obj.id });
    }
    setObjForm(null);
  }

  async function moveWorkType(id: string, dir: -1 | 1) {
    const list = workTypes;
    const i = list.findIndex((w) => w.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    await updateWorkType(list[i].id, { sortOrder: list[j].sortOrder });
    await updateWorkType(list[j].id, { sortOrder: list[i].sortOrder });
  }

  async function saveCustomWorkType() {
    if (!wtForm || !wtForm.nameRu.trim()) return;
    await addWorkType({
      nameRu: wtForm.nameRu.trim(),
      nameKy: wtForm.nameKy.trim() || wtForm.nameRu.trim(),
      icon: wtForm.icon,
      unit: wtForm.unit,
      calc: wtForm.area ? 'area' : 'none',
      isFavorite: false,
      sortOrder: (workTypes[workTypes.length - 1]?.sortOrder ?? 0) + 1,
    });
    setWtForm(null);
  }

  async function downloadJson() {
    const backup = await exportBackup(withPhotos);
    downloadText('brigadir-backup.json', JSON.stringify(backup, null, 1), 'application/json');
  }

  async function uploadJson(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBackupFile(parsed)) {
        toast.show(t('settings.importError'));
        return;
      }
      if (!window.confirm(t('settings.importConfirm'))) return;
      await importBackup(parsed);
      await ensureSeeded();
      toast.show(t('settings.imported'));
    } catch {
      toast.show(t('settings.importError'));
    }
  }

  async function wipe() {
    await wipeAll();
    await ensureSeeded();
    setWipeInput(null);
    toast.show(t('common.deleted'));
  }

  const rateOf = (workTypeId: string) => rates.find((r) => r.workTypeId === workTypeId);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-8">
      <ScreenHeader title={t('settings.title')} />

      {/* Объекты */}
      <section className={section}>
        <h2 className={h2}>{t('settings.objects')}</h2>
        {objects.map((o) => (
          <div key={o.id} className="flex items-center gap-2 border-b border-slate-100 py-2">
            <button
              className="flex min-h-[48px] flex-1 items-center gap-2 text-left"
              onClick={() => void updateSettings({ activeObjectId: o.id })}
            >
              {o.id === settings.activeObjectId && <Check size={18} className="shrink-0 text-orange-500" aria-hidden="true" />}
              <span className={`text-[16px] ${o.archivedAt ? 'text-slate-400 line-through' : ''}`}>
                {o.name}
                {o.customerName && <span className="text-slate-400"> · {o.customerName}</span>}
              </span>
            </button>
            <button className="min-h-[44px] px-2 text-[14px] text-slate-500" onClick={() => setObjForm({ id: o.id, name: o.name, customerName: o.customerName ?? '' })}>
              {t('settings.rename')}
            </button>
            <button
              className="min-h-[44px] px-2 text-[14px] text-slate-500"
              onClick={() => void updateObject(o.id, { archivedAt: o.archivedAt ? undefined : nowIso() })}
            >
              {o.archivedAt ? t('workers.unarchive') : t('settings.archive')}
            </button>
          </div>
        ))}
        <button className="mt-2 min-h-[48px] w-full rounded-xl bg-slate-100 text-[16px]" onClick={() => setObjForm({ name: '', customerName: '' })}>
          {t('settings.newObject')}
        </button>
        {objects.length === 0 && (
          <button className="mt-2 min-h-[48px] w-full rounded-xl bg-orange-500 text-[16px] font-semibold text-white" onClick={() => void startFresh(t('objects.defaultName'))}>
            {t('home.startClean')}
          </button>
        )}
      </section>

      {/* Виды работ */}
      <section className={section}>
        <h2 className={h2}>{t('settings.workTypes')}</h2>
        {workTypes.map((w) => (
          <div key={w.id} className="flex items-center gap-1.5 border-b border-slate-100 py-1.5">
            <Icon name={w.icon} size={22} className={w.archivedAt ? 'text-slate-300' : 'text-slate-600'} />
            <span className={`flex-1 truncate text-[15px] ${w.archivedAt ? 'text-slate-400' : ''}`}>{wtLabel(w, lang)}</span>
            <button aria-label={t('settings.favorite')} className="min-h-[44px] min-w-[40px]" onClick={() => void updateWorkType(w.id, { isFavorite: !w.isFavorite })}>
              <Star size={20} className={w.isFavorite ? 'fill-orange-400 text-orange-400' : 'text-slate-300'} aria-hidden="true" />
            </button>
            <button aria-label={t('settings.moveUp')} className="min-h-[44px] min-w-[36px] text-slate-400" onClick={() => void moveWorkType(w.id, -1)}>
              <ArrowUp size={18} aria-hidden="true" />
            </button>
            <button aria-label={t('settings.moveDown')} className="min-h-[44px] min-w-[36px] text-slate-400" onClick={() => void moveWorkType(w.id, 1)}>
              <ArrowDown size={18} aria-hidden="true" />
            </button>
            <label className="flex min-h-[44px] items-center" aria-label={t('settings.show')}>
              <input
                type="checkbox"
                className="h-5 w-5 accent-orange-500"
                checked={!w.archivedAt}
                onChange={(e) => void updateWorkType(w.id, { archivedAt: e.target.checked ? undefined : nowIso() })}
              />
            </label>
          </div>
        ))}
        <button className="mt-2 min-h-[48px] w-full rounded-xl bg-slate-100 text-[16px]" onClick={() => setWtForm({ nameRu: '', nameKy: '', icon: 'box', unit: 'шт.', area: false })}>
          {t('settings.customWorkType')}
        </button>
      </section>

      {/* Расценки активного объекта */}
      <section className={section}>
        <h2 className={h2}>{t('settings.rates')} · {objects.find((o) => o.id === settings.activeObjectId)?.name ?? ''}</h2>
        <div className="flex justify-between pb-1 text-[13px] text-slate-400">
          <span>{t('works.filterType')}</span>
          <span>{t('settings.rateCustomer')} / {t('settings.rateWorker')}</span>
        </div>
        {enabledTypes.map((w) => {
          const r = rateOf(w.id);
          return (
            <div key={w.id} className="flex items-center justify-between border-b border-slate-100 py-1.5">
              <span className="flex-1 truncate text-[15px]">{wtLabel(w, lang)} <span className="text-slate-400">({w.unit})</span></span>
              <button
                className="min-h-[44px] rounded-lg bg-slate-50 px-2 text-[15px] font-semibold"
                onClick={() => setNumSheet({
                  title: `${wtLabel(w, lang)} — ${t('wizard.customerPrice')}`,
                  initial: r ? tyiynToSomsInput(r.customerPrice) : '',
                  save: (v) => void upsertRate(settings.activeObjectId, w.id, somsToTyiyn(v), r?.workerPrice ?? 0),
                })}
              >
                {r ? tyiynToSomsInput(r.customerPrice) : '0'}
              </button>
              <span className="px-1 text-slate-300">/</span>
              <button
                className="min-h-[44px] rounded-lg bg-slate-50 px-2 text-[15px] font-semibold"
                onClick={() => setNumSheet({
                  title: `${wtLabel(w, lang)} — ${t('wizard.workerPrice')}`,
                  initial: r ? tyiynToSomsInput(r.workerPrice) : '',
                  save: (v) => void upsertRate(settings.activeObjectId, w.id, r?.customerPrice ?? 0, somsToTyiyn(v)),
                })}
              >
                {r ? tyiynToSomsInput(r.workerPrice) : '0'}
              </button>
            </div>
          );
        })}
      </section>

      {/* Язык, налог, касса */}
      <section className={section}>
        <h2 className={h2}>{t('settings.language')}</h2>
        <Segmented
          options={[{ value: 'ru', label: t('lang.ru') }, { value: 'ky', label: t('lang.ky') }]}
          value={settings.lang}
          onChange={(v) => void updateSettings({ lang: v })}
        />
        <h2 className={`${h2} pt-4`}>{t('settings.tax')}</h2>
        <Segmented
          options={[
            { value: 'none', label: t('settings.taxNone') },
            { value: 'percent', label: t('settings.taxPercent') },
            { value: 'fixedMonthly', label: t('settings.taxFixed') },
          ]}
          value={settings.taxMode}
          onChange={(v) => void updateSettings({ taxMode: v })}
        />
        {settings.taxMode === 'percent' && (
          <button
            className="mt-2 flex min-h-[48px] w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-[16px]"
            onClick={() => setNumSheet({
              title: t('settings.taxPercentValue'),
              initial: String(settings.taxPercent),
              save: (v) => void updateSettings({ taxPercent: parseDecimal(v) }),
            })}
          >
            <span>{t('settings.taxPercentValue')}</span>
            <span className="font-semibold">{settings.taxPercent}%</span>
          </button>
        )}
        {settings.taxMode === 'fixedMonthly' && (
          <button
            className="mt-2 flex min-h-[48px] w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-[16px]"
            onClick={() => setNumSheet({
              title: t('settings.taxFixedValue'),
              initial: tyiynToSomsInput(settings.taxFixedMonthly),
              save: (v) => void updateSettings({ taxFixedMonthly: somsToTyiyn(v) }),
            })}
          >
            <span>{t('settings.taxFixedValue')}</span>
            <span className="font-semibold">{tyiynToSomsInput(settings.taxFixedMonthly)}</span>
          </button>
        )}
        <button
          className="mt-4 flex min-h-[48px] w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-[16px]"
          onClick={() => setNumSheet({
            title: t('settings.openingCash'),
            initial: tyiynToSomsInput(settings.openingCash),
            save: (v) => void updateSettings({ openingCash: somsToTyiyn(v) }),
          })}
        >
          <span>{t('settings.openingCash')}</span>
          <span className="font-semibold">{tyiynToSomsInput(settings.openingCash)}</span>
        </button>
      </section>

      {/* Резервная копия */}
      <section className={section}>
        <h2 className={h2}>{t('settings.backup')}</h2>
        <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
          <input type="checkbox" className="h-5 w-5 accent-orange-500" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} />
          {t('settings.withPhotos')}
        </label>
        <div className="flex gap-2 pt-2">
          <button className="min-h-[52px] flex-1 rounded-xl bg-slate-100 text-[15px] font-semibold" onClick={() => void downloadJson()} data-testid="download-json">
            {t('settings.downloadJson')}
          </button>
          <button className="min-h-[52px] flex-1 rounded-xl bg-slate-100 text-[15px] font-semibold" onClick={() => fileRef.current?.click()} data-testid="upload-json">
            {t('settings.uploadJson')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            data-testid="upload-json-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadJson(f);
              e.target.value = '';
            }}
          />
        </div>
        <button className="mt-3 min-h-[48px] w-full rounded-xl bg-slate-100 text-[15px]" onClick={() => void loadDemo().then(() => toast.show(t('common.saved')))}>
          {t('settings.loadDemo')}
        </button>
        <button className="mt-2 min-h-[48px] w-full rounded-xl text-[15px] text-red-600" onClick={() => setWipeInput('')} data-testid="wipe-all">
          {t('settings.wipe')}
        </button>
      </section>

      {/* Переименование и создание объекта */}
      {objForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setObjForm(null)}>
          <div className="flex w-full max-w-[430px] flex-col gap-2 rounded-t-3xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <input autoFocus className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]" placeholder={t('settings.objectName')} value={objForm.name} onChange={(e) => setObjForm({ ...objForm, name: e.target.value })} />
            <input className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]" placeholder={t('settings.customerName')} value={objForm.customerName} onChange={(e) => setObjForm({ ...objForm, customerName: e.target.value })} />
            <button className="min-h-[56px] rounded-xl bg-orange-500 text-[18px] font-semibold text-white disabled:opacity-40" disabled={!objForm.name.trim()} onClick={() => void saveObject()}>
              {t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Свой вид работы */}
      {wtForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setWtForm(null)}>
          <div className="flex max-h-[85vh] w-full max-w-[430px] flex-col gap-2 overflow-y-auto rounded-t-3xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <input autoFocus className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]" placeholder={t('settings.nameRu')} value={wtForm.nameRu} onChange={(e) => setWtForm({ ...wtForm, nameRu: e.target.value })} />
            <input className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]" placeholder={t('settings.nameKy')} value={wtForm.nameKy} onChange={(e) => setWtForm({ ...wtForm, nameKy: e.target.value })} />
            <p className="pt-1 text-[14px] text-slate-500">{t('settings.icon')}</p>
            <div className="grid grid-cols-6 gap-1.5">
              {CUSTOM_ICONS.map((icon) => (
                <button
                  key={icon}
                  aria-label={icon}
                  className={`flex min-h-[48px] items-center justify-center rounded-xl border ${wtForm.icon === icon ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}
                  onClick={() => setWtForm({ ...wtForm, icon })}
                >
                  <Icon name={icon} size={24} />
                </button>
              ))}
            </div>
            <p className="pt-1 text-[14px] text-slate-500">{t('settings.unit')}</p>
            <select className="min-h-[52px] rounded-xl border border-slate-300 bg-white px-3 text-[17px]" value={wtForm.unit} onChange={(e) => setWtForm({ ...wtForm, unit: e.target.value as Unit })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
              <input type="checkbox" className="h-5 w-5 accent-orange-500" checked={wtForm.area} onChange={(e) => setWtForm({ ...wtForm, area: e.target.checked })} />
              {t('settings.areaCalc')}
            </label>
            <button className="min-h-[56px] rounded-xl bg-orange-500 text-[18px] font-semibold text-white disabled:opacity-40" disabled={!wtForm.nameRu.trim()} onClick={() => void saveCustomWorkType()}>
              {t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Удаление всех данных: двойное подтверждение со словом */}
      {wipeInput !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setWipeInput(null)}>
          <div className="flex w-full max-w-[430px] flex-col gap-2 rounded-t-3xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="text-[18px] font-semibold">{t('settings.wipe')}</p>
            <p className="text-[15px] text-slate-500">{t('settings.wipeConfirm')}</p>
            <input autoFocus className="min-h-[56px] rounded-xl border border-slate-300 px-3 text-[18px]" value={wipeInput} onChange={(e) => setWipeInput(e.target.value)} data-testid="wipe-word" />
            <button
              className="min-h-[56px] rounded-xl bg-red-600 text-[18px] font-semibold text-white disabled:opacity-40"
              disabled={wipeInput.trim().toLowerCase() !== t('settings.wipeWord')}
              onClick={() => void wipe()}
              data-testid="wipe-confirm"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      )}

      {numSheet && (
        <NumSheet title={numSheet.title} initial={numSheet.initial} onSave={numSheet.save} onClose={() => setNumSheet(null)} />
      )}
    </div>
  );
}
