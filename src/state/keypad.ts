// Одна нампад-клавиатура на всё приложение: цифры печатаются прямо в активное поле.
import { create } from 'zustand';
import { applyKey } from '../core/format';

// Почему поле закрылось: «Готово», «Дальше», тап мимо, другое поле, переход, поле исчезло
export type CloseReason = 'done' | 'next' | 'outside' | 'switch' | 'route' | 'unmount';

export interface KeypadTarget {
  id: string;
  label: string;
  decimals: number;
  maxDigits: number;
  get: () => string;
  set: (value: string) => void;
  onClose?: (reason: CloseReason) => void;
}

interface KeypadState {
  target: KeypadTarget | null;
  fresh: boolean; // значение выделено: первая цифра заменит его
  open: (target: KeypadTarget) => void;
  close: (reason: CloseReason) => void;
  press: (key: string) => void;
  setFresh: (fresh: boolean) => void;
}

export const useKeypad = create<KeypadState>((set, get) => ({
  target: null,
  fresh: false,
  open: (target) => {
    const current = get().target;
    if (current && current.id !== target.id) {
      set({ target: null });
      current.onClose?.('switch');
    }
    set({ target, fresh: target.get() !== '' });
  },
  close: (reason) => {
    const current = get().target;
    if (!current) return;
    set({ target: null, fresh: false });
    current.onClose?.(reason);
  },
  press: (key) => {
    const { target, fresh } = get();
    if (!target) return;
    target.set(applyKey(target.get(), key, { decimals: target.decimals, maxDigits: target.maxDigits, fresh }));
    set({ fresh: false });
  },
  setFresh: (fresh) => set({ fresh }),
}));
