// Словари и хук t(). Хардкод строк в компонентах запрещён.
import { create } from 'zustand';
import ru from './ru.json';
import ky from './ky.json';
import type { Lang } from '../db/types';

type Dict = Record<string, string>;
const dicts: Record<Lang, Dict> = { ru: ru as Dict, ky: ky as Dict };

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: 'ru',
  setLang: (lang) => set({ lang }),
}));

export type TParams = Record<string, string | number>;

export function translate(lang: Lang, key: string, params?: TParams): string {
  let s = dicts[lang][key] ?? dicts.ru[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

// Хук для компонентов: перерисовка при смене языка
export function useT() {
  const lang = useLangStore((s) => s.lang);
  return (key: string, params?: TParams) => translate(lang, key, params);
}

// Вне компонентов (выписка, CSV)
export function t(key: string, params?: TParams): string {
  return translate(useLangStore.getState().lang, key, params);
}

// Короткая дата для ленты: «20 окт»
export function formatDateShort(date: string, lang: Lang): string {
  const months = translate(lang, 'months.short').split(',');
  const day = Number(date.slice(8, 10));
  const month = Number(date.slice(5, 7)) - 1;
  return `${day} ${months[month] ?? ''}`;
}
