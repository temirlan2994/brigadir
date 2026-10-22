// Переключатель-сегменты (тип выплаты, способ, деление)
export function Segmented<T extends string>({ options, value, onChange, testIdPrefix }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testIdPrefix?: string;
}) {
  return (
    <div className="flex gap-1 rounded-[16px] bg-[#ece8df] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          data-testid={testIdPrefix ? `${testIdPrefix}-${o.value}` : undefined}
          className={`min-h-[46px] flex-1 rounded-[12px] px-2 text-[15px] leading-tight ${
            value === o.value ? 'bg-white font-bold shadow-sm' : 'font-semibold text-slate-600'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
