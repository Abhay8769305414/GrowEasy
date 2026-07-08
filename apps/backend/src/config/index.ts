import 'dotenv/config';

export const config = {
  // Server
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  get isDev() {
    return this.nodeEnv === 'development';
  },

  // AI
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: 'gemini-2.5-flash',

  // CORS — defaults to allow all origins in development
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  // File upload limits
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB ?? '50', 10) * 1024 * 1024,

  // Logging
  logLevel: process.env.LOG_LEVEL ?? 'info',

  // Processing constants
  batchSize: 25,
  maxRetries: 3,
  previewRowLimit: 50,
  jobTtlMs: 60 * 60 * 1000,          // 1 hour
  jobCleanupIntervalMs: 5 * 60 * 1000, // every 5 minutes
  requestTimeoutMs: 30_000,
  llmTimeoutMs: 60_000,
} as const;