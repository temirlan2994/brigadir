import { initials } from '../lib/files';
import type { Worker } from '../db/types';

// Кружок рабочего с инициалами
export function WorkerCircle({ worker, size = 48 }: { worker: Worker; size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: worker.color, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(worker.name)}
    </span>
  );
}
