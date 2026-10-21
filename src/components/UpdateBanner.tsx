import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useT } from '../i18n';
import { useSw } from '../state/sw';

// Баннер «Вышло обновление»: нажатие на кнопку обновляет приложение.
export function UpdateBanner() {
  const t = useT();
  const reg = useSw((s) => s.reg);
  const setReg = useSw((s) => s.setReg);
  const setNeedRefresh = useSw((s) => s.setNeedRefresh);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      setReg(r ?? null);
    },
  });

  useEffect(() => {
    setNeedRefresh(needRefresh);
  }, [needRefresh, setNeedRefresh]);

  // Проверка новой версии раз в час; интервал чистится при размонтировании
  useEffect(() => {
    if (!reg) return;
    const id = setInterval(() => {
      void reg.update().catch(() => {});
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [reg]);

  if (!needRefresh) return null;

  return (
    <div className="no-print fixed left-1/2 top-2 z-[60] w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2">
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-white shadow-lg">
        <span className="text-[16px]">{t('update.available')}</span>
        <button
          data-testid="update-app"
          className="min-h-[48px] shrink-0 rounded-xl bg-orange-500 px-4 text-[16px] font-semibold"
          onClick={() => {
            void updateServiceWorker(true);
            // Страховка: если старый SW не передал контроль, перезагружаемся сами
            setTimeout(() => window.location.reload(), 1500);
          }}
        >
          {t('update.do')}
        </button>
      </div>
    </div>
  );
}
