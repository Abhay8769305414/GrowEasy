// ─── API Client for GrowEasy Backend ──────────────────────────────────────────

const BASE_URL = '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.error ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PreviewResponse {
  jobId: string;
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
  fileSize: number;
  fileName: string;
  suggestedMappings?: Record<string, any>;
}

export interface FieldMappingInput {
  csvColumn: string;
  crmField: string | null;
}

export interface StartImportResponse {
  jobId: string;
  status: string;
  message: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: string;
  processedRows: number;
  totalRows: number;
  createdAt: number;
  updatedAt: number;
  fileName?: string;
  headers?: string[];
  preview?: Record<string, string>[];
  fieldMappings?: Record<string, any>;
}

export interface FieldConfidence {
  score: number;
  level: 'high' | 'medium' | 'low';
  reason: string;
}

export interface CrmRecord {
  row: number;
  status: 'success' | 'failed' | 'skipped';
  rawData: Record<string, string>;
  data: Record<string, string>;
  fieldConfidence: Record<string, FieldConfidence>;
  errors: Array<{ field: string; message: string; value?: string }>;
  warnings: Array<{ field: string; message: string; value?: string }>;
}

export interface JobResult {
  jobId: string;
  status: string;
  summary: { total: number; success: number; failed: number; skipped: number };
  metrics: {
    startedAt: number;
    completedAt?: number;
    durationMs?: number;
    llmCalls: number;
    totalTokens: number;
    estimatedCostUsd: number;
    llmLatencyMs: number[];
  };
  records: CrmRecord[];
}

// ─── API Methods ───────────────────────────────────────────────────────────────

export const api = {
  /**
   * Upload a CSV file for preview.
   */
  async previewCsv(file: File): Promise<PreviewResponse> {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${BASE_URL}/import/preview`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.error ?? 'Upload failed');
    }

    return res.json();
  },

  /**
   * Start an import job with confirmed field mappings.
   */
  async startImport(jobId: string, fieldMappings: FieldMappingInput[]): Promise<StartImportResponse> {
    return request<StartImportResponse>('/import/start', {
      method: 'POST',
      body: JSON.stringify({ jobId, fieldMappings }),
    });
  },

  /**
   * Poll job status.
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return request<JobStatusResponse>(`/jobs/${jobId}`);
  },

  /**
   * Get final job results.
   */
  async getJobResult(jobId: string): Promise<JobResult> {
    return request<JobResult>(`/jobs/${jobId}/result`);
  },

  /**
   * Delete / cancel a job.
   */
  async deleteJob(jobId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/jobs/${jobId}`, { method: 'DELETE' });
  },

  /**
   * Subscribe to SSE progress events.
   */
  subscribeToEvents(
    jobId: string,
    handlers: {
      onProgress?: (data: { processed: number; total: number; batchId: string }) => void;
      onDone?: (data: { jobId: string; summary: JobResult['summary'] }) => void;
      onError?: (error: Event) => void;
    }
  ): EventSource {
    const es = new EventSource(`${BASE_URL}/jobs/${jobId}/events`);

    if (handlers.onProgress) {
      es.addEventListener('progress', (e) => {
        handlers.onProgress?.(JSON.parse(e.data));
      });
    }

    if (handlers.onDone) {
      es.addEventListener('done', (e) => {
        handlers.onDone?.(JSON.parse(e.data));
        es.close();
      });
    }

    if (handlers.onError) {
      es.onerror = handlers.onError;
    }

    return es;
  },
};

export { ApiError };
