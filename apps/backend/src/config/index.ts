import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',

  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: 'gemini-2.5-flash',

  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',

  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB ?? '50', 10) * 1024 * 1024,

  logLevel: process.env.LOG_LEVEL ?? 'info',

  batchSize: 25,
  maxRetries: 3,
  previewRowLimit: 50,
  jobTtlMs: 60 * 60 * 1000, // 1 hour
  requestTimeoutMs: 30_000,
  llmTimeoutMs: 60_000,
} as const;
