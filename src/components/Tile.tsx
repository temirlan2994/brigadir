import { Icon } from '../icons';

// Плитка: светлый фон, пиктограмма в кружке 56 px, слово 16 px под ней.
export function Tile({ icon, label, sub, onClick, selected, testId }: {
  icon: string;
  label: string;
  sub?: string;
  onClick: () => void;
  selected?: boolean;
  testId?: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`flex min-h-[112px] min-w-[96px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 ${
        selected ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
        <Icon name={icon} size={32} />
      </span>
      <span className="text-center text-[16px] leading-tight">{label}</span>
      {sub && <span className="text-[13px] text-slate-500">{sub}</span>}
    </button>
  );
}
