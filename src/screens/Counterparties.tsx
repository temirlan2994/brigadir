import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, MessageCircle, Phone, Plus, Search } from 'lucide-react';
import { useT } from '../i18n';
import {
  useAdjustments, useCounterparties, useEntries, useObjects, useReceipts, byObject,
} from '../lib/hooks';
import { activeEntries, notDeleted } from '../core/calc';
import { customerOwesByPlan } from '../core/plan';
import { formatPhone, phoneDigits } from '../core/phone';
import { formatMoney } from '../core/format';
import { nowIso, todayStr, updateCounterparty } from '../db/repo';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { CounterpartySheet } from '../components/CounterpartySheet';
import { Card, Initials, KvRow, Pill, SectionTitle } from '../components/ui';
import type { SiteObject } from '../db/types';

// Сколько должен заказчик по каждому своему объекту
function useOwesByObject() {
  const entries = useEntries();
  const receipts = useReceipts();
  const adjustments = useAdjustments();
  const all = activeEntries(entries);
  const today = todayStr();
  return (o: SiteObject) => customerOwesByPlan(
    o.payment, byObject(all, o.id), notDeleted(byObject(receipts, o.id)),
    notDeleted(byObject(adjustments, o.id)), today,
  );
}

// Контрагенты: все, кто платит за объекты. Поиск, «создать», карточка
export function Counterparties() {
  const t = useT();
  const navigate = useNavigate();
  const all = useCounterparties();
  const objects = useObjects();
  const owes = useOwesByObject();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = all.filter((c) => Boolean(c.archivedAt) === showArchived);
    if (!q) return base;
    const digits = q.replace(/\D/g, '');
    return base.filter((c) => c.name.toLowerCase().includes(q)
      || (c.contactName ?? '').toLowerCase().includes(q)
      || (digits.length >= 3 && (c.phone ?? '').includes(digits)));
  }, [all, query, showArchived]);
  const archivedCount = all.filter((c) => c.archivedAt).length;

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader title={t('cp.title')} sub={t('cp.sub')} />
      <div className="flex flex-1 flex-col gap-3 px-4">
        {all.length > 4 && (
          <label className="flex min-h-[52px] items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-white px-3">
            <Search size={18} className="text-slate-400" aria-hidden="true" />
            <input className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" placeholder={t('cp.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        )}
        {list.map((c) => {
          const mine = objects.filter((o) => o.counterpartyId === c.id);
          const debt = mine.filter((o) => !o.archivedAt).reduce((s, o) => s + Math.max(0, owes(o)), 0);
          return (
            <button key={c.id} className="flex min-h-[72px] items-center gap-3 rounded-[18px] bg-white px-4 py-3 text-left shadow-card" onClick={() => navigate(`/counterparties/${c.id}`)} data-testid={`cp-row-${c.name}`}>
              <Initials name={c.name} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-bold">{c.name}</span>
                <span className="block truncate text-[13px] font-medium text-slate-500">
                  {[formatPhone(c.phone), t('cp.objectsCount', { n: mine.length })].filter(Boolean).join(' · ')}
                </span>
              </span>
              {debt > 0 && <span className="shrink-0 text-right text-[16px] font-extrabold text-money-in">{formatMoney(debt)}</span>}
              <ChevronRight size={18} className="shrink-0 text-slate-300" aria-hidden="true" />
            </button>
          );
        })}
        {all.length === 0 && <p className="py-6 text-center text-[16px] text-slate-500">{t('cp.empty')}</p>}
        {archivedCount > 0 && (
          <button className="min-h-[44px] text-[15px] font-semibold text-slate-500" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? t('cp.showActive') : `${t('workers.archived')} (${archivedCount})`}
          </button>
        )}
        <div className="sticky bottom-0 mt-auto bg-paper pt-3">
          <BigButton label={t('cp.create')} icon={<Plus size={22} aria-hidden="true" />} onClick={() => setCreating(true)} testId="cp-create" />
        </div>
      </div>
      {creating && (
        <CounterpartySheet onClose={() => setCreating(false)} onSaved={(c) => { setCreating(false); navigate(`/counterparties/${c.id}`); }} />
      )}
    </div>
  );
}

