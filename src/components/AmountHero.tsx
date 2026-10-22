import { groupInput } from '../core/format';
import { Caret } from './NumField';

// Крупная сумма вверху экрана ввода: цифры с нампада внизу печатаются сюда
export function AmountHero({ label, value, suffix, fresh, sub, testId = 'amount-field' }: {
  label: string;
  value: string;
  suffix: string;
  fresh?: boolean;
  sub?: string;
  testId?: string;
}) {
  const shown = groupInput(value);
  return (
    <div className="rounded-[20px] border-2 border-ink bg-white px-4 py-3 shadow-card" data-testid={testId}>
      <span className="block text-[13px] font-semibold text-slate-500">{label}</span>
      <span className="mt-0.5 flex items-baseline whitespace-nowrap text-[40px] font-black leading-tight tracking-tight">
        {shown
          ? <span className={fresh ? 'rounded bg-accent/40 px-1' : ''}>{shown}</span>
          : <span className="text-slate-300">0</span>}
        {!fresh && <Caret />}
        {' '}
        <span className="ml-1 text-[22px] font-bold text-slate-400">{suffix}</span>
      </span>
      {sub && <span className="block text-[13px] font-medium text-slate-500">{sub}</span>}
    </div>
  );
}
