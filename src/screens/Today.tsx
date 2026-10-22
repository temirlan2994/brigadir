import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, ChevronDown, Check, Plus } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { formatMoney } from '../core/format';
import { useFeed, useHomeSummary } from '../lib/summary';
import { useObjects, useWorkers, useAttendance } from '../lib/hooks';
import { loadDemo } from '../db/seed';
import { todayStr, updateSettings } from '../db/repo';
import { useToast } from '../state/toast';
import { Tile } from '../components/Tile';
import { BigButton } from '../components/BigButton';
import { Card, DarkCard, Pill, SectionTitle, Tag } from '../components/ui';

// «Сегодня»: свободно ли на зарплату, одна большая кнопка «Записать работу», лента
export function Today() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const sum = useHomeSummary();
  const objects = useObjects();
  const workers = useWorkers();
  const feed = useFeed(20, sum.activeObject?.id);
  const attendance = useAttendance(sum.activeObject?.id, todayStr());
  const [showObjects, setShowObjects] = useState(false);

  const openObjects = objects.filter((o) => !o.closedAt && !o.archivedAt);
  const today = todayStr();
  const yesterday = todayStr(-1);
  const evening = new Date().getHours() >= 18;
  const nothingToday = evening && sum.todayEntries.length === 0;

  // Нет ни одного открытого объекта (первый запуск или все закрыты) — начинаем с объекта
  if (objects.length === 0 || !sum.activeObject) {
    return (
      <div className="flex min-h-screen flex-col px-4">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-[24px] font-extrabold">{t('app.name')}</h1>
          <button aria-label={t('common.settings')} className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500" onClick={() => navigate('/settings')}>
            <SettingsIcon size={24} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-10 flex flex-col gap-4">
          <p className="text-[24px] font-extrabold leading-snug">{objects.length === 0 ? t('welcome.title') : t('welcome.allClosed')}</p>
          <p className="text-[16px] leading-relaxed text-slate-600">{objects.length === 0 ? t('welcome.text') : t('welcome.allClosedText')}</p>
          <BigButton label={t('welcome.newObject')} onClick={() => navigate('/objects/new')} testId="start-new-object" />
          {objects.length === 0 ? (
            <BigButton
              label={t('welcome.demo')}
              tone="neutral"
              testId="load-demo"
              onClick={() => void loadDemo().then(() => toast.show(t('common.saved')))}
            />
          ) : (
            <BigButton label={t('nav.objects')} tone="neutral" onClick={() => navigate('/objects')} />
          )}
        </div>
      </div>
    );
  }

  const groups: { label: string; rows: typeof feed }[] = [];
  for (const row of feed) {
    const label = row.date === today ? t('common.today') : row.date === yesterday ? t('common.yesterday') : formatDateShort(row.date, lang);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }

  const attendanceNames = attendance
    ? attendance.workerIds.map((id) => workers.find((w) => w.id === id)?.name).filter(Boolean).join(', ')
    : '';

  return (
    <div className="px-4 pb-4">
      <header className="flex items-center justify-between py-4">
        <button className="min-w-0 text-left" onClick={() => setShowObjects(true)} data-testid="object-switch">
          <span className="flex items-center gap-1 text-[24px] font-extrabold leading-tight">
            <span className="truncate">{sum.activeObject?.name ?? t('common.object')}</span>
            <ChevronDown size={20} className="shrink-0 text-slate-400" aria-hidden="true" />
          </span>
          <span className="block text-[14px] font-medium text-slate-500">{formatDateShort(today, lang)}</span>
        </button>
        <button aria-label={t('common.settings')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-slate-500" onClick={() => navigate('/settings')}>
          <SettingsIcon size={24} aria-hidden="true" />
          <span className="sr-only">{t('common.settings')}</span>
        </button>
      </header>

      <div className="flex flex-col gap-3">
        {/* Главное число: свободно ли на зарплату */}
        <DarkCard tone={sum.free < 0 ? 'red' : 'dark'}>
          <button className="w-full text-left" onClick={() => navigate('/cash')} data-testid="free-cash">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-medium text-white/65">{t('today.freeForPayroll')}</span>
              <Pill tone={sum.free < 0 ? 'red' : 'yellow'}>{sum.free < 0 ? t('today.notEnough') : t('today.enough')}</Pill>
            </span>
            <span className="mt-1 block whitespace-nowrap text-[38px] font-black leading-none tracking-tight">
              {formatMoney(sum.free)}
            </span>
            <span className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[14px]">
              <span className="whitespace-nowrap"><span className="text-white/65">{t('today.inCash')} </span>{formatMoney(sum.cash)}</span>
              <span className="whitespace-nowrap" data-testid="owed-to-workers"><span className="text-white/65">{t('today.oweTeam')} </span>{formatMoney(sum.owed)}</span>
            </span>
          </button>
        </DarkCard>

        <div className="grid grid-cols-2 gap-3">
          <Card className="!p-3.5" onClick={() => sum.activeObject && navigate(`/objects/${sum.activeObject.id}/money`)} testId="owed-to-me">
            <span className="block text-[14px] font-medium text-slate-500">
              {sum.advanceLeft > 0 ? t('today.advanceLeft') : t('today.customerOwes')}
            </span>
            <span className={`block whitespace-nowrap text-[20px] font-extrabold ${sum.advanceLeft > 0 ? 'text-ink' : 'text-money-in'}`}>
              {formatMoney(sum.advanceLeft > 0 ? sum.advanceLeft : sum.owedToMe)}
            </span>
          </Card>
          <Card className="!p-3.5" onClick={() => sum.activeObject && navigate(`/objects/${sum.activeObject.id}/handover`)} testId="not-handed">
            <span className="block text-[14px] font-medium text-slate-500">{t('today.notHanded')}</span>
            <span className="block whitespace-nowrap text-[20px] font-extrabold">{formatMoney(sum.notAccepted)}</span>
          </Card>
        </div>

        <BigButton
          label={t('today.recordWork')}
          icon={<Plus size={24} strokeWidth={2.6} aria-hidden="true" />}
          onClick={() => navigate('/work/new')}
          testId="btn-work"
        />

        <div className="grid grid-cols-3 gap-2.5">
          <Tile icon="hardhat" label={t('today.paid')} onClick={() => navigate('/payout/new')} testId="btn-payout" size="sm" />
          <Tile icon="truck" label={t('today.spent')} onClick={() => navigate('/expense/new')} testId="btn-expense" size="sm" />
          <Tile icon="sack" label={t('today.received')} onClick={() => navigate('/receipt/new')} testId="btn-receipt" size="sm" />
        </div>

        {workers.length > 0 && (
          <Card className="!py-3" onClick={() => navigate('/attendance')} testId="attendance-row">
            <span className="block text-[13px] font-semibold text-slate-500">{t('today.whoCame')}</span>
            <span className="block text-[16px] font-semibold">
              {attendanceNames || t('today.whoCameEmpty')}
            </span>
          </Card>
        )}

        {nothingToday && (
          <div className="rounded-[18px] bg-[#fff6d6] px-4 py-3 text-[15px] font-semibold text-[#7a5a00]">
            {t('today.nudge')}
          </div>
        )}

        {groups.map((g) => (
          <div key={g.label} className="flex flex-col gap-2">
            <SectionTitle>{g.label}</SectionTitle>
            {g.rows.map((row) => (
              <button key={row.key} className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 text-left shadow-card" onClick={() => navigate(row.to)}>
                <Tag kind={row.tagKind} label={t(row.typeKey)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{row.title}</span>
                  {row.sub && <span className="block truncate text-[13px] font-medium text-slate-500">{row.sub}</span>}
                </span>
                <span className={`text-[17px] font-extrabold ${row.tone === 'in' ? 'text-money-in' : row.tone === 'out' ? 'text-money-out' : ''}`}>
                  {row.amountText}
                </span>
              </button>
            ))}
          </div>
        ))}
        {feed.length === 0 && (
          <p className="py-6 text-center text-[16px] text-slate-400">{t('today.emptyFeed')}</p>
        )}
      </div>

      {showObjects && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowObjects(false)}>
          <div className="w-full max-w-[430px] rounded-t-[28px] bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="pb-2 text-[18px] font-extrabold">{t('today.switchObject')}</h2>
            {openObjects.map((o) => (
              <button
                key={o.id}
                className="flex min-h-[56px] w-full items-center justify-between border-b border-line text-left text-[17px] font-semibold"
                onClick={() => { void updateSettings({ activeObjectId: o.id }); setShowObjects(false); }}
              >
                <span>{o.name}{o.customerName && <span className="font-medium text-slate-500"> · {o.customerName}</span>}</span>
                {o.id === sum.activeObject?.id && <Check size={22} className="text-ink" aria-hidden="true" />}
              </button>
            ))}
            <div className="pt-3">
              <BigButton label={t('objects.new')} tone="dark" icon={<Plus size={22} aria-hidden="true" />} onClick={() => { setShowObjects(false); navigate('/objects/new'); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
