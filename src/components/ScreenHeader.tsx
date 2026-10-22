import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useT } from '../i18n';
import type { ReactNode } from 'react';

// Шапка экрана: назад, крупный заголовок, подзаголовок, действие справа
export function ScreenHeader({ title, sub, onBack, right, noBack }: {
  title: string;
  sub?: string;
  onBack?: () => void;
  right?: ReactNode;
  noBack?: boolean;
}) {
  const navigate = useNavigate();
  const t = useT();

  // Первая запись истории (перезагрузка на внутреннем экране) — выходим на «Сегодня»
  function defaultBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx === 0) navigate('/', { replace: true });
    else navigate(-1);
  }
  return (
    <header className="flex items-center gap-2 px-3 pb-2 pt-4">
      {!noBack && (
        <button
          aria-label={t('common.back')}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink active:bg-line"
          onClick={onBack ?? defaultBack}
        >
          <ChevronLeft size={28} strokeWidth={2.4} aria-hidden="true" />
          <span className="sr-only">{t('common.back')}</span>
        </button>
      )}
      <div className={`min-w-0 flex-1 ${noBack ? 'pl-2' : ''}`}>
        <h1 className="line-clamp-2 text-[24px] font-extrabold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="truncate text-[14px] font-medium text-slate-500">{sub}</p>}
      </div>
      {right && <div className="shrink-0 pr-1">{right}</div>}
    </header>
  );
}
