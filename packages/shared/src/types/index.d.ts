import { CrmFieldName } from '../constants';
export declare enum JobStatus {
    QUEUED = "queued",
    PARSING = "parsing",
    PROCESSING = "processing",
    DONE = "done",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum FieldType {
    STRING = "string",
    EMAIL = "email",
    PHONE = "phone",
    DATE = "date",
    URL = "url",
    ENUM = "enum",
    NUMBER = "number"
}
export declare enum ConfidenceLevel {
    HIGH = "high",// >= 0.85
    MEDIUM = "medium",// >= 0.60
    LOW = "low"
}
export declare enum BatchStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    DONE = "done",
    FAILED = "failed",
    RETRYING = "retrying"
}
export declare enum SseEvent {
    PROGRESS = "progress",
    BATCH_COMPLETE = "batch_complete",
    BATCH_FAILED = "batch_failed",
    DONE = "done",
    ERROR = "error"
}
export type CsvRow = Record<string, string>;
export interface CsvPreview {
    jobId: string;
    headers: string[];
    preview: CsvRow[];
    totalRows: number;
    fileSize: number;
    fileName: string;
}
export interface FieldConfidence {
    score: number;
    level: ConfidenceLevel;
    reason: string;
}
export interface FieldMapping {
    csvColumn: string;
    crmField: CrmFieldName | null;
    confidence: FieldConfidence;
}
export type FieldMappingMap = Record<string, FieldMapping>;
export type CrmFieldValues = Partial<Record<CrmFieldName, string>>;
export interface RowError {
    field: CrmFieldName | string;
    message: string;
    value?: string;
}
export interface RowWarning {
    field: CrmFieldName | string;
    message: string;
    value?: string;
}
export interface CrmRecord {
    row: number;
    status: 'success' | 'failed' | 'skipped';
    rawData: CsvRow;
    data: CrmFieldValues;
    fieldConfidence: Partial<Record<CrmFieldName, FieldConfidence>>;
    errors: RowError[];
    warnings: RowWarning[];
}
export interface BatchInfo {
    batchId: string;
    index: number;
    rowStart: number;
    rowEnd: number;
    status: BatchStatus;
    retries: number;
    error?: string;
}
export interface JobMetrics {
    startedAt: number;
    completedAt?: number;
    durationMs?: number;
    llmCalls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
    llmLatencyMs: number[];
}
export interface ProcessingSummary {
    total: number;
    success: number;
    failed: number;
    skipped: number;
}
export interface Job {
    id: string;
    status: JobStatus;
    fileName: string;
    totalRows: number;
    processedRows: number;
    fieldMappings: FieldMappingMap;
    batches: BatchInfo[];
    summary: ProcessingSummary;
    metrics: JobMetrics;
    createdAt: number;
    updatedAt: number;
    headers?: string[];
    previewRows?: Record<string, string>[];
    records?: CrmRecord[];
    parsedRows?: CsvRow[];
    delimiter?: string;
}
export interface ProcessingResult {
    jobId: string;
    status: JobStatus;
    summary: ProcessingSummary;
    metrics: JobMetrics;
    records: CrmRecord[];
}
export interface SseProgressPayload {
    processed: number;
    total: number;
    batchId: string;
    batchIndex: number;
    totalBatches: number;
}
export interface SseBatchPayload extends SseProgressPayload {
    batchStatus: BatchStatus;
    error?: string;
    retries?: number;
}
export interface SseDonePayload {
    jobId: string;
    summary: ProcessingSummary;
    metrics: Pick<JobMetrics, 'durationMs' | 'llmCalls' | 'totalTokens' | 'estimatedCostUsd'>;
}
//# sourceMappingURL=index.d.ts.map