import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Contact, Search } from 'lucide-react';
import { useT, useLangStore } from '../i18n';
import {
  COUNTRIES, digitsOnly, formatNational, formatPhone, isComplete, maxDigits, parsePhone, toE164,
  typedNational, type Country,
} from '../core/phone';
import { contactsSupported, pickContact, type PickedContact } from '../lib/contacts';
import { Flag } from './Flag';
import { Sheet } from './Sheet';

// Номер без кода из сохранённого +996…: для выбранной страны — без повторного угадывания
function nationalOf(value: string, country: Country): string {
  const prefix = `+${country.dial}`;
  return value.startsWith(prefix) ? digitsOnly(value.slice(prefix.length)) : parsePhone(value, country).national;
}

// Позиция в отформатированном номере сразу после n-й цифры
function caretAfterDigits(formatted: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) seen++;
    if (seen === n) return i + 1;
  }
  return formatted.length;
}

// Телефон: слева флаг и код страны (+996 по умолчанию), справа — номер без кода.
// Тап по флагу — другая страна. Кнопка «из контактов» — где телефон это умеет.
export function PhoneField({ label, value, onChange, onContact, testId }: {
  label: string;
  value: string; // +996555123456 или пусто
  onChange: (phone: string) => void;
  onContact?: (contact: PickedContact) => void;
  testId?: string;
}) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const [country, setCountry] = useState<Country>(() => parsePhone(value).country);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [choices, setChoices] = useState<PickedContact | null>(null);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emitted = useRef(value);
  const caretDigits = useRef<number | null>(null);

  // Номер пришёл снаружи (контакт, загрузка) — подстраиваем страну
  useEffect(() => {
    if (value !== emitted.current && value) setCountry(parsePhone(value).country);
    emitted.current = value;
  }, [value]);

  // Номер с кодом не из списка (+48…) показываем и храним как набран
  const free = value !== '' && !parsePhone(value).known;
  const national = free ? '' : nationalOf(value, country);
  const formatted = free ? value : formatNational(national, country);

  useLayoutEffect(() => {
    if (caretDigits.current === null || !inputRef.current) return;
    const pos = caretAfterDigits(formatted, caretDigits.current);
    inputRef.current.setSelectionRange(pos, pos);
    caretDigits.current = null;
  }, [formatted]);

  function send(next: string) {
    emitted.current = next;
    onChange(next);
  }

  function emit(c: Country, digits: string) {
    send(toE164(c, digits.slice(0, maxDigits(c))));
  }

  // Разобранный номер: страна из списка — по коду, чужая — как набрали, «+» и цифры
  function emitParsed(raw: string) {
    const parsed = parsePhone(raw, country);
    if (!parsed.known) {
      send(`+${parsed.national}`);
      return;
    }
    setCountry(parsed.country);
    emit(parsed.country, parsed.national);
  }

  function onInput(raw: string, caret: number | null) {
    const digits = digitsOnly(raw);
    // Набирают с «+» или вставили номер целиком (с кодом, с 0 впереди) — разбираем
    if (raw.trim().startsWith('+') || free || digits.length - national.length > 1) {
      if (!digits && !raw.trim().startsWith('+')) send('');
      else emitParsed(raw);
      return;
    }
    const before = digitsOnly(raw.slice(0, caret ?? raw.length)).length;
    // Стёрли пробел между группами — стираем цифру перед ним
    if (digits === national && raw.length < formatted.length && before > 0) {
      caretDigits.current = before - 1;
      emit(country, national.slice(0, before - 1) + national.slice(before));
      return;
    }
    caretDigits.current = before;
    emit(country, typedNational(digits, country));
  }

  function chooseCountry(c: Country) {
    setCountry(c);
    emit(c, national);
    setPicker(false);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function applyNumber(contact: PickedContact, tel: string) {
    emitParsed(tel);
    onContact?.({ ...contact, tels: [tel] });
    setChoices(null);
  }

  async function fromContacts() {
    const contact = await pickContact();
    if (!contact) return;
    if (contact.tels.length > 1) setChoices(contact);
    else if (contact.tels.length === 1) applyNumber(contact, contact.tels[0]);
    else onContact?.(contact);
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace('+', '');
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.ru.toLowerCase().includes(q) || c.ky.toLowerCase().includes(q) || c.dial.startsWith(q));
  }, [query]);

  const missing = (country.min ?? maxDigits(country)) - national.length;
  const showIncomplete = touched && national.length > 0 && !isComplete(country, national);

  return (
    <div>
      <div className="rounded-[16px] border-[1.5px] border-line bg-white px-3.5 py-2 focus-within:border-ink">
        <span className="block text-[12px] font-semibold text-slate-500">{label}</span>
        <div className="mt-0.5 flex items-center gap-2">
          <button
            type="button"
            className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-[10px] bg-paper px-2 text-[17px] font-bold"
            onClick={() => setPicker(true)}
            aria-label={`${t('phone.country')}: ${lang === 'ky' ? country.ky : country.ru}`}
            data-testid={testId ? `${testId}-country` : undefined}
          >
            {free ? <span className="px-1">+…</span> : <><Flag code={country.code} />+{country.dial}</>}
            <ChevronDown size={16} className="text-slate-400" aria-hidden="true" />
          </button>
          <input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            data-testid={testId}
            className="min-w-0 flex-1 bg-transparent text-[18px] font-semibold outline-none placeholder:font-medium placeholder:text-slate-300"
            placeholder={country.code === 'KG' ? '555 123 456' : formatNational('0'.repeat(maxDigits(country)), country)}
            value={formatted}
            onChange={(e) => onInput(e.target.value, e.target.selectionStart)}
            onBlur={() => setTouched(true)}
          />
          {contactsSupported() && (
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-paper text-ink"
              onClick={() => void fromContacts()}
              aria-label={t('phone.fromContacts')}
              data-testid={testId ? `${testId}-contacts` : undefined}
            >
              <Contact size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {showIncomplete && (
        <p className="px-1 pt-1 text-[13px] font-semibold text-money-out">{t('phone.incomplete', { n: missing })}</p>
      )}

      {picker && (
        <Sheet onClose={() => { setPicker(false); setQuery(''); }} title={t('phone.countryTitle')}>
          <label className="flex min-h-[52px] items-center gap-2 rounded-[14px] border-[1.5px] border-line px-3">
            <Search size={18} className="text-slate-400" aria-hidden="true" />
            <input
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
              placeholder={t('phone.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="flex flex-col">
            {list.map((c) => (
              <button
                key={c.code}
                className={`flex min-h-[54px] items-center gap-3 border-b border-[#f0ece3] px-1 text-left ${c.code === country.code ? 'font-extrabold' : 'font-semibold'}`}
                onClick={() => chooseCountry(c)}
                data-testid={`country-${c.code}`}
              >
                <Flag code={c.code} />
                <span className="flex-1 text-[17px]">{lang === 'ky' ? c.ky : c.ru}</span>
                <span className="text-[16px] text-slate-500">+{c.dial}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {choices && (
        <Sheet onClose={() => setChoices(null)} title={t('phone.pickNumber')}>
          <p className="text-[15px] font-semibold text-slate-500">{choices.name}</p>
          {choices.tels.map((tel) => (
            <button key={tel} className="min-h-[56px] rounded-[14px] bg-paper px-4 text-left text-[18px] font-bold" onClick={() => applyNumber(choices, tel)}>
              {formatPhone(tel) || tel}
            </button>
          ))}
        </Sheet>
      )}
    </div>
  );
}
