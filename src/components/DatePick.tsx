import { todayStr } from '../db/repo';
import { useT, formatDateShort, useLangStore } from '../i18n';

// Дата: Сегодня / Вчера одной кнопкой / выбрать из календаря.
// Поле даты лежит прозрачно ПОВЕРХ кнопки — тап попадает прямо в него,
// и системный календарь открывается на любом телефоне.
export function DatePick({ value, onChange }: {
  value: string;
  onChange: (date: string) => void;
}) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const today = todayStr();
  const yesterday = todayStr(-1);
  const isOther = value !== today && value !== yesterday;

  const seg = (active: boolean) =>
    `min-h-[46px] rounded-[12px] px-2 text-[15px] ${
      active ? 'bg-white font-bold shadow-sm' : 'font-semibold text-slate-600'
    }`;

  return (
    <div className="flex gap-1 rounded-[16px] bg-[#ece8df] p-1">
      <button className={`flex-1 ${seg(value === today)}`} onClick={() => onChange(today)}>
        {t('common.today')}
      </button>
      <button className={`flex-1 ${seg(value === yesterday)}`} onClick={() => onChange(yesterday)}>
        {t('common.yesterday')}
      </button>
      <div className="relative min-w-0 flex-1">
        <span className={`flex h-full w-full items-center justify-center ${seg(isOther)}`}>
          {isOther ? formatDateShort(value, lang) : t('common.pickDate')}
        </span>
        <input
          type="date"
          aria-label={t('common.pickDate')}
          data-testid="date-input"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
