import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './services/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimit } from './middleware/rateLimit';
import importRoutes from './routes/import';
import jobRoutes from './routes/jobs';

const app = express();
const startTime = Date.now();

// ─── Security Middleware ───────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
}));

// ─── Global Middleware ─────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestLogger);

// ─── General API rate limit (skip for SSE which has its own keepalive) ────────

app.use('/api', apiRateLimit);

// ─── Health Check ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'groweasy-backend',
    version: process.env.npm_package_version ?? '1.0.0',
    environment: config.nodeEnv,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────

app.use('/api/import', importRoutes);
app.use('/api/jobs', jobRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
});

// ─── Centralized Error Handler (must be last) ──────────────────────────────────

app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  const port = config.port;
  app.listen(port, '0.0.0.0', () => {
    logger.info(
      {
        port,
        env: config.nodeEnv,
        corsOrigin: config.corsOrigin,
      },
      `GrowEasy backend listening on 0.0.0.0:${port}`
    );
  });
}

export default app;
