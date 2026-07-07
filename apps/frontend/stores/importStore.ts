import { create } from 'zustand';
import { PreviewResponse, FieldMappingInput } from '../lib/api';

interface ImportStore {
  // Upload state
  file: File | null;
  setFile: (file: File | null) => void;

  // Preview state
  preview: PreviewResponse | null;
  setPreview: (preview: PreviewResponse | null) => void;

  // Field mappings (user-confirmed)
  fieldMappings: FieldMappingInput[];
  setFieldMappings: (mappings: FieldMappingInput[]) => void;
  updateFieldMapping: (csvColumn: string, crmField: string | null) => void;

  // Active job
  jobId: string | null;
  setJobId: (id: string | null) => void;

  // Progress
  processed: number;
  total: number;
  setProgress: (processed: number, total: number) => void;

  // Reset
  reset: () => void;
}

export const useImportStore = create<ImportStore>((set) => ({
  file: null,
  setFile: (file) => set({ file }),

  preview: null,
  setPreview: (preview) => set({ preview }),

  fieldMappings: [],
  setFieldMappings: (fieldMappings) => set({ fieldMappings }),
  updateFieldMapping: (csvColumn, crmField) =>
    set((state) => ({
      fieldMappings: state.fieldMappings.map((m) =>
        m.csvColumn === csvColumn ? { ...m, crmField } : m
      ),
    })),

  jobId: null,
  setJobId: (jobId) => set({ jobId }),

  processed: 0,
  total: 0,
  setProgress: (processed, total) => set({ processed, total }),

  reset: () =>
    set({
      file: null,
      preview: null,
      fieldMappings: [],
      jobId: null,
      processed: 0,
      total: 0,
    }),
}));
