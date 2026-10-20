// Типы данных. Деньги — целые тыйыны (1 сом = 100 тыйын).
export type Money = number;

export type Lang = 'ru' | 'ky';
export type TaxMode = 'none' | 'percent' | 'fixedMonthly';

export interface Settings {
  id: 'main';
  lang: Lang;
  taxMode: TaxMode;
  taxPercent: number; // 4 = 4%
  taxFixedMonthly: Money;
  openingCash: Money; // начальный остаток кассы
  activeObjectId: string;
}

export interface SiteObject {
  id: string;
  name: string;
  customerName?: string;
  createdAt: string;
  archivedAt?: string;
}

export type Unit = 'м²' | 'м³' | 'кг' | 'т' | 'пог. м' | 'шт.' | 'точка' | 'смена' | 'час' | 'рейс';
export type CalcKind = 'area' | 'none';

export interface WorkType {
  id: string;
  nameRu: string;
  nameKy: string;
  icon: string; // имя пиктограммы
  unit: Unit;
  calc: CalcKind; // area = есть мини-калькулятор площади
  isFavorite: boolean;
  sortOrder: number;
  archivedAt?: string;
}

// Текущая расценка вида работы на объекте
export interface Rate {
  id: string;
  objectId: string;
  workTypeId: string;
  customerPrice: Money;
  workerPrice: Money;
  updatedAt: string;
}

export interface Worker {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  color: string; // цвет кружка с инициалами
  createdAt: string;
  archivedAt?: string;
}

export type SplitMode = 'equal' | 'shifts' | 'manual';

export interface Share {
  workerId: string;
  weight: number;
  amount: Money;
}

export interface WorkEntry {
  id: string;
  objectId: string;
  workTypeId: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  unit: string;
  customerPrice: Money; // снимок цены
  workerPrice: Money;
  customerTotal: Money; // quantity × цена, округлено
  workersTotal: Money;
  shares: Share[];
  splitMode: SplitMode;
  note?: string;
  photoIds: string[];
  accepted: boolean;
  acceptedAt?: string;
  createdAt: string;
  version: number;
  supersedesId?: string;
  deletedAt?: string;
}

export type PayoutKind = 'payout' | 'advance' | 'deduction';
export type PayMethod = 'cash' | 'transfer';

export interface Payout {
  id: string;
  objectId?: string;
  workerId: string;
  date: string;
  amount: Money;
  method: PayMethod;
  kind: PayoutKind; // deduction = удержание с рабочего
  note?: string;
  createdAt: string;
  deletedAt?: string;
}

export type ExpenseCategory =
  | 'transport' | 'fuel' | 'tools' | 'food'
  | 'housing' | 'materials' | 'rent' | 'other';

export interface Expense {
  id: string;
  objectId: string;
  date: string;
  category: ExpenseCategory;
  amount: Money;
  paidBy: 'contractor' | 'customer';
  note?: string;
  photoIds: string[];
  createdAt: string;
  deletedAt?: string;
}

// Поступление денег от заказчика
export interface Receipt {
  id: string;
  objectId: string;
  date: string;
  amount: Money;
  method: PayMethod;
  note?: string;
  createdAt: string;
  deletedAt?: string;
}

export type AdjustmentKind = 'retention' | 'penalty' | 'offset' | 'other';

// Уменьшает долг заказчика
export interface CustomerAdjustment {
  id: string;
  objectId: string;
  date: string;
  kind: AdjustmentKind;
  amount: Money;
  note?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface Photo {
  id: string;
  blob: Blob;
  createdAt: string;
}

export interface ChangeLog {
  id: string;
  at: string;
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'restore';
  summary: string;
}
