'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useImportStore } from '@/stores/importStore';

export function useUpload() {
  const router = useRouter();
  const { setFile, setPreview, setJobId, setFieldMappings } = useImportStore();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setFile(file);
      setIsUploading(true);

      try {
        const preview = await api.previewCsv(file);
        setPreview(preview);
        setJobId(preview.jobId);

        // Initialize field mappings with suggested mappings if available
        setFieldMappings(
          preview.headers.map((h) => ({
            csvColumn: h,
            crmField: preview.suggestedMappings?.[h]?.crmField ?? null,
          }))
        );

        router.push(`/preview/${preview.jobId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [router, setFile, setPreview, setJobId, setFieldMappings]
  );

  return { upload, isUploading, error };
}
