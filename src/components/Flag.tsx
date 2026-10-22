// Флаги стран для выбора кода телефона (flag-icons, MIT — см. src/assets/flags/LICENSE)
const FLAGS = import.meta.glob('../assets/flags/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function Flag({ code, className = '' }: { code: string; className?: string }) {
  const src = FLAGS[`../assets/flags/${code.toLowerCase()}.svg`];
  return (
    <span className={`inline-block h-[18px] w-6 shrink-0 overflow-hidden rounded-[3px] bg-line shadow-[0_0_0_1px_rgba(0,0,0,.08)] ${className}`}>
      {src && <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />}
    </span>
  );
}
