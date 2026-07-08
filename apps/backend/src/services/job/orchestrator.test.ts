import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobOrchestrator, callWithRetry, jobEvents } from './orchestrator';
import { jobRepository } from './JobRepository';
import { JobStatus, ConfidenceLevel } from '@groweasy/shared';

// Mock extraction agent
vi.mock('../ai/CRMExtractionAgent', () => ({
  extractCrmRecords: vi.fn(async ({ rows }: { rows: Record<string, string>[]; batchId: string }) => {
    return {
      results: rows.map((r, idx: number) => ({
        rowIndex: idx,
        extracted: {
          name: r['Name'] || '',
          email: r['Email'] || '',
        },
        skipped: false,
      })),
      metadata: {
        modelVersion: 'test-mock-gemini',
        promptVersion: 'v1',
        tokensUsed: 100,
        latencyMs: 50,
      },
    };
  }),
}));

// Pre-built rows so the test does not depend on disk or file paths
function buildTestRows(count: number): Record<string, string>[] {
  return Array.from({ length: count }, (_, i) => ({
    Name: `Rahul ${i + 1}`,
    Email: `rahul${i + 1}@example.com`,
    Phone: '+919876543210',
    Country: 'India',
  }));
}

describe('JobOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('callWithRetry', () => {
    it('should retry on failures and resolve on success', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Transient failure');
        }
        return 'success';
      };

      const result = await callWithRetry(fn, 3, 5);
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should throw an error after exceeding retry attempts', async () => {
      const fn = async () => {
        throw new Error('Fatal failure');
      };

      await expect(callWithRetry(fn, 2, 5)).rejects.toThrow('Fatal failure');
    });
  });

  describe('startJob', () => {
    it('orchestrates processing in batches of 25, tracks progress, and emits SSE events', async () => {
      const jobId = `job-test-${Date.now()}`;
      const fieldMappings = {
        name: {
          csvColumn: 'Name',
          crmField: 'name' as const,
          confidence: { score: 1, level: ConfidenceLevel.HIGH, reason: 'Exact header match' },
        },
        email: {
          csvColumn: 'Email',
          crmField: 'email' as const,
          confidence: { score: 1, level: ConfidenceLevel.HIGH, reason: 'Exact header match' },
        },
      };

      // Create a queued job in the repository
      await jobRepository.create({
        id: jobId,
        status: JobStatus.QUEUED,
        fileName: 'test.csv',
        totalRows: 0,
        processedRows: 0,
        fieldMappings,
        batches: [],
        summary: { total: 0, success: 0, failed: 0, skipped: 0 },
        metrics: {
          startedAt: Date.now(),
          llmCalls: 0,
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          estimatedCostUsd: 0,
          llmLatencyMs: [],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Setup listeners for SSE broadcasts
      const progressPayloads: unknown[] = [];
      let donePayload: unknown = null;

      jobEvents.on(`progress:${jobId}`, (payload) => {
        progressPayloads.push(payload);
      });

      const donePromise = new Promise<void>((resolve) => {
        jobEvents.on(`done:${jobId}`, (payload) => {
          donePayload = payload;
          resolve();
        });
      });

      // Pre-parsed rows (30 contacts) — no disk or file path required
      const rawRows = buildTestRows(30);

      // Start the job (processes in background)
      await jobOrchestrator.startJob(jobId, rawRows, fieldMappings, ',');

      // Wait for done event to fire
      await donePromise;

      // Verify progress events (30 rows batched: 25 in batch 1, 5 in batch 2)
      expect(progressPayloads).toHaveLength(2);
      expect((progressPayloads[0] as any)).toMatchObject({
        processed: 25,
        total: 30,
        batchId: `${jobId}-batch-1`,
        batchIndex: 0,
        totalBatches: 2,
      });
      expect((progressPayloads[1] as any)).toMatchObject({
        processed: 30,
        total: 30,
        batchId: `${jobId}-batch-2`,
        batchIndex: 1,
        totalBatches: 2,
      });

      // Verify done event payload
      expect(donePayload).toBeDefined();
      expect((donePayload as any).summary.success).toBe(30);

      // Verify stored job status and records
      const finalJob = await jobRepository.findById(jobId);
      expect(finalJob).toBeDefined();
      expect(finalJob!.status).toBe(JobStatus.DONE);
      expect(finalJob!.processedRows).toBe(30);
      expect(finalJob!.records).toHaveLength(30);

      const firstRecord = finalJob!.records![0];
      expect(firstRecord.status).toBe('success');
      expect(firstRecord.data.name).toBe('Rahul 1');
      expect(firstRecord.data.email).toBe('rahul1@example.com');
    });
  });
});
