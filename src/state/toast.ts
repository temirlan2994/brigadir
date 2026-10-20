// Тост «Записано · Отменить» на 5 секунд.
import { create } from 'zustand';

interface ToastState {
  message: string | null;
  undo: (() => void | Promise<void>) | null;
  show: (message: string, undo?: () => void | Promise<void>) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  message: null,
  undo: null,
  show: (message, undo) => {
    clearTimeout(timer);
    set({ message, undo: undo ?? null });
    timer = setTimeout(() => set({ message: null, undo: null }), 5000);
  },
  hide: () => {
    clearTimeout(timer);
    set({ message: null, undo: null });
  },
}));
