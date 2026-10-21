import type { ReactNode } from 'react';
import { NumPad } from './NumPad';
import { BigButton } from './BigButton';

// Закреплённая нижняя панель ввода: активное поле всегда видно над нампадом,
// крутить экран не нужно.
export function NumPadPanel({ label, value, onChange, hint, action }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  action?: { label: string; onClick: () => void; disabled?: boolean; testId?: string };
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-auto rounded-t-[24px] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(31,41,55,.08)]">
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <span className="truncate text-[14px] font-semibold text-slate-500">{label}</span>
        <span className="text-[30px] font-extrabold leading-tight" data-testid="active-value">{value || '0'}</span>
      </div>
      {hint}
      <NumPad value={value} onChange={onChange} />
      {action && (
        <div className="mt-3">
          <BigButton label={action.label} onClick={action.onClick} disabled={action.disabled} testId={action.testId} />
        </div>
      )}
    </div>
  );
}
