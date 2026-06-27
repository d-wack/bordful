'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { JobListings } from '@/components/jobs/JobListings';
import { ClientBreadcrumb } from '@/components/ui/client-breadcrumb';
import { JobFilters } from '@/components/ui/job-filters';
import { JobsPerPageSelect } from '@/components/ui/jobs-per-page-select';
import { PaginationControl } from '@/components/ui/pagination-control';
import { PostJobBanner } from '@/components/ui/post-job-banner';
import { SortOrderSelect } from '@/components/ui/sort-order-select';
import {
  DEFAULT_PER_PAGE,
  HOURS_PER_YEAR,
  SALARY_TIER_1,
  SALARY_TIER_2,
  SALARY_TIER_3,
} from '@/lib/constants/defaults';
import type { JobType } from '@/lib/constants/job-types';
import type { LanguageCode } from '@/lib/constants/languages';
import type { CareerLevel, Job } from '@/lib/db/airtable';
import { useJobSearch } from '@/lib/hooks/useJobSearch';
import { usePagination } from '@/lib/hooks/usePagination';
import { useSortOrder } from '@/lib/hooks/useSortOrder';
import { filterJobsBySearch } from '@/lib/utils/filter-jobs';

type JobsLayoutProps = {
  filteredJobs: Job[];
};

type FilterType =
  | 'type'
  | 'role'
  | 'remote'
  | 'salary'
  | 'visa'
  | 'language'
  | 'clear';
type FilterValue =
  | string[]
  | boolean
  | CareerLevel[]
  | LanguageCode[]
  | JobType[]
  | true;

/** Returns true if the job's annual salary falls within one of the selected ranges. */
function jobMatchesSalaryRange(job: Job, salaryRanges: string[]): boolean {
  if (!job.salary) {
    return false;
  }

  const annualSalary =
    job.salary.max ??
    (job.salary.min != null ? job.salary.min * HOURS_PER_YEAR : 0);

  if (annualSalary === 0) {
    return false;
  }

  if (salaryRanges.includes('< $50K') && annualSalary < SALARY_TIER_1) {
    return true;
  }
  if (
    salaryRanges.includes('$50K - $100K') &&
    annualSalary >= SALARY_TIER_1 &&
    annualSalary <= SALARY_TIER_2
  ) {
    return true;
  }
  if (
    salaryRanges.includes('$100K - $200K') &&
    annualSalary > SALARY_TIER_2 &&
    annualSalary <= SALARY_TIER_3
  ) {
    return true;
  }
  return salaryRanges.includes('> $200K') && annualSalary > SALARY_TIER_3;
}

/** Filter jobs by employment type. */
function applyTypeFilter(jobs: Job[], value: FilterValue): Job[] {
  if (!Array.isArray(value) || value.length === 0) {
    return jobs;
  }
  const jobTypes = value as JobType[];
  return jobs.filter((job) => jobTypes.includes(job.type as JobType));
}

/** Filter jobs by career level. */
function applyRoleFilter(jobs: Job[], value: FilterValue): Job[] {
  if (!Array.isArray(value) || value.length === 0) {
    return jobs;
  }
  const careerLevels = value as CareerLevel[];
  return jobs.filter((job) =>
    careerLevels.some((level) => job.career_level.includes(level))
  );
}

/** Filter jobs by required language. */
function applyLanguageFilter(jobs: Job[], value: FilterValue): Job[] {
  if (!Array.isArray(value) || value.length === 0) {
    return jobs;
  }
  const languageCodes = value as LanguageCode[];
  return jobs.filter((job) =>
    job.languages?.some((lang) => languageCodes.includes(lang as LanguageCode))
  );
}

/** Filter jobs by salary range strings. */
function applySalaryFilter(jobs: Job[], value: FilterValue): Job[] {
  if (!Array.isArray(value) || value.length === 0) {
    return jobs;
  }
  const salaryRanges = value as string[];
  return jobs.filter((job) => jobMatchesSalaryRange(job, salaryRanges));
}

