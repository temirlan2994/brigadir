// Черновик мастера «Сделали работу» (zustand).
import { create } from 'zustand';
import type { SplitMode } from '../db/types';

export interface WorkDraft {
  editId?: string; // правка существующей записи
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

export const useDraft = create<DraftState>((set) => ({
  draft: emptyDraft,
  step: 0,
  set: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  setStep: (step) => set({ step }),
  reset: (draft, step = 0) => set({ draft: { ...emptyDraft, ...draft }, step }),
}));
