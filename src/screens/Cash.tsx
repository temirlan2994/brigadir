import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useT, useLangStore, formatDateShort, translate } from '../i18n';
import { useFeed, useHomeSummary, wtLabel } from '../lib/summary';
import { useObjects, useWorkers, useWorkTypes } from '../lib/hooks';
import { activeEntries, notDeleted, payoutsFromCash, contractorExpensesTotal, receiptsTotal, cashMovesNet } from '../core/calc';
import { formatMoney } from '../core/format';
import { toCsv, downloadText } from '../lib/files';
import { BigButton } from '../components/BigButton';
import { Card, DarkCard, Pill, SectionTitle, Tag } from '../components/ui';

// Касса: деньги по всем объектам, из чего сложилось, хватит ли на зарплату
export function Cash() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const sum = useHomeSummary();
  const feed = useFeed(30);
  const objects = useObjects();
  const workers = useWorkers();
  const workTypes = useWorkTypes();

  const received = receiptsTotal(sum.receipts);
  const paidOut = payoutsFromCash(sum.payouts);
  const expenses = contractorExpensesTotal(sum.expenses);
  const movesNet = cashMovesNet(sum.moves);

  function exportCsv() {
    const act = activeEntries(sum.entries);
    const soms = (tyiyn: number) => (tyiyn / 100).toFixed(2).replace('.', ',');
    const objName = (id?: string) => objects.find((o) => o.id === id)?.name ?? '';
    const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? '';
    const L = (key: string) => translate(lang, key);

    downloadText('raboty.csv', toCsv(
      [L('common.date'), L('common.object'), L('works.filterType'), L('works.quantity'), L('settings.unit'), L('wizard.customerPrice'), L('wizard.workerPrice'), L('wizard.customerTotal'), L('wizard.workersTotal'), L('works.statusAccepted'), L('common.note')],
      act.map((e) => [e.date, objName(e.objectId), wtLabel(workTypes.find((w) => w.id === e.workTypeId), lang), String(e.quantity).replace('.', ','), e.unit, soms(e.customerPrice), soms(e.workerPrice), soms(e.customerTotal), soms(e.workersTotal), e.accepted ? String(e.acceptedQuantity ?? e.quantity).replace('.', ',') : '0', e.note ?? '']),
    ), 'text/csv;charset=utf-8');
    downloadText('vydachi.csv', toCsv(
      [L('common.date'), L('common.object'), L('workers.name'), L('common.sum'), L('adjustment.kind'), L('common.method'), L('common.note')],
      notDeleted(sum.payouts).map((p) => [p.date, objName(p.objectId), workerName(p.workerId), soms(p.amount), L(p.kind === 'advance' ? 'feed.advance' : p.kind === 'deduction' ? 'feed.deduction' : 'feed.payout'), L(p.method === 'cash' ? 'payout.cash' : 'payout.transfer'), p.note ?? '']),
    ), 'text/csv;charset=utf-8');
    downloadText('rashody.csv', toCsv(
      [L('common.date'), L('common.object'), L('expense.pickCategory'), L('common.sum'), L('expense.whoPays'), L('common.note')],
      notDeleted(sum.expenses).map((e) => [e.date, objName(e.objectId), L(`expense.${e.category}`), soms(e.amount), e.paidBy === 'contractor' ? L('expense.me') : L('expense.customer'), e.note ?? '']),
    ), 'text/csv;charset=utf-8');
    downloadText('postupleniya.csv', toCsv(
      [L('common.date'), L('common.object'), L('common.sum'), L('adjustment.kind'), L('common.method'), L('common.note')],
      notDeleted(sum.receipts).map((r) => [r.date, objName(r.objectId), soms(r.amount), L(r.kind === 'advance' ? 'feed.customerAdvance' : 'feed.receipt'), L(r.method === 'cash' ? 'payout.cash' : 'payout.transfer'), r.note ?? '']),
    ), 'text/csv;charset=utf-8');
    downloadText('kassa.csv', toCsv(
      [L('common.date'), L('adjustment.kind'), L('common.sum'), L('common.note')],
      notDeleted(sum.moves).map((m) => [m.date, L(m.kind === 'draw' ? 'cash.drawTitle' : 'cash.contributionTitle'), soms(m.amount), m.note ?? '']),
    ), 'text/csv;charset=utf-8');
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex items-baseline justify-between py-4">
        <h1 className="text-[24px] font-extrabold">{t('nav.cash')}</h1>
        <span className="text-[14px] font-medium text-slate-500">{t('cash.allObjects')}</span>
      </div>
      <div className="flex flex-col gap-3">
        <DarkCard>
          <span className="text-[14px] font-medium text-white/65">{t('cash.now')}</span>
          <span className="mt-1 block text-[40px] font-black leading-none tracking-tight" data-testid="cash-value">{formatMoney(sum.cash)}</span>
          <div className="mt-3 flex flex-col gap-1 text-[14px] text-white/85">
            <span className="flex justify-between"><span>{t('cash.opening')}</span><b>{formatMoney(sum.settings.openingCash)}</b></span>
            <span className="flex justify-between"><span>+ {t('cash.fromCustomers')}</span><b className="text-[#86efac]">{formatMoney(received)}</b></span>
            <span className="flex justify-between"><span>− {t('cash.paidTeam')}</span><b className="text-[#fca5a5]">{formatMoney(paidOut)}</b></span>
            <span className="flex justify-between"><span>− {t('cash.expenses')}</span><b className="text-[#fca5a5]">{formatMoney(expenses)}</b></span>
            {movesNet !== 0 && (
              <span className="flex justify-between"><span>{movesNet > 0 ? '+' : '−'} {t('cash.personal')}</span><b className={movesNet > 0 ? 'text-[#86efac]' : 'text-[#fca5a5]'}>{formatMoney(Math.abs(movesNet))}</b></span>
            )}
          </div>
        </DarkCard>

        <Card>
          <span className="flex items-center justify-between gap-2">
            <span>
              <span className="block text-[14px] font-medium text-slate-500">{t('cash.enoughQuestion')}</span>
              <span className="block text-[16px] font-bold">
                {t('cash.enoughLine', { owed: formatMoney(sum.owed) })} <span className={sum.free >= 0 ? 'text-money-in' : 'text-money-out'}>{formatMoney(sum.free)}</span>
              </span>
            </span>
            <Pill tone={sum.free >= 0 ? 'green' : 'red'}>{sum.free >= 0 ? t('common.yes') : t('common.no')}</Pill>
          </span>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <BigButton label={t('cash.draw')} tone="neutral" onClick={() => navigate('/cashmove/new?kind=draw')} testId="btn-draw" />
          <BigButton label={t('cash.contribute')} tone="neutral" onClick={() => navigate('/cashmove/new?kind=contribution')} testId="btn-contribute" />
        </div>

        <SectionTitle>{t('cash.recent')}</SectionTitle>
        {feed.map((row) => (
          <button key={row.key} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 text-left shadow-card" onClick={() => navigate(row.to)}>
            <Tag kind={row.tagKind} label={t(row.typeKey)} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold">{row.title}</span>
              <span className="block truncate text-[13px] font-medium text-slate-500">{formatDateShort(row.date, lang)}{row.sub ? ` · ${row.sub}` : ''}</span>
            </span>
            <span className={`text-[17px] font-extrabold ${row.tone === 'in' ? 'text-money-in' : row.tone === 'out' ? 'text-money-out' : ''}`}>{row.amountText}</span>
          </button>
        ))}
        {feed.length === 0 && <p className="py-4 text-center text-[15px] text-slate-400">{t('common.empty')}</p>}

        <BigButton label={t('cash.exportCsv')} tone="neutral" icon={<FileText size={20} aria-hidden="true" />} onClick={exportCsv} testId="export-csv" />
      </div>
    </div>
  );
}
