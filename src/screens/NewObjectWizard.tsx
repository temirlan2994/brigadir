import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Plus, X } from 'lucide-react';
import { useT, useLangStore } from '../i18n';
import { useCounterparties, useWorkers, useWorkTypes } from '../lib/hooks';
import { WORK_TYPE_SEED } from '../db/seed';
import { addObject, addReceipt, addWorker, todayStr, updateSettings, upsertRate } from '../db/repo';
import { formatMoney, parseDecimal, somsToTyiyn } from '../core/format';
import { checkPlan } from '../core/plan';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { NumField } from '../components/NumField';
import { CounterpartyPicker } from '../components/CounterpartyPicker';
import { EMPTY_PLAN, PaymentPlanEditor } from '../components/PaymentPlanEditor';
import { TextField } from '../components/ui';
import { WorkerCircle } from '../components/WorkerCircle';
import { wtLabel } from '../lib/summary';
import type { PaymentPlan } from '../db/types';

const STEPS = ['object', 'pay', 'prices', 'team'] as const;

interface PriceRow { workTypeId: string; on: boolean; customer: string; worker: string }
interface TeamRow { name: string; headcount: string }

// Взял объект → как платит заказчик → о каких ценах договорились → кто бригадиры.
// Один раз на объект; он же — первый запуск.
export function NewObjectWizard() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const step = Math.min(STEPS.length - 1, Math.max(0, Number(params.get('step') ?? '0') || 0));
  const workTypes = useWorkTypes();
  const workers = useWorkers();
  const counterparties = useCounterparties();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cpId, setCpId] = useState<string | undefined>();
  const [plan, setPlan] = useState<PaymentPlan>(EMPTY_PLAN);
  const [received, setReceived] = useState<string[]>([]);
  const [terms, setTerms] = useState('');
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [draft, setDraft] = useState<TeamRow>({ name: '', headcount: '' });
  const [saving, setSaving] = useState(false);
  // Запись истории, с которой начался мастер: по ней снимаем все шаги после завершения
  const entryIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (entryIdxRef.current === null) {
      entryIdxRef.current = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    }
    // Перезагрузка посреди мастера: поля пусты — возвращаемся на первый шаг
    if (step > 0 && !name.trim()) navigate('?step=0', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Новый шаг открывается сверху, а не там, где прокрутили прошлый
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  function setPrice(id: string, patch: Partial<PriceRow>) {
    setPrices((ps) => ps.map((x) => (x.workTypeId === id ? { ...x, ...patch } : x)));
  }

  function addTeamRow() {
    if (!draft.name.trim()) return;
    setTeam([...team, { name: draft.name.trim(), headcount: draft.headcount }]);
    setDraft({ name: '', headcount: '' });
  }

  const planOk = checkPlan(plan).ok;

  async function finish() {
    if (saving || !name.trim()) return;
    setSaving(true);
    const cp = counterparties.find((c) => c.id === cpId);
    // По объёмам пустой аванс не храним; по общей сумме части остаются как есть
    const payment: PaymentPlan = plan.basis === 'volume'
      ? { ...plan, parts: plan.parts.filter((p) => p.amount > 0) }
      : plan;
    const obj = await addObject(name.trim(), cp?.name, {
      address: address.trim() || undefined,
      counterpartyId: cp?.id,
      customerPhone: cp?.phone,
      payment,
      paymentTerms: terms.trim() || undefined,
    });
    for (const p of prices) {
      if (p.on) await upsertRate(obj.id, p.workTypeId, somsToTyiyn(p.customer), somsToTyiyn(p.worker));
    }
    // Аванс уже на руках — сразу в кассу. Галочка считается только у части «сразу»:
    // если часть потом переключили на «после этапа», её деньги ещё не получены
    for (const part of payment.parts) {
      if (received.includes(part.id) && part.trigger === 'start' && part.amount > 0) {
        await addReceipt({ objectId: obj.id, date: todayStr(), amount: part.amount, method: 'cash', kind: 'advance', note: part.title });
      }
    }
    const rows = draft.name.trim() ? [...team, draft] : team;
    for (const r of rows) {
      const head = Math.round(parseDecimal(r.headcount));
      await addWorker(r.name.trim(), undefined, undefined, head > 0 ? head : undefined);
    }
    await updateSettings({ activeObjectId: obj.id });
    // Снимаем все шаги мастера со стека; если мастер был первой страницей — на «Сегодня»
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    const entryIdx = entryIdxRef.current ?? 0;
    const delta = idx - entryIdx + 1;
    if (entryIdx > 0 && idx >= delta) navigate(-delta);
    else navigate('/', { replace: true });
  }

  const titles = [t('newObject.step1'), t('newObject.step2'), t('newObject.step3'), t('newObject.step4')];
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
            <TextField label={t('newObject.address')} value={address} onChange={setAddress} testId="obj-address" placeholder={t('common.optional')} />
            <CounterpartyPicker label={t('cp.label')} value={cpId} onChange={(c) => setCpId(c?.id)} />
            <div className="mt-auto pt-2">
              <BigButton label={t('newObject.next2')} disabled={!name.trim()} onClick={() => goStep(1)} testId="obj-next-1" />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-[15px] leading-relaxed text-slate-600">{t('newObject.intro2')}</p>
            <PaymentPlanEditor plan={plan} onChange={setPlan} received={received} onReceived={setReceived} />
            <TextField label={t('pay.notes')} value={terms} onChange={setTerms} placeholder={t('pay.notesPlaceholder')} testId="obj-terms" />
            <div className="mt-auto flex flex-col gap-1 pt-2">
              <BigButton label={t('newObject.next3')} disabled={!planOk} onClick={() => goStep(2)} testId="obj-next-2" />
              <button
                className="min-h-[44px] text-[15px] font-semibold text-slate-500"
                onClick={() => { setPlan(EMPTY_PLAN); setReceived([]); goStep(2); }}
                data-testid="pay-later"
              >
                {t('pay.later')}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[15px] leading-relaxed text-slate-600">
              {plan.basis === 'fixed' ? t('newObject.intro3fixed') : t('newObject.intro3')}
            </p>
            <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2 bg-paper px-4 py-1.5 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
              <span className="flex-1">{t('newObject.priceWork')}</span>
              <span className="w-[72px] text-right text-money-in">{t('newObject.priceCustomer')}</span>
              <span className="w-[72px] text-right text-money-out">{t('newObject.priceTeam')}</span>
            </div>
            <div className="flex flex-col gap-2">
              {prices.map((p) => {
                const wt = workTypes.find((w) => w.id === p.workTypeId);
                if (!wt) return null;
                const label = wtLabel(wt, lang);
                return (
                  <div key={p.workTypeId} className={`flex items-center gap-2 rounded-[16px] bg-white px-3 py-2.5 shadow-card ${p.on ? '' : 'opacity-60'}`}>
                    <button
                      type="button"
                      aria-label={label}
                      aria-pressed={p.on}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${p.on ? 'border-ink bg-ink text-white' : 'border-slate-300'}`}
                      onClick={() => setPrice(p.workTypeId, { on: !p.on })}
                      data-testid={`price-on-${wt.nameRu}`}
                    >
                      {p.on && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold">{label}</span>
                      <span className="block truncate text-[12px] font-medium text-slate-500">
                        {t('newObject.marginShort', { unit: wt.unit, sum: formatMoney(Math.max(0, somsToTyiyn(p.customer) - somsToTyiyn(p.worker))) })}
                      </span>
                    </span>
                    <NumField
                      variant="cell"
                      tone="in"
                      label={`${label} — ${t('wizard.customerPrice')}`}
                      value={p.customer}
                      onChange={(v) => setPrice(p.workTypeId, { customer: v, on: true })}
                      className="w-[72px]"
                      testId={`price-c-${wt.nameRu}`}
                    />
                    <NumField
                      variant="cell"
                      tone="out"
                      label={`${label} — ${t('wizard.workerPrice')}`}
                      value={p.worker}
                      onChange={(v) => setPrice(p.workTypeId, { worker: v, on: true })}
                      className="w-[72px]"
                      testId={`price-w-${wt.nameRu}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="sticky bottom-0 mt-auto bg-paper pt-3">
              <BigButton label={t('newObject.next4')} onClick={() => goStep(3)} testId="obj-next-3" />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-[15px] leading-relaxed text-slate-600">{t('newObject.intro4')}</p>
            <div className="flex flex-col gap-2">
              {workers.filter((w) => !w.archivedAt).map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-2.5 shadow-card">
                  <WorkerCircle worker={w} size={40} />
                  <span className="flex-1 text-[16px] font-semibold">{w.name}</span>
                  {w.headcount ? <span className="text-[13px] font-semibold text-slate-500">{t('workers.headcountShort', { n: w.headcount })}</span> : null}
                </div>
              ))}
              {team.map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-2.5 shadow-card">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-dark text-[15px] font-bold text-white">{r.name[0]?.toUpperCase()}</span>
                  <span className="flex-1 text-[16px] font-semibold">{r.name}</span>
                  {r.headcount && <span className="text-[13px] font-semibold text-slate-500">{t('workers.headcountShort', { n: Math.round(parseDecimal(r.headcount)) })}</span>}
                  <button type="button" aria-label={t('common.delete')} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400" onClick={() => setTeam(team.filter((_, j) => j !== i))}>
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <div className="flex items-stretch gap-2">
                <TextField
                  className="min-w-0 flex-1"
                  label={t('workers.name')}
                  value={draft.name}
                  onChange={(v) => setDraft({ ...draft, name: v })}
                  testId="team-name"
                  placeholder={t('newObject.namePlaceholderWorker')}
                />
                <NumField
                  className="w-[112px] shrink-0"
                  label={t('newObject.people')}
                  keypadLabel={t('workers.headcount')}
                  value={draft.headcount}
                  onChange={(v) => setDraft((d) => ({ ...d, headcount: v }))}
                  decimals={0}
                  maxDigits={3}
                  suffix={t('newObject.peopleShort')}
                  placeholder="—"
                  testId="team-headcount"
                />
              </div>
            </div>
            <BigButton
              label={t('newObject.oneMore')}
              tone="neutral"
              icon={<Plus size={20} aria-hidden="true" />}
              disabled={!draft.name.trim()}
              onClick={addTeamRow}
              testId="team-add"
            />
            <div className="mt-auto flex flex-col gap-2">
              <BigButton label={t('newObject.finish')} onClick={() => void finish()} disabled={saving} testId="obj-finish" />
              <button className="min-h-[44px] text-[15px] font-semibold text-slate-500" onClick={() => void finish()}>{t('newObject.later')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
