// Режим «показать заказчику»: прячет цены бригады и прибыль на экранах объекта.
import { create } from 'zustand';

interface ViewState {
  customerMode: boolean;
  toggleCustomerMode: () => void;
}

export const useView = create<ViewState>((set) => ({
  customerMode: false,
  toggleCustomerMode: () => set((s) => ({ customerMode: !s.customerMode })),
}));
