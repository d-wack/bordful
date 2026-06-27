import { describe, expect, it } from 'vitest';
import type { Salary } from '@/lib/db/airtable';
import {
  formatSalary,
  formatUSDApproximation,
  normalizeAnnualSalary,
} from '@/lib/db/airtable';

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const RE_APPROX_PREFIX = /^≈/;
const ANNUAL_USD_120K = 120_000;
const HOURS_PER_YEAR = 2080;
const HOURLY_RATE_50 = 50;

// ---------------------------------------------------------------------------
// formatSalary
// ---------------------------------------------------------------------------

describe('formatSalary', () => {
  it('returns "Not specified" for null salary', () => {
    expect(formatSalary(null)).toBe('Not specified');
  });

  it('returns "Not specified" when both min and max are null', () => {
    const salary: Salary = {
      min: null,
      max: null,
      currency: 'USD',
      unit: 'year',
    };
    expect(formatSalary(salary)).toBe('Not specified');
  });

  it('formats a yearly USD range with k-suffix', () => {
    const salary: Salary = {
      min: 80_000,
      max: 120_000,
      currency: 'USD',
      unit: 'year',
    };
    expect(formatSalary(salary)).toBe('$80k-120k/year');
  });

  it('formats a single (max-only) salary', () => {
    const salary: Salary = {
      min: null,
      max: 50_000,
      currency: 'USD',
      unit: 'year',
    };
    expect(formatSalary(salary)).toBe('$50k/year');
  });

  it('formats hourly rates without k-suffix for small numbers', () => {
    const salary: Salary = { min: 25, max: 40, currency: 'USD', unit: 'hour' };
    expect(formatSalary(salary)).toBe('$25-40/hour');
  });

  it('optionally appends the currency code', () => {
    const salary: Salary = {
      min: 80_000,
      max: 100_000,
      currency: 'EUR',
      unit: 'year',
    };
    const result = formatSalary(salary, true);
    expect(result).toContain('(EUR)');
  });

  it('formats equal min and max as a single value', () => {
    const salary: Salary = {
      min: 100_000,
      max: 100_000,
      currency: 'USD',
      unit: 'year',
    };
    expect(formatSalary(salary)).toBe('$100k/year');
  });
});

// ---------------------------------------------------------------------------
// formatUSDApproximation
// ---------------------------------------------------------------------------

describe('formatUSDApproximation', () => {
  it('returns null for a USD salary (no approximation needed)', () => {
    const salary: Salary = {
      min: 80_000,
      max: 120_000,
      currency: 'USD',
      unit: 'year',
    };
    expect(formatUSDApproximation(salary)).toBeNull();
  });

  it('returns null for a null salary', () => {
    expect(formatUSDApproximation(null)).toBeNull();
  });

  it('returns a string starting with ≈ for non-USD salaries', () => {
    const salary: Salary = {
      min: 80_000,
      max: 120_000,
      currency: 'EUR',
      unit: 'year',
    };
    const result = formatUSDApproximation(salary);
    expect(result).not.toBeNull();
    expect(result).toMatch(RE_APPROX_PREFIX);
  });
});

// ---------------------------------------------------------------------------
// normalizeAnnualSalary
// ---------------------------------------------------------------------------

describe('normalizeAnnualSalary', () => {
  it('returns -1 for null salary', () => {
    expect(normalizeAnnualSalary(null)).toBe(-1);
  });

  it('returns -1 when both min and max are null', () => {
    const salary: Salary = {
      min: null,
      max: null,
      currency: 'USD',
      unit: 'year',
    };
    expect(normalizeAnnualSalary(salary)).toBe(-1);
  });

  it('annualizes a yearly salary to its max value', () => {
    const salary: Salary = {
      min: 80_000,
      max: ANNUAL_USD_120K,
      currency: 'USD',
      unit: 'year',
    };
    expect(normalizeAnnualSalary(salary)).toBe(ANNUAL_USD_120K);
  });

  it('annualizes a monthly salary to yearly', () => {
    const salary: Salary = {
      min: null,
      max: 10_000,
      currency: 'USD',
      unit: 'month',
    };
    expect(normalizeAnnualSalary(salary)).toBe(ANNUAL_USD_120K);
  });

  it('annualizes an hourly salary using 2080 hours/year', () => {
    const salary: Salary = {
      min: null,
      max: HOURLY_RATE_50,
      currency: 'USD',
      unit: 'hour',
    };
    expect(normalizeAnnualSalary(salary)).toBe(HOURLY_RATE_50 * HOURS_PER_YEAR);
  });
});
