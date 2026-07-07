'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useResult(jobId: string, enabled = true) {
  return useQuery({
    queryKey: ['result', jobId],
    queryFn: () => api.getJobResult(jobId),
    staleTime: 60_000,
    retry: 3,
    enabled,
  });
}
