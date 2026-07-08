import { z } from 'zod';
export declare const PreviewResponseSchema: z.ZodObject<{
    jobId: z.ZodString;
    headers: z.ZodArray<z.ZodString, "many">;
    preview: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodString>, "many">;
    totalRows: z.ZodNumber;
    fileSize: z.ZodNumber;
    fileName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    headers: string[];
    fileSize: number;
    jobId: string;
    preview: Record<string, string>[];
    totalRows: number;
    fileName: string;
}, {
    headers: string[];
    fileSize: number;
    jobId: string;
    preview: Record<string, string>[];
    totalRows: number;
    fileName: string;
}>;
export declare const StartImportRequestSchema: z.ZodObject<{
    jobId: z.ZodString;
    fieldMappings: z.ZodArray<z.ZodObject<{
        csvColumn: z.ZodString;
        crmField: z.ZodNullable<z.ZodEnum<["name", "email", "phone", "company", "address", "city", "state", "country", "tags", "notes", "lead_source", "status", "owner", "website", "created_at"]>>;
    }, "strip", z.ZodTypeAny, {
        csvColumn: string;
        crmField: "name" | "email" | "phone" | "company" | "address" | "city" | "state" | "country" | "tags" | "notes" | "lead_source" | "status" | "owner" | "website" | "created_at" | null;
    }, {
        csvColumn: string;
        crmField: "name" | "email" | "phone" | "company" | "address" | "city" | "state" | "country" | "tags" | "notes" | "lead_source" | "status" | "owner" | "website" | "created_at" | null;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    jobId: string;
    fieldMappings: {
        csvColumn: string;
        crmField: "name" | "email" | "phone" | "company" | "address" | "city" | "state" | "country" | "tags" | "notes" | "lead_source" | "status" | "owner" | "website" | "created_at" | null;
    }[];
}, {
    jobId: string;
    fieldMappings: {
        csvColumn: string;
        crmField: "name" | "email" | "phone" | "company" | "address" | "city" | "state" | "country" | "tags" | "notes" | "lead_source" | "status" | "owner" | "website" | "created_at" | null;
    }[];
}>;
export declare const StartImportResponseSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodEnum<["queued"]>;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    status: "queued";
    jobId: string;
}, {
    message: string;
    status: "queued";
    jobId: string;
}>;
export declare const JobStatusResponseSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodEnum<["queued", "parsing", "processing", "done", "failed", "cancelled"]>;
    processedRows: z.ZodNumber;
    totalRows: z.ZodNumber;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "queued" | "parsing" | "processing" | "done" | "failed" | "cancelled";
    jobId: string;
    totalRows: number;
    processedRows: number;
    createdAt: number;
    updatedAt: number;
}, {
    status: "queued" | "parsing" | "processing" | "done" | "failed" | "cancelled";
    jobId: string;
    totalRows: number;
    processedRows: number;
    createdAt: number;
    updatedAt: number;
}>;
export declare const CrmFieldValueSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export declare const RowErrorSchema: z.ZodObject<{
    field: z.ZodString;
    message: z.ZodString;
    value: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    field: string;
    value?: string | undefined;
}, {
    message: string;
    field: string;
    value?: string | undefined;
}>;
export declare const FieldConfidenceSchema: z.ZodObject<{
    score: z.ZodNumber;
    level: z.ZodEnum<["high", "medium", "low"]>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    level: "high" | "medium" | "low";
    score: number;
    reason: string;
}, {
    level: "high" | "medium" | "low";
    score: number;
    reason: string;
}>;
export declare const CrmRecordSchema: z.ZodObject<{
    row: z.ZodNumber;
    status: z.ZodEnum<["success", "failed", "skipped"]>;
    rawData: z.ZodRecord<z.ZodString, z.ZodString>;
    data: z.ZodRecord<z.ZodString, z.ZodString>;
    fieldConfidence: z.ZodRecord<z.ZodString, z.ZodObject<{
        score: z.ZodNumber;
        level: z.ZodEnum<["high", "medium", "low"]>;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        level: "high" | "medium" | "low";
        score: number;
        reason: string;
    }, {
        level: "high" | "medium" | "low";
        score: number;
        reason: string;
    }>>;
    errors: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        message: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        field: string;
        value?: string | undefined;
    }, {
        message: string;
        field: string;
        value?: string | undefined;
    }>, "many">;
    warnings: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        message: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        field: string;
        value?: string | undefined;
    }, {
        message: string;
        field: string;
        value?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "success" | "skipped";
    row: number;
    rawData: Record<string, string>;
    data: Record<string, string>;
    fieldConfidence: Record<string, {
        level: "high" | "medium" | "low";
        score: number;
        reason: string;
    }>;
    errors: {
        message: string;
        field: string;
        value?: string | undefined;
    }[];
    warnings: {
        message: string;
        field: string;
        value?: string | undefined;
    }[];
}, {
    status: "failed" | "success" | "skipped";
    row: number;
    rawData: Record<string, string>;
    data: Record<string, string>;
    fieldConfidence: Record<string, {
        level: "high" | "medium" | "low";
        score: number;
        reason: string;
    }>;
    errors: {
        message: string;
        field: string;
        value?: string | undefined;
    }[];
    warnings: {
        message: string;
        field: string;
        value?: string | undefined;
    }[];
}>;
export declare const ProcessingResultSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodString;
    summary: z.ZodObject<{
        total: z.ZodNumber;
        success: z.ZodNumber;
        failed: z.ZodNumber;
        skipped: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        failed: number;
        success: number;
        skipped: number;
        total: number;
    }, {
        failed: number;
        success: number;
        skipped: number;
        total: number;
    }>;
    metrics: z.ZodObject<{
        startedAt: z.ZodNumber;
        completedAt: z.ZodOptional<z.ZodNumber>;
        durationMs: z.ZodOptional<z.ZodNumber>;
        llmCalls: z.ZodNumber;
        totalTokens: z.ZodNumber;
        estimatedCostUsd: z.ZodNumber;
        llmLatencyMs: z.ZodArray<z.ZodNumber, "many">;
    }, "strip", z.ZodTypeAny, {
        llmCalls: number;
        totalTokens: number;
        estimatedCostUsd: number;
        startedAt: number;
        llmLatencyMs: number[];
        durationMs?: number | undefined;
        completedAt?: number | undefined;
    }, {
        llmCalls: number;
        totalTokens: number;
        estimatedCostUsd: number;
        startedAt: number;
        llmLatencyMs: number[];
        durationMs?: number | undefined;
        completedAt?: number | undefined;
    }>;
    records: z.ZodArray<z.ZodObject<{
        row: z.ZodNumber;
        status: z.ZodEnum<["success", "failed", "skipped"]>;
        rawData: z.ZodRecord<z.ZodString, z.ZodString>;
        data: z.ZodRecord<z.ZodString, z.ZodString>;
        fieldConfidence: z.ZodRecord<z.ZodString, z.ZodObject<{
            score: z.ZodNumber;
            level: z.ZodEnum<["high", "medium", "low"]>;
            reason: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            level: "high" | "medium" | "low";
            score: number;
            reason: string;
        }, {
            level: "high" | "medium" | "low";
            score: number;
            reason: string;
        }>>;
        errors: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            message: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            message: string;
            field: string;
            value?: string | undefined;
        }, {
            message: string;
            field: string;
            value?: string | undefined;
        }>, "many">;
        warnings: z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            message: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            message: string;
            field: string;
            value?: string | undefined;
        }, {
            message: string;
            field: string;
            value?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        status: "failed" | "success" | "skipped";
        row: number;
        rawData: Record<string, string>;
        data: Record<string, string>;
        fieldConfidence: Record<string, {
            level: "high" | "medium" | "low";
            score: number;
            reason: string;
        }>;
        errors: {
            message: string;
            field: string;
            value?: string | undefined;
        }[];
        warnings: {
            message: string;
            field: string;
            value?: string | undefined;
        }[];
    }, {
        status: "failed" | "success" | "skipped";
        row: number;
        rawData: Record<string, string>;
        data: Record<string, string>;
        fieldConfidence: Record<string, {
            level: "high" | "medium" | "low";
            score: number;
            reason: string;
        }>;
        errors: {
            message: string;
            field: string;
            value?: string | undefined;
        }[];
        warnings: {
            message: string;
            field: string;
            value?: string | undefined;
        }[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: string;
    jobId: string;
    summary: {
        failed: number;
        success: number;
        skipped: number;
        total: number;
    };
    metrics: {
        llmCalls: number;
        totalTokens: number;
        estimatedCostUsd: number;
        startedAt: number;
        llmLatencyMs: number[];
        durationMs?: number | undefined;
        completedAt?: number | undefined;
    };
    records: {
        status: "failed" | "success" | "skipped";
        row: number;
        rawData: Record<string, string>;
        data: Record<string, string>;
        fieldConfidence: Record<string, {
            level: "high" | "medium" | "low";
            score: number;
            reason: string;
        }>;
        errors: {
            message: string;
            field: string;
            value?: string | undefined;
        }[];
        warnings: {
            message: string;
            field: string;
            value?: string | undefined;
        }[];
    }[];
}, {
    status: string;
    jobId: string;
    summary: {
        failed: number;
        success: number;
        skipped: number;
        total: number;
    };
    metrics: {
        llmCalls: number;
        totalTokens: number;
        estimatedCostUsd: number;
        startedAt: number;
        llmLatencyMs: number[];
        durationMs?: number | undefined;
        completedAt?: number | undefined;
    };
    records: {
        status: "failed" | "success" | "skipped";
        row: number;
        rawData: Record<string, string>;
        data: Record<string, string>;
        fieldConfidence: Record<string, {
            level: "high" | "medium" | "low";
            score: number;
            reason: string;
        }>;
        errors: {
            message: string;
            field: string;
            value?: string | undefined;
        }[];
        warnings: {
            message: string;
            field: string;
            value?: string | undefined;
        }[];
    }[];
}>;
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    requestId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    error: string;
    success: false;
    requestId?: string | undefined;
    code?: string | undefined;
}, {
    error: string;
    success: false;
    requestId?: string | undefined;
    code?: string | undefined;
}>;
export type PreviewResponse = z.infer<typeof PreviewResponseSchema>;
export type StartImportRequest = z.infer<typeof StartImportRequestSchema>;
export type StartImportResponse = z.infer<typeof StartImportResponseSchema>;
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;
export type ProcessingResultResponse = z.infer<typeof ProcessingResultSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
//# sourceMappingURL=apiSchemas.d.ts.map