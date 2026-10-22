import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, AlertTriangle } from 'lucide-react';
import { useT } from '../i18n';
import { useObjectSummary, useHomeSummary } from '../lib/summary';
import { useObjects } from '../lib/hooks';
import { formatMoney } from '../core/format';
import { nowIso, updateObject, updateSettings } from '../db/repo';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/ui';

// Закрыть объект — проверка, а не кнопка: всё принято? заказчик заплатил? бригада рассчитана?
export function CloseObject() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { id = '' } = useParams();
  const s = useObjectSummary(id);
  const home = useHomeSummary();
  const objects = useObjects();
  const o = s.object;
  if (!o) return <ScreenHeader title="" />;

  const checks = [
    { ok: s.notAccepted === 0, title: t('close.allAccepted'), sub: s.notAccepted === 0 ? t('close.ok') : t('close.notAcceptedLeft', { sum: formatMoney(s.notAccepted) }) },
    { ok: s.owedToMe <= 0, title: t('close.customerPaid'), sub: s.owedToMe <= 0 ? t('close.ok') : t('close.customerOwesLeft', { sum: formatMoney(s.owedToMe) }) },
    { ok: home.owed === 0, title: t('close.teamSettled'), sub: home.owed === 0 ? t('close.ok') : t('close.teamOwedLeft', { sum: formatMoney(home.owed) }) },
  ];
  const allOk = checks.every((c) => c.ok);

  async function close() {
    const wasActive = home.settings.activeObjectId === id;
    await updateObject(id, { closedAt: nowIso() });
    if (wasActive) {
      const next = objects.find((x) => x.id !== id && !x.closedAt && !x.archivedAt);
      await updateSettings({ activeObjectId: next?.id ?? '' });
    }
    toast.show(t('close.done'), async () => {
      await updateObject(id, { closedAt: undefined });
      if (wasActive) await updateSettings({ activeObjectId: id });
    });
    // Пришли с экрана итога — просто возвращаемся на него, чтобы не плодить записи в истории
    if ((location.state as { fromResult?: boolean } | null)?.fromResult) navigate(-1);
    else navigate(`/objects/${id}/result`, { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader title={t('object.closeObject')} sub={o.name} />
      <div className="flex flex-1 flex-col gap-3 px-4">
        <p className="text-[15px] leading-relaxed text-slate-600">{t('close.intro')}</p>
        {checks.map((c) => (
          <Card key={c.title} className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${c.ok ? 'bg-[#e6f4ea] text-money-in' : 'bg-[#fff1d6] text-[#92400e]'}`}>
              {c.ok ? <Check size={22} strokeWidth={3} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-bold">{c.title}</span>
              <span className="block text-[13px] font-medium text-slate-500">{c.sub}</span>
            </span>
          </Card>
        ))}
        <div className="mt-auto flex flex-col gap-2">
          {!allOk && <p className="px-1 text-center text-[14px] text-slate-500">{t('close.warning')}</p>}
          <BigButton label={t('close.confirm')} tone={allOk ? 'primary' : 'dark'} onClick={() => void close()} testId="close-confirm" />
        </div>
      </div>
    </div>
  );
}
