import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { jobOrchestrator, callWithRetry, jobEvents } from './orchestrator';
import { jobRepository } from './JobRepository';
import { JobStatus, BatchStatus, ConfidenceLevel } from '@groweasy/shared';

// Mock extraction agent
vi.mock('../ai/CRMExtractionAgent', () => ({
  extractCrmRecords: vi.fn(async ({ rows, batchId }) => {
    return {
      results: rows.map((r: any, idx: number) => ({
        rowIndex: idx,
        extracted: {
          name: r.Name || '',
          email: r.Email || '',
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

describe('JobOrchestrator', () => {
  let tempCsvFile: string;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a temporary CSV with 30 rows of contacts
    const headers = 'Name,Email,Phone,Country\n';
    const lines = Array.from({ length: 30 }, (_, i) => `Rahul ${i + 1},rahul${i + 1}@example.com,+919876543210,India`).join('\n');
    tempCsvFile = path.join(os.tmpdir(), `orchestrator-test-${Date.now()}.csv`);
    fs.writeFileSync(tempCsvFile, headers + lines, 'utf-8');
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
      const progressPayloads: any[] = [];
      let donePayload: any = null;

      jobEvents.on(`progress:${jobId}`, (payload) => {
        progressPayloads.push(payload);
      });

      const donePromise = new Promise<void>((resolve) => {
        jobEvents.on(`done:${jobId}`, (payload) => {
          donePayload = payload;
          resolve();
        });
      });

      // Start the job (processes in background)
      await jobOrchestrator.startJob(jobId, tempCsvFile, fieldMappings, ',');

      // Wait for done event to fire
      await donePromise;

      // Verify progress events (30 rows batched: 25 in batch 1, 5 in batch 2)
      expect(progressPayloads).toHaveLength(2);
      expect(progressPayloads[0]).toEqual({
        processed: 25,
        total: 30,
        batchId: `${jobId}-batch-1`,
        batchIndex: 0,
        totalBatches: 2,
      });
      expect(progressPayloads[1]).toEqual({
        processed: 30,
        total: 30,
        batchId: `${jobId}-batch-2`,
        batchIndex: 1,
        totalBatches: 2,
      });

      // Verify done event payload
      expect(donePayload).toBeDefined();
      expect(donePayload.summary.success).toBe(30);

      // Verify stored job status and records in database
      const finalJob = await jobRepository.findById(jobId);
      expect(finalJob).toBeDefined();
      expect(finalJob!.status).toBe(JobStatus.DONE);
      expect(finalJob!.processedRows).toBe(30);
      expect(finalJob!.records).toHaveLength(30);
      
      const firstRecord = finalJob!.records![0];
      expect(firstRecord.status).toBe('success');
      expect(firstRecord.data.name).toBe('Rahul 1');
      expect(firstRecord.data.email).toBe('rahul1@example.com');
      
      fs.unlinkSync(tempCsvFile);
    });
  });
});
