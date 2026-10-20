// Живые запросы к базе для экранов.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DEFAULT_SETTINGS } from '../db/repo';
import type {
  CustomerAdjustment, Expense, Payout, Receipt, Settings,
  SiteObject, WorkEntry, Worker, WorkType,
} from '../db/types';

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get('main'), []) ?? DEFAULT_SETTINGS;
}

export function useObjects(): SiteObject[] {
  return useLiveQuery(() => db.objects.toArray(), []) ?? [];
}

export function useActiveObject(): SiteObject | undefined {
  const settings = useSettings();
  const objects = useObjects();
  return objects.find((o) => o.id === settings.activeObjectId) ?? objects.find((o) => !o.archivedAt);
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

// Фильтр по объекту
export function byObject<T extends { objectId?: string }>(rows: T[], objectId?: string): T[] {
  if (!objectId) return rows;
  return rows.filter((r) => r.objectId === objectId);
}
