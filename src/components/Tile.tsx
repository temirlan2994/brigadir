import { Icon } from '../icons';

// Плитка: белая карточка, пиктограмма в квадрате, слово под ней.
export function Tile({ icon, label, sub, onClick, selected, testId, size = 'md' }: {
  icon: string;
  label: string;
  sub?: string;
  onClick: () => void;
  selected?: boolean;
  testId?: string;
  size?: 'md' | 'sm';
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`flex min-w-[96px] flex-col items-center justify-center gap-2 rounded-[18px] p-3 shadow-card ${
        size === 'sm' ? 'min-h-[96px]' : 'min-h-[112px]'
      } ${selected ? 'bg-amber-50 ring-2 ring-accent' : 'bg-white'}`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-paper text-ink">
        <Icon name={icon} size={26} />
      </span>
      <span className="text-center text-[15px] font-semibold leading-tight">{label}</span>
      {sub && <span className="text-[13px] font-medium text-slate-500">{sub}</span>}
    </button>
  );
}
