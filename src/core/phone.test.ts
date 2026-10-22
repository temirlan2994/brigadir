// Тесты телефонов: разбор, формат, код страны.
import { describe, it, expect } from 'vitest';
import {
  COUNTRIES, countryByCode, digitsOnly, formatNational, formatPhone, guessCustomerKind, isComplete,
  maxDigits, normalizePhone, parsePhone, phoneDigits, toE164, typedNational,
} from './phone';

describe('чужой код страны не подменяется своим', () => {
  it('+48 — не из списка: known=false, все цифры как есть', () => {
    const p = parsePhone('+48 512 345 678');
    expect(p.known).toBe(false);
    expect(p.national).toBe('48512345678');
    expect(phoneDigits('+48 512 345 678')).toBe('48512345678');
    expect(formatPhone('+48 512 345 678')).toBe('+48 512 345 678');
    expect(normalizePhone('+48 512 345 678')).toBe('+48512345678');
  });

  it('свои коды — known=true', () => {
    expect(parsePhone('+996555123456').known).toBe(true);
    expect(parsePhone('0555123456').known).toBe(true);
    expect(parsePhone('+').known).toBe(false);
  });

  it('несколько номеров через запятую — берётся первый', () => {
    expect(parsePhone('0555123456, 0700123456').national).toBe('555123456');
    expect(parsePhone('0555 12 34 56 / 0700 12 34 56').national).toBe('555123456');
  });
});

describe('typedNational — номер набирают по цифре', () => {
  const KG2 = countryByCode('KG');
  const KZ2 = countryByCode('KZ');
  it('ведущий 0 — местный префикс, отбрасывается', () => {
    expect(typedNational('0555123456', KG2)).toBe('555123456');
    expect(typedNational('0', KG2)).toBe('');
  });

  it('повтор кода страны «996…» убирается, когда цифр больше, чем в номере', () => {
    expect(typedNational('99655512', KG2)).toBe('99655512');
    expect(typedNational('9965551234', KG2)).toBe('5551234');
  });

  it('«8» России и Казахстана перед 10 цифрами убирается', () => {
    expect(typedNational('87011234567', KZ2)).toBe('7011234567');
    expect(typedNational('8701123456', KZ2)).toBe('8701123456');
  });

  it('лишние цифры без кода отрезаются', () => {
    expect(typedNational('5551234567', KG2)).toBe('555123456');
  });
});

describe('normalizePhone и вид заказчика', () => {
  it('старые записи — к виду +996…, короткий мусор — как был', () => {
    expect(normalizePhone('+996 555 123 456')).toBe('+996555123456');
    expect(normalizePhone('0700 11 22 33')).toBe('+996700112233');
    expect(normalizePhone(' 12-34 ')).toBe('12-34');
    expect(normalizePhone('+')).toBe('+');
  });

  it('компания или человек по названию', () => {
    expect(guessCustomerKind('ОсОО Курулуш')).toBe('company');
    expect(guessCustomerKind('ИП Асанов')).toBe('company');
    expect(guessCustomerKind('СтройКом')).toBe('company');
    expect(guessCustomerKind('«Ала-Тоо»')).toBe('company');
    expect(guessCustomerKind('Асан Акматов')).toBe('person');
    expect(guessCustomerKind('Комил')).toBe('person');
  });
});

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
