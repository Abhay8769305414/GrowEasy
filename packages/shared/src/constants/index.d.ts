export declare const CRM_FIELDS: readonly ["name", "email", "phone", "company", "address", "city", "state", "country", "tags", "notes", "lead_source", "status", "owner", "website", "created_at"];
export type CrmFieldName = (typeof CRM_FIELDS)[number];
export declare const BATCH_SIZE = 25;
export declare const MAX_RETRIES = 3;
export declare const MAX_FILE_SIZE_BYTES: number;
export declare const PREVIEW_ROW_LIMIT = 50;
export declare const SSE_HEARTBEAT_INTERVAL_MS = 15000;
export declare const JOB_TTL_MS: number;
export declare const CONFIDENCE_THRESHOLDS: {
    readonly HIGH: 0.85;
    readonly MEDIUM: 0.6;
};
//# sourceMappingURL=index.d.ts.map