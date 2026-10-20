import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, Users, Wallet } from 'lucide-react';
import { useT } from '../i18n';

// Нижняя навигация: всегда пиктограмма с подписью
export function BottomNav() {
  const t = useT();
  const tabs = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/works', icon: ClipboardList, label: t('nav.works') },
    { to: '/workers', icon: Users, label: t('nav.workers') },
    { to: '/money', icon: Wallet, label: t('nav.money') },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {tabs.map(({ to, icon: TabIcon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-h-[64px] flex-col items-center justify-center gap-0.5 ${
                isActive ? 'text-orange-600' : 'text-slate-500'
              }`
            }
          >
            <TabIcon size={24} aria-hidden="true" />
            <span className="text-[13px] leading-tight">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
