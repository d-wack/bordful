import Link from 'next/link';
import type { Job } from '@/lib/db/airtable';
import { generateJobSlug } from '@/lib/utils/slugify';

const MIN_TITLE_WORD_LENGTH = 3;
const MAX_SIMILAR_JOBS = 5;

type SimilarJobsProps = {
  currentJob: Job;
  allJobs: Job[];
};

/** Derive a human-readable location string for a job card. */
function resolveJobLocation(job: Job): string | null {
  if (job.workplace_type === 'Remote') {
    if (job.remote_region) {
      return `Remote (${job.remote_region})`;
    }
    return null;
  }
  if (job.workplace_type === 'Hybrid') {
    return (
      [
        job.workplace_city,
        job.workplace_country,
        job.remote_region ? `Hybrid (${job.remote_region})` : null,
      ]
        .filter(Boolean)
        .join(', ') || null
    );
  }
  return (
    [job.workplace_city, job.workplace_country].filter(Boolean).join(', ') ||
    null
  );
}

export function SimilarJobs({ currentJob, allJobs }: SimilarJobsProps) {
  const titleWords = currentJob.title.toLowerCase().split(' ');

  const similarJobs = allJobs
    .filter((job) => {
      if (job.id === currentJob.id) {
        return false;
      }

      const jobTitleLower = job.title.toLowerCase();
      const isSimilarTitle = titleWords.some(
        (word) =>
          word.length > MIN_TITLE_WORD_LENGTH && jobTitleLower.includes(word)
      );

      const isSameLocation =
        (job.workplace_type === 'Remote' &&
          currentJob.workplace_type === 'Remote') ||
        (job.workplace_city &&
          currentJob.workplace_city &&
          job.workplace_city === currentJob.workplace_city) ||
        (job.workplace_country &&
          currentJob.workplace_country &&
          job.workplace_country === currentJob.workplace_country);

      return isSimilarTitle || isSameLocation;
    })
    .slice(0, MAX_SIMILAR_JOBS);

  if (similarJobs.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-3 font-semibold text-lg">Similar Jobs</h2>
      <div className="space-y-3">
        {similarJobs.map((job) => {
          const location = resolveJobLocation(job);

          return (
            <Link
              className="block hover:text-gray-900"
              href={`/jobs/${generateJobSlug(job.title, job.company)}`}
              key={job.id}
            >
              <div className="text-xs leading-tight">{job.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 leading-tight">
                <span>{job.company}</span>
                <span>•</span>
                <span>{job.type}</span>
                {location && (
                  <>
                    <span>•</span>
                    <span>{location}</span>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
