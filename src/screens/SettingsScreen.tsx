import { useRef, useState } from 'react';
import { Star, ArrowUp, ArrowDown } from 'lucide-react';
import { useT, useLangStore } from '../i18n';
import { useSettings, useWorkTypes } from '../lib/hooks';
import { addWorkType, nowIso, updateSettings, updateWorkType, wipeAll } from '../db/repo';
import { ensureSeeded, loadDemo, CUSTOM_ICONS } from '../db/seed';
import { exportBackup, importBackup, isBackupFile } from '../db/backup';
import { downloadText } from '../lib/files';
import { somsToTyiyn, tyiynToSomsInput, parseDecimal } from '../core/format';
import { useToast } from '../state/toast';
import { useSw } from '../state/sw';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { NumSheet } from '../components/NumSheet';
import { BigButton } from '../components/BigButton';
import { Card, SectionTitle, TextField } from '../components/ui';
import { Icon } from '../icons';
import { wtLabel } from '../lib/summary';
import type { Unit } from '../db/types';

const UNITS: Unit[] = ['м²', 'м³', 'кг', 'т', 'пог. м', 'шт.', 'точка', 'смена', 'час', 'рейс'];

// Настройки программы: только про программу. Объекты и цены живут внутри объекта.
export function SettingsScreen() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const toast = useToast();
  const settings = useSettings();
  const workTypes = useWorkTypes();
  const [wtForm, setWtForm] = useState<{ nameRu: string; nameKy: string; icon: string; unit: Unit; area: boolean } | null>(null);
  const [numSheet, setNumSheet] = useState<{ title: string; initial: string; save: (v: string) => void } | null>(null);
  const [withPhotos, setWithPhotos] = useState(false);
  const [wipeInput, setWipeInput] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function moveWorkType(id: string, dir: -1 | 1) {
    const i = workTypes.findIndex((w) => w.id === id);
    const j = i + dir;
    if (j < 0 || j >= workTypes.length) return;
    await updateWorkType(workTypes[i].id, { sortOrder: workTypes[j].sortOrder });
    await updateWorkType(workTypes[j].id, { sortOrder: workTypes[i].sortOrder });
  }

  async function saveCustomWorkType() {
    if (!wtForm || !wtForm.nameRu.trim()) return;
    await addWorkType({
      nameRu: wtForm.nameRu.trim(),
      nameKy: wtForm.nameKy.trim() || wtForm.nameRu.trim(),
      icon: wtForm.icon, unit: wtForm.unit, calc: wtForm.area ? 'area' : 'none',
      isFavorite: false, sortOrder: (workTypes[workTypes.length - 1]?.sortOrder ?? 0) + 1,
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
      if (!isBackupFile(parsed)) { toast.show(t('settings.importError')); return; }
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

  async function checkUpdates() {
    const { reg, needRefresh } = useSw.getState();
    if (needRefresh) return;
    if (!reg) { toast.show(t('update.checkFailed')); return; }
    try { await reg.update(); } catch { toast.show(t('update.checkFailed')); return; }
    if (reg.installing || reg.waiting) { toast.show(t('update.downloading')); return; }
    toast.show(t('update.latest'));
  }

  const rowBtn = 'flex min-h-[52px] w-full items-center justify-between rounded-[14px] bg-paper px-3.5 text-[16px]';

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-8">
      <ScreenHeader title={t('settings.title')} sub={t('settings.programOnly')} />
      <div className="flex flex-col gap-3 px-4">
        <SectionTitle>{t('settings.language')}</SectionTitle>
        <Segmented
          options={[{ value: 'ru', label: t('lang.ru') }, { value: 'ky', label: t('lang.ky') }]}
          value={settings.lang}
          onChange={(v) => void updateSettings({ lang: v })}
        />

        <SectionTitle>{t('settings.money')}</SectionTitle>
        <Card className="flex flex-col gap-2 !p-3">
          <button className={rowBtn} onClick={() => setNumSheet({ title: t('settings.openingCash'), initial: tyiynToSomsInput(settings.openingCash), save: (v) => void updateSettings({ openingCash: somsToTyiyn(v) }) })}>
            <span>{t('settings.openingCash')}</span><b>{tyiynToSomsInput(settings.openingCash)}</b>
          </button>
          <span className="px-1 pt-1 text-[13px] font-semibold text-slate-500">{t('settings.tax')}</span>
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
            <button className={rowBtn} onClick={() => setNumSheet({ title: t('settings.taxPercentValue'), initial: String(settings.taxPercent), save: (v) => void updateSettings({ taxPercent: parseDecimal(v) }) })}>
              <span>{t('settings.taxPercentValue')}</span><b>{settings.taxPercent}%</b>
            </button>
          )}
          {settings.taxMode === 'fixedMonthly' && (
            <button className={rowBtn} onClick={() => setNumSheet({ title: t('settings.taxFixedValue'), initial: tyiynToSomsInput(settings.taxFixedMonthly), save: (v) => void updateSettings({ taxFixedMonthly: somsToTyiyn(v) }) })}>
              <span>{t('settings.taxFixedValue')}</span><b>{tyiynToSomsInput(settings.taxFixedMonthly)}</b>
            </button>
          )}
        </Card>

        <SectionTitle>{t('settings.workTypes')}</SectionTitle>
        <Card className="!p-3">
          <p className="px-1 pb-2 text-[13px] text-slate-500">{t('settings.workTypesHint')}</p>
          <button className={rowBtn} onClick={() => setShowCatalog(!showCatalog)}>
            <span>{t('settings.catalog', { n: workTypes.filter((w) => !w.archivedAt).length })}</span>
            <span className="text-slate-400">{showCatalog ? '▴' : '▾'}</span>
          </button>
          {showCatalog && workTypes.map((w) => (
            <div key={w.id} className="flex items-center gap-1.5 border-b border-[#f0ece3] py-1.5">
              <Icon name={w.icon} size={22} className={w.archivedAt ? 'text-slate-300' : 'text-ink'} />
              <span className={`flex-1 truncate text-[15px] font-semibold ${w.archivedAt ? 'text-slate-400' : ''}`}>{wtLabel(w, lang)}</span>
              <button aria-label={t('settings.favorite')} className="min-h-[44px] min-w-[40px]" onClick={() => void updateWorkType(w.id, { isFavorite: !w.isFavorite })}>
                <Star size={20} className={w.isFavorite ? 'fill-accent text-accent' : 'text-slate-300'} aria-hidden="true" />
              </button>
              <button aria-label={t('settings.moveUp')} className="min-h-[44px] min-w-[36px] text-slate-400" onClick={() => void moveWorkType(w.id, -1)}><ArrowUp size={18} aria-hidden="true" /></button>
              <button aria-label={t('settings.moveDown')} className="min-h-[44px] min-w-[36px] text-slate-400" onClick={() => void moveWorkType(w.id, 1)}><ArrowDown size={18} aria-hidden="true" /></button>
              <label className="flex min-h-[44px] items-center" aria-label={t('settings.show')}>
                <input type="checkbox" className="h-5 w-5 accent-[#17191c]" checked={!w.archivedAt} onChange={(e) => void updateWorkType(w.id, { archivedAt: e.target.checked ? undefined : nowIso() })} />
              </label>
            </div>
          ))}
          <div className="pt-2">
            <BigButton label={t('settings.customWorkType')} tone="neutral" onClick={() => setWtForm({ nameRu: '', nameKy: '', icon: 'box', unit: 'шт.', area: false })} />
          </div>
        </Card>

        <SectionTitle>{t('settings.backup')}</SectionTitle>
        <Card className="flex flex-col gap-2 !p-3">
          <p className="px-1 text-[13px] text-slate-500">{t('settings.backupHint')}</p>
          <label className="flex min-h-[44px] items-center gap-2 px-1 text-[15px]">
            <input type="checkbox" className="h-5 w-5 accent-[#17191c]" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} />
            {t('settings.withPhotos')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <BigButton label={t('settings.downloadJson')} tone="dark" onClick={() => void downloadJson()} testId="download-json" />
            <BigButton label={t('settings.uploadJson')} tone="neutral" onClick={() => fileRef.current?.click()} testId="upload-json" />
          </div>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" data-testid="upload-json-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadJson(f); e.target.value = ''; }} />
        </Card>

        <SectionTitle>{t('settings.about')}</SectionTitle>
        <Card className="flex flex-col gap-2 !p-3">
          <p className="px-1 text-[15px] text-slate-500">{t('settings.version', { v: __APP_VERSION__ })}</p>
          <BigButton label={t('update.check')} tone="neutral" onClick={() => void checkUpdates()} testId="check-updates" />
          <BigButton label={t('settings.loadDemo')} tone="neutral" onClick={() => void loadDemo().then(() => toast.show(t('common.saved')))} />
          <button className="min-h-[48px] text-[15px] font-semibold text-money-out" onClick={() => setWipeInput('')} data-testid="wipe-all">
            {t('settings.wipe')}
          </button>
        </Card>
      </div>

      {wtForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setWtForm(null)}>
          <div className="flex max-h-[85vh] w-full max-w-[430px] flex-col gap-2 overflow-y-auto rounded-t-[28px] bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <TextField label={t('settings.nameRu')} value={wtForm.nameRu} onChange={(v) => setWtForm({ ...wtForm, nameRu: v })} autoFocus />
            <TextField label={t('settings.nameKy')} value={wtForm.nameKy} onChange={(v) => setWtForm({ ...wtForm, nameKy: v })} />
            <p className="pt-1 text-[13px] font-semibold text-slate-500">{t('settings.icon')}</p>
            <div className="grid grid-cols-6 gap-1.5">
              {CUSTOM_ICONS.map((icon) => (
                <button key={icon} aria-label={icon} className={`flex min-h-[48px] items-center justify-center rounded-xl border ${wtForm.icon === icon ? 'border-ink bg-paper' : 'border-line'}`} onClick={() => setWtForm({ ...wtForm, icon })}>
                  <Icon name={icon} size={24} />
                </button>
              ))}
            </div>
            <p className="pt-1 text-[13px] font-semibold text-slate-500">{t('settings.unit')}</p>
            <select className="min-h-[52px] rounded-[14px] border border-line bg-white px-3 text-[17px]" value={wtForm.unit} onChange={(e) => setWtForm({ ...wtForm, unit: e.target.value as Unit })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
              <input type="checkbox" className="h-5 w-5 accent-[#17191c]" checked={wtForm.area} onChange={(e) => setWtForm({ ...wtForm, area: e.target.checked })} />
              {t('settings.areaCalc')}
            </label>
            <BigButton label={t('common.save')} tone="dark" disabled={!wtForm.nameRu.trim()} onClick={() => void saveCustomWorkType()} />
          </div>
        </div>
      )}

      {wipeInput !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setWipeInput(null)}>
          <div className="flex w-full max-w-[430px] flex-col gap-2 rounded-t-[28px] bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="text-[18px] font-extrabold">{t('settings.wipe')}</p>
            <p className="text-[15px] text-slate-500">{t('settings.wipeConfirm')}</p>
            <input autoFocus className="min-h-[56px] rounded-[14px] border border-line px-3 text-[18px]" value={wipeInput} onChange={(e) => setWipeInput(e.target.value)} data-testid="wipe-word" />
            <BigButton label={t('common.delete')} tone="danger" disabled={wipeInput.trim().toLowerCase() !== t('settings.wipeWord')} onClick={() => void wipe()} testId="wipe-confirm" />
          </div>
        </div>
      )}

      {numSheet && <NumSheet title={numSheet.title} initial={numSheet.initial} onSave={numSheet.save} onClose={() => setNumSheet(null)} />}
    </div>
  );
}
