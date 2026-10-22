// Живые запросы к базе для экранов.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DEFAULT_SETTINGS } from '../db/repo';
import type {
  CustomerAdjustment, Expense, Payout, Receipt, Settings,
  SiteObject, WorkEntry, Worker, WorkType, CashMove, Attendance,
} from '../db/types';

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get('main'), []) ?? DEFAULT_SETTINGS;
}

export function useObjects(): SiteObject[] {
  return useLiveQuery(() => db.objects.toArray(), []) ?? [];
}

// Текущий объект — только открытый: закрытый или архивный не может принимать записи
export function useActiveObject(): SiteObject | undefined {
  const settings = useSettings();
  const objects = useObjects();
  const open = objects.filter((o) => !o.closedAt && !o.archivedAt);
  return open.find((o) => o.id === settings.activeObjectId) ?? open[0];
}

export function useWorkers(): Worker[] {
  return useLiveQuery(() => db.workers.toArray(), []) ?? [];
}

export function useWorkTypes(): WorkType[] {
  const types = useLiveQuery(() => db.workTypes.toArray(), []) ?? [];
  return [...types].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function useEntries(): WorkEntry[] {
  return useLiveQuery(() => db.workEntries.toArray(), []) ?? [];
}

export function usePayouts(): Payout[] {
  return useLiveQuery(() => db.payouts.toArray(), []) ?? [];
}

export function useExpenses(): Expense[] {
  return useLiveQuery(() => db.expenses.toArray(), []) ?? [];
}

export function useReceipts(): Receipt[] {
  return useLiveQuery(() => db.receipts.toArray(), []) ?? [];
}

export function useAdjustments(): CustomerAdjustment[] {
  return useLiveQuery(() => db.adjustments.toArray(), []) ?? [];
}

export function useCashMoves(): CashMove[] {
  return useLiveQuery(() => db.cashMoves.toArray(), []) ?? [];
}

// Кто вышел на объект в этот день (для чтения на «Сегодня»; экраны ввода
// делают самоидентифицирующийся запрос сами — см. AttendanceToday)
export function useAttendance(objectId: string | undefined, date: string): Attendance | null | undefined {
  return useLiveQuery(
    async () => (objectId ? (await db.attendance.where({ objectId, date }).first()) ?? null : null),
    [objectId, date],
  );
}

export function useObject(id: string | undefined): SiteObject | undefined {
  return useLiveQuery(async () => (id ? await db.objects.get(id) : undefined), [id]);
}

// Фильтр по объекту
export function byObject<T extends { objectId?: string }>(rows: T[], objectId?: string): T[] {
  if (!objectId) return rows;
  return rows.filter((r) => r.objectId === objectId);
}
