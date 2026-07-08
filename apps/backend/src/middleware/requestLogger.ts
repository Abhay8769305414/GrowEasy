import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../services/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const start = Date.now();

  // Attach requestId to request for downstream use
  (req as Request & { id: string }).id = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const reqExt = req as Request & { jobId?: string; batchId?: string };
    const jobId = reqExt.jobId ?? req.params?.id ?? req.body?.jobId;
    const batchId = reqExt.batchId;

    logger.info(
      {
        requestId,
        ...(jobId ? { jobId } : {}),
        ...(batchId ? { batchId } : {}),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
        userAgent: req.headers['user-agent'],
      },
      `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`
    );
  });

  next();
}
