import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { jobRepository } from '../services/job/JobRepository';
import { JobStatus } from '@groweasy/shared';

describe('Jobs Route Endpoints', () => {
  const jobId = '2b73bc0c-ff67-4e36-8a79-084dfbb7159c';

  beforeEach(async () => {
    // Seed a job in the repository for testing
    await jobRepository.delete(jobId);
    await jobRepository.create({
      id: jobId,
      status: JobStatus.DONE,
      fileName: 'clean_contacts.csv',
      totalRows: 1,
      processedRows: 1,
      fieldMappings: {},
      batches: [],
      summary: { total: 1, success: 1, failed: 0, skipped: 0 },
      metrics: {
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        durationMs: 1000,
        llmCalls: 1,
        totalTokens: 50,
        promptTokens: 30,
        completionTokens: 20,
        estimatedCostUsd: 0.0001,
        llmLatencyMs: [500],
      },
      records: [
        {
          row: 1,
          status: 'success',
          rawData: { Name: 'Rahul Sharma', Email: 'rahul@example.com' },
          data: { name: 'Rahul Sharma', email: 'rahul@example.com' },
          fieldConfidence: {},
          errors: [],
          warnings: [],
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  it('GET /api/jobs/:id returns correct status', async () => {
    const res = await request(app)
      .get(`/api/jobs/${jobId}`)
      .expect(200);

    expect(res.body.jobId).toBe(jobId);
    expect(res.body.status).toBe(JobStatus.DONE);
  });

  it('GET /api/jobs/:id returns 404 for unknown job', async () => {
    await request(app)
      .get('/api/jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .expect(404);
  });

  it('GET /api/jobs/:id/result returns clean records', async () => {
    const res = await request(app)
      .get(`/api/jobs/${jobId}/result`)
      .expect(200);

    expect(res.body.jobId).toBe(jobId);
    expect(res.body.records).toHaveLength(1);
    expect(res.body.records[0].data.name).toBe('Rahul Sharma');
  });

  it('GET /api/jobs/:id/download/json returns json file attachment', async () => {
    const res = await request(app)
      .get(`/api/jobs/${jobId}/download/json`)
      .expect(200);

    expect(res.header['content-disposition']).toContain('attachment');
    expect(res.header['content-disposition']).toContain('.json');
    expect(res.header['content-type']).toContain('application/json');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].data.name).toBe('Rahul Sharma');
  });

  it('GET /api/jobs/:id/download/csv returns csv file attachment', async () => {
    const res = await request(app)
      .get(`/api/jobs/${jobId}/download/csv`)
      .expect(200);

    expect(res.header['content-disposition']).toContain('attachment');
    expect(res.header['content-disposition']).toContain('.csv');
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.text).toContain('"name","email","phone","company"');
    expect(res.text).toContain('"Rahul Sharma","rahul@example.com"');
  });

  it('DELETE /api/jobs/:id cancels or deletes job', async () => {
    await request(app)
      .delete(`/api/jobs/${jobId}`)
      .expect(200);

    // Verify it is gone
    const job = await jobRepository.findById(jobId);
    expect(job).toBeNull();
  });

  it('GET /api/jobs/:id returns 400 for invalid UUID format', async () => {
    await request(app)
      .get('/api/jobs/invalid-uuid-123')
      .expect(400);
  });
});
