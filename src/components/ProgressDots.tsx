// Точки прогресса мастера
export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-2 py-2" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i <= current ? 'bg-orange-500' : 'bg-slate-300'}`}
        />
      ))}
    </div>
  );
}
