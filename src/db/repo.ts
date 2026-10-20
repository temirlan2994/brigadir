// Репозиторий: создание, новая версия, мягкое удаление, восстановление, ChangeLog.
import { db } from './db';
import type {
  ChangeLog, CustomerAdjustment, Expense, Payout, Rate, Receipt,
  Settings, SiteObject, WorkEntry, Worker, WorkType, Money,
} from './types';

export const uid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

// Локальная дата устройства YYYY-MM-DD
export function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

async function log(entity: string, entityId: string, action: ChangeLog['action'], summary: string) {
  await db.changeLog.add({ id: uid(), at: nowIso(), entity, entityId, action, summary });
}

// --- Настройки ---

export const DEFAULT_SETTINGS: Settings = {
  id: 'main', lang: 'ru', taxMode: 'none', taxPercent: 4,
  taxFixedMonthly: 0, openingCash: 0, activeObjectId: '',
};

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('main')) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: 'main' });
}

// --- Объекты ---

export async function addObject(name: string, customerName?: string): Promise<SiteObject> {
  const obj: SiteObject = { id: uid(), name, customerName, createdAt: nowIso() };
  await db.objects.add(obj);
  await log('object', obj.id, 'create', name);
  return obj;
}

export async function updateObject(id: string, patch: Partial<SiteObject>) {
  await db.objects.update(id, patch);
  await log('object', id, 'update', patch.name ?? '');
}

// --- Расценки ---

export async function upsertRate(objectId: string, workTypeId: string, customerPrice: Money, workerPrice: Money) {
  const existing = await db.rates.where({ objectId, workTypeId }).first();
  if (existing) {
    await db.rates.update(existing.id, { customerPrice, workerPrice, updatedAt: nowIso() });
  } else {
    await db.rates.add({ id: uid(), objectId, workTypeId, customerPrice, workerPrice, updatedAt: nowIso() });
  }
}

export async function getRate(objectId: string, workTypeId: string): Promise<Rate | undefined> {
  return db.rates.where({ objectId, workTypeId }).first();
}

// --- Рабочие ---

export const WORKER_COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#14b8a6', '#6366f1'];

export async function addWorker(name: string, specialty?: string, phone?: string): Promise<Worker> {
  const count = await db.workers.count();
  const worker: Worker = {
    id: uid(), name, specialty, phone,
    color: WORKER_COLORS[count % WORKER_COLORS.length],
    createdAt: nowIso(),
  };
  await db.workers.add(worker);
  await log('worker', worker.id, 'create', name);
  return worker;
}

export async function updateWorker(id: string, patch: Partial<Worker>) {
  await db.workers.update(id, patch);
  await log('worker', id, 'update', patch.name ?? '');
}

// --- Записи работ ---

export async function addWorkEntry(data: Omit<WorkEntry, 'id' | 'createdAt' | 'version'>): Promise<WorkEntry> {
  const entry: WorkEntry = { ...data, id: uid(), createdAt: nowIso(), version: 1 };
  await db.workEntries.add(entry);
  await log('workEntry', entry.id, 'create', `${entry.quantity} ${entry.unit}`);
  return entry;
}

// Правка = новая версия поверх старой
export async function reviseWorkEntry(
  oldId: string,
  data: Omit<WorkEntry, 'id' | 'createdAt' | 'version' | 'supersedesId'>,
): Promise<WorkEntry> {
  const old = await db.workEntries.get(oldId);
  const entry: WorkEntry = {
    ...data, id: uid(), createdAt: nowIso(),
    version: (old?.version ?? 0) + 1, supersedesId: oldId,
  };
  await db.workEntries.add(entry);
  await log('workEntry', entry.id, 'update', `v${entry.version}: ${entry.quantity} ${entry.unit}`);
  return entry;
}

export async function acceptWorkEntries(ids: string[]) {
  const at = nowIso();
  for (const id of ids) {
    await db.workEntries.update(id, { accepted: true, acceptedAt: at });
    await log('workEntry', id, 'update', 'принято');
  }
}

export async function unacceptWorkEntry(id: string) {
  await db.workEntries.update(id, { accepted: false, acceptedAt: undefined });
  await log('workEntry', id, 'update', 'приёмка снята');
}

// --- Общие операции с журналами ---

type SoftTable = 'workEntries' | 'payouts' | 'expenses' | 'receipts' | 'adjustments';

export async function softDelete(table: SoftTable, id: string) {
  await db[table].update(id, { deletedAt: nowIso() });
  await log(table, id, 'delete', '');
}

export async function restore(table: SoftTable, id: string) {
  await db[table].update(id, { deletedAt: undefined });
  await log(table, id, 'restore', '');
}

// Жёсткое удаление — только для «Отменить» сразу после создания
export async function hardDelete(table: SoftTable, id: string) {
  await db[table].delete(id);
}

// --- Выплаты, расходы, поступления, корректировки ---

export async function addPayout(data: Omit<Payout, 'id' | 'createdAt'>): Promise<Payout> {
  const row: Payout = { ...data, id: uid(), createdAt: nowIso() };
  await db.payouts.add(row);
  await log('payout', row.id, 'create', String(row.amount));
  return row;
}

export async function updatePayout(id: string, patch: Partial<Payout>) {
  await db.payouts.update(id, patch);
  await log('payout', id, 'update', '');
}

export async function addExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const row: Expense = { ...data, id: uid(), createdAt: nowIso() };
  await db.expenses.add(row);
  await log('expense', row.id, 'create', String(row.amount));
  return row;
}

export async function updateExpense(id: string, patch: Partial<Expense>) {
  await db.expenses.update(id, patch);
  await log('expense', id, 'update', '');
}

export async function addReceipt(data: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt> {
  const row: Receipt = { ...data, id: uid(), createdAt: nowIso() };
  await db.receipts.add(row);
  await log('receipt', row.id, 'create', String(row.amount));
  return row;
}

export async function updateReceipt(id: string, patch: Partial<Receipt>) {
  await db.receipts.update(id, patch);
  await log('receipt', id, 'update', '');
}

export async function addAdjustment(data: Omit<CustomerAdjustment, 'id' | 'createdAt'>): Promise<CustomerAdjustment> {
  const row: CustomerAdjustment = { ...data, id: uid(), createdAt: nowIso() };
  await db.adjustments.add(row);
  await log('adjustment', row.id, 'create', String(row.amount));
  return row;
}

export async function updateAdjustment(id: string, patch: Partial<CustomerAdjustment>) {
  await db.adjustments.update(id, patch);
  await log('adjustment', id, 'update', '');
}

// --- Виды работ ---

export async function addWorkType(data: Omit<WorkType, 'id'>): Promise<WorkType> {
  const row: WorkType = { ...data, id: uid() };
  await db.workTypes.add(row);
  await log('workType', row.id, 'create', row.nameRu);
  return row;
}

export async function updateWorkType(id: string, patch: Partial<WorkType>) {
  await db.workTypes.update(id, patch);
}

// --- Фото ---

export async function addPhoto(blob: Blob): Promise<string> {
  const id = uid();
  await db.photos.add({ id, blob, createdAt: nowIso() });
  return id;
}

// --- Полная очистка ---

export async function wipeAll() {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
}
