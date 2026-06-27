import 'server-only';

import Airtable from 'airtable';
import { cache } from 'react';
import {
  CURRENCY_CODES,
  type CurrencyCode,
  getCurrencyByName,
} from '@/lib/constants/currencies';
import {
  getLanguageByName,
  LANGUAGE_CODES,
  type LanguageCode,
} from '@/lib/constants/languages';
import type { RemoteRegion, WorkplaceType } from '@/lib/constants/workplace';
import type { CareerLevel, Job, SalaryUnit } from '@/lib/db/airtable';
import type { JobRepository } from '@/lib/db/types';
import { normalizeMarkdown } from '@/lib/utils/markdown';

// ---------------------------------------------------------------------------
// Top-level regex constants (hoisted for reuse and performance)
// ---------------------------------------------------------------------------
const LANGUAGE_CODE_RE = /.*?\(([a-z]{2})\)$/i;
const CURRENCY_CODE_RE = /^([A-Z]{2,5})\s*\(.*?\)$/i;
const VISA_YES_RE = /^yes$/i;
const VISA_NO_RE = /^no$/i;

type AirtableBase = ReturnType<Airtable['base']>;

const getAirtableBase = cache((): AirtableBase | null => {
  const apiKey = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!(apiKey && baseId)) {
    return null;
  }

  try {
    return new Airtable({
      apiKey,
      endpointUrl: 'https://api.airtable.com',
    }).base(baseId);
  } catch {
    return null;
  }
});

const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Jobs';

// Ensure career level is always returned as an array
function normalizeCareerLevel(value: unknown): CareerLevel[] {
  if (!value) {
    return ['NotSpecified'];
  }

  if (Array.isArray(value)) {
    // Convert Airtable's display values to our enum values
    return value.map((level) => {
      // Handle Airtable's display format (e.g., "Entry Level" -> "EntryLevel")
      const normalized = level.replace(/\s+/g, '');
      return normalized as CareerLevel;
    });
  }

  // Handle single value
  const normalized = (value as string).replace(/\s+/g, '');
  return [normalized as CareerLevel];
}

function normalizeWorkplaceType(value: unknown): WorkplaceType {
  if (
    typeof value === 'string' &&
    ['On-site', 'Hybrid', 'Remote'].includes(value)
  ) {
    return value as WorkplaceType;
  }

  return 'Not specified';
}

function normalizeRemoteRegion(value: unknown): RemoteRegion {
  if (typeof value === 'string') {
    const validRegions = [
      'Worldwide',
      'Americas Only',
      'Europe Only',
      'Asia-Pacific Only',
      'US Only',
      'EU Only',
      'UK/EU Only',
      'US/Canada Only',
    ];
    if (validRegions.includes(value)) {
      return value as RemoteRegion;
    }
  }
  return null;
}

// Normalize a single Airtable language value to a LanguageCode or null.
function normalizeLanguageItem(item: unknown): LanguageCode | null {
  if (typeof item !== 'string') {
    return null;
  }

  // Extract code from "Language Name (code)" format
  const languageCodeMatch = LANGUAGE_CODE_RE.exec(item);
  if (languageCodeMatch?.[1]) {
    const extractedCode = languageCodeMatch[1].toLowerCase();
    if (LANGUAGE_CODES.includes(extractedCode as LanguageCode)) {
      return extractedCode as LanguageCode;
    }
  }

  // String itself is a valid 2-letter code
  if (
    item.length === 2 &&
    LANGUAGE_CODES.includes(item.toLowerCase() as LanguageCode)
  ) {
    return item.toLowerCase() as LanguageCode;
  }

  // Try to look up by language name
  const language = getLanguageByName(item);
  if (language) {
    return language.code as LanguageCode;
  }

  return null;
}

// Function to normalize language data from Airtable
function normalizeLanguages(value: unknown): LanguageCode[] {
  if (!(value && Array.isArray(value))) {
    return [];
  }
  return value
    .map(normalizeLanguageItem)
    .filter((code): code is LanguageCode => code !== null);
}

// Function to normalize currency data from Airtable
function normalizeCurrency(value: unknown): CurrencyCode {
  if (!value) {
    return 'USD';
  }

  if (typeof value === 'string') {
    // Extract code from "USD (United States Dollar)" format
    const currencyCodeMatch = CURRENCY_CODE_RE.exec(value);
    if (currencyCodeMatch?.[1]) {
      const extractedCode = currencyCodeMatch[1].toUpperCase();
      if (CURRENCY_CODES.includes(extractedCode as CurrencyCode)) {
        return extractedCode as CurrencyCode;
      }
    }

    // String itself is a valid currency code
    const upperCaseValue = value.toUpperCase();
    if (CURRENCY_CODES.includes(upperCaseValue as CurrencyCode)) {
      return upperCaseValue as CurrencyCode;
    }

    // Try to look up by currency name
    const currency = getCurrencyByName(value);
    if (currency) {
      return currency.code;
    }
  }

  return 'USD';
}

function normalizeBenefits(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const benefitsText = String(value).trim();
  if (!benefitsText) {
    return null;
  }

  const MAX_BENEFITS_LENGTH = 1000;
  if (benefitsText.length > MAX_BENEFITS_LENGTH) {
    return benefitsText.substring(0, MAX_BENEFITS_LENGTH).trim();
  }

  return benefitsText;
}

