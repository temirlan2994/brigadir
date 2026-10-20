import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Check, Plus } from 'lucide-react';
import { useT, useLangStore, formatDateShort } from '../i18n';
import { formatMoney } from '../core/format';
import { useFeed, useHomeSummary } from '../lib/summary';
import { useObjects, useWorkers } from '../lib/hooks';
import { loadDemo, startFresh, seedRatesForObject } from '../db/seed';
import { addObject, todayStr, updateSettings } from '../db/repo';
import { useToast } from '../state/toast';
import { Tile } from '../components/Tile';

// Главная: три числа, четыре кнопки, лента
export function Home() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const toast = useToast();
  const sum = useHomeSummary();
  const feed = useFeed(20);
  const workers = useWorkers();
  const objects = useObjects();
  const [showObjects, setShowObjects] = useState(false);
  const [newObjectName, setNewObjectName] = useState<string | null>(null);

  const isEmpty = workers.length === 0 && sum.entries.length === 0;

  async function createObject() {
    const name = (newObjectName ?? '').trim();
    if (!name) return;
    const obj = await addObject(name);
    await seedRatesForObject(obj.id);
    await updateSettings({ activeObjectId: obj.id });
    setNewObjectName(null);
    setShowObjects(false);
  }

  return (
    <div className="px-4">
      <header className="flex items-center justify-between py-3">
        <button className="min-h-[48px] text-left" onClick={() => setShowObjects(true)}>
          <span className="block text-[18px] font-semibold leading-tight">
            {sum.activeObject?.name ?? t('common.object')}
          </span>
          <span className="text-[14px] text-slate-500">{formatDateShort(todayStr(), lang)}</span>
        </button>
        <button
          aria-label={t('common.settings')}
          className="flex min-h-[48px] min-w-[48px] items-center justify-center gap-1 text-slate-500"
          onClick={() => navigate('/settings')}
        >
          <SettingsIcon size={24} aria-hidden="true" />
          <span className="sr-only">{t('common.settings')}</span>
        </button>
      </header>

      {isEmpty ? (
        <div className="flex flex-col gap-4 pt-10">
          <p className="text-center text-[22px] font-semibold leading-snug">{t('home.emptyTitle')}</p>
          <button
            data-testid="load-demo"
            className="min-h-[64px] rounded-2xl bg-orange-500 text-[20px] font-semibold text-white"
            onClick={() => void loadDemo().then(() => toast.show(t('common.saved')))}
          >
            {t('home.loadDemo')}
          </button>
          <button
            data-testid="start-clean"
            className="min-h-[64px] rounded-2xl bg-slate-100 text-[20px] font-semibold"
            onClick={() => void startFresh(t('objects.defaultName'))}
          >
            {t('home.startClean')}
          </button>
        </div>
      ) : (
        <>
          {/* Три числа; нажатие — список записей, из которых число сложилось */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <button data-testid="owed-to-me" className="flex w-full items-baseline justify-between py-1.5" onClick={() => navigate('/details/owed')}>
              <span className="text-[16px] text-slate-600">{t('home.owedToMe')}</span>
              <span className="text-[32px] font-bold leading-tight text-money-in">
                {sum.owedToMe < 0 ? t('home.customerOverpaid') : formatMoney(sum.owedToMe)}
              </span>
            </button>
            <button data-testid="owed-to-workers" className="flex w-full items-baseline justify-between py-1.5" onClick={() => navigate('/details/workers')}>
              <span className="text-[16px] text-slate-600">{t('home.owedToWorkers')}</span>
              <span className="text-[32px] font-bold leading-tight text-money-out">{formatMoney(sum.owed)}</span>
            </button>
            <button data-testid="free-cash" className="flex w-full items-baseline justify-between py-1.5" onClick={() => navigate('/details/free')}>
              <span className="text-[16px] text-slate-600">{t('home.free')}</span>
              <span className="text-[32px] font-bold leading-tight text-slate-900">{formatMoney(sum.free)}</span>
            </button>
            {sum.free < 0 && (
              <p data-testid="not-enough-banner" className="mt-2 rounded-xl bg-red-600 px-4 py-3 text-center text-[16px] font-semibold text-white">
                {t('home.notEnough')}
              </p>
            )}
          </section>

          {/* Четыре большие кнопки */}
          <section className="mt-4 grid grid-cols-2 gap-3">
            <Tile icon="hammer" label={t('home.didWork')} onClick={() => navigate('/work/new')} testId="btn-work" />
            <Tile icon="hardhat" label={t('home.paidWorkers')} onClick={() => navigate('/payout/new')} testId="btn-payout" />
            <Tile icon="truck" label={t('home.spent')} onClick={() => navigate('/expense/new')} testId="btn-expense" />
            <Tile icon="sack" label={t('home.received')} onClick={() => navigate('/receipt/new')} testId="btn-receipt" />
          </section>

          <button className="mt-3 w-full py-2 text-center text-[14px] text-slate-500" onClick={() => navigate('/details/profit')}>
            {t('home.profitForecast', { sum: formatMoney(sum.profit) })}
          </button>

          {/* Лента последних записей */}
          <section className="mt-2 flex flex-col gap-2 pb-4" data-testid="feed">
            {feed.map((row) => (
              <button
                key={row.key}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm"
                onClick={() => navigate(row.to)}
              >
                <span className={`rounded-lg px-2 py-0.5 text-[13px] font-medium ${
                  row.tone === 'in' ? 'bg-green-100 text-green-800'
                    : row.tone === 'out' ? 'bg-red-100 text-red-800'
                    : 'bg-sky-100 text-sky-800'
                }`}>
                  {t(row.typeKey)}
                </span>
                <span className="flex-1 truncate text-[16px]">{row.title}</span>
                <span className="text-right">
                  <span className={`block text-[16px] font-semibold ${
                    row.tone === 'in' ? 'text-money-in' : row.tone === 'out' ? 'text-money-out' : 'text-slate-900'
                  }`}>
                    {row.amountText}
                  </span>
                  <span className="block text-[13px] text-slate-400">{formatDateShort(row.date, lang)}</span>
                </span>
              </button>
            ))}
            {feed.length === 0 && (
              <p className="py-6 text-center text-[16px] text-slate-400">{t('common.empty')}</p>
            )}
          </section>
        </>
      )}

      {/* Переключение объекта */}
      {showObjects && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowObjects(false)}>
          <div className="w-full max-w-[430px] rounded-t-3xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="pb-2 text-[18px] font-semibold">{t('home.switchObject')}</h2>
            {objects.filter((o) => !o.archivedAt).map((o) => (
              <button
                key={o.id}
                className="flex min-h-[56px] w-full items-center justify-between border-b border-slate-100 text-left text-[18px]"
                onClick={() => { void updateSettings({ activeObjectId: o.id }); setShowObjects(false); }}
              >
                <span>{o.name}</span>
                {o.id === sum.activeObject?.id && <Check size={22} className="text-orange-500" aria-hidden="true" />}
              </button>
            ))}
            {newObjectName === null ? (
              <button
                className="mt-2 flex min-h-[56px] w-full items-center gap-2 text-[18px] text-orange-600"
                onClick={() => setNewObjectName('')}
              >
                <Plus size={22} aria-hidden="true" />
                {t('settings.newObject')}
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  className="min-h-[56px] flex-1 rounded-xl border border-slate-300 px-3 text-[18px]"
                  placeholder={t('settings.objectName')}
                  value={newObjectName}
                  onChange={(e) => setNewObjectName(e.target.value)}
                />
                <button className="min-h-[56px] rounded-xl bg-orange-500 px-4 text-[18px] font-semibold text-white" onClick={() => void createObject()}>
                  {t('common.add')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
