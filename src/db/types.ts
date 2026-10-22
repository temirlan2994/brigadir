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
  address?: string;
  counterpartyId?: string; // заказчик — кто платит
  // Снимок имени и телефона заказчика: экраны и акты читают их без поиска контрагента
  customerName?: string;
  customerPhone?: string;
  payment?: PaymentPlan;
  paymentTerms?: string; // другие договорённости о деньгах, своими словами
  createdAt: string;
  archivedAt?: string;
  closedAt?: string; // объект закрыт: расчёты завершены
}

// Контрагент: компания или человек, который платит. Сохраняется и выбирается снова.
export interface Counterparty {
  id: string;
  kind: 'company' | 'person';
  name: string; // название компании или ФИО
  contactName?: string; // кто на связи у компании
  phone?: string; // +996555123456
  inn?: string;
  address?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string;
}

// Когда наступает часть оплаты: сразу (аванс), после этапа (отметишь «сдан») или к дате
export type PartTrigger = 'start' | 'stage' | 'date';

export interface PlanPart {
  id: string;
  title: string;
  percent?: number; // доля, если делили в процентах
  amount: Money;
  trigger: PartTrigger;
  dueDate?: string; // YYYY-MM-DD
  doneAt?: string; // этап сдан — часть стала к оплате
}

export type ActsEvery = 'week' | 'twoWeeks' | 'month' | 'handover';

// Как платит заказчик.
// volume — за принятые объёмы по ценам за единицу (плюс аванс);
// fixed — общая сумма за объект, частями
export interface PaymentPlan {
  basis: 'volume' | 'fixed';
  total?: Money; // сумма договора или смета
  splitBy: 'percent' | 'amount';
  parts: PlanPart[];
  actsEvery?: ActsEvery;
}

// Стадия объекта по данным: что уже произошло
export type ObjectStage = 'taken' | 'working' | 'handing' | 'getting' | 'closed';

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

// Бригадир: Самат-подрядчик раздаёт объёмы бригадирам, у каждого своя бригада
export interface Worker {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  headcount?: number; // сколько человек в его бригаде
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
  acceptedQuantity?: number; // частичная приёмка: принятый объём
  acceptedTotal?: Money; // acceptedQuantity × customerPrice
  acceptNote?: string; // почему приняли не всё
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
  kind?: 'payment' | 'advance'; // аванс — деньги вперёд, до акта
  note?: string;
  createdAt: string;
  deletedAt?: string;
}

// Личные движения по кассе бригадира: взял себе / вложил свои
export interface CashMove {
  id: string;
  date: string;
  kind: 'draw' | 'contribution';
  amount: Money;
  note?: string;
  createdAt: string;
  deletedAt?: string;
}

// Кто сегодня вышел на объект
export interface Attendance {
  id: string;
  objectId: string;
  date: string;
  workerIds: string[];
  createdAt: string;
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