/** Apply a single filter operation to a job list and return the updated list. */
function computeFilteredJobs(
  filterType: FilterType,
  value: FilterValue,
  filteredJobs: Job[],
  searchTerm: string
): Job[] {
  if (filterType === 'clear') {
    return filteredJobs;
  }

  let jobs = filterJobsBySearch(filteredJobs, searchTerm);

  if (filterType === 'type') {
    jobs = applyTypeFilter(jobs, value);
  }
  if (filterType === 'role') {
    jobs = applyRoleFilter(jobs, value);
  }
  if (filterType === 'remote' && value === true) {
    jobs = jobs.filter((job) => job.workplace_type === 'Remote');
  }
  if (filterType === 'salary') {
    jobs = applySalaryFilter(jobs, value);
  }
  if (filterType === 'visa' && value === true) {
    jobs = jobs.filter((job) => job.visa_sponsorship === 'Yes');
  }
  if (filterType === 'language') {
    jobs = applyLanguageFilter(jobs, value);
  }

  return jobs;
}

export function JobsLayout({ filteredJobs }: JobsLayoutProps) {
  const searchParams = useSearchParams();
  const { sortOrder } = useSortOrder();
  const { page } = usePagination();
  const { searchTerm } = useJobSearch();

  const [selectedJobs, setSelectedJobs] = useState<Job[]>(filteredJobs);

  const jobsPerPage = Number(searchParams.get('per_page')) || DEFAULT_PER_PAGE;

  const handleFilterChange = useCallback(
    (filterType: FilterType, value: FilterValue) => {
      setSelectedJobs(
        computeFilteredJobs(filterType, value, filteredJobs, searchTerm ?? '')
      );
    },
    [filteredJobs, searchTerm]
  );

  useEffect(() => {
    const searchFiltered = filterJobsBySearch(filteredJobs, searchTerm ?? '');
    setSelectedJobs(searchFiltered);
  }, [searchTerm, filteredJobs]);

  const sortedJobs = [...selectedJobs].sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':
        return (
          new Date(a.posted_date).getTime() - new Date(b.posted_date).getTime()
        );
      case 'salary': {
        const aMax = a.salary?.max || 0;
        const bMax = b.salary?.max || 0;
        return bMax - aMax;
      }
      default:
        return (
          new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
        );
    }
  });

  const startIndex = (page - 1) * jobsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + jobsPerPage);

  return (
    <main className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <ClientBreadcrumb />
      </div>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:gap-8">
        {/* Main content */}
        <div className="order-2 flex-[3] lg:order-1">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-0">
            <div className="w-full space-y-1 sm:w-auto">
              <h1 className="flex flex-wrap items-center gap-2 font-semibold text-xl tracking-tight lg:text-2xl">
                Latest Jobs
                {page > 1 && (
                  <span className="font-normal text-gray-500">Page {page}</span>
                )}
              </h1>
              <p className="text-muted-foreground text-sm">
                Showing {paginatedJobs.length.toLocaleString()} of{' '}
                {sortedJobs.length.toLocaleString()} positions
              </p>
            </div>
            <div className="flex w-full items-center justify-between gap-3 overflow-x-auto pb-1 sm:w-auto sm:justify-end">
              <JobsPerPageSelect />
              <SortOrderSelect />
            </div>
          </div>

          <JobListings jobs={paginatedJobs} />

          {sortedJobs.length > jobsPerPage && (
            <PaginationControl
              itemsPerPage={jobsPerPage}
              totalItems={sortedJobs.length}
            />
          )}

          <div className="mt-8 lg:hidden">
            <PostJobBanner />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="order-first w-full lg:order-last lg:w-[240px] xl:w-[260px]">
          <div className="space-y-6">
            <JobFilters
              initialFilters={{
                types: [],
                roles: [],
                remote: false,
                salaryRanges: [],
                visa: false,
                languages: [],
              }}
              jobs={filteredJobs}
              onFilterChange={handleFilterChange}
            />
            <div className="hidden lg:block">
              <PostJobBanner />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
