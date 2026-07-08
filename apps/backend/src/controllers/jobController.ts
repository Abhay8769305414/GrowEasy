import { Request, Response, NextFunction } from 'express';
import { JobStatus, CrmFieldName } from '@groweasy/shared';
import { jobRepository } from '../services/job/JobRepository';
import { createError } from '../middleware/errorHandler';
import { logger } from '../services/logger';

/**
 * GET /api/jobs/:id
 * Polling endpoint — returns current job status.
 */
export async function getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const job = await jobRepository.findById(id);

    if (!job) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    res.json({
      jobId: job.id,
      status: job.status,
      processedRows: job.processedRows,
      totalRows: job.totalRows,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      fileName: job.fileName,
      headers: job.headers,
      preview: job.previewRows,
      fieldMappings: job.fieldMappings,
    });
  } catch (error) {
    next(error);
  }
}

import { jobEvents } from '../services/job/orchestrator';

/**
 * Middleware to validate that the request path parameter 'id' is a valid UUID format.
 * Returns a 400 Bad Request directly if the format is invalid.
 */
export function validateJobIdParam(req: Request, _res: Response, next: NextFunction): void {
  const id = req.params.id as string;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID_REGEX.test(id)) {
    next(createError('Invalid job ID format. Expected a standard UUID.', 400, 'VALIDATION_ERROR'));
    return;
  }
  next();
}

/**
 * GET /api/jobs/:id/events
 * SSE stream — emits progress, done, error events.
 */
export async function streamJobEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const job = await jobRepository.findById(id);

    if (!job) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // If job is already complete, send done immediately and terminate
    if (job.status === JobStatus.DONE) {
      send('done', {
        jobId: id,
        summary: job.summary,
        metrics: {
          durationMs: job.metrics.durationMs,
          llmCalls: job.metrics.llmCalls,
          totalTokens: job.metrics.totalTokens,
          estimatedCostUsd: job.metrics.estimatedCostUsd,
        },
      });
      res.end();
      return;
    }

    if (job.status === JobStatus.FAILED) {
      send('error', { error: 'Job execution failed' });
      res.end();
      return;
    }

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearInterval(heartbeat);
      jobEvents.off(`progress:${id}`, onProgress);
      jobEvents.off(`done:${id}`, onDone);
      jobEvents.off(`error:${id}`, onError);
    };

    // Subscribe to orchestrator event emitter
    const onProgress = (data: unknown) => send('progress', data);
    const onDone = (data: unknown) => {
      send('done', data);
      cleanup();
      res.end();
    };
    const onError = (data: { error: string }) => {
      send('error', data);
      cleanup();
      res.end();
    };

    jobEvents.on(`progress:${id}`, onProgress);
    jobEvents.on(`done:${id}`, onDone);
    jobEvents.on(`error:${id}`, onError);

    // Heartbeat to keep SSE alive
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15_000);

    req.on('close', () => {
      cleanup();
      logger.debug({ jobId: id }, 'SSE client disconnected');
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/:id/result
 * Returns the final processed CRM records.
 */
export async function getJobResult(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const job = await jobRepository.findById(id);

    if (!job) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    res.json({
      jobId: id,
      status: job.status,
      summary: job.summary,
      metrics: job.metrics,
      records: job.records ?? [],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/:id/download/json
 * Downloads clean CRM records as JSON.
 */
export async function downloadJobJson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const job = await jobRepository.findById(id);

    if (!job) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    const records = job.records ?? [];
    res.setHeader('Content-Disposition', `attachment; filename="job-${id}-clean.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(records, null, 2));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/:id/download/csv
 * Downloads clean CRM records as CSV.
 */
/**
 * Guards against CSV formula injection (CWE-1236).
 * Escapes cells starting with =, +, -, @, tab (0x09), or carriage return (0x0D)
 * by prepending a single quote, making them inert in spreadsheet applications.
 */
function sanitizeCsvCell(raw: string): string {
  const INJECTION_CHARS = /^[=+\-@\t\r]/;
  const escaped = raw.replace(/"/g, '""');
  if (INJECTION_CHARS.test(raw)) {
    return `"'${escaped}"`;
  }
  return `"${escaped}"`;
}

export async function downloadJobCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const job = await jobRepository.findById(id);

    if (!job) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    const records = job.records ?? [];
    const fields = [
      'name', 'email', 'phone', 'company', 'status',
      'country', 'website', 'lead_source', 'created_at', 'tags', 'notes'
    ];

    // Build CSV string with formula injection protection
    const headerLine = fields.map(f => sanitizeCsvCell(f)).join(',');
    const rowLines = records.map(record => {
      const data = record.data || {};
      return fields.map(f => {
        const val = String(data[f as CrmFieldName] ?? '');
        return sanitizeCsvCell(val);
      }).join(',');
    });

    const csvContent = [headerLine, ...rowLines].join('\n');

    res.setHeader('Content-Disposition', `attachment; filename="job-${id}-clean.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/jobs/:id
 * Cancel a job or clean up its resources.
 */
export async function deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const deleted = await jobRepository.delete(id);

    if (!deleted) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    logger.info({ jobId: id }, 'Job deleted');
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    next(error);
  }
}

