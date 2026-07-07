import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './services/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import importRoutes from './routes/import';
import jobRoutes from './routes/jobs';

const app = express();

// ─── Global Middleware ─────────────────────────────────────────────────────────

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── Health Check ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'groweasy-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────

app.use('/api/import', importRoutes);
app.use('/api/jobs', jobRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
});

// ─── Error Handler (must be last) ─────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        env: config.nodeEnv,
        corsOrigin: config.corsOrigin,
      },
      `GrowEasy backend running on http://localhost:${config.port}`
    );
  });
}

export default app;
