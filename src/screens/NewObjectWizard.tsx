import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { useT, useLangStore } from '../i18n';
import { useWorkers, useWorkTypes } from '../lib/hooks';
import { WORK_TYPE_SEED } from '../db/seed';
import { addObject, addReceipt, addWorker, todayStr, updateSettings, upsertRate } from '../db/repo';
import { somsToTyiyn } from '../core/format';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { NumSheet } from '../components/NumSheet';
import { TextField } from '../components/ui';
import { WorkerCircle } from '../components/WorkerCircle';
import { wtLabel } from '../lib/summary';

const STEPS = ['object', 'prices', 'team'] as const;

interface PriceRow { workTypeId: string; on: boolean; customer: string; worker: string }

// Взял объект → о каких ценах договорились → кто в бригаде. Один раз на объект.
export function NewObjectWizard() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const step = Math.min(2, Math.max(0, Number(params.get('step') ?? '0') || 0));
  const workTypes = useWorkTypes();
  const workers = useWorkers();

  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [terms, setTerms] = useState('');
  const [advance, setAdvance] = useState('');
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [newNames, setNewNames] = useState<string[]>([]);
  const [draftName, setDraftName] = useState('');
  const [sheet, setSheet] = useState<{ title: string; initial: string; save: (v: string) => void } | null>(null);
  const [saving, setSaving] = useState(false);

  // Цены по умолчанию из справочника; популярные виды отмечены заранее
  useEffect(() => {
    if (prices.length > 0 || workTypes.length === 0) return;
    setPrices(workTypes.filter((w) => !w.archivedAt).map((w) => {
      const seed = WORK_TYPE_SEED.find((s) => s.nameRu === w.nameRu);
      return {
        workTypeId: w.id, on: w.isFavorite,
        customer: seed ? String(seed.customerPrice) : '',
        worker: seed ? String(seed.workerPrice) : '',
      };
    }));
  }, [workTypes, prices.length]);

  function goStep(n: number) {
    navigate(`?step=${n}`);
  }

  async function finish() {
    if (saving || !name.trim()) return;
    setSaving(true);
    const obj = await addObject(name.trim(), customer.trim() || undefined, {
      customerPhone: phone.trim() || undefined,
      paymentTerms: terms.trim() || undefined,
    });
    for (const p of prices) {
      if (p.on) await upsertRate(obj.id, p.workTypeId, somsToTyiyn(p.customer), somsToTyiyn(p.worker));
    }
    const adv = somsToTyiyn(advance);
    if (adv > 0) {
      await addReceipt({ objectId: obj.id, date: todayStr(), amount: adv, method: 'cash', kind: 'advance' });
    }
    for (const n of newNames) await addWorker(n);
    if (draftName.trim()) await addWorker(draftName.trim());
    await updateSettings({ activeObjectId: obj.id });
    // Снимаем все шаги мастера со стека
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    const delta = Math.min(idx, step + 1);
    if (delta > 0) navigate(-delta);
    else navigate('/', { replace: true });
  }

  const titles = [t('newObject.step1'), t('newObject.step2'), t('newObject.step3')];
  const strip = (
    <div className="flex gap-1">
      {STEPS.map((s, i) => (
        <div key={s} className="flex-1 text-center">
          <div className={`mb-1.5 h-1.5 rounded-full ${i < step ? 'bg-slate-400' : i === step ? 'bg-accent' : 'bg-line'}`} />
          <span className={`text-[11px] font-bold ${i === step ? 'text-ink' : 'text-slate-400'}`}>{t(`newObject.strip.${s}`)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScreenHeader title={titles[step]} sub={t('newObject.counter', { n: step + 1 })} onBack={() => navigate(-1)} />
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        {strip}

        {step === 0 && (
          <>
            <p className="text-[16px] leading-relaxed text-slate-600">{t('newObject.intro1')}</p>
            <TextField label={t('newObject.name')} value={name} onChange={setName} autoFocus testId="obj-name" placeholder={t('newObject.namePlaceholder')} />
            <TextField label={t('newObject.customer')} value={customer} onChange={setCustomer} testId="obj-customer" placeholder={t('newObject.customerPlaceholder')} />
            <TextField label={t('newObject.phone')} value={phone} onChange={setPhone} inputMode="tel" placeholder={t('common.optional')} />
            <TextField label={t('newObject.terms')} value={terms} onChange={setTerms} placeholder={t('newObject.termsPlaceholder')} />
            <button
              className="flex min-h-[60px] items-center justify-between rounded-[16px] border-[1.5px] border-line bg-white px-3.5 text-left"
              onClick={() => setSheet({ title: t('newObject.advance'), initial: advance, save: setAdvance })}
            >
              <span><span className="block text-[12px] font-semibold text-slate-500">{t('newObject.advance')}</span><span className="text-[18px] font-semibold">{advance ? `${advance} сом` : t('newObject.noAdvance')}</span></span>
            </button>
            <div className="mt-auto">
              <BigButton label={t('newObject.next2')} disabled={!name.trim()} onClick={() => goStep(1)} testId="obj-next-1" />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-[15px] leading-relaxed text-slate-600">{t('newObject.intro2')}</p>
            <div className="flex flex-col gap-2">
              {prices.map((p) => {
                const wt = workTypes.find((w) => w.id === p.workTypeId);
                if (!wt) return null;
                return (
                  <div key={p.workTypeId} className={`flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-2.5 shadow-card ${p.on ? '' : 'opacity-60'}`}>
                    <button
                      aria-label={wtLabel(wt, lang)}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${p.on ? 'border-ink bg-ink text-white' : 'border-slate-300'}`}
                      onClick={() => setPrices(prices.map((x) => (x.workTypeId === p.workTypeId ? { ...x, on: !x.on } : x)))}
                    >
                      {p.on && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold">{wtLabel(wt, lang)} · {wt.unit}</span>
                      <span className="block text-[12px] font-medium text-slate-500">{t('newObject.margin', { sum: Math.max(0, Number(p.customer || 0) - Number(p.worker || 0)) })}</span>
                    </span>
                    <button className="rounded-lg bg-paper px-2 py-1 text-[16px] font-extrabold text-money-in" onClick={() => setSheet({ title: `${wtLabel(wt, lang)} — ${t('wizard.customerPrice')}`, initial: p.customer, save: (v) => setPrices((ps) => ps.map((x) => (x.workTypeId === p.workTypeId ? { ...x, customer: v, on: true } : x))) })}>
                      {p.customer || '0'}
                    </button>
                    <span className="text-slate-300">/</span>
                    <button className="rounded-lg bg-paper px-2 py-1 text-[16px] font-extrabold text-money-out" onClick={() => setSheet({ title: `${wtLabel(wt, lang)} — ${t('wizard.workerPrice')}`, initial: p.worker, save: (v) => setPrices((ps) => ps.map((x) => (x.workTypeId === p.workTypeId ? { ...x, worker: v, on: true } : x))) })}>
                      {p.worker || '0'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="sticky bottom-0 mt-auto bg-paper pt-3">
              <BigButton label={t('newObject.next3')} onClick={() => goStep(2)} testId="obj-next-2" />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[15px] leading-relaxed text-slate-600">{t('newObject.intro3')}</p>
            <div className="flex flex-col gap-2">
              {workers.filter((w) => !w.archivedAt).map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-2.5 shadow-card">
                  <WorkerCircle worker={w} size={40} />
                  <span className="text-[16px] font-semibold">{w.name}</span>
                  {w.specialty && <span className="text-[13px] text-slate-500">{w.specialty}</span>}
                </div>
              ))}
              {newNames.map((n, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-2.5 shadow-card">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-dark text-[15px] font-bold text-white">{n[0]?.toUpperCase()}</span>
                  <span className="text-[16px] font-semibold">{n}</span>
                </div>
              ))}
              <TextField label={t('workers.name')} value={draftName} onChange={setDraftName} testId="team-name" placeholder={t('newObject.namePlaceholderWorker')} />
            </div>
            <BigButton
              label={t('newObject.oneMore')}
              tone="neutral"
              icon={<Plus size={20} aria-hidden="true" />}
              disabled={!draftName.trim()}
              onClick={() => { setNewNames([...newNames, draftName.trim()]); setDraftName(''); }}
              testId="team-add"
            />
            <div className="mt-auto flex flex-col gap-2">
              <BigButton label={t('newObject.finish')} onClick={() => void finish()} disabled={saving} testId="obj-finish" />
              <button className="min-h-[44px] text-[15px] font-semibold text-slate-500" onClick={() => void finish()}>{t('newObject.later')}</button>
            </div>
          </>
        )}
      </div>

      {sheet && <NumSheet title={sheet.title} initial={sheet.initial} onSave={sheet.save} onClose={() => setSheet(null)} />}
    </div>
  );
}
