import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useT } from '../i18n';
import type { ReactNode } from 'react';

// Шапка экрана с кнопкой «Назад»
export function ScreenHeader({ title, onBack, right }: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  const t = useT();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-2">
      <button
        className="flex min-h-[48px] items-center pr-2 pl-1 text-slate-600"
        onClick={onBack ?? (() => navigate(-1))}
      >
        <ChevronLeft size={26} aria-hidden="true" />
        <span className="text-[16px]">{t('common.back')}</span>
      </button>
      <h1 className="flex-1 truncate text-center text-[18px] font-semibold">{title}</h1>
      <div className="min-w-[64px] text-right">{right}</div>
    </header>
  );
}
