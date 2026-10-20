// База Dexie: foremanDb, версия 1.
import Dexie, { type Table } from 'dexie';
import type {
  Settings, SiteObject, WorkType, Rate, Worker, WorkEntry,
  Payout, Expense, Receipt, CustomerAdjustment, Photo, ChangeLog,
} from './types';

export class ForemanDb extends Dexie {
  settings!: Table<Settings, string>;
  objects!: Table<SiteObject, string>;
  workTypes!: Table<WorkType, string>;
  rates!: Table<Rate, string>;
  workers!: Table<Worker, string>;
  workEntries!: Table<WorkEntry, string>;
  payouts!: Table<Payout, string>;
  expenses!: Table<Expense, string>;
  receipts!: Table<Receipt, string>;
  adjustments!: Table<CustomerAdjustment, string>;
  photos!: Table<Photo, string>;
  changeLog!: Table<ChangeLog, string>;

  constructor() {
    super('foremanDb');
    this.version(1).stores({
      settings: 'id',
      objects: 'id, createdAt',
      workTypes: 'id, sortOrder',
      rates: 'id, objectId, workTypeId, [objectId+workTypeId]',
      workers: 'id, createdAt',
      workEntries: 'id, objectId, date, createdAt, deletedAt',
      payouts: 'id, workerId, objectId, date, deletedAt',
      expenses: 'id, objectId, date, deletedAt',
      receipts: 'id, objectId, date, deletedAt',
      adjustments: 'id, objectId, date, deletedAt',
      photos: 'id',
      changeLog: 'id, at, entityId',
    });
  }
}

export const db = new ForemanDb();
