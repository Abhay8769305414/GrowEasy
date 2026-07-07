export const CRM_FIELDS = [
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
] as const;

export type CrmFieldName = (typeof CRM_FIELDS)[number];

export const BATCH_SIZE = 25;
export const MAX_RETRIES = 3;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const PREVIEW_ROW_LIMIT = 50;
export const SSE_HEARTBEAT_INTERVAL_MS = 15_000;
export const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.60,
} as const;
