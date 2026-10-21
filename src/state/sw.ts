// Состояние service worker: регистрация и флаг «вышло обновление».
import { create } from 'zustand';

interface SwState {
  reg: ServiceWorkerRegistration | null;
  needRefresh: boolean;
  setReg: (reg: ServiceWorkerRegistration | null) => void;
  setNeedRefresh: (v: boolean) => void;
}

export const useSw = create<SwState>((set) => ({
  reg: null,
  needRefresh: false,
  setReg: (reg) => set({ reg }),
  setNeedRefresh: (needRefresh) => set({ needRefresh }),
}));
