import { forwardRef, useEffect, useId, useImperativeHandle, useRef, type ReactNode } from 'react';
import { groupInput } from '../core/format';
import { useKeypad, type CloseReason } from '../state/keypad';

export interface NumFieldProps {
  label: string; // подпись над числом и на клавиатуре
  value: string; // строка ввода: "150000", "12,5"
  onChange: (value: string) => void;
  onCommit?: (value: string, reason: CloseReason) => void; // поле закрылось
  suffix?: string; // «сом», «%», «чел.», единица
  placeholder?: string;
  decimals?: number;
  maxDigits?: number;
  variant?: 'field' | 'cell' | 'hero';
  tone?: 'in' | 'out';
  keypadLabel?: string;
  autoOpen?: boolean;
  hint?: ReactNode;
  testId?: string;
  className?: string;
}

// Мигающий курсор в конце числа
export function Caret() {
  return <span className="caret" aria-hidden="true" />;
}

// Числовое поле: нажал — снизу выезжает нампад, цифры печатаются прямо здесь.
// Старое значение сначала выделено: первая цифра заменяет его, повторный тап — дописать.
export const NumField = forwardRef<{ open: () => void }, NumFieldProps>(function NumField({
  label, value, onChange, onCommit, suffix, placeholder, decimals = 2, maxDigits = 10,
  variant = 'field', tone, keypadLabel, autoOpen, hint, testId, className = '',
}, ref) {
  const id = useId();
  const active = useKeypad((s) => s.target?.id === id);
  const fresh = useKeypad((s) => s.target?.id === id && s.fresh);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  function open() {
    const keypad = useKeypad.getState();
    if (keypad.target?.id === id) {
      keypad.setFresh(false);
      return;
    }
    // Системная клавиатура не нужна — убираем её, если была
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== document.body) focused.blur();
    keypad.open({
      id, label: keypadLabel ?? label, decimals, maxDigits,
      get: () => valueRef.current,
      set: (v) => { valueRef.current = v; onChangeRef.current(v); },
      onClose: (reason) => onCommitRef.current?.(valueRef.current, reason),
    });
  }

  useImperativeHandle(ref, () => ({ open }));

  useEffect(() => {
    if (autoOpen) open();
    return () => {
      if (useKeypad.getState().target?.id === id) useKeypad.getState().close('unmount');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = groupInput(value);
  const text = (
    <>
      {shown
        ? <span className={fresh ? 'rounded bg-accent/40 px-0.5' : ''}>{shown}</span>
        : !active && <span className="font-medium text-slate-400">{placeholder ?? '0'}</span>}
      {active && !fresh && <Caret />}
      {suffix && (shown || active) && <>{' '}<span className="text-[0.8em] font-semibold text-slate-500">{suffix}</span></>}
    </>
  );

  if (variant === 'cell') {
    const color = tone === 'in' ? 'text-money-in' : tone === 'out' ? 'text-money-out' : '';
    return (
      <button
        type="button"
        data-numfield={id}
        data-testid={testId}
        aria-label={label}
        onClick={open}
        className={`min-w-[64px] rounded-lg px-2 py-1.5 text-right text-[16px] font-extrabold ${color} ${active ? 'bg-white ring-2 ring-accent' : 'bg-paper'} ${className}`}
      >
        {text}
      </button>
    );
  }

  if (variant === 'hero') {
    return (
      <button
        type="button"
        data-numfield={id}
        data-testid={testId}
        aria-label={label}
        onClick={open}
        className={`block w-full rounded-[16px] px-2 py-1 text-left text-[36px] font-black tracking-tight ${active ? 'bg-paper ring-2 ring-accent' : ''} ${className}`}
      >
        {text}
      </button>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        data-numfield={id}
        data-testid={testId}
        onClick={open}
        className={`block min-h-[60px] w-full rounded-[16px] border-[1.5px] bg-white px-3.5 py-2.5 text-left ${active ? 'border-ink ring-2 ring-accent' : 'border-line'}`}
      >
        <span className="block text-[12px] font-semibold text-slate-500">{label}</span>
        <span className="mt-0.5 block min-h-[27px] text-[18px] font-semibold">{text}</span>
      </button>
      {hint && <div className="px-1 pt-1 text-[13px] text-slate-500">{hint}</div>}
    </div>
  );
});
