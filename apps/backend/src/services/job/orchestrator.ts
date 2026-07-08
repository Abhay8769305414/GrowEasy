import { EventEmitter } from 'events';
import { 
  JobStatus, 
  BatchStatus, 
  CrmRecord, 
  FieldMappingMap, 
  ProcessingSummary,
  JobMetrics,
  BatchInfo
} from '@groweasy/shared';
import { logger } from '../logger';
import { jobRepository } from './JobRepository';
import { extractCrmRecords } from '../ai/CRMExtractionAgent';
import { normalizeCrmRecord } from '../normalizer/normalizer';
import { validateCrmRecord } from '../validator/validator';
import { estimateGeminiCost } from '@groweasy/shared';

export const jobEvents = new EventEmitter();

// Limit EventEmitter listeners warnings
jobEvents.setMaxListeners(1000);

export const BATCH_SIZE = 25;

/**
 * Exponential backoff helper for LLM API resilience.
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  onRetry?: (error: any, attempt: number) => void
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw error;
      }
      if (onRetry) {
        onRetry(error, attempt);
      }
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      await new Promise((res) => setTimeout(res, backoffDelay));
    }
  }
}

/**
 * Orchestrates batch execution of CSV record mapping, extraction, normalization, and validation.
 */
export class JobOrchestrator {
  /**
   * Starts a background import job.
   */
  async startJob(
    jobId: string,
    rawRows: Record<string, string>[],
    fieldMappings: FieldMappingMap,
    delimiter = ','
  ): Promise<void> {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      logger.error({ jobId }, '[JobOrchestrator] Job not found to start');
      return;
    }

    // Set job to processing status
    const startTime = Date.now();
    await jobRepository.update(jobId, {
      status: JobStatus.PROCESSING,
      metrics: {
        startedAt: startTime,
        llmCalls: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0,
        llmLatencyMs: [],
      },
    });

