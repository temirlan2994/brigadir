// Формат денег и разбор ввода. Деньги — целые тыйыны.
import type { Money } from '../db/types';

// Разряды через пробел: 78000 → "78 000"
export function groupDigits(n: number): string {
  const sign = n < 0 ? '−' : '';
  const digits = String(Math.abs(n));
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ' ';
    out += digits[i];
  }
  return sign + out;
}

// 7 800 000 тыйын → "78 000 сом" (без копеек, с округлением)
export function formatMoney(tyiyn: Money): string {
  return `${groupDigits(Math.round(tyiyn / 100))} сом`;
}

// С копейками через запятую: 1 666 667 → "16 666,67 сом" (для выписки и акта)
export function formatMoneyExact(tyiyn: Money): string {
  const sign = tyiyn < 0 ? '−' : '';
  const abs = Math.abs(Math.round(tyiyn));
  const soms = Math.floor(abs / 100);
  const kop = abs % 100;
  return `${sign}${groupDigits(soms)},${String(kop).padStart(2, '0')} сом`;
}

// Число без единицы: 28.5 → "28,5"
export function formatQuantity(q: number): string {
  const [int, frac] = String(q).split('.');
  return frac ? `${groupDigits(Number(int))},${frac}` : groupDigits(Number(int));
}

// Разбор ввода нампада: запятая и точка работают одинаково
export function parseDecimal(input: string): number {
  const normalized = input.replace(',', '.').trim();
  if (normalized === '' || normalized === '.') return 0;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

// Сомы из строки нампада → тыйыны (целое)
export function somsToTyiyn(input: string): Money {
  return Math.round(parseDecimal(input) * 100);
}

// Тыйыны → строка в сомах для поля ввода (без группировки)
export function tyiynToSomsInput(tyiyn: Money): string {
  const soms = tyiyn / 100;
  return Number.isInteger(soms) ? String(soms) : String(soms).replace('.', ',');
}

export interface KeyOptions {
  decimals?: number; // знаков после запятой; 0 — только целые
  maxDigits?: number;
  fresh?: boolean; // значение выделено: первая клавиша заменяет его целиком
}

// Строка поля после нажатия клавиши нампада: цифра, «,» или «erase»
export function applyKey(value: string, key: string, opts: KeyOptions = {}): string {
  const decimals = opts.decimals ?? 2;
  const maxDigits = opts.maxDigits ?? 10;
  const base = opts.fresh ? '' : value;
  if (key === 'erase') return base.slice(0, -1);
  if (key === ',') {
    if (decimals === 0 || base.includes(',')) return base;
    return base === '' ? '0,' : `${base},`;
  }
  if (base === '0') return key;
  const frac = base.split(',')[1];
  if (frac !== undefined && frac.length >= decimals) return base;
  if (base.replace(',', '').length >= maxDigits) return base;
  return base + key;
}

// Строка поля с разрядами для показа: "1234567,5" → "1 234 567,5"
export function groupInput(raw: string): string {
  if (raw === '') return '';
  const [int, frac] = raw.split(',');
  const grouped = groupDigits(Number(int));
  return frac !== undefined ? `${grouped},${frac}` : grouped;
}

// Процент для показа: 33.3 → "33,3"
export function formatPercent(p: number): string {
  const rounded = Math.round(p * 10) / 10;
  return String(rounded).replace('.', ',');
}
