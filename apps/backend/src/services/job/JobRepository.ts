import { Job, JobStatus } from '@groweasy/shared';
import { config } from '../../config';
import { logger } from '../logger';

const CLEANUP_STATUSES = new Set<JobStatus>([
  JobStatus.DONE,
  JobStatus.FAILED,
  JobStatus.CANCELLED,
]);

export class JobRepository {
  private readonly store = new Map<string, Job>();
  private readonly cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, config.jobCleanupIntervalMs);
    this.cleanupTimer.unref?.();
  }

  async create(job: Job): Promise<void> {
    this.cleanupExpired();
    this.store.set(job.id, job);
    logger.debug({ jobId: job.id }, '[JobRepository] Job created in memory store');
  }

  async findById(id: string): Promise<Job | null> {
    this.cleanupExpired();
    return this.store.get(id) ?? null;
  }

  async update(id: string, updates: Partial<Job>): Promise<Job | null> {
    this.cleanupExpired();
    const existing = this.store.get(id);
    if (!existing) return null;

    const updated: Job = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    this.store.set(id, updated);
    logger.debug({ jobId: id }, '[JobRepository] Job updated in memory store');
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async findByStatus(status: JobStatus): Promise<Job[]> {
    this.cleanupExpired();
    return Array.from(this.store.values()).filter((job) => job.status === status);
  }

  async listAll(): Promise<Job[]> {
    this.cleanupExpired();
    return Array.from(this.store.values());
  }

  cleanupExpired(now = Date.now()): number {
    let deleted = 0;

    for (const [id, job] of this.store.entries()) {
      if (!CLEANUP_STATUSES.has(job.status)) continue;
      if (now - job.updatedAt < config.jobTtlMs) continue;

      this.store.delete(id);
      deleted++;
    }

    if (deleted > 0) {
      logger.info({ deleted }, '[JobRepository] Expired completed jobs cleaned up');
    }

    return deleted;
  }

  get size(): number {
    return this.store.size;
  }
}

export const jobRepository = new JobRepository();