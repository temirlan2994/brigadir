// Черновик мастера «Сделали работу» (zustand).
// Лежит в localStorage: звонок или камера могут убить приложение посреди ввода.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SplitMode } from '../db/types';

export interface WorkDraft {
  editId?: string; // правка существующей записи
  objectId: string; // объект, на котором начат черновик
  workTypeId: string;
  quantityInput: string;
  areaMode: boolean;
  lengthInput: string;
  heightInput: string;
  openingInputs: string[];
  customerPriceInput: string; // сомы, строка нампада
  workerPriceInput: string;
  rememberRate: boolean;
  workerIds: string[];
  splitMode: SplitMode;
  shiftInputs: Record<string, string>;
  manualInputs: Record<string, string>;
  date: string;
  note: string;
  photoIds: string[];
}

export const emptyDraft: WorkDraft = {
  objectId: '',
  workTypeId: '',
  quantityInput: '',
  areaMode: false,
  lengthInput: '',
  heightInput: '',
  openingInputs: [],
  customerPriceInput: '',
  workerPriceInput: '',
  rememberRate: false,
  workerIds: [],
  splitMode: 'equal',
  shiftInputs: {},
  manualInputs: {},
  date: '',
  note: '',
  photoIds: [],
};

interface DraftState {
  draft: WorkDraft;
  step: number;
  set: (patch: Partial<WorkDraft>) => void;
  setStep: (step: number) => void;
  reset: (draft?: Partial<WorkDraft>, step?: number) => void;
}

export const useDraft = create<DraftState>()(persist(
  (set) => ({
    draft: emptyDraft,
    step: 0,
    set: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
    setStep: (step) => set({ step }),
    reset: (draft, step = 0) => set({ draft: { ...emptyDraft, ...draft }, step }),
  }),
  { name: 'brigadir-work-draft', partialize: (s) => ({ draft: s.draft }) },
));
