import { z } from 'zod';
import { CRM_FIELDS } from '../constants';

// ─── Preview ───────────────────────────────────────────────────────────────────

export const PreviewResponseSchema = z.object({
  jobId: z.string().uuid(),
  headers: z.array(z.string()),
  preview: z.array(z.record(z.string())),
  totalRows: z.number().int().nonnegative(),
  fileSize: z.number().int().nonnegative(),
  fileName: z.string(),
});

// ─── Import Start ──────────────────────────────────────────────────────────────

export const StartImportRequestSchema = z.object({
  jobId: z.string().uuid(),
  fieldMappings: z.array(
    z.object({
      csvColumn: z.string(),
      crmField: z.enum(CRM_FIELDS).nullable(),
    })
  ),
});

export const StartImportResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['queued']),
  message: z.string(),
});

// ─── Job Status ────────────────────────────────────────────────────────────────

export const JobStatusResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['queued', 'parsing', 'processing', 'done', 'failed', 'cancelled']),
  processedRows: z.number().int().nonnegative(),
  totalRows: z.number().int().nonnegative(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// ─── Result ────────────────────────────────────────────────────────────────────

export const CrmFieldValueSchema = z.record(z.string());

export const RowErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.string().optional(),
});

export const FieldConfidenceSchema = z.object({
  score: z.number().min(0).max(1),
  level: z.enum(['high', 'medium', 'low']),
  reason: z.string(),
});

export const CrmRecordSchema = z.object({
  row: z.number().int().positive(),
  status: z.enum(['success', 'failed', 'skipped']),
  rawData: z.record(z.string()),
  data: CrmFieldValueSchema,
  fieldConfidence: z.record(FieldConfidenceSchema),
  errors: z.array(RowErrorSchema),
  warnings: z.array(RowErrorSchema),
});

export const ProcessingResultSchema = z.object({
  jobId: z.string().uuid(),
  status: z.string(),
  summary: z.object({
    total: z.number(),
    success: z.number(),
    failed: z.number(),
    skipped: z.number(),
  }),
  metrics: z.object({
    startedAt: z.number(),
    completedAt: z.number().optional(),
    durationMs: z.number().optional(),
    llmCalls: z.number(),
    totalTokens: z.number(),
    estimatedCostUsd: z.number(),
    llmLatencyMs: z.array(z.number()),
  }),
  records: z.array(CrmRecordSchema),
});

// ─── Error Response ─────────────────────────────────────────────────────────────

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  requestId: z.string().optional(),
});

// ─── Inferred Types ────────────────────────────────────────────────────────────

export type PreviewResponse = z.infer<typeof PreviewResponseSchema>;
export type StartImportRequest = z.infer<typeof StartImportRequestSchema>;
export type StartImportResponse = z.infer<typeof StartImportResponseSchema>;
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;
export type ProcessingResultResponse = z.infer<typeof ProcessingResultSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
