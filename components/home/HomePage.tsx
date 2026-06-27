'use client';

import { formatDistanceToNow, isToday } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { JobCard } from '@/components/jobs/JobCard';
import { HeroSection } from '@/components/ui/hero-section';
import { JobFilters } from '@/components/ui/job-filters';
import { JobSearchInput } from '@/components/ui/job-search-input';
import { JobsPerPageSelect } from '@/components/ui/jobs-per-page-select';
import { PaginationControl } from '@/components/ui/pagination-control';
import { PostJobBanner } from '@/components/ui/post-job-banner';
import { SortOrderSelect } from '@/components/ui/sort-order-select';
import config from '@/config';
import {
  DEFAULT_PER_PAGE,
  DEFAULT_TRENDING_COMPANIES,
  SALARY_TIER_1,
  SALARY_TIER_2,
  SALARY_TIER_3,
} from '@/lib/constants/defaults';
import type { LanguageCode } from '@/lib/constants/languages';
import type { CareerLevel, Job } from '@/lib/db/airtable';
import { normalizeAnnualSalary } from '@/lib/db/airtable';
import { useJobSearch } from '@/lib/hooks/useJobSearch';
import { usePagination } from '@/lib/hooks/usePagination';
import { useSortOrder } from '@/lib/hooks/useSortOrder';
import { filterJobsBySearch } from '@/lib/utils/filter-jobs';

type Filters = {
  types: string[];
  roles: CareerLevel[];
  remote: boolean;
  salaryRanges: string[];
  visa: boolean;
  languages: LanguageCode[];
};

type FilterType =
  | 'type'
  | 'role'
  | 'remote'
  | 'salary'
  | 'visa'
  | 'language'
  | 'clear';
type FilterValue = string[] | boolean | CareerLevel[] | LanguageCode[] | true;

const CLEARED_FILTERS: Filters = {
  types: [],
  roles: [],
  remote: false,
  salaryRanges: [],
  visa: false,
  languages: [],
};

/** Returns true when a job's annual salary falls within the given salary range string. */
function jobInSalaryRange(annualSalary: number, range: string): boolean {
  switch (range) {
    case '< $50K':
      return annualSalary < SALARY_TIER_1;
    case '$50K - $100K':
      return annualSalary >= SALARY_TIER_1 && annualSalary <= SALARY_TIER_2;
    case '$100K - $200K':
      return annualSalary > SALARY_TIER_2 && annualSalary <= SALARY_TIER_3;
    case '> $200K':
      return annualSalary > SALARY_TIER_3;
    default:
      return false;
  }
}

/** Apply all active filters and sort order to produce a display-ready job list. */
function computeFilteredJobs(
  initialJobs: Job[],
  searchTerm: string | null,
  filters: Filters,
  sortOrder: string
): Job[] {
  let filtered = filterJobsBySearch([...initialJobs], searchTerm ?? '');

  if (filters.types.length > 0) {
    filtered = filtered.filter((job) => filters.types.includes(job.type));
  }

  if (filters.roles.length > 0) {
    filtered = filtered.filter(
      (job) =>
        job.career_level &&
        filters.roles.some((role) => job.career_level.includes(role))
    );
  }

  if (filters.remote) {
    filtered = filtered.filter((job) => job.workplace_type === 'Remote');
  }

  if (filters.visa) {
    filtered = filtered.filter((job) => job.visa_sponsorship === 'Yes');
  }

  if (filters.salaryRanges.length > 0) {
    filtered = filtered.filter((job) => {
      if (!job.salary) {
        return false;
      }
      const annualSalary = normalizeAnnualSalary(job.salary);
      return filters.salaryRanges.some((range) =>
        jobInSalaryRange(annualSalary, range)
      );
    });
  }

  if (filters.languages.length > 0) {
    filtered = filtered.filter(
      (job) =>
        job.languages?.length > 0 &&
        filters.languages.some((lang) => job.languages.includes(lang))
    );
  }

  applySortOrder(filtered, sortOrder);
  return filtered;
}

const SALARY_MISSING = -1;

/** Compare two jobs by annual salary, sorting jobs without salary to the bottom. */
function compareSalary(a: Job, b: Job): number {
  const salaryA = a.salary ? normalizeAnnualSalary(a.salary) : SALARY_MISSING;
  const salaryB = b.salary ? normalizeAnnualSalary(b.salary) : SALARY_MISSING;
  if (salaryA === SALARY_MISSING && salaryB === SALARY_MISSING) {
    return 0;
  }
  if (salaryA === SALARY_MISSING) {
    return 1;
  }
  if (salaryB === SALARY_MISSING) {
    return -1;
  }
  return salaryB - salaryA;
}

/** Sort a job array in-place by the selected sort order. */
function applySortOrder(jobs: Job[], sortOrder: string): void {
  switch (sortOrder) {
    case 'oldest':
      jobs.sort(
        (a, b) =>
          new Date(a.posted_date).getTime() - new Date(b.posted_date).getTime()
      );
      break;
    case 'salary':
      jobs.sort(compareSalary);
      break;
    default: // newest
      jobs.sort(
        (a, b) =>
          new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
      );
  }
}

