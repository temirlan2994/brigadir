// База Dexie: foremanDb, версия 1.
import Dexie, { type Table } from 'dexie';
import type {
  Settings, SiteObject, WorkType, Rate, Worker, WorkEntry,
  Payout, Expense, Receipt, CustomerAdjustment, Photo, ChangeLog,
  CashMove, Attendance,
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
  cashMoves!: Table<CashMove, string>;
  attendance!: Table<Attendance, string>;

  constructor() {
    super('foremanDb');
    const v1 = {
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
    };
    this.version(1).stores(v1);
    // v2: личные движения кассы и «кто вышел»
    this.version(2).stores({
      ...v1,
      cashMoves: 'id, date, deletedAt',
      attendance: 'id, objectId, date, [objectId+date]',
    });
  }
}

export const db = new ForemanDb();
