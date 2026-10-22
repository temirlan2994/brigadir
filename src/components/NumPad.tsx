import { Delete } from 'lucide-react';
import { useT } from '../i18n';

// Собственный нампад: 0–9, запятая, стереть. Системная клавиатура не вызывается.
export function NumPad({ onKey, allowComma = true }: {
  onKey: (key: string) => void;
  allowComma?: boolean;
}) {
  const t = useT();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'erase'];

  return (
    <div className="grid grid-cols-3 gap-2" data-testid="numpad">
      {keys.map((key) => (
        <button
          key={key}
          data-key={key}
          aria-label={key === 'erase' ? t('common.erase') : key}
          disabled={key === ',' && !allowComma}
          className="flex min-h-[56px] items-center justify-center rounded-[14px] bg-paper text-[26px] font-semibold active:bg-line disabled:opacity-0"
          onClick={() => onKey(key)}
        >
          {key === 'erase' ? <Delete size={26} aria-hidden="true" /> : key}
        </button>
      ))}
    </div>
  );
}
