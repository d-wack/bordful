import type { Job } from '@/lib/db/airtable';

/**
 * Repository interface for Job data access.
 *
 * Both `AirtableJobRepository` (read-only, current default) and the future
 * `PrismaPostgresJobRepository` (write-capable) must conform to this contract.
 * All server-side code that needs job data should depend on this interface, not
 * on a concrete implementation, so that the active backend can be swapped via
 * config/env without touching calling code.
 */
export type JobRepository = {
  /**
   * Retrieve all active jobs sorted by `posted_date` descending.
   * Returns an empty array when the data source is unavailable.
   */
  getJobs(): Promise<Job[]>;

  /**
   * Retrieve a single active job by its record ID.
   * Returns `null` when the job does not exist or is inactive.
   */
  getJob(id: string): Promise<Job | null>;

  /**
   * Verify that the underlying data source is reachable.
   * Intended for health-check and diagnostics endpoints only.
   */
  testConnection(): Promise<boolean>;
};
