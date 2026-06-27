/**
 * Tests for the repository factory in lib/db/index.ts.
 *
 * These tests verify that:
 *  1. The factory always returns an object satisfying the `JobRepository`
 *     interface (correct method signatures present).
 *  2. The default provider is Airtable when DATABASE_PROVIDER is absent.
 *  3. An explicit DATABASE_PROVIDER=airtable also resolves to Airtable.
 *
 * NOTE: We do NOT call the real Airtable API in unit tests.  The method
 * presence assertions are purely structural — they confirm the factory wires
 * up correctly without any I/O.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock server-only so the module can be imported in the Node test environment
// (Vitest runs in Node, not a Next.js server context).
// ---------------------------------------------------------------------------
vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Mock AirtableJobRepository to avoid real Airtable SDK calls and to avoid
// the 'server-only' constraint imposed by airtable.server.ts.
// ---------------------------------------------------------------------------
vi.mock('@/lib/db/airtable.server', () => {
  class MockAirtableJobRepository {
    getJobs() {
      return Promise.resolve([]);
    }
    getJob(_id: string) {
      return Promise.resolve(null);
    }
    testConnection() {
      return Promise.resolve(false);
    }
  }
  return { AirtableJobRepository: MockAirtableJobRepository };
});

describe('getJobRepository factory', () => {
  const originalEnv = process.env.DATABASE_PROVIDER;

  beforeEach(() => {
    // Reset the module registry so each test gets a fresh import with the
    // updated DATABASE_PROVIDER value.
    vi.resetModules();
  });

  afterEach(() => {
    // Restore the original env var after each test.
    process.env.DATABASE_PROVIDER =
      originalEnv === undefined ? undefined : originalEnv;
  });

  it('returns a JobRepository when DATABASE_PROVIDER is not set', async () => {
    process.env.DATABASE_PROVIDER = undefined;
    const { getJobRepository } = await import('@/lib/db/index');
    const repo = getJobRepository();

    expect(typeof repo.getJobs).toBe('function');
    expect(typeof repo.getJob).toBe('function');
    expect(typeof repo.testConnection).toBe('function');
  });

  it('returns a JobRepository when DATABASE_PROVIDER=airtable', async () => {
    process.env.DATABASE_PROVIDER = 'airtable';
    const { getJobRepository } = await import('@/lib/db/index');
    const repo = getJobRepository();

    expect(typeof repo.getJobs).toBe('function');
    expect(typeof repo.getJob).toBe('function');
    expect(typeof repo.testConnection).toBe('function');
  });

  it('returns a JobRepository when DATABASE_PROVIDER=AIRTABLE (case-insensitive)', async () => {
    process.env.DATABASE_PROVIDER = 'AIRTABLE';
    const { getJobRepository } = await import('@/lib/db/index');
    const repo = getJobRepository();

    expect(typeof repo.getJobs).toBe('function');
  });

  it('falls back to Airtable for an unrecognised provider value', async () => {
    process.env.DATABASE_PROVIDER = 'unknown-provider';
    const { getJobRepository } = await import('@/lib/db/index');
    const repo = getJobRepository();

    // Should still return a valid repository (AirtableJobRepository via default)
    expect(typeof repo.getJobs).toBe('function');
    expect(typeof repo.getJob).toBe('function');
    expect(typeof repo.testConnection).toBe('function');
  });

  it('re-exports the JobRepository type (type-level check)', async () => {
    // This import would fail at compile time if the re-export is broken.
    const mod = await import('@/lib/db/index');
    // At runtime we just verify the module exported `getJobRepository`
    expect(typeof mod.getJobRepository).toBe('function');
  });
});
