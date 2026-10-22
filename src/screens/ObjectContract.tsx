import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Phone, MessageCircle } from 'lucide-react';
import { useT } from '../i18n';
import { useObject, useSettings } from '../lib/hooks';
import { nowIso, setObjectCounterparty, updateObject, updateSettings } from '../db/repo';
import { phoneDigits } from '../core/phone';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { CounterpartyPicker } from '../components/CounterpartyPicker';
import { EMPTY_PLAN, PaymentPlanEditor } from '../components/PaymentPlanEditor';
import { Card, SectionTitle, TextField } from '../components/ui';
import type { PaymentPlan, SiteObject } from '../db/types';

type Form = { name: string; address: string; terms: string; payment: PaymentPlan };

// Заказчик и договор: название, адрес, кто платит, как платит. Всё сохраняется само.
export function ObjectContract() {
  const t = useT();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const o = useObject(id);
  const settings = useSettings();
  const [form, setForm] = useState<Form | null>(null);

  // Через 0,7 с после правки — в базу; при уходе с экрана — сразу
  const pendingRef = useRef<Form | null>(null);
  function persist(f: Form, obj: SiteObject | undefined) {
    pendingRef.current = null;
    void updateObject(id, {
      name: f.name.trim() || obj?.name,
      address: f.address.trim() || undefined,
      paymentTerms: f.terms.trim() || undefined,
      payment: f.payment,
    });
  }
  const objRef = useRef(o);
  objRef.current = o;
  useEffect(() => {
    if (!form) return;
    pendingRef.current = form;
    const timer = setTimeout(() => persist(form, objRef.current), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);
  useEffect(() => () => {
    if (pendingRef.current) persist(pendingRef.current, objRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!o) return <ScreenHeader title="" />;
  const f: Form = form ?? { name: o.name, address: o.address ?? '', terms: o.paymentTerms ?? '', payment: o.payment ?? EMPTY_PLAN };
  const open = !o.closedAt && !o.archivedAt;
  const digits = phoneDigits(o.customerPhone);

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-8">
      <ScreenHeader title={t('object.contract')} sub={o.name} />
      <div className="flex flex-col gap-3 px-4">
        <SectionTitle>{t('common.object')}</SectionTitle>
        <TextField label={t('newObject.name')} value={f.name} onChange={(v) => setForm({ ...f, name: v })} testId="contract-name" />
        <TextField label={t('newObject.address')} value={f.address} onChange={(v) => setForm({ ...f, address: v })} placeholder={t('common.optional')} />

        <SectionTitle>{t('cp.label')}</SectionTitle>
        <CounterpartyPicker value={o.counterpartyId} onChange={(c) => void setObjectCounterparty(o.id, c?.id)} />
        {digits && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:+${digits}`} className="flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] bg-white text-[16px] font-bold shadow-card">
              <Phone size={18} aria-hidden="true" />{t('cp.call')}
            </a>
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="flex min-h-[52px] items-center justify-center gap-2 rounded-[16px] bg-white text-[16px] font-bold text-money-in shadow-card">
              <MessageCircle size={18} aria-hidden="true" />{t('cp.whatsapp')}
            </a>
          </div>
        )}

        <SectionTitle>{t('contract.payment')}</SectionTitle>
        <PaymentPlanEditor plan={f.payment} onChange={(p) => setForm({ ...f, payment: p })} />
        <TextField label={t('pay.notes')} value={f.terms} onChange={(v) => setForm({ ...f, terms: v })} placeholder={t('pay.notesPlaceholder')} />

        <Card className="mt-2 flex flex-col gap-2 !p-3">
          {settings.activeObjectId !== o.id && open && (
            <BigButton label={t('objects.makeCurrent')} tone="neutral" onClick={() => void updateSettings({ activeObjectId: o.id })} />
          )}
          {open && (
            <BigButton label={t('object.closeObject')} tone="neutral" onClick={() => navigate(`/objects/${id}/close`)} testId="contract-close" />
          )}
          <button className="min-h-[44px] text-[15px] font-semibold text-slate-500" onClick={() => { void updateObject(id, { archivedAt: o.archivedAt ? undefined : nowIso() }); navigate(-1); }}>
            {o.archivedAt ? t('workers.unarchive') : t('settings.archive')}
          </button>
        </Card>
      </div>
    </div>
  );
}
