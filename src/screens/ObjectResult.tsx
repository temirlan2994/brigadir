import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Send } from 'lucide-react';
import { useT, useLangStore } from '../i18n';
import { useObjectSummary, wtLabel } from '../lib/summary';
import { useWorkTypes } from '../lib/hooks';
import { formatMoney } from '../core/format';
import { notDeleted } from '../core/calc';
import { customerReportText, sendText } from '../lib/report';
import { useToast } from '../state/toast';
import { ScreenHeader } from '../components/ScreenHeader';
import { BigButton } from '../components/BigButton';
import { Card, DarkCard, KvRow } from '../components/ui';

// Итог объекта: заработал или нет, из чего сложилось, что съело деньги
export function ObjectResult() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const { id = '' } = useParams();
  const s = useObjectSummary(id);
  const workTypes = useWorkTypes();
  const o = s.object;
  if (!o) return <ScreenHeader title="" />;

  const closed = Boolean(o.closedAt);
  const result = closed ? s.profitFact : s.profit;
  const dates = s.active.map((e) => e.date).sort();
  const days = dates.length > 0
    ? Math.max(1, Math.round((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / 86_400_000) + 1)
    : 0;

  // Что съело деньги: самая большая категория расходов
  const byCat = new Map<string, number>();
  for (const x of notDeleted(s.objExpenses).filter((e) => e.paidBy === 'contractor')) {
    byCat.set(x.category, (byCat.get(x.category) ?? 0) + x.amount);
  }
  const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  // Самый выгодный вид работ
  const byType = new Map<string, number>();
  for (const e of s.active) byType.set(e.workTypeId, (byType.get(e.workTypeId) ?? 0) + (e.customerTotal - e.workersTotal));
  const topType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];

  async function report() {
    const res = await sendText(o!.customerPhone, customerReportText(o!, s.active, workTypes));
    if (res === 'copied') toast.show(t('common.copied'));
              else if (res === 'failed') toast.show(t('common.copyFailed'));
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-6">
      <ScreenHeader title={t('object.result')} sub={o.name} />
      <div className="flex flex-col gap-3 px-4">
        <DarkCard tone={result >= 0 ? 'green' : 'red'}>
          <span className="text-[14px] font-medium text-white/75">{closed ? t('result.earned') : t('result.forecast')}</span>
          <span className="mt-1 block text-[40px] font-black leading-none tracking-tight">{result > 0 ? '+' : ''}{formatMoney(result)}</span>
          {days > 0 && (
            <span className="mt-2 block text-[14px] font-medium text-white/75">
              {t('result.perDay', { days, sum: formatMoney(Math.round(result / days)) })}
            </span>
          )}
        </DarkCard>

        <Card>
          <KvRow
            label={closed ? t('object.customerPaid') : s.fixed ? t('plan.contract') : t('object.doneAll')}
            value={formatMoney(closed ? s.received : s.revenue)}
            tone="in"
          />
          <KvRow label={t('result.team')} value={`−${formatMoney(s.workersSum)}`} tone="out" />
          <KvRow label={t('result.expenses')} value={`−${formatMoney(s.contractorExp)}`} tone="out" />
          {(closed ? s.taxFact : s.tax) > 0 && <KvRow label={t('profit.tax')} value={`−${formatMoney(closed ? s.taxFact : s.tax)}`} tone="out" />}
          <KvRow label={t('result.left')} value={formatMoney(result)} strong tone={result >= 0 ? 'in' : 'out'} />
          {!closed && s.owedToMe > 0 && <KvRow label={t('object.customerOwes')} value={formatMoney(s.owedToMe)} />}
        </Card>

        {(topCat || topType) && (
          <Card>
            <span className="block text-[14px] font-medium text-slate-500">{t('result.insights')}</span>
            <span className="mt-1 block text-[15px] leading-relaxed">
              {topCat && t('result.topExpense', { cat: t(`expense.${topCat[0]}`), sum: formatMoney(topCat[1]) })}
              {topCat && topType ? ' ' : ''}
              {topType && topType[1] > 0 && t('result.topType', { type: wtLabel(workTypes.find((w) => w.id === topType[0]), lang), sum: formatMoney(topType[1]) })}
            </span>
          </Card>
        )}

        <button className="min-h-[48px] rounded-[14px] bg-white text-[15px] font-bold text-slate-700 shadow-card" onClick={() => navigate(`/objects/${id}/expenses`)}>
          {t('result.lists')} →
        </button>

        <div className="grid grid-cols-2 gap-2">
          <BigButton label={t('handover.buildAct')} tone="neutral" icon={<FileText size={20} aria-hidden="true" />} onClick={() => navigate(`/act?objectId=${id}`)} />
          <BigButton label={t('result.send')} tone="neutral" icon={<Send size={20} aria-hidden="true" />} onClick={() => void report()} />
        </div>
        {!closed && (
          <BigButton label={t('object.closeObject')} tone="dark" onClick={() => navigate(`/objects/${id}/close`, { state: { fromResult: true } })} testId="to-close" />
        )}
      </div>
    </div>
  );
}
