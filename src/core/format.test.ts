// Тесты формата денег и разбора ввода.
import { describe, it, expect } from 'vitest';
import {
  groupDigits, formatMoney, formatMoneyExact, formatQuantity,
  parseDecimal, somsToTyiyn, tyiynToSomsInput, applyKey, groupInput, formatPercent,
} from './format';

describe('applyKey — ввод с нампада', () => {
  it('цифры дописываются, ноль в начале заменяется', () => {
    expect(applyKey('', '5')).toBe('5');
    expect(applyKey('12', '3')).toBe('123');
    expect(applyKey('0', '7')).toBe('7');
  });

  it('стереть убирает последний знак', () => {
    expect(applyKey('123', 'erase')).toBe('12');
    expect(applyKey('', 'erase')).toBe('');
  });

  it('запятая одна; пустое поле → «0,»; целые поля запятую не берут', () => {
    expect(applyKey('', ',')).toBe('0,');
    expect(applyKey('12', ',')).toBe('12,');
    expect(applyKey('12,5', ',')).toBe('12,5');
    expect(applyKey('12', ',', { decimals: 0 })).toBe('12');
  });

  it('знаков после запятой не больше decimals', () => {
    expect(applyKey('12,34', '5')).toBe('12,34');
    expect(applyKey('12,3', '4', { decimals: 3 })).toBe('12,34');
  });

  it('не больше maxDigits цифр', () => {
    expect(applyKey('1234567890', '1')).toBe('1234567890');
    expect(applyKey('12', '3', { maxDigits: 2 })).toBe('12');
  });

  it('выделенное значение заменяется первой клавишей', () => {
    expect(applyKey('600', '7', { fresh: true })).toBe('7');
    expect(applyKey('600', 'erase', { fresh: true })).toBe('');
    expect(applyKey('600', ',', { fresh: true })).toBe('0,');
  });
});

describe('groupInput / formatPercent', () => {
  it('разряды в строке поля, дробная часть как есть', () => {
    expect(groupInput('')).toBe('');
    expect(groupInput('1500000')).toBe('1 500 000');
    expect(groupInput('1234,5')).toBe('1 234,5');
    expect(groupInput('0,')).toBe('0,');
  });

  it('процент с одной цифрой после запятой', () => {
    expect(formatPercent(30)).toBe('30');
    expect(formatPercent(33.333)).toBe('33,3');
  });
});

describe('formatMoney', () => {
  it('7 800 000 тыйын → 78 000 сом', () => {
    expect(formatMoney(7_800_000)).toBe('78 000 сом');
  });

  it('1 666 667 тыйын → 16 667 сом (округление)', () => {
    expect(formatMoney(1_666_667)).toBe('16 667 сом');
  });

  it('отрицательные и маленькие', () => {
    expect(formatMoney(-400_000)).toBe('−4 000 сом');
    expect(formatMoney(0)).toBe('0 сом');
    expect(formatMoney(50)).toBe('1 сом');
  });
});

describe('formatMoneyExact', () => {
  it('1 666 667 → 16 666,67 сом', () => {
    expect(formatMoneyExact(1_666_667)).toBe('16 666,67 сом');
  });

  it('копейки дополняются нулём, минус сохраняется', () => {
    expect(formatMoneyExact(100_005)).toBe('1 000,05 сом');
    expect(formatMoneyExact(-7_000)).toBe('−70,00 сом');
  });
});

describe('groupDigits', () => {
  it('разряды через пробел', () => {
    expect(groupDigits(78_000)).toBe('78 000');
    expect(groupDigits(1_234_567)).toBe('1 234 567');
    expect(groupDigits(999)).toBe('999');
    expect(groupDigits(-5_000)).toBe('−5 000');
  });
});

describe('formatQuantity', () => {
  it('целые и дробные', () => {
    expect(formatQuantity(1200)).toBe('1 200');
    expect(formatQuantity(28.5)).toBe('28,5');
  });
});

describe('parseDecimal / somsToTyiyn', () => {
  it('запятая и точка работают одинаково', () => {
    expect(parseDecimal('28,5')).toBe(28.5);
    expect(parseDecimal('28.5')).toBe(28.5);
    expect(parseDecimal('1200')).toBe(1200);
  });

  it('пустое и мусор → 0', () => {
    expect(parseDecimal('')).toBe(0);
    expect(parseDecimal('.')).toBe(0);
    expect(parseDecimal('abc')).toBe(0);
  });

  it('сомы → тыйыны', () => {
    expect(somsToTyiyn('65')).toBe(6_500);
    expect(somsToTyiyn('0,5')).toBe(50);
  });
});

describe('tyiynToSomsInput', () => {
  it('целое и с копейками', () => {
    expect(tyiynToSomsInput(6_500)).toBe('65');
    expect(tyiynToSomsInput(6_550)).toBe('65,5');
  });
});