// Карточка контрагента: реквизиты, позвонить / WhatsApp, его объекты и долг
export function CounterpartyCard() {
  const t = useT();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const all = useCounterparties();
  const objects = useObjects();
  const owes = useOwesByObject();
  const [editing, setEditing] = useState(false);
  const c = all.find((x) => x.id === id);
  if (!c) return <ScreenHeader title="" />;

  const mine = objects.filter((o) => o.counterpartyId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const debt = mine.filter((o) => !o.archivedAt).reduce((s, o) => s + Math.max(0, owes(o)), 0);
  const digits = phoneDigits(c.phone);

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader
        title={c.name}
        sub={t(c.kind === 'company' ? 'cp.company' : 'cp.person')}
        right={<button className="min-h-[44px] rounded-full bg-white px-3 text-[13px] font-bold shadow-card" onClick={() => setEditing(true)} data-testid="cp-card-edit">{t('common.edit')}</button>}
      />
      <div className="flex flex-col gap-3 px-4">
        <Card>
          {c.contactName && <KvRow label={t('cp.contactName')} value={c.contactName} />}
          <KvRow label={t('cp.phone')} value={formatPhone(c.phone) || '—'} />
          {c.inn && <KvRow label={t('cp.inn')} value={c.inn} />}
          {c.address && <KvRow label={t('cp.address')} value={c.address} />}
          {c.note && <p className="pt-2 text-[15px] text-slate-700">{c.note}</p>}
        </Card>
        {digits && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:+${digits}`} className="flex min-h-[56px] items-center justify-center gap-2 rounded-[16px] bg-dark text-[16px] font-bold text-white">
              <Phone size={18} aria-hidden="true" />{t('cp.call')}
            </a>
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="flex min-h-[56px] items-center justify-center gap-2 rounded-[16px] bg-white text-[16px] font-bold text-money-in shadow-card">
              <MessageCircle size={18} aria-hidden="true" />{t('cp.whatsapp')}
            </a>
          </div>
        )}

        {debt > 0 && (
          <Card className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-slate-600">{t('cp.owesTotal')}</span>
            <span className="text-[22px] font-black text-money-in">{formatMoney(debt)}</span>
          </Card>
        )}

        <SectionTitle>{t('cp.objects')}</SectionTitle>
        {mine.map((o) => {
          const owed = owes(o);
          return (
            <button key={o.id} className="flex min-h-[64px] items-center gap-3 rounded-[16px] bg-white px-4 py-3 text-left shadow-card" onClick={() => navigate(`/objects/${o.id}`)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-bold">{o.name}</span>
                <span className="block text-[13px] font-medium text-slate-500">
                  {o.closedAt ? t('cp.closed') : o.archivedAt ? t('settings.archivedMark') : t('cp.inWork')}
                </span>
              </span>
              {owed > 0 ? <Pill tone="green">{formatMoney(owed)}</Pill> : null}
              <ChevronRight size={18} className="shrink-0 text-slate-300" aria-hidden="true" />
            </button>
          );
        })}
        {mine.length === 0 && <p className="px-1 text-[14px] text-slate-400">{t('cp.noObjects')}</p>}

        <button
          className="mt-2 min-h-[44px] text-[15px] font-semibold text-slate-500"
          onClick={() => { void updateCounterparty(c.id, { archivedAt: c.archivedAt ? undefined : nowIso() }); navigate(-1); }}
        >
          {c.archivedAt ? t('workers.unarchive') : t('workers.archive')}
        </button>
      </div>
      {editing && <CounterpartySheet initial={c} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />}
    </div>
  );
}
