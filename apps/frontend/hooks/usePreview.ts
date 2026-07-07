'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useImportStore } from '@/stores/importStore';

export function usePreview(jobId: string) {
  const preview = useImportStore((s) => s.preview);
  const setPreview = useImportStore((s) => s.setPreview);
  const fieldMappings = useImportStore((s) => s.fieldMappings);
  const setFieldMappings = useImportStore((s) => s.setFieldMappings);
  const updateFieldMapping = useImportStore((s) => s.updateFieldMapping);

  // If preview is already in store (from upload flow), use it directly.
  // Otherwise fetch status from API (e.g., on page refresh).
  const { data: jobStatus } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.getJobStatus(jobId),
    enabled: !preview,
  });

  useEffect(() => {
    if (jobStatus && !preview && jobStatus.headers && jobStatus.preview) {
      setPreview({
        jobId: jobStatus.jobId,
        headers: jobStatus.headers,
        preview: jobStatus.preview,
        totalRows: jobStatus.totalRows,
        fileName: jobStatus.fileName ?? 'Unknown File',
        fileSize: 0,
      });

      // Initialize field mappings if they don't exist yet
      if (fieldMappings.length === 0) {
        setFieldMappings(
          jobStatus.headers.map((h) => ({
            csvColumn: h,
            crmField: jobStatus.fieldMappings?.[h]?.crmField ?? null,
          }))
        );
      }
    }
  }, [jobStatus, preview, fieldMappings.length, setPreview, setFieldMappings]);

  return {
    preview,
    jobStatus,
    fieldMappings,
    updateFieldMapping,
  };
}
