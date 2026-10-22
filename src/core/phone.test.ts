// Тесты телефонов: разбор, формат, код страны.
import { describe, it, expect } from 'vitest';
import {
  COUNTRIES, countryByCode, digitsOnly, formatNational, formatPhone, isComplete,
  maxDigits, parsePhone, phoneDigits, toE164,
} from './phone';

const KG = countryByCode('KG');
const KZ = countryByCode('KZ');
const RU = countryByCode('RU');

describe('страны', () => {
  it('по умолчанию Кыргызстан, неизвестный код → Кыргызстан', () => {
    expect(COUNTRIES[0].code).toBe('KG');
    expect(countryByCode(undefined).code).toBe('KG');
    expect(countryByCode('XX').code).toBe('KG');
    expect(countryByCode('UZ').dial).toBe('998');
  });

  it('длина номера без кода', () => {
    expect(maxDigits(KG)).toBe(9);
    expect(maxDigits(RU)).toBe(10);
  });
});

describe('formatNational', () => {
  it('по группам страны, неполный номер — сколько есть', () => {
    expect(formatNational('555123456', KG)).toBe('555 123 456');
    expect(formatNational('7011234567', KZ)).toBe('701 123 45 67');
    expect(formatNational('5551', KG)).toBe('555 1');
    expect(formatNational('', KG)).toBe('');
  });
});

describe('parsePhone', () => {
  it('международный формат с плюсом и пробелами', () => {
    const p = parsePhone('+996 555 12-34-56');
    expect(p.country.code).toBe('KG');
    expect(p.national).toBe('555123456');
  });

  it('+7: мобильные на 6 и 7 — Казахстан, остальные — Россия', () => {
    expect(parsePhone('+7 701 123 45 67').country.code).toBe('KZ');
    expect(parsePhone('+7 916 123 45 67').country.code).toBe('RU');
  });

  it('00 вместо плюса', () => {
    const p = parsePhone('00998 90 123 45 67');
    expect(p.country.code).toBe('UZ');
    expect(p.national).toBe('901234567');
  });

  it('местный ноль: 0555 123 456 → +996 555 123 456', () => {
    const p = parsePhone('0555 123 456');
    expect(p.country.code).toBe('KG');
    expect(p.national).toBe('555123456');
  });

  it('лишний ноль после кода: +996 0555 123 456', () => {
    expect(parsePhone('+996 0555 123 456').national).toBe('555123456');
  });

  it('код без плюса: 996555123456', () => {
    const p = parsePhone('996555123456');
    expect(p.country.code).toBe('KG');
    expect(p.national).toBe('555123456');
  });

  it('8 701… — старая запись Казахстана и России', () => {
    const p = parsePhone('8 701 123 45 67');
    expect(p.country.code).toBe('KZ');
    expect(p.national).toBe('7011234567');
    expect(parsePhone('8 916 123 45 67').country.code).toBe('RU');
  });

  it('местный номер в выбранной стране: ведущая 8 в Казахстане', () => {
    const p = parsePhone('87011234567', KZ);
    expect(p.country.code).toBe('KZ');
    expect(p.national).toBe('7011234567');
  });

  it('просто цифры без кода — в стране по умолчанию; лишнее отрезается', () => {
    expect(parsePhone('555123456').national).toBe('555123456');
    expect(parsePhone('5551234567').national).toBe('555123456');
    expect(parsePhone('+99655512345678').national).toBe('555123456');
  });

  it('длинный номер без известного кода остаётся в стране по умолчанию', () => {
    const p = parsePhone('5559876543210');
    expect(p.country.code).toBe('KG');
    expect(p.national).toBe('555987654');
  });

  it('пусто и мусор', () => {
    expect(parsePhone(undefined).national).toBe('');
    expect(parsePhone('  ').national).toBe('');
    expect(parsePhone('+').national).toBe('');
  });
});

describe('хранение и показ', () => {
  it('E.164 и пустой номер', () => {
    expect(toE164(KG, '555123456')).toBe('+996555123456');
    expect(toE164(KG, '')).toBe('');
  });

  it('полный ли номер: Корея бывает короче', () => {
    expect(isComplete(KG, '555123456')).toBe(true);
    expect(isComplete(KG, '55512345')).toBe(false);
    expect(isComplete(countryByCode('KR'), '212345678')).toBe(true);
  });

  it('formatPhone: красиво с кодом; мусор — как есть', () => {
    expect(formatPhone('+996555123456')).toBe('+996 555 123 456');
    expect(formatPhone('0555 123 456')).toBe('+996 555 123 456');
    expect(formatPhone('')).toBe('');
    expect(formatPhone(undefined)).toBe('');
    expect(formatPhone('звонить вечером')).toBe('звонить вечером');
  });

  it('цифры для WhatsApp и звонка', () => {
    expect(phoneDigits('+996555123456')).toBe('996555123456');
    expect(phoneDigits('0555 123 456')).toBe('996555123456');
    expect(phoneDigits(undefined)).toBe('');
    expect(phoneDigits('нет')).toBe('');
  });

  it('digitsOnly', () => {
    expect(digitsOnly('+996 (555) 12-34')).toBe('9965551234');
  });
});
