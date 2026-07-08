"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorResponseSchema = exports.ProcessingResultSchema = exports.CrmRecordSchema = exports.FieldConfidenceSchema = exports.RowErrorSchema = exports.CrmFieldValueSchema = exports.JobStatusResponseSchema = exports.StartImportResponseSchema = exports.StartImportRequestSchema = exports.PreviewResponseSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
// ─── Preview ───────────────────────────────────────────────────────────────────
exports.PreviewResponseSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    headers: zod_1.z.array(zod_1.z.string()),
    preview: zod_1.z.array(zod_1.z.record(zod_1.z.string())),
    totalRows: zod_1.z.number().int().nonnegative(),
    fileSize: zod_1.z.number().int().nonnegative(),
    fileName: zod_1.z.string(),
});
// ─── Import Start ──────────────────────────────────────────────────────────────
exports.StartImportRequestSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    fieldMappings: zod_1.z.array(zod_1.z.object({
        csvColumn: zod_1.z.string(),
        crmField: zod_1.z.enum(constants_1.CRM_FIELDS).nullable(),
    })),
});
exports.StartImportResponseSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['queued']),
    message: zod_1.z.string(),
});
// ─── Job Status ────────────────────────────────────────────────────────────────
exports.JobStatusResponseSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['queued', 'parsing', 'processing', 'done', 'failed', 'cancelled']),
    processedRows: zod_1.z.number().int().nonnegative(),
    totalRows: zod_1.z.number().int().nonnegative(),
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
});
// ─── Result ────────────────────────────────────────────────────────────────────
exports.CrmFieldValueSchema = zod_1.z.record(zod_1.z.string());
exports.RowErrorSchema = zod_1.z.object({
    field: zod_1.z.string(),
    message: zod_1.z.string(),
    value: zod_1.z.string().optional(),
});
exports.FieldConfidenceSchema = zod_1.z.object({
    score: zod_1.z.number().min(0).max(1),
    level: zod_1.z.enum(['high', 'medium', 'low']),
    reason: zod_1.z.string(),
});
exports.CrmRecordSchema = zod_1.z.object({
    row: zod_1.z.number().int().positive(),
    status: zod_1.z.enum(['success', 'failed', 'skipped']),
    rawData: zod_1.z.record(zod_1.z.string()),
    data: exports.CrmFieldValueSchema,
    fieldConfidence: zod_1.z.record(exports.FieldConfidenceSchema),
    errors: zod_1.z.array(exports.RowErrorSchema),
    warnings: zod_1.z.array(exports.RowErrorSchema),
});
exports.ProcessingResultSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    status: zod_1.z.string(),
    summary: zod_1.z.object({
        total: zod_1.z.number(),
        success: zod_1.z.number(),
        failed: zod_1.z.number(),
        skipped: zod_1.z.number(),
    }),
    metrics: zod_1.z.object({
        startedAt: zod_1.z.number(),
        completedAt: zod_1.z.number().optional(),
        durationMs: zod_1.z.number().optional(),
        llmCalls: zod_1.z.number(),
        totalTokens: zod_1.z.number(),
        estimatedCostUsd: zod_1.z.number(),
        llmLatencyMs: zod_1.z.array(zod_1.z.number()),
    }),
    records: zod_1.z.array(exports.CrmRecordSchema),
});
// ─── Error Response ─────────────────────────────────────────────────────────────
exports.ErrorResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    error: zod_1.z.string(),
    code: zod_1.z.string().optional(),
    requestId: zod_1.z.string().optional(),
});
//# sourceMappingURL=apiSchemas.js.map