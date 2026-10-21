import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Building2, Users, Wallet } from 'lucide-react';
import { useT } from '../i18n';

// Нижняя навигация: Сегодня · Объекты · Бригада · Касса. Всегда пиктограмма с подписью.
// История как в нативном приложении: вкладки не копятся в стеке,
// «Назад» с любой вкладки ведёт на «Сегодня», с него — выход.
export function BottomNav() {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { to: '/', icon: Sun, label: t('nav.today') },
    { to: '/objects', icon: Building2, label: t('nav.objects') },
    { to: '/team', icon: Users, label: t('nav.team') },
    { to: '/cash', icon: Wallet, label: t('nav.cash') },
  ];

  function go(to: string) {
    if (to === pathname) return;
    if (to === '/') {
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) navigate(-idx);
      else navigate('/', { replace: true });
      return;
    }
    navigate(to, { replace: pathname !== '/' });
  }

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {tabs.map(({ to, icon: TabIcon, label }) => {
          const active = pathname === to;
          return (
            <button
              key={to}
              data-testid={`tab-${to === '/' ? 'today' : to.slice(1)}`}
              onClick={() => go(to)}
              className={`flex min-h-[72px] flex-col items-center justify-center gap-1 text-[12px] ${
                active ? 'font-extrabold text-ink' : 'font-semibold text-slate-500'
              }`}
            >
              <span className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? 'bg-accent' : ''}`}>
                <TabIcon size={22} strokeWidth={2.2} aria-hidden="true" />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
