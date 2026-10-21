import { todayStr } from '../db/repo';
import { useT, formatDateShort, useLangStore } from '../i18n';

// Дата: Сегодня / Вчера одной кнопкой / выбрать из календаря
export function DatePick({ value, onChange }: {
  value: string;
  onChange: (date: string) => void;
}) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const today = todayStr();
  const yesterday = todayStr(-1);
  const isOther = value !== today && value !== yesterday;

  const btn = (active: boolean) =>
    `min-h-[46px] flex-1 rounded-[12px] px-2 text-[15px] ${
      active ? 'bg-white font-bold shadow-sm' : 'font-semibold text-slate-600'
    }`;

  return (
    <div className="flex gap-1 rounded-[16px] bg-[#ece8df] p-1">
      <button className={btn(value === today)} onClick={() => onChange(today)}>
        {t('common.today')}
      </button>
      <button className={btn(value === yesterday)} onClick={() => onChange(yesterday)}>
        {t('common.yesterday')}
      </button>
      <label className={`${btn(isOther)} flex cursor-pointer items-center justify-center`}>
        <span>{isOther ? formatDateShort(value, lang) : t('common.pickDate')}</span>
        <input
          type="date"
          className="h-0 w-0 opacity-0"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