function normalizeApplicationRequirements(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const requirementsText = String(value).trim();
  if (!requirementsText) {
    return null;
  }

  const MAX_REQUIREMENTS_LENGTH = 1000;
  if (requirementsText.length > MAX_REQUIREMENTS_LENGTH) {
    return requirementsText.substring(0, MAX_REQUIREMENTS_LENGTH).trim();
  }

  return requirementsText;
}

function normalizeVisaSponsorship(
  value: unknown
): 'Yes' | 'No' | 'Not specified' {
  if (!value) {
    return 'Not specified';
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    if (VISA_YES_RE.test(normalizedValue)) {
      return 'Yes';
    }
    if (VISA_NO_RE.test(normalizedValue)) {
      return 'No';
    }
  }

  return 'Not specified';
}

// ---------------------------------------------------------------------------
// Record-mapping helpers — extracted to keep per-function complexity low
// ---------------------------------------------------------------------------

/** Coerce an unknown Airtable field value to `string | null`. */
function toStr(value: unknown): string | null {
  return (value as string) || null;
}

/** Build the nullable salary object from raw Airtable field values. */
function normalizeSalary(
  salaryMin: unknown,
  salaryMax: unknown,
  salaryCurrency: unknown,
  salaryUnit: unknown
): Job['salary'] {
  if (!(salaryMin || salaryMax)) {
    return null;
  }
  return {
    min: salaryMin ? Number(salaryMin) : null,
    max: salaryMax ? Number(salaryMax) : null,
    currency: normalizeCurrency(salaryCurrency),
    unit: salaryUnit as SalaryUnit,
  };
}

/** Map a raw Airtable record to the domain `Job` type. */
function mapRecordToJob(record: Airtable.Record<Airtable.FieldSet>): Job {
  const fields = record.fields;

  return {
    id: record.id,
    title: fields.title as string,
    company: fields.company as string,
    type: fields.type as Job['type'],
    salary: normalizeSalary(
      fields.salary_min,
      fields.salary_max,
      fields.salary_currency,
      fields.salary_unit
    ),
    description: normalizeMarkdown(fields.description as string),
    benefits: normalizeBenefits(fields.benefits),
    application_requirements: normalizeApplicationRequirements(
      fields.application_requirements
    ),
    apply_url: fields.apply_url as string,
    posted_date: fields.posted_date as string,
    valid_through: toStr(fields.valid_through),
    job_identifier: toStr(fields.job_identifier),
    job_source_name: toStr(fields.job_source_name),
    status: fields.status as Job['status'],
    career_level: normalizeCareerLevel(fields.career_level),
    visa_sponsorship: normalizeVisaSponsorship(fields.visa_sponsorship),
    featured: !!fields.featured,
    workplace_type: normalizeWorkplaceType(fields.workplace_type),
    remote_region: normalizeRemoteRegion(fields.remote_region),
    timezone_requirements: toStr(fields.timezone_requirements),
    workplace_city: toStr(fields.workplace_city),
    workplace_country: toStr(fields.workplace_country),
    languages: normalizeLanguages(fields.languages),
    skills: toStr(fields.skills),
    qualifications: toStr(fields.qualifications),
    education_requirements: toStr(fields.education_requirements),
    experience_requirements: toStr(fields.experience_requirements),
    industry: toStr(fields.industry),
    occupational_category: toStr(fields.occupational_category),
    responsibilities: toStr(fields.responsibilities),
  };
}

export const getJobs = cache(async (): Promise<Job[]> => {
  const base = getAirtableBase();
  if (!base) {
    return [];
  }

  try {
    const records = await base(TABLE_NAME)
      .select({
        filterByFormula: "{status} = 'active'",
        sort: [{ field: 'posted_date', direction: 'desc' }],
      })
      .all();

    return records.map(mapRecordToJob);
  } catch {
    return [];
  }
});

export const getJob = cache(async (id: string): Promise<Job | null> => {
  const base = getAirtableBase();
  if (!base) {
    return null;
  }

  try {
    const record = await base(TABLE_NAME).find(id);
    const fields = record.fields;

    if (fields.status !== 'active') {
      return null;
    }

    return mapRecordToJob(record);
  } catch {
    return null;
  }
});

export async function testConnection(): Promise<boolean> {
  const base = getAirtableBase();
  if (!base) {
    return false;
  }

  try {
    await base(TABLE_NAME)
      .select({
        maxRecords: 1,
      })
      .all();
    return true;
  } catch {
    return false;
  }
}

/**
 * Airtable implementation of the `JobRepository` interface.
 *
 * Wraps the cached module-level fetcher functions so that all existing call
 * sites continue to work unchanged, while new code can depend on the
 * `JobRepository` interface and receive this implementation (or a future
 * `PrismaPostgresJobRepository`) via the factory in `lib/db/index.ts`.
 */
export class AirtableJobRepository implements JobRepository {
  getJobs(): Promise<Job[]> {
    return getJobs();
  }

  getJob(id: string): Promise<Job | null> {
    return getJob(id);
  }

  testConnection(): Promise<boolean> {
    return testConnection();
  }
}
