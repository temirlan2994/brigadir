import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useT, useLangStore } from '../i18n';
import { db } from '../db/db';
import { useObject, useWorkTypes } from '../lib/hooks';
import { upsertRate } from '../db/repo';
import { somsToTyiyn, tyiynToSomsInput } from '../core/format';
import { ScreenHeader } from '../components/ScreenHeader';
import { NumField } from '../components/NumField';
import { SectionTitle } from '../components/ui';
import { wtLabel } from '../lib/summary';
import type { Rate, WorkType } from '../db/types';

// Одна цена: печатается прямо в ячейке, в базу — когда поле закрыли
function PriceCell({ label, stored, tone, onSave, testId }: {
  label: string; stored: number | undefined; tone: 'in' | 'out'; onSave: (tyiyn: number) => void; testId: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <NumField
      variant="cell"
      tone={tone}
      label={label}
      value={draft ?? (stored !== undefined ? tyiynToSomsInput(stored) : '')}
      placeholder="—"
      onChange={setDraft}
      onCommit={(v) => {
        const typed = draft !== null;
        setDraft(null);
        const next = somsToTyiyn(v);
        if (typed && next !== stored) onSave(next);
      }}
      className="w-[76px]"
      testId={testId}
    />
  );
}

// Цены за работы на этом объекте: заказчику и бригаде
export function ObjectPrices() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const { id = '' } = useParams();
  const o = useObject(id);
  const workTypes = useWorkTypes();
  const rates = useLiveQuery(() => db.rates.where('objectId').equals(id).toArray(), [id]) ?? [];

  if (!o) return <ScreenHeader title="" />;

  const rateOf = (workTypeId: string) => rates.find((r) => r.workTypeId === workTypeId);
  const withRate = workTypes.filter((w) => !w.archivedAt && rateOf(w.id));
  const withoutRate = workTypes.filter((w) => !w.archivedAt && !rateOf(w.id));

  const rateRow = (w: WorkType) => {
    const r: Rate | undefined = rateOf(w.id);
    const label = wtLabel(w, lang);
    return (
      <div key={w.id} className="flex items-center gap-2 rounded-[16px] bg-white px-3.5 py-2.5 shadow-card">
        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{label} <span className="text-[13px] font-medium text-slate-500">· {w.unit}</span></span>
        <PriceCell
          label={`${label} — ${t('wizard.customerPrice')}`}
          stored={r?.customerPrice}
          tone="in"
          onSave={(v) => void upsertRate(id, w.id, v, r?.workerPrice ?? 0)}
          testId={`rate-c-${w.nameRu}`}
        />
        <PriceCell
          label={`${label} — ${t('wizard.workerPrice')}`}
          stored={r?.workerPrice}
          tone="out"
          onSave={(v) => void upsertRate(id, w.id, r?.customerPrice ?? 0, v)}
          testId={`rate-w-${w.nameRu}`}
        />
      </div>
    );
  };

  const header = (
    <div className="flex items-center gap-2 px-3.5 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
      <span className="flex-1">{t('newObject.priceWork')}</span>
      <span className="w-[76px] text-right text-money-in">{t('newObject.priceCustomer')}</span>
      <span className="w-[76px] text-right text-money-out">{t('newObject.priceTeam')}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-8">
      <ScreenHeader title={t('object.prices')} sub={o.name} />
      <div className="flex flex-col gap-3 px-4">
        <p className="px-1 text-[14px] text-slate-500">{t('prices.hint')}</p>
        <SectionTitle>{t('prices.agreed')}</SectionTitle>
        {header}
        <div className="flex flex-col gap-2">{withRate.map(rateRow)}</div>
        {withoutRate.length > 0 && (
          <>
            <SectionTitle>{t('prices.other')}</SectionTitle>
            <div className="flex flex-col gap-2">{withoutRate.map(rateRow)}</div>
          </>
        )}
      </div>
    </div>
  );
}
