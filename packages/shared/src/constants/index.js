"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIDENCE_THRESHOLDS = exports.JOB_TTL_MS = exports.SSE_HEARTBEAT_INTERVAL_MS = exports.PREVIEW_ROW_LIMIT = exports.MAX_FILE_SIZE_BYTES = exports.MAX_RETRIES = exports.BATCH_SIZE = exports.CRM_FIELDS = void 0;
exports.CRM_FIELDS = [
    'name',
    'email',
    'phone',
    'company',
    'address',
    'city',
    'state',
    'country',
    'tags',
    'notes',
    'lead_source',
    'status',
    'owner',
    'website',
    'created_at',
];
exports.BATCH_SIZE = 25;
exports.MAX_RETRIES = 3;
exports.MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
exports.PREVIEW_ROW_LIMIT = 50;
exports.SSE_HEARTBEAT_INTERVAL_MS = 15000;
exports.JOB_TTL_MS = 60 * 60 * 1000; // 1 hour
exports.CONFIDENCE_THRESHOLDS = {
    HIGH: 0.85,
    MEDIUM: 0.60,
};
//# sourceMappingURL=index.js.map