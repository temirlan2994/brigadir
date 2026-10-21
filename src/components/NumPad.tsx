import { Delete } from 'lucide-react';
import { useT } from '../i18n';

// Собственный нампад: 0–9, запятая, стереть. Системная клавиатура не вызывается.
export function NumPad({ value, onChange }: {
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useT();

  function press(key: string) {
    if (key === 'erase') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ',') {
      if (value.includes(',')) return;
      onChange(value === '' ? '0,' : `${value},`);
      return;
    }
    if (value === '0') {
      onChange(key);
      return;
    }
    if (value.replace(',', '').length >= 10) return;
    onChange(value + key);
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'erase'];

  return (
    <div className="grid grid-cols-3 gap-2" data-testid="numpad">
      {keys.map((key) => (
        <button
          key={key}
          data-key={key}
          aria-label={key === 'erase' ? t('common.erase') : key}
          className="flex min-h-[58px] items-center justify-center rounded-[14px] bg-paper text-[26px] font-semibold active:bg-line"
          onClick={() => press(key)}
        >
          {key === 'erase' ? <Delete size={26} aria-hidden="true" /> : key}
        </button>
      ))}
    </div>
  );
}
