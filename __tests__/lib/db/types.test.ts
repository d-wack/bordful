import { describe, expect, it, vi } from 'vitest';
import type { Job } from '@/lib/db/airtable';
import type { JobRepository } from '@/lib/db/types';

// ---------------------------------------------------------------------------
// Structural contract test for JobRepository
//
// We verify that an object satisfying the interface can be constructed and
// that TypeScript enforces the required method signatures.  No real I/O
// happens — the repository is a stub.
// ---------------------------------------------------------------------------

const stubJob: Job = {
  id: 'rec_test_001',
  title: 'Senior Engineer',
  company: 'Acme Corp',
  type: 'Full-time',
  salary: { min: 100_000, max: 140_000, currency: 'USD', unit: 'year' },
  description: 'A great role.',
  benefits: null,
  application_requirements: null,
  apply_url: 'https://example.com/apply',
  posted_date: '2026-01-01',
  valid_through: null,
  job_identifier: null,
  job_source_name: null,
  status: 'active',
  career_level: ['Senior'],
  visa_sponsorship: 'Not specified',
  featured: false,
  workplace_type: 'Remote',
  remote_region: 'Worldwide',
  timezone_requirements: null,
  workplace_city: null,
  workplace_country: null,
  languages: ['en'],
};

/**
 * A minimal in-memory stub that satisfies the JobRepository interface.
 * This proves the interface is usable as an abstraction for future
 * PrismaPostgresJobRepository or test doubles.
 */
const stubRepository: JobRepository = {
  getJobs: vi.fn().mockResolvedValue([stubJob]),
  getJob: vi
    .fn()
    .mockImplementation(async (id: string) =>
      id === stubJob.id ? stubJob : null
    ),
  testConnection: vi.fn().mockResolvedValue(true),
};

describe('JobRepository interface', () => {
  it('getJobs returns an array of jobs', async () => {
    const jobs = await stubRepository.getJobs();
    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBe(1);
    expect(jobs[0]?.id).toBe('rec_test_001');
  });

  it('getJob returns a job for a known id', async () => {
    const job = await stubRepository.getJob('rec_test_001');
    expect(job).not.toBeNull();
    expect(job?.title).toBe('Senior Engineer');
  });

  it('getJob returns null for an unknown id', async () => {
    const job = await stubRepository.getJob('rec_unknown');
    expect(job).toBeNull();
  });

  it('testConnection returns a boolean', async () => {
    const result = await stubRepository.testConnection();
    expect(typeof result).toBe('boolean');
    expect(result).toBe(true);
  });
});
