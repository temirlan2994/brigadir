// Главная кнопка действия: во всю ширину, не ниже 64 px.
export function BigButton({ label, onClick, disabled, tone = 'primary', testId }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'neutral' | 'danger';
  testId?: string;
}) {
  const tones = {
    primary: 'bg-orange-500 text-white active:bg-orange-600',
    neutral: 'bg-slate-100 text-slate-800 active:bg-slate-200',
    danger: 'bg-red-600 text-white active:bg-red-700',
  };
  return (
    <button
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[64px] w-full rounded-2xl text-[20px] font-semibold disabled:opacity-40 ${tones[tone]}`}
    >
      {label}
    </button>
  );
}
