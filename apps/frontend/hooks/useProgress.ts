'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useImportStore } from '@/stores/importStore';

export interface ProgressState {
  processed: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  isDone: boolean;
  batchId?: string;
  summary?: { total: number; success: number; failed: number; skipped: number };
  error?: string;
}

export function useProgress(jobId: string): ProgressState {
  const { setProgress } = useImportStore();
  const [state, setState] = useState<ProgressState>({
    processed: 0,
    total: 0,
    percentage: 0,
    isComplete: false,
    isDone: false,
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const es = api.subscribeToEvents(jobId, {
      onProgress: ({ processed, total, batchId }) => {
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
        setProgress(processed, total);
        setState((prev) => ({
          ...prev,
          processed,
          total,
          percentage,
          batchId,
          isComplete: false,
          isDone: false,
        }));
      },
      onDone: ({ summary }) => {
        setState((prev) => ({
          ...prev,
          percentage: 100,
          isComplete: true,
          isDone: true,
          summary,
        }));
      },
      onError: () => {
        setState((prev) => ({ ...prev, error: 'Connection lost. Falling back to polling.' }));
      },
    });

    esRef.current = es;

    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return state;
}
