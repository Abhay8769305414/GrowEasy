import { Job, JobStatus } from '@groweasy/shared';
import { logger } from '../logger';

/**
 * Thread-safe In-memory Job Repository singleton.
 */
export class JobRepository {
  private readonly store = new Map<string, Job>();

  async create(job: Job): Promise<void> {
    this.store.set(job.id, job);
    logger.debug({ jobId: job.id }, '[JobRepository] Job created in memory store');
  }

  async findById(id: string): Promise<Job | null> {
    return this.store.get(id) ?? null;
  }

  async update(id: string, updates: Partial<Job>): Promise<Job | null> {
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
    return Array.from(this.store.values()).filter((job) => job.status === status);
  }

  async listAll(): Promise<Job[]> {
    return Array.from(this.store.values());
  }

  /** Expose store size for health checks */
  get size(): number {
    return this.store.size;
  }
}

// Singleton instance shared across the application
export const jobRepository = new JobRepository();
