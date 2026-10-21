// Переключатель-сегменты (тип выплаты, способ, деление)
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-[16px] bg-[#ece8df] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[46px] flex-1 rounded-[12px] px-2 text-[15px] ${
            value === o.value ? 'bg-white font-bold shadow-sm' : 'font-semibold text-slate-600'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
