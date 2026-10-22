import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Icon } from '../icons';
import { useT } from '../i18n';
import type { ObjectStage } from '../db/types';

// Белая карточка
export function Card({ children, className = '', onClick, testId }: {
  children: ReactNode; className?: string; onClick?: () => void; testId?: string;
}) {
  const cls = `rounded-[22px] bg-white p-4 shadow-card ${className}`;
  if (onClick) {
    return <button data-testid={testId} className={`w-full text-left ${cls}`} onClick={onClick}>{children}</button>;
  }
  return <div data-testid={testId} className={cls}>{children}</div>;
}

// Тёмная карточка для главной суммы
export function DarkCard({ children, className = '', tone = 'dark' }: {
  children: ReactNode; className?: string; tone?: 'dark' | 'green' | 'red';
}) {
  const bg = tone === 'green' ? 'bg-[#14532d]' : tone === 'red' ? 'bg-[#7f1d1d]' : 'bg-dark';
  return <div className={`rounded-[22px] p-4 text-white shadow-card ${bg} ${className}`}>{children}</div>;
}

// Строка «подпись — значение»
export function KvRow({ label, value, strong, tone }: {
  label: string; value: string; strong?: boolean; tone?: 'in' | 'out';
}) {
  const color = tone === 'in' ? 'text-money-in' : tone === 'out' ? 'text-money-out' : '';
  return (
    <div className={`flex items-center justify-between border-b border-[#f0ece3] py-2 last:border-b-0 ${strong ? 'text-[17px]' : 'text-[15px]'}`}>
      <span className={strong ? 'font-bold' : 'text-slate-700'}>{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

// Пункт-ссылка с пиктограммой: «Работы · 12 записей ›»
export function MenuRow({ icon, title, sub, onClick, testId }: {
  icon: string; title: string; sub?: string; onClick: () => void; testId?: string;
}) {
  return (
    <button data-testid={testId} onClick={onClick} className="flex min-h-[72px] w-full items-center gap-3.5 rounded-[18px] bg-white px-4 py-3 text-left shadow-card">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-paper text-ink">
        <Icon name={icon} size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-bold">{title}</span>
        {sub && <span className="block truncate text-[13px] font-medium text-slate-500">{sub}</span>}
      </span>
      <ChevronRight size={22} className="shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  );
}

// Цветная метка типа записи
export function Tag({ kind, label }: { kind: 'work' | 'pay' | 'exp' | 'rec' | 'grey'; label: string }) {
  const cls = {
    work: 'bg-[#e8eef9] text-[#1e3a8a]',
    pay: 'bg-[#fde8e8] text-money-out',
    exp: 'bg-[#fff1d6] text-[#92400e]',
    rec: 'bg-[#e6f4ea] text-money-in',
    grey: 'bg-[#ece8df] text-slate-600',
  }[kind];
  return <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[12px] font-extrabold uppercase tracking-wide ${cls}`}>{label}</span>;
}

// Строка ленты: сверху что и сколько, снизу метка типа и подробности.
// Метка не отнимает место у названия — «Аванс заказчика» не обрезает «Наличные»
export function FeedItem({ tagKind, tagLabel, title, sub, amount, tone, onClick }: {
  tagKind: 'work' | 'pay' | 'exp' | 'rec' | 'grey';
  tagLabel: string;
  title: string;
  sub?: string;
  amount: string;
  tone?: 'in' | 'out' | 'muted' | 'plain';
  onClick: () => void;
}) {
  const color = tone === 'in' ? 'text-money-in' : tone === 'out' ? 'text-money-out' : tone === 'muted' ? 'text-slate-500' : '';
  return (
    <button className="flex w-full flex-col gap-1.5 rounded-[16px] bg-white px-3.5 py-3 text-left shadow-card" onClick={onClick}>
      <span className="flex w-full items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[16px] font-semibold">{title}</span>
        <span className={`shrink-0 text-[17px] font-extrabold ${color}`}>{amount}</span>
      </span>
      <span className="flex w-full min-w-0 items-center gap-2">
        <Tag kind={tagKind} label={tagLabel} />
        {sub && <span className="min-w-0 truncate text-[13px] font-medium text-slate-500">{sub}</span>}
      </span>
    </button>
  );
}

// Маленькая плашка-статус
export function Pill({ tone, children }: { tone: 'yellow' | 'green' | 'red' | 'grey'; children: ReactNode }) {
  const cls = {
    yellow: 'bg-accent text-ink',
    green: 'bg-[#e6f4ea] text-money-in',
    red: 'bg-[#fde8e8] text-money-out',
    grey: 'bg-[#ece8df] text-slate-600',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${cls}`}>{children}</span>;
}

// Заголовок раздела в списке
export function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="px-1 pt-2 text-[13px] font-extrabold uppercase tracking-wider text-slate-500">{children}</p>;
}

const STAGES: ObjectStage[] = ['taken', 'working', 'handing', 'getting', 'closed'];

// Полоска стадий объекта: взял → работаем → сдаём → получаем → закрыл
export function StageStrip({ stage }: { stage: ObjectStage }) {
  const t = useT();
  const current = STAGES.indexOf(stage);
  return (
    <div className="flex gap-1" data-testid="stage-strip">
      {STAGES.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'next';
        return (
          <div key={s} className="flex-1 text-center">
            <div className={`mb-1.5 h-1.5 rounded-full ${state === 'now' ? 'bg-accent' : state === 'done' ? 'bg-slate-400' : 'bg-line'}`} />
            <span className={`text-[12px] font-bold ${state === 'now' ? 'text-ink' : state === 'done' ? 'text-slate-600' : 'text-slate-400'}`}>
              {t(`stage.${s}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Поле формы с подписью (системная клавиатура — только для текста)
export function TextField({ label, value, onChange, placeholder, inputMode, autoFocus, testId, autoComplete, className = '' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  inputMode?: 'text' | 'tel' | 'numeric'; autoFocus?: boolean; testId?: string;
  autoComplete?: string; className?: string;
}) {
  return (
    <label className={`block rounded-[16px] border-[1.5px] border-line bg-white px-3.5 py-2.5 focus-within:border-ink ${className}`}>
      <span className="block text-[12px] font-semibold text-slate-500">{label}</span>
      <input
        data-testid={testId}
        autoFocus={autoFocus}
        inputMode={inputMode}
        autoComplete={autoComplete ?? 'off'}
        className="mt-0.5 w-full bg-transparent text-[18px] font-semibold outline-none placeholder:font-medium placeholder:text-slate-400"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// Кружок с первыми буквами имени
export function Initials({ name, size = 44, dark }: { name: string; size?: number; dark?: boolean }) {
  const letters = name.replace(/[«»"']/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${dark ? 'bg-dark text-white' : 'bg-[#ece8df] text-ink'}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {letters || '?'}
    </span>
  );
}

// Подпись над группой полей
export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="block px-1 pb-1 text-[13px] font-bold text-slate-600">{children}</span>;
}

// Кнопки-фишки: выбор одного из нескольких (необязательный)
export function Chips<T extends string>({ options, value, onChange, testIdPrefix }: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  testIdPrefix?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-testid={testIdPrefix ? `${testIdPrefix}-${o.value}` : undefined}
          className={`min-h-[44px] rounded-full px-4 text-[15px] font-bold ${value === o.value ? 'bg-ink text-white' : 'bg-white text-ink shadow-card'}`}
          onClick={() => onChange(value === o.value ? undefined : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
