import { useRef, useState } from 'react';
import { Contact } from 'lucide-react';
import { useT } from '../i18n';
import { addCounterparty, updateCounterparty } from '../db/repo';
import { contactsSupported, pickContact } from '../lib/contacts';
import { parsePhone, toE164 } from '../core/phone';
import { Sheet } from './Sheet';
import { Segmented } from './Segmented';
import { PhoneField } from './PhoneField';
import { BigButton } from './BigButton';
import { TextField } from './ui';
import type { Counterparty } from '../db/types';

interface Form {
  kind: Counterparty['kind'];
  name: string;
  contactName: string;
  phone: string;
  inn: string;
  address: string;
  note: string;
}

function toForm(c?: Counterparty, name = ''): Form {
  return {
    kind: c?.kind ?? 'company', name: c?.name ?? name, contactName: c?.contactName ?? '',
    phone: c?.phone ?? '', inn: c?.inn ?? '', address: c?.address ?? '', note: c?.note ?? '',
  };
}

// Окно «Новый контрагент» / правка: компания или человек, кто на связи, телефон, ИНН, адрес
export function CounterpartySheet({ initial, initialName, onClose, onSaved }: {
  initial?: Counterparty;
  initialName?: string;
  onClose: () => void;
  onSaved: (cp: Counterparty) => void;
}) {
  const t = useT();
  const [form, setForm] = useState<Form>(() => toForm(initial, initialName));
  const savingRef = useRef(false);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  async function fromContacts() {
    const c = await pickContact();
    if (!c) return;
    const tel = c.tels[0];
    const parsed = tel ? parsePhone(tel) : undefined;
    set({
      name: form.name.trim() ? form.name : c.name,
      ...(parsed && parsed.national ? { phone: toE164(parsed.country, parsed.national) } : {}),
    });
  }

  async function save() {
    const name = form.name.trim();
    if (!name || savingRef.current) return;
    savingRef.current = true;
    try {
      const data = {
        kind: form.kind,
        name,
        contactName: form.kind === 'company' ? form.contactName.trim() || undefined : undefined,
        phone: form.phone || undefined,
        inn: form.inn.trim() || undefined,
        address: form.address.trim() || undefined,
        note: form.note.trim() || undefined,
      };
      if (initial) {
        await updateCounterparty(initial.id, data);
        onSaved({ ...initial, ...data });
      } else {
        onSaved(await addCounterparty(data));
      }
    } finally {
      savingRef.current = false;
    }
  }

  const company = form.kind === 'company';

  return (
    <Sheet onClose={onClose} title={initial ? t('cp.editTitle') : t('cp.newTitle')} testId="cp-sheet">
      {contactsSupported() && (
        <button
          type="button"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-paper text-[16px] font-bold"
          onClick={() => void fromContacts()}
          data-testid="cp-from-contacts"
        >
          <Contact size={20} aria-hidden="true" />
          {t('cp.fromContacts')}
        </button>
      )}
      <Segmented
        options={[{ value: 'company', label: t('cp.company') }, { value: 'person', label: t('cp.person') }]}
        value={form.kind}
        onChange={(v) => set({ kind: v })}
        testIdPrefix="cp"
      />
      <TextField
        label={company ? t('cp.companyName') : t('cp.personName')}
        placeholder={company ? t('cp.companyPlaceholder') : t('cp.personPlaceholder')}
        value={form.name}
        onChange={(v) => set({ name: v })}
        autoFocus={!initial}
        testId="cp-name"
      />
      {company && (
        <TextField label={t('cp.contactName')} placeholder={t('cp.contactPlaceholder')} value={form.contactName} onChange={(v) => set({ contactName: v })} testId="cp-contact" />
      )}
      <PhoneField
        label={t('cp.phone')}
        value={form.phone}
        onChange={(v) => set({ phone: v })}
        onContact={(c) => { if (!form.name.trim() && c.name) set({ name: c.name }); }}
        testId="cp-phone"
      />
      <TextField label={t('cp.inn')} placeholder={t('common.optional')} value={form.inn} onChange={(v) => set({ inn: v.replace(/\D/g, '').slice(0, 14) })} inputMode="numeric" testId="cp-inn" />
      <TextField label={t('cp.address')} placeholder={t('common.optional')} value={form.address} onChange={(v) => set({ address: v })} />
      <TextField label={t('cp.note')} placeholder={t('common.optional')} value={form.note} onChange={(v) => set({ note: v })} />
      {!initial && <p className="px-1 text-[13px] text-slate-500">{t('cp.saveHint')}</p>}
      <BigButton label={t('common.save')} tone="dark" disabled={!form.name.trim()} onClick={() => void save()} testId="cp-save" />
    </Sheet>
  );
}
