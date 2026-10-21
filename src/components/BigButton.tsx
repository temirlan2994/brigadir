import type { ReactNode } from 'react';

// Главная кнопка действия: во всю ширину, не ниже 60 px.
// primary — жёлтая (одно главное действие на экране), dark — чёрная, neutral — белая.
export function BigButton({ label, onClick, disabled, tone = 'primary', testId, icon }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'dark' | 'neutral' | 'danger';
  testId?: string;
  icon?: ReactNode;
}) {
  const tones = {
    primary: 'bg-accent text-ink active:brightness-95',
    dark: 'bg-dark text-white active:bg-slate-800',
    neutral: 'bg-white text-ink border-[1.5px] border-line active:bg-paper',
    danger: 'bg-money-out text-white active:brightness-95',
  };
  return (
    <button
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[60px] w-full items-center justify-center gap-2 rounded-[18px] px-4 text-[18px] font-bold disabled:opacity-40 ${tones[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}
