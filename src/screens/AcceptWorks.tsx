import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useActiveObject, useEntries, useWorkTypes, byObject } from '../lib/hooks';
import { activeEntries } from '../core/calc';
import { formatMoney, formatQuantity } from '../core/format';
import { acceptWorkEntries } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { wtLabel } from '../lib/summary';

// Приёмка: список непринятых записей с чекбоксами
export function AcceptWorks() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const entries = useEntries();
  const workTypes = useWorkTypes();
  const activeObject = useActiveObject();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const unaccepted = byObject(activeEntries(entries), activeObject?.id)
    .filter((e) => !e.accepted)
    .sort((a, b) => b.date.localeCompare(a.date));

  function toggle(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  }

  async function accept() {
    await acceptWorkEntries([...checked]);
    navigate(-1);
    toast.show(t('common.saved'));
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ScreenHeader title={t('receipt.markAccepted')} />
      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        {unaccepted.map((e) => {
          const wt = workTypes.find((w) => w.id === e.workTypeId);
          return (
            <label key={e.id} className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-white px-4 shadow-sm">
              <input
                type="checkbox"
                className="h-7 w-7 accent-orange-500"
                checked={checked.has(e.id)}
                onChange={() => toggle(e.id)}
                data-testid={`accept-${e.id}`}
              />
              <span className="flex-1">
                <span className="block text-[16px]">{wtLabel(wt, lang)} · {formatQuantity(e.quantity)} {e.unit}</span>
                <span className="block text-[13px] text-slate-400">{formatDateShort(e.date, lang)}</span>
              </span>
              <span className="text-[16px] font-semibold">{formatMoney(e.customerTotal)}</span>
            </label>
          );
        })}
        {unaccepted.length === 0 && (
          <p className="py-6 text-center text-[16px] text-slate-400">{t('receipt.noUnaccepted')}</p>
        )}
        <div className="mt-auto pt-3">
          <BigButton label={t('receipt.acceptSelected')} disabled={checked.size === 0} onClick={() => void accept()} testId="accept-selected" />
        </div>
      </div>
    </div>
  );
}