    // Start background processing
    this.runPipeline(jobId, rawRows, fieldMappings, delimiter).catch((err) => {
      logger.error({ jobId, err: err.message }, '[JobOrchestrator] Fatal error in processing pipeline');
      jobEvents.emit(`error:${jobId}`, { error: err.message });
    });
  }

  private async runPipeline(
    jobId: string,
    rawRows: Record<string, string>[],
    fieldMappings: FieldMappingMap,
    _delimiter: string
  ): Promise<void> {
    const startTime = Date.now();
    logger.info({ jobId, totalRows: rawRows.length }, '[JobOrchestrator] Pipeline started');

    
    const totalRows = rawRows.length;
    if (totalRows === 0) {
      await jobRepository.update(jobId, {
        status: JobStatus.DONE,
        totalRows: 0,
        processedRows: 0,
        summary: { total: 0, success: 0, failed: 0, skipped: 0 },
      });
      jobEvents.emit(`done:${jobId}`, {
        jobId,
        summary: { total: 0, success: 0, failed: 0, skipped: 0 },
        metrics: { durationMs: 0, llmCalls: 0, totalTokens: 0, estimatedCostUsd: 0 },
      });
      return;
    }

    // Update job with correct total row count
    await jobRepository.update(jobId, { totalRows });

    // 2. Build batches of size BATCH_SIZE (25)
    const batchesCount = Math.ceil(totalRows / BATCH_SIZE);
    const jobBatchesList: BatchInfo[] = Array.from({ length: batchesCount }, (_, i) => {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, totalRows);
      return {
        batchId: `${jobId}-batch-${i + 1}`,
        index: i,
        rowStart: start,
        rowEnd: end,
        status: BatchStatus.PENDING,
        retries: 0,
      };
    });

    await jobRepository.update(jobId, { batches: jobBatchesList });

    const cleanRecords: CrmRecord[] = [];
    const summary: ProcessingSummary = { total: totalRows, success: 0, failed: 0, skipped: 0 };
    const metrics: JobMetrics = {
      startedAt: Date.now(),
      llmCalls: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      llmLatencyMs: [],
    };

    // 3. Process batches sequentially to respect API rate limits and provide steady progress
    for (let i = 0; i < batchesCount; i++) {
      const batchInfo = jobBatchesList[i];
      batchInfo.status = BatchStatus.PROCESSING;
      await jobRepository.update(jobId, { batches: [...jobBatchesList] });

      const batchRows = rawRows.slice(batchInfo.rowStart, batchInfo.rowEnd);
      const rowsCount = batchRows.length;

      logger.info(
        { jobId, batchId: batchInfo.batchId, start: batchInfo.rowStart, end: batchInfo.rowEnd },
        `[JobOrchestrator] Processing batch ${i + 1}/${batchesCount}`
      );

      // Mapping approved array format to map
      const mappingArray = Object.values(fieldMappings);

      // Perform CRM extraction with 3x retry exponential backoff
      let extractionResult;
      try {
        extractionResult = await callWithRetry(
          () => extractCrmRecords({
            rows: batchRows,
            fieldMappings: mappingArray,
            batchId: batchInfo.batchId,
          }),
          3,
          1000,
          (error, attempt) => {
            batchInfo.retries = attempt;
            logger.warn(
              { jobId, batchId: batchInfo.batchId, attempt, err: error.message },
              '[JobOrchestrator] Extraction failed, retrying...'
            );
          }
        );

        batchInfo.status = BatchStatus.DONE;
      } catch (err) {
        // Fallback strategy: If LLM fails completely, perform deterministic extraction fallback for the batch
        logger.error(
          { jobId, batchId: batchInfo.batchId, err: (err as Error).message },
          '[JobOrchestrator] Batch extraction failed after retries. Executing deterministic extraction fallback.'
        );
        batchInfo.status = BatchStatus.FAILED;
        batchInfo.error = (err as Error).message;

        const approvedFields = Object.values(fieldMappings);
        const fallbackResults = batchRows.map((row, index) => {
          const extracted: Record<string, string> = {};
          for (const m of approvedFields) {
            if (m.crmField) {
              extracted[m.crmField] = row[m.csvColumn] ?? '';
            }
          }
          return {
            rowIndex: index,
            extracted,
            skipped: false,
          };
        });

        extractionResult = {
          results: fallbackResults,
          metadata: {
            modelVersion: 'deterministic-fallback-critical',
            promptVersion: 'v1',
            tokensUsed: 0,
            latencyMs: 0,
          },
        };
      }

      // Update metrics
      metrics.llmCalls += 1;
      metrics.llmLatencyMs.push(extractionResult.metadata.latencyMs);
      
      // Calculate token costs if tokens are present
      if (extractionResult.metadata.tokensUsed > 0) {
        metrics.totalTokens += extractionResult.metadata.tokensUsed;
        // Assume standard 70/30 split for fallback calculation
        const promptTokens = Math.round(extractionResult.metadata.tokensUsed * 0.7);
        const completionTokens = extractionResult.metadata.tokensUsed - promptTokens;
        metrics.promptTokens += promptTokens;
        metrics.completionTokens += completionTokens;
        metrics.estimatedCostUsd += estimateGeminiCost(promptTokens, completionTokens);
      }

      // 4. Normalize & Validate each row of the extraction results
      for (let rIndex = 0; rIndex < rowsCount; rIndex++) {
        const rawRow = batchRows[rIndex];
        const extractedResult = extractionResult.results.find((res) => res.rowIndex === rIndex);
        const extractedValues = extractedResult?.extracted ?? {};

        // Normalize
        const normalizedValues = normalizeCrmRecord(extractedValues);
        
        // Validate
        const actualRowNumber = batchInfo.rowStart + rIndex;
        const record = validateCrmRecord(normalizedValues, actualRowNumber, rawRow);

        // Apply mapping confidence scores to fields if mapping has confidences
        for (const mapping of mappingArray) {
          if (mapping.crmField) {
            record.fieldConfidence[mapping.crmField] = mapping.confidence;
          }
        }

        cleanRecords.push(record);

        // Increment summary counts
        if (record.status === 'success') summary.success++;
        else if (record.status === 'failed') summary.failed++;
        else if (record.status === 'skipped') summary.skipped++;
      }

      // 5. Update overall job progress
      const processed = batchInfo.rowEnd;
      await jobRepository.update(jobId, {
        processedRows: processed,
        batches: [...jobBatchesList],
        summary,
      });

      // Emit Progress Event via SSE
      jobEvents.emit(`progress:${jobId}`, {
        processed,
        total: totalRows,
        batchId: batchInfo.batchId,
        batchIndex: i,
        totalBatches: batchesCount,
      });
    }

    // 6. Complete Pipeline and mark Job as done
    const duration = Date.now() - startTime;
    metrics.completedAt = Date.now();
    metrics.durationMs = duration;

    await jobRepository.update(jobId, {
      status: JobStatus.DONE,
      records: cleanRecords,
      summary,
      metrics,
    });

    logger.info({ jobId, summary, duration }, '[JobOrchestrator] Pipeline execution completed successfully');

    // Emit Done Event via SSE
    jobEvents.emit(`done:${jobId}`, {
      jobId,
      summary,
      metrics: {
        durationMs: duration,
        llmCalls: metrics.llmCalls,
        totalTokens: metrics.totalTokens,
        estimatedCostUsd: metrics.estimatedCostUsd,
      },
    });
  }
}

export const jobOrchestrator = new JobOrchestrator();
