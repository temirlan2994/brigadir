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
    <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-slate-200 bg-slate-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <span className="truncate text-[14px] text-slate-500">{label}</span>
        <span className="text-[30px] font-bold leading-tight" data-testid="active-value">{value || '0'}</span>
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
