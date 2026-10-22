import { useSearchParams } from 'react-router-dom';
import { Printer, Send } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { useActiveObject, useEntries, useWorkTypes, byObject, useObject } from '../lib/hooks';
import { activeEntries } from '../core/calc';
import { formatMoneyExact, formatQuantity } from '../core/format';
import { todayStr } from '../db/repo';
import { isStandalone } from '../lib/files';
import { actText, sendText } from '../lib/report';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { wtLabel } from '../lib/summary';

// Акт выполненных работ: печатная страница, window.print()
export function ActPrint() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const toast = useToast();
  const [params] = useSearchParams();
  const paramObject = useObject(params.get('objectId') ?? undefined);
  const activeObjectHook = useActiveObject();
  const activeObject = paramObject ?? activeObjectHook;
  const entries = useEntries();
  const workTypes = useWorkTypes();

  // В акт идёт принятый объём (при частичной приёмке — принятая часть)
  const accepted = byObject(activeEntries(entries), activeObject?.id)
    .filter((e) => e.accepted)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      ...e,
      actQuantity: e.acceptedQuantity ?? e.quantity,
      actTotal: e.acceptedTotal ?? e.customerTotal,
    }));

  const from = accepted[0]?.date;
  const to = accepted[accepted.length - 1]?.date;
  const total = accepted.reduce((s, e) => s + e.actTotal, 0);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="no-print">
        <ScreenHeader title={t('act.title')} />
      </div>

      <div className="flex-1 px-6 py-4 text-[14px] leading-snug text-black">
        <h1 className="pb-2 text-center text-[18px] font-bold">{t('act.title')}</h1>
        <p>{t('act.object')}: {activeObject?.name ?? ''}</p>
        {activeObject?.customerName && <p>{t('act.customer')}: {activeObject.customerName}</p>}
        {from && to && (
          <p>{t('act.period')}: {formatDateShort(from, lang)} — {formatDateShort(to, lang)}</p>
        )}
        <p>{t('common.date')}: {formatDateShort(todayStr(), lang)}</p>

        <table className="mt-3 w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {[t('act.workType'), t('act.unit'), t('act.quantity'), t('act.price'), t('act.sum')].map((h) => (
                <th key={h} className="border border-black px-1.5 py-1 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accepted.map((e) => (
              <tr key={e.id}>
                <td className="border border-black px-1.5 py-1">{wtLabel(workTypes.find((w) => w.id === e.workTypeId), lang)}</td>
                <td className="border border-black px-1.5 py-1">{e.unit}</td>
                <td className="border border-black px-1.5 py-1 text-right">{formatQuantity(e.actQuantity)}</td>
                <td className="border border-black px-1.5 py-1 text-right">{formatMoneyExact(e.customerPrice)}</td>
                <td className="border border-black px-1.5 py-1 text-right">{formatMoneyExact(e.actTotal)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="border border-black px-1.5 py-1 text-right font-bold">{t('act.total')}</td>
              <td className="border border-black px-1.5 py-1 text-right font-bold">{formatMoneyExact(total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-10 flex justify-between">
          <p>{t('act.contractorSign')}: ______________</p>
          <p>{t('act.customerSign')}: ______________</p>
        </div>
      </div>

      <div className="no-print flex flex-col gap-2 px-4 pb-6">
        {/* В установленном приложении печати нет — акт уходит текстом в WhatsApp */}
        <BigButton
          label={t('act.send')}
          icon={<Send size={20} aria-hidden="true" />}
          testId="send-act"
          onClick={() => {
            if (!activeObject) return;
            const text = actText(
              activeObject,
              accepted.map((e) => ({
                name: workTypes.find((w) => w.id === e.workTypeId)?.nameRu ?? '',
                unit: e.unit, qty: e.actQuantity, price: e.customerPrice, total: e.actTotal,
              })),
              total, formatQuantity, formatMoneyExact,
            );
            void sendText(activeObject.customerPhone, text).then((res) => {
              if (res === 'copied') toast.show(t('common.copied'));
              else if (res === 'failed') toast.show(t('common.copyFailed'));
            });
          }}
        />
        {!isStandalone() && (
          <BigButton label={t('act.print')} tone="neutral" icon={<Printer size={20} aria-hidden="true" />} onClick={() => window.print()} testId="print-act" />
        )}
      </div>
    </div>
  );
}
