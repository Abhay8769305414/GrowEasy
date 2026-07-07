'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useImportStore } from '@/stores/importStore';

export function useImport() {
  const router = useRouter();
  const { jobId, fieldMappings } = useImportStore();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startImport = useCallback(async () => {
    if (!jobId) return;
    setError(null);
    setIsStarting(true);

    try {
      await api.startImport(jobId, fieldMappings);
      router.push(`/result/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start import');
    } finally {
      setIsStarting(false);
    }
  }, [jobId, fieldMappings, router]);

  return { startImport, isStarting, error };
}
