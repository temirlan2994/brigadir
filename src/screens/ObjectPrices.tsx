import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useT, useLangStore } from '../i18n';
import { db } from '../db/db';
import { useObject, useWorkTypes, useSettings } from '../lib/hooks';
import { updateObject, updateSettings, upsertRate, nowIso } from '../db/repo';
import { somsToTyiyn, tyiynToSomsInput } from '../core/format';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { NumSheet } from '../components/NumSheet';
import { Card, SectionTitle, TextField } from '../components/ui';
import { wtLabel } from '../lib/summary';

// Цены и заказчик: расценки этого объекта, данные заказчика, архив
export function ObjectPrices() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const o = useObject(id);
  const settings = useSettings();
  const workTypes = useWorkTypes();
  const rates = useLiveQuery(() => db.rates.where('objectId').equals(id).toArray(), [id]) ?? [];
  const [sheet, setSheet] = useState<{ title: string; initial: string; save: (v: string) => void } | null>(null);
  const [form, setForm] = useState<{ name: string; customerName: string; customerPhone: string; paymentTerms: string } | null>(null);

  // Поля заказчика сохраняются сами через секунду после правки,
  // а при уходе с экрана — сразу: системный «Назад» не теряет ввод
  const pendingRef = useRef<typeof form>(null);
  function persistForm(f: NonNullable<typeof form>) {
    pendingRef.current = null;
    void updateObject(id, {
      name: f.name.trim() || o?.name,
      customerName: f.customerName.trim() || undefined,
      customerPhone: f.customerPhone.trim() || undefined,
      paymentTerms: f.paymentTerms.trim() || undefined,
    });
  }
  useEffect(() => {
    if (!form) return;
    pendingRef.current = form;
    const timer = setTimeout(() => persistForm(form), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);
  useEffect(() => () => {
    if (pendingRef.current) persistForm(pendingRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!o) return <ScreenHeader title="" />;
  const f = form ?? { name: o.name, customerName: o.customerName ?? '', customerPhone: o.customerPhone ?? '', paymentTerms: o.paymentTerms ?? '' };

  function saveField<K extends keyof typeof f>(key: K, value: string) {
    setForm({ ...f, [key]: value });
  }

  const rateOf = (workTypeId: string) => rates.find((r) => r.workTypeId === workTypeId);
  const withRate = workTypes.filter((w) => !w.archivedAt && rateOf(w.id));
  const withoutRate = workTypes.filter((w) => !w.archivedAt && !rateOf(w.id));

  const rateRow = (w: (typeof workTypes)[number]) => {
    const r = rateOf(w.id);
    return (
      <div key={w.id} className="flex items-center gap-2 rounded-[16px] bg-white px-3.5 py-2.5 shadow-card">
        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{wtLabel(w, lang)} <span className="text-[13px] font-medium text-slate-500">· {w.unit}</span></span>
        <button className="rounded-lg bg-paper px-2.5 py-1.5 text-[16px] font-extrabold text-money-in" onClick={() => setSheet({ title: `${wtLabel(w, lang)} — ${t('wizard.customerPrice')}`, initial: r ? tyiynToSomsInput(r.customerPrice) : '', save: (v) => void upsertRate(id, w.id, somsToTyiyn(v), r?.workerPrice ?? 0) })}>
          {r ? tyiynToSomsInput(r.customerPrice) : '—'}
        </button>
        <span className="text-slate-300">/</span>
        <button className="rounded-lg bg-paper px-2.5 py-1.5 text-[16px] font-extrabold text-money-out" onClick={() => setSheet({ title: `${wtLabel(w, lang)} — ${t('wizard.workerPrice')}`, initial: r ? tyiynToSomsInput(r.workerPrice) : '', save: (v) => void upsertRate(id, w.id, r?.customerPrice ?? 0, somsToTyiyn(v)) })}>
          {r ? tyiynToSomsInput(r.workerPrice) : '—'}
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-8">
      <ScreenHeader title={t('object.prices')} sub={o.name} />
      <div className="flex flex-col gap-3 px-4">
        <SectionTitle>{t('newObject.customer')}</SectionTitle>
        <Card className="flex flex-col gap-2 !p-3">
          <TextField label={t('newObject.name')} value={f.name} onChange={(v) => saveField('name', v)} />
          <TextField label={t('newObject.customer')} value={f.customerName} onChange={(v) => saveField('customerName', v)} />
          <TextField label={t('newObject.phone')} value={f.customerPhone} onChange={(v) => saveField('customerPhone', v)} inputMode="tel" />
          <TextField label={t('newObject.terms')} value={f.paymentTerms} onChange={(v) => saveField('paymentTerms', v)} />
        </Card>

        <SectionTitle>{t('prices.agreed')}</SectionTitle>
        <p className="px-1 text-[13px] text-slate-500">{t('prices.hint')}</p>
        <div className="flex flex-col gap-2">{withRate.map(rateRow)}</div>
        {withoutRate.length > 0 && (
          <>
            <SectionTitle>{t('prices.other')}</SectionTitle>
            <div className="flex flex-col gap-2">{withoutRate.map(rateRow)}</div>
          </>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {settings.activeObjectId !== o.id && !o.closedAt && !o.archivedAt && (
            <BigButton label={t('objects.makeCurrent')} tone="neutral" onClick={() => void updateSettings({ activeObjectId: o.id })} />
          )}
          {!o.closedAt && !o.archivedAt && (
            <BigButton label={t('object.closeObject')} tone="neutral" onClick={() => navigate(`/objects/${id}/close`)} testId="to-close" />
          )}
          <button className="min-h-[44px] text-[15px] font-semibold text-slate-500" onClick={() => { void updateObject(id, { archivedAt: o.archivedAt ? undefined : nowIso() }); navigate(-1); }}>
            {o.archivedAt ? t('workers.unarchive') : t('settings.archive')}
          </button>
        </div>
      </div>
      {sheet && <NumSheet title={sheet.title} initial={sheet.initial} onSave={sheet.save} onClose={() => setSheet(null)} />}
    </div>
  );
}
