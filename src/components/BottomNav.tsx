import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Users, Wallet } from 'lucide-react';
import { useT } from '../i18n';

// Нижняя навигация: всегда пиктограмма с подписью.
// История как в нативном приложении: вкладки не копятся в стеке,
// «Назад» с любой вкладки ведёт на главную, с главной — выход.
export function BottomNav() {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/works', icon: ClipboardList, label: t('nav.works') },
    { to: '/workers', icon: Users, label: t('nav.workers') },
    { to: '/money', icon: Wallet, label: t('nav.money') },
  ];

  function go(to: string) {
    if (to === pathname) return;
    if (to === '/') {
      // Схлопываем стек до первой записи (главной)
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) navigate(-idx);
      else navigate('/', { replace: true });
      return;
    }
    // С главной — одна новая запись; между вкладками — замена записи
    navigate(to, { replace: pathname !== '/' });
  }

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {tabs.map(({ to, icon: TabIcon, label }) => {
          const active = pathname === to;
          return (
            <button
              key={to}
              onClick={() => go(to)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 ${
                active ? 'text-orange-600' : 'text-slate-500'
              }`}
            >
              <TabIcon size={24} aria-hidden="true" />
              <span className="text-[13px] leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
