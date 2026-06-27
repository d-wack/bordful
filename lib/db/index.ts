import 'server-only';

import { AirtableJobRepository } from '@/lib/db/airtable.server';
import type { JobRepository } from '@/lib/db/types';

/**
 * Repository factory — returns the active `JobRepository` implementation.
 *
 * ## How the backend is selected
 *
 * The active provider is controlled by the `DATABASE_PROVIDER` environment
 * variable (case-insensitive):
 *
 * | Value       | Implementation              | When to use                             |
 * |-------------|-----------------------------|-----------------------------------------|
 * | `airtable`  | `AirtableJobRepository`     | Read-only deployments (current default) |
 * | `postgres`  | `PrismaPostgresJobRepository` | Phase 1+: self-service posting, auth  |
 *
 * Defaults to `"airtable"` when the variable is absent so that existing
 * Airtable-only deployments require **zero config changes**.
 *
 * ## Usage
 *
 * ```ts
 * // In a Server Component, Server Action, or Route Handler:
 * import { getJobRepository } from '@/lib/db';
 *
 * const repo = getJobRepository();
 * const jobs = await repo.getJobs();
 * ```
 *
 * > **Important:** This module is `server-only`. It must never be imported
 * > from client components.
 *
 * ## Phase 1 note
 *
 * When `PrismaPostgresJobRepository` is implemented, add:
 * ```ts
 * import { PrismaPostgresJobRepository } from '@/lib/db/prisma.server';
 * ```
 * and extend the `switch` below with a `'postgres'` branch.
 */
export function getJobRepository(): JobRepository {
  const provider = (process.env.DATABASE_PROVIDER ?? 'airtable').toLowerCase();

  switch (provider) {
    // Phase 1 will add:
    // case 'postgres':
    //   return new PrismaPostgresJobRepository();

    default:
      return new AirtableJobRepository();
  }
}

// Re-export the interface so callers can type-hint against it without a
// separate import from @/lib/db/types.
export type { JobRepository } from '@/lib/db/types';