/** Sort jobs by featured status first, then by sort order. */
function sortByFeaturedAndOrder(jobs: Job[], sortOrder: string): Job[] {
  return [...jobs].sort((a, b) => {
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }
    switch (sortOrder) {
      case 'newest':
        return (
          new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
        );
      case 'oldest':
        return (
          new Date(a.posted_date).getTime() - new Date(b.posted_date).getTime()
        );
      case 'salary': {
        const aSalary = a.salary ? normalizeAnnualSalary(a.salary) : 0;
        const bSalary = b.salary ? normalizeAnnualSalary(b.salary) : 0;
        return bSalary - aSalary;
      }
      default:
        return 0;
    }
  });
}

/**
 * Apply a single filter change to the previous filters state.
 * Returns the new `Filters` object or `prev` unchanged if no update is needed.
 */
function applyFilterChange(
  prev: Filters,
  filterType: FilterType,
  value: FilterValue
): Filters {
  const next = { ...prev };
  switch (filterType) {
    case 'type':
      if (
        Array.isArray(value) &&
        JSON.stringify(value) !== JSON.stringify(prev.types)
      ) {
        next.types = value;
      } else {
        return prev;
      }
      break;
    case 'role':
      if (
        Array.isArray(value) &&
        JSON.stringify(value) !== JSON.stringify(prev.roles)
      ) {
        next.roles = value as CareerLevel[];
      } else {
        return prev;
      }
      break;
    case 'remote':
      if (typeof value === 'boolean' && value !== prev.remote) {
        next.remote = value;
      } else {
        return prev;
      }
      break;
    case 'salary':
      if (
        Array.isArray(value) &&
        JSON.stringify(value) !== JSON.stringify(prev.salaryRanges)
      ) {
        next.salaryRanges = value;
      } else {
        return prev;
      }
      break;
    case 'visa':
      if (typeof value === 'boolean' && value !== prev.visa) {
        next.visa = value;
      } else {
        return prev;
      }
      break;
    case 'language':
      if (
        Array.isArray(value) &&
        JSON.stringify(value) !== JSON.stringify(prev.languages)
      ) {
        next.languages = value as LanguageCode[];
      } else {
        return prev;
      }
      break;
    default:
      return prev;
  }
  return next;
}

