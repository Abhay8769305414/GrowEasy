import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { JobStatus, ConfidenceLevel } from '@groweasy/shared';
import { jobRepository } from '../services/job/JobRepository';
import { parseCsvFile } from '../services/parser/csvParser';
import { suggestFieldMappings } from '../services/ai/FieldMappingAgent';
import { jobOrchestrator } from '../services/job/orchestrator';
import { createError } from '../middleware/errorHandler';
import { logger } from '../services/logger';

/**
 * POST /api/import/preview
 * Upload a CSV file → stream-parse it → return real headers, preview rows, total count.
 */
export async function previewImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const file = req.file;

  if (!file) {
    next(createError('No file uploaded', 400, 'NO_FILE'));
    return;
  }

  const jobId = randomUUID();
  const now = Date.now();
  const requestId = (req as Request & { id?: string }).id ?? jobId;

  const log = logger.child({ jobId, requestId, file: file.originalname });
  log.info(
    { size: file.size, mimetype: file.mimetype, path: file.path },
    '[Upload] File received — starting CSV parse'
  );

  try {
    // ── Create initial job record ────────────────────────────────────────────
    await jobRepository.create({
      id: jobId,
      status: JobStatus.PARSING,
      fileName: file.originalname,
      totalRows: 0,
      processedRows: 0,
      fieldMappings: {},
      batches: [],
      summary: { total: 0, success: 0, failed: 0, skipped: 0 },
      metrics: {
        startedAt: now,
        llmCalls: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0,
        llmLatencyMs: [],
      },
      createdAt: now,
      updatedAt: now,
    });

    // ── Stream-parse the CSV ─────────────────────────────────────────────────
    const parsed = await parseCsvFile({
      filePath: file.path,
      originalName: file.originalname,
      jobId,
    });

    // ── Suggest CRM field mappings using Field Mapping Agent ─────────────────
    const mappingSuggestions = await suggestFieldMappings(
      parsed.headers,
      parsed.preview.slice(0, 5)
    );

    const initialMappings: Record<string, any> = {};
    for (const mapping of mappingSuggestions.mappings) {
      let level = ConfidenceLevel.LOW;
      if (mapping.confidence >= 0.85) level = ConfidenceLevel.HIGH;
      else if (mapping.confidence >= 0.60) level = ConfidenceLevel.MEDIUM;

      initialMappings[mapping.csvColumn] = {
        csvColumn: mapping.csvColumn,
        crmField: mapping.crmField,
        confidence: {
          score: mapping.confidence,
          level,
          reason: mapping.reason,
        },
      };
    }

    // ── Update job with real row count and suggestions ───────────────────────
    await jobRepository.update(jobId, {
      status: JobStatus.QUEUED,
      totalRows: parsed.totalRows,
      headers: parsed.headers,
      previewRows: parsed.preview,
      fieldMappings: initialMappings as any,
      filePath: file.path,
      delimiter: parsed.delimiter,
    });

    log.info(
      {
        headers: parsed.headers,
        totalRows: parsed.totalRows,
        skippedRows: parsed.skippedRows,
        previewRows: parsed.preview.length,
        delimiter: parsed.delimiter,
        suggestedMappingsCount: mappingSuggestions.mappings.filter(m => m.crmField).length,
      },
      '[Upload] CSV parsed and mapping suggestions completed successfully'
    );

    // ── Cleanup uploaded file (data now in memory for preview) ───────────────
    // Keep file on disk for the actual processing job — cleaned up after job completes
    // fs.unlinkSync(file.path); // ← uncomment if you want immediate cleanup

    res.json({
      jobId,
      headers: parsed.headers,
      preview: parsed.preview,
      totalRows: parsed.totalRows,
      skippedRows: parsed.skippedRows,
      fileSize: file.size,
      fileName: file.originalname,
      delimiter: parsed.delimiter,
      suggestedMappings: initialMappings,
    });
  } catch (error) {
    log.error({ err: (error as Error).message }, '[Upload] CSV parsing failed');

    // Clean up the failed upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    await jobRepository.delete(jobId);
    next(createError((error as Error).message, 422, 'PARSE_ERROR'));
  }
}

/**
 * POST /api/import/start
 * Begin AI processing of an uploaded job with confirmed field mappings.
 */
export async function startImport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { jobId, fieldMappings } = req.body as {
      jobId: string;
      fieldMappings: Array<{ csvColumn: string; crmField: string | null }>;
    };

    if (!jobId) {
      throw createError('jobId is required', 400, 'MISSING_JOB_ID');
    }

    const job = await jobRepository.findById(jobId);
    if (!job) {
      throw createError('Job not found — upload the file again', 404, 'JOB_NOT_FOUND');
    }

    // Build mapping map
    const mappingMap: Record<
      string,
      { csvColumn: string; crmField: string | null; confidence: { score: number; level: string; reason: string } }
    > = {};

    for (const m of fieldMappings ?? []) {
      mappingMap[m.csvColumn] = {
        csvColumn: m.csvColumn,
        crmField: m.crmField,
        confidence: { score: 1.0, level: 'high', reason: 'User-confirmed mapping' },
      };
    }

    await jobRepository.update(jobId, {
      status: JobStatus.QUEUED,
      fieldMappings: mappingMap as never,
    });

    // Start pipeline execution in background
    await jobOrchestrator.startJob(
      jobId,
      job.filePath!,
      mappingMap as never,
      job.delimiter ?? ','
    );

    logger.info(
      { jobId, mappingCount: fieldMappings?.length ?? 0 },
      '[Import] Job queued — AI processing will start'
    );

    res.json({
      jobId,
      status: 'queued',
      message: `Import job queued. Processing ${job.totalRows} rows.`,
    });
  } catch (error) {
    next(error);
  }
}
