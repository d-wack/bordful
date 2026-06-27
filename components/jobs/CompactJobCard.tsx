'use client';

import Link from 'next/link';
import { JobBadge } from '@/components/ui/job-badge';
import { formatSalary, type Job } from '@/lib/db/airtable';
import { formatDate } from '@/lib/utils/formatDate';
import { generateJobSlug } from '@/lib/utils/slugify';

const TITLE_MAX_LENGTH = 40;
const NEW_JOB_THRESHOLD_HOURS = 48;
const MS_PER_HOUR = 3_600_000; // 1000 * 60 * 60

export function CompactJobCard({ job }: { job: Job }) {
  const { relativeTime } = formatDate(job.posted_date);
  const showSalary =
    job.salary && (job.salary.min !== null || job.salary.max !== null);

  // Check if job was posted within the last 48 hours
  const isNew = () => {
    const now = new Date();
    const postedDate = new Date(job.posted_date);
    const diffInHours = Math.floor(
      (now.getTime() - postedDate.getTime()) / MS_PER_HOUR
    );
    return diffInHours <= NEW_JOB_THRESHOLD_HOURS;
  };

  // Only show workplace type when it carries meaningful information
  const workplaceType =
    job.workplace_type !== 'Not specified' ? job.workplace_type : null;

  // Limit title length to prevent layout issues
  const limitedTitle =
    job.title.length > TITLE_MAX_LENGTH
      ? `${job.title.substring(0, TITLE_MAX_LENGTH)}...`
      : job.title;

  return (
    <Link
      className={`block px-3 py-2.5 transition-colors hover:bg-zinc-50 ${
        job.featured ? 'bg-zinc-50' : ''
      }`}
      href={`/jobs/${generateJobSlug(job.title, job.company)}`}
    >
      <div className="flex items-center gap-2">
        {/* Title and badges */}
        <div className="min-w-0 flex-grow">
          <div className="flex items-center gap-1.5">
            <h3 className="line-clamp-1 max-w-[calc(100%-70px)] font-medium text-sm">
              {limitedTitle}
            </h3>
            <div className="flex shrink-0 flex-nowrap gap-1">
              {isNew() && (
                <JobBadge
                  className="flex h-4 items-center px-1.5 py-0 text-[10px]"
                  type="new"
                >
                  New
                </JobBadge>
              )}
              {job.featured && (
                <JobBadge
                  className="flex h-4 items-center px-1.5 py-0 text-[9px]"
                  type="featured"
                >
                  Featured
                </JobBadge>
              )}
            </div>
          </div>

          {/* Company */}
          <div className="line-clamp-1 text-gray-600 text-xs">
            {job.company}
          </div>
        </div>

        {/* Essential info */}
        <div className="flex shrink-0 items-center gap-2 text-gray-500 text-xs">
          <span className="whitespace-nowrap">{job.type}</span>
          {showSalary && (
            <>
              <span className="text-gray-300">•</span>
              <span className="whitespace-nowrap">
                {formatSalary(job.salary, true)}
              </span>
            </>
          )}
          {workplaceType && (
            <>
              <span className="text-gray-300">•</span>
              <span className="whitespace-nowrap">{workplaceType}</span>
            </>
          )}
          <span className="text-gray-300">•</span>
          <span className="whitespace-nowrap">{relativeTime}</span>
        </div>
      </div>
    </Link>
  );
}