function HomePageContent({ initialJobs }: { initialJobs: Job[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { searchTerm } = useJobSearch();
  const { sortOrder } = useSortOrder();
  const { page } = usePagination();

  // Parse initial filters from URL
  const initialFilters: Filters = {
    types: searchParams.get('types')?.split(',').filter(Boolean) ?? [],
    roles: (searchParams.get('roles')?.split(',').filter(Boolean) ??
      []) as CareerLevel[],
    remote: searchParams.get('remote') === 'true',
    salaryRanges: searchParams.get('salary')?.split(',').filter(Boolean) ?? [],
    visa: searchParams.get('visa') === 'true',
    languages: (searchParams.get('languages')?.split(',').filter(Boolean) ??
      []) as LanguageCode[],
  };

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [pendingUrlUpdate, setPendingUrlUpdate] = useState<Record<
    string,
    string | null
  > | null>(null);

  const jobsPerPage =
    Number.parseInt(searchParams.get('per_page') ?? '', 10) || DEFAULT_PER_PAGE;

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setPendingUrlUpdate(updates);
  }, []);

  useEffect(() => {
    if (!pendingUrlUpdate) {
      return;
    }
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(pendingUrlUpdate)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`/?${params.toString()}`, { scroll: false });
    setPendingUrlUpdate(null);
  }, [pendingUrlUpdate, router, searchParams]);

  const updateFilterParams = useCallback(
    (newFilters: Filters) => {
      updateParams({
        types: newFilters.types.length ? newFilters.types.join(',') : null,
        roles: newFilters.roles.length ? newFilters.roles.join(',') : null,
        remote: newFilters.remote ? 'true' : null,
        salary: newFilters.salaryRanges.length
          ? newFilters.salaryRanges.join(',')
          : null,
        visa: newFilters.visa ? 'true' : null,
        languages: newFilters.languages.length
          ? newFilters.languages.join(',')
          : null,
        page: '1',
      });
    },
    [updateParams]
  );

  const handleFilterChange = useCallback(
    (filterType: FilterType, value: FilterValue) => {
      if (filterType === 'clear') {
        setFilters(CLEARED_FILTERS);
        updateFilterParams(CLEARED_FILTERS);
        return;
      }
      setFilters((prev) => {
        const next = applyFilterChange(prev, filterType, value);
        if (next !== prev) {
          updateFilterParams(next);
        }
        return next;
      });
    },
    [updateFilterParams]
  );

  const filteredJobs = useMemo(
    () => computeFilteredJobs(initialJobs, searchTerm, filters, sortOrder),
    [initialJobs, searchTerm, filters, sortOrder]
  );

  const sortedJobs = useMemo(
    () => sortByFeaturedAndOrder(filteredJobs, sortOrder),
    [filteredJobs, sortOrder]
  );

  const startIndex = (page - 1) * jobsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + jobsPerPage);

  const lastUpdatedTimestamp = useMemo(() => {
    if (initialJobs.length === 0) {
      return null;
    }
    return Math.max(
      ...initialJobs.map((job) => new Date(job.posted_date).getTime())
    );
  }, [initialJobs]);

  const jobsAddedToday = useMemo(
    () =>
      initialJobs.filter((job) => isToday(new Date(job.posted_date))).length,
    [initialJobs]
  );

  // Scroll to category - keeping this for potential future use
  const _scrollToCategory = (categoryId: string) => {
    const el = document.getElementById(categoryId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <HeroSection
        badge={config.badge}
        description={config.description}
        title={config.title}
      >
        <div className="max-w-[480px]">
          <JobSearchInput />
        </div>

        {(config.quickStats?.enabled ?? true) && (
          <div
            className="mt-6 grid max-w-[480px] grid-cols-3 gap-4 text-muted-foreground text-xs"
            style={{ color: config.ui.heroStatsColor || undefined }}
          >
            {(config.quickStats?.sections?.openJobs?.enabled ?? true) && (
              <div>
                <div
                  className="font-medium text-foreground"
                  style={{
                    color: config.ui.heroStatsColor || undefined,
                  }}
                >
                  {config.quickStats?.sections?.openJobs?.title || 'Open Jobs'}
                </div>
                <div className="flex items-center">
                  {(config.quickStats?.sections?.openJobs
                    ?.showNewJobsIndicator ??
                    true) &&
                    jobsAddedToday > 0 && (
                      <span className="pulse-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    )}
                  <span>{initialJobs.length.toLocaleString()}</span>
                  {(config.quickStats?.sections?.openJobs
                    ?.showNewJobsIndicator ??
                    true) &&
                    jobsAddedToday > 0 && (
                      <span className="ml-1">
                        ({jobsAddedToday.toLocaleString()} added today)
                      </span>
                    )}
                </div>
              </div>
            )}

            {(config.quickStats?.sections?.lastUpdated?.enabled ?? true) &&
              lastUpdatedTimestamp && (
                <div>
                  <div
                    className="font-medium text-foreground"
                    style={{
                      color: config.ui.heroStatsColor || undefined,
                    }}
                  >
                    {config.quickStats?.sections?.lastUpdated?.title ||
                      'Last Updated'}
                  </div>
                  <div>
                    {formatDistanceToNow(new Date(lastUpdatedTimestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              )}

            {(config.quickStats?.sections?.trending?.enabled ?? true) && (
              <div>
                <div
                  className="font-medium text-foreground"
                  style={{
                    color: config.ui.heroStatsColor || undefined,
                  }}
                >
                  {config.quickStats?.sections?.trending?.title || 'Trending'}
                </div>
                <div>
                  {Array.from(new Set(initialJobs.map((job) => job.company)))
                    .slice(
                      0,
                      config.quickStats?.sections?.trending?.maxCompanies ||
                        DEFAULT_TRENDING_COMPANIES
                    )
                    .join(', ')}
                </div>
              </div>
            )}
          </div>
        )}
      </HeroSection>

      {/* Jobs Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="order-2 flex-[3] md:order-1">
            <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-0">
              <div className="w-full space-y-1 sm:w-auto">
                <h2 className="flex flex-wrap items-center gap-2 font-semibold text-xl tracking-tight">
                  Latest Opportunities
                  {page > 1 && (
                    <span className="font-normal text-gray-500">
                      Page {page}
                    </span>
                  )}
                </h2>
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

            <div className="space-y-4">
              {paginatedJobs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    No positions found matching your search criteria. Try
                    adjusting your search terms.
                  </p>
                </div>
              ) : (
                paginatedJobs.map((job) => <JobCard job={job} key={job.id} />)
              )}
            </div>

            {sortedJobs.length > jobsPerPage && (
              <PaginationControl
                itemsPerPage={jobsPerPage}
                totalItems={sortedJobs.length}
              />
            )}

            <div className="mt-8 md:hidden">
              <PostJobBanner />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="order-1 w-full md:order-2 md:w-[240px] lg:w-[250px] xl:w-[260px]">
            <div className="space-y-6">
              <JobFilters
                initialFilters={initialFilters}
                jobs={initialJobs}
                onFilterChange={handleFilterChange}
              />
              <div className="hidden md:block">
                <PostJobBanner />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function HomePage({ initialJobs }: { initialJobs: Job[] }) {
  return (
    <Suspense>
      <HomePageContent initialJobs={initialJobs} />
    </Suspense>
  );
}
