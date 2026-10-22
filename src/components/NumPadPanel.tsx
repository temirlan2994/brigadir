import { useRef, type ReactNode } from 'react';
import { NumPad } from './NumPad';
import { BigButton } from './BigButton';
import { applyKey } from '../core/format';

// Закреплённая нижняя клавиатура экрана суммы. Своего табло нет:
// цифры печатаются в поле на экране (крупная сумма сверху или выбранное поле).
// fresh — поле только что выбрано: первая цифра заменяет старое значение
export function NumPadPanel({ value, onChange, hint, action, decimals = 2, fresh, onFreshUsed }: {
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  action?: { label: string; onClick: () => void; disabled?: boolean; testId?: string };
  decimals?: number;
  fresh?: boolean;
  onFreshUsed?: () => void;
}) {
  // Два быстрых нажатия до перерисовки не должны терять цифру
  const valueRef = useRef(value);
  valueRef.current = value;
  const freshRef = useRef(fresh);
  freshRef.current = fresh;
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-auto rounded-t-[24px] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(31,41,55,.08)]">
      {hint}
      <NumPad
        onKey={(key) => {
          const next = applyKey(valueRef.current, key, { decimals, fresh: freshRef.current });
          valueRef.current = next;
          if (freshRef.current) {
            freshRef.current = false;
            onFreshUsed?.();
          }
          onChange(next);
        }}
        allowComma={decimals > 0}
      />
      {action && (
        <div className="mt-3">
          <BigButton label={action.label} onClick={action.onClick} disabled={action.disabled} testId={action.testId} />
        </div>
      )}
    </div>
  );
}
