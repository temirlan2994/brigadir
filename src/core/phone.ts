// Телефоны: страна с кодом, ввод номера без кода, хранение в виде +996555123456.

export interface Country {
  code: string; // ISO: KG, KZ…
  dial: string; // код без «+»
  groups: number[]; // как делить номер без кода: 555 123 456
  min?: number; // самый короткий номер без кода, если бывает короче
  ru: string;
  ky: string;
}

// Сначала свои и соседи — так их и показываем в выборе страны
export const COUNTRIES: Country[] = [
  { code: 'KG', dial: '996', groups: [3, 3, 3], ru: 'Кыргызстан', ky: 'Кыргызстан' },
  { code: 'KZ', dial: '7', groups: [3, 3, 2, 2], ru: 'Казахстан', ky: 'Казакстан' },
  { code: 'RU', dial: '7', groups: [3, 3, 2, 2], ru: 'Россия', ky: 'Россия' },
  { code: 'UZ', dial: '998', groups: [2, 3, 2, 2], ru: 'Узбекистан', ky: 'Өзбекстан' },
  { code: 'TJ', dial: '992', groups: [2, 3, 2, 2], ru: 'Таджикистан', ky: 'Тажикстан' },
  { code: 'TR', dial: '90', groups: [3, 3, 2, 2], ru: 'Турция', ky: 'Түркия' },
  { code: 'CN', dial: '86', groups: [3, 4, 4], ru: 'Китай', ky: 'Кытай' },
  { code: 'AE', dial: '971', groups: [2, 3, 4], ru: 'ОАЭ', ky: 'БАЭ' },
  { code: 'KR', dial: '82', groups: [2, 4, 4], min: 9, ru: 'Южная Корея', ky: 'Түштүк Корея' },
  { code: 'AZ', dial: '994', groups: [2, 3, 2, 2], ru: 'Азербайджан', ky: 'Азербайжан' },
  { code: 'GE', dial: '995', groups: [3, 2, 2, 2], ru: 'Грузия', ky: 'Грузия' },
  { code: 'AM', dial: '374', groups: [2, 3, 3], ru: 'Армения', ky: 'Армения' },
  { code: 'BY', dial: '375', groups: [2, 3, 2, 2], ru: 'Беларусь', ky: 'Беларусь' },
  { code: 'UA', dial: '380', groups: [2, 3, 2, 2], ru: 'Украина', ky: 'Украина' },
  { code: 'DE', dial: '49', groups: [3, 4, 4], min: 10, ru: 'Германия', ky: 'Германия' },
  { code: 'GB', dial: '44', groups: [4, 6], ru: 'Великобритания', ky: 'Улуу Британия' },
  { code: 'US', dial: '1', groups: [3, 3, 4], ru: 'США', ky: 'АКШ' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function countryByCode(code: string | undefined): Country {
  return COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
}

export function maxDigits(country: Country): number {
  return country.groups.reduce((s, g) => s + g, 0);
}

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

// Номер без кода по группам: "555123456" → "555 123 456"
export function formatNational(national: string, country: Country): string {
  const parts: string[] = [];
  let pos = 0;
  for (const g of country.groups) {
    if (pos >= national.length) break;
    parts.push(national.slice(pos, pos + g));
    pos += g;
  }
  return parts.join(' ');
}

// +7 общий у России и Казахстана: казахстанские мобильные начинаются на 6 или 7
function countryForDial(dial: string, national: string): Country {
  if (dial === '7') return countryByCode(/^[67]/.test(national) ? 'KZ' : 'RU');
  return COUNTRIES.find((c) => c.dial === dial)!;
}

export interface ParsedPhone {
  country: Country;
  national: string; // только цифры, без кода страны
}

// Разбор того, что вставили или взяли из контактов: «+7 701…», «0555 12 34 56», «996555…»
export function parsePhone(raw: string | undefined, fallback: Country = DEFAULT_COUNTRY): ParsedPhone {
  const text = (raw ?? '').trim();
  const digits = digitsOnly(text);
  const international = text.startsWith('+') || text.startsWith('00');
  const all = international && text.startsWith('00') ? digits.slice(2) : digits;
  // Код страны: самое длинное совпадение, если номер международный или длиннее местного
  if (international || all.length > maxDigits(fallback)) {
    const dials = [...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length);
    const dial = dials.find((d) => all.startsWith(d));
    if (dial) {
      let national = all.slice(dial.length);
      const country = countryForDial(dial, national);
      // «+996 0555…»: лишний местный ноль после кода
      if (national.length === maxDigits(country) + 1 && national[0] === '0') national = national.slice(1);
      return { country, national: national.slice(0, maxDigits(country)) };
    }
    // «8 701 123 45 67»: старая запись номеров России и Казахстана
    if (all.length === 11 && all[0] === '8') {
      const national = all.slice(1);
      return { country: countryForDial('7', national), national };
    }
  }
  // Местная запись с ведущим 0 (0555…) или 8 (8 701…)
  let national = all;
  if (national.length === maxDigits(fallback) + 1 && (national[0] === '0' || national[0] === '8')) {
    national = national.slice(1);
  }
  return { country: fallback, national: national.slice(0, maxDigits(fallback)) };
}

export function toE164(country: Country, national: string): string {
  return national ? `+${country.dial}${national}` : '';
}

export function isComplete(country: Country, national: string): boolean {
  return national.length >= (country.min ?? maxDigits(country));
}

// Для показа: +996 555 123 456
export function formatPhone(phone: string | undefined): string {
  if (!phone) return '';
  const { country, national } = parsePhone(phone);
  if (!national) return phone;
  return `+${country.dial} ${formatNational(national, country)}`;
}

// Номер для ссылки wa.me и tel: только цифры с кодом страны
export function phoneDigits(phone: string | undefined): string {
  if (!phone) return '';
  const { country, national } = parsePhone(phone);
  return national ? `${country.dial}${national}` : '';
}
