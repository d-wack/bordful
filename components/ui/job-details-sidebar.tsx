import { formatDistanceToNow } from 'date-fns';
import {
  Briefcase,
  Calendar,
  Clock,
  Flag,
  Gift,
  Globe,
  Hash,
  Languages,
  Laptop,
  Link,
  MapPin,
  Wallet,
} from 'lucide-react';
import { CollapsibleText } from '@/components/ui/collapsible-text';
import { JobBadge } from '@/components/ui/job-badge';
import config from '@/config';
import {
  getDisplayNameFromCode,
  type LanguageCode,
} from '@/lib/constants/languages';
import type { RemoteRegion, WorkplaceType } from '@/lib/constants/workplace';
import {
  type CareerLevel,
  formatSalary,
  formatUSDApproximation,
  type Salary,
} from '@/lib/db/airtable';

type JobDetailsSidebarProps = {
  title: string;
  jobUrl: string;
  fullDate: string;
  relativeTime: string;
  workplace_type: WorkplaceType;
  remote_region: RemoteRegion;
  timezone_requirements: string | null;
  workplace_city: string | null;
  workplace_country: string | null;
  salary: Salary | null;
  career_level: CareerLevel[];
  apply_url: string;
  visa_sponsorship: string;
  languages: LanguageCode[];
  benefits: string | null;
  valid_through: string | null;
  job_identifier: string | null;
  job_source_name: string | null;
};

type DeadlineInfo = {
  fullDate: string;
  relativeTime: string;
  isPastDeadline: boolean;
};

function formatCareerLevel(level: CareerLevel): string {
  const formatMap: Record<CareerLevel, string> = {
    Internship: 'Internship',
    EntryLevel: 'Entry Level',
    Associate: 'Associate',
    Junior: 'Junior',
    MidLevel: 'Mid Level',
    Senior: 'Senior',
    Staff: 'Staff',
    Principal: 'Principal',
    Lead: 'Lead',
    Manager: 'Manager',
    SeniorManager: 'Senior Manager',
    Director: 'Director',
    SeniorDirector: 'Senior Director',
    VP: 'VP',
    SVP: 'SVP',
    EVP: 'EVP',
    CLevel: 'C-Level',
    Founder: 'Founder',
    NotSpecified: 'Not Specified',
  };

  return formatMap[level] || level;
}

/** Parse `valid_through` into a user-readable deadline info object. */
function resolveDeadline(validThrough: string | null): DeadlineInfo | null {
  if (!validThrough) {
    return null;
  }

  const deadlineDate = new Date(validThrough);
  const isPastDeadline = deadlineDate < new Date();
  const relativeDeadline = formatDistanceToNow(deadlineDate, {
    addSuffix: false,
  });

  return {
    fullDate: deadlineDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    relativeTime: isPastDeadline
      ? `${relativeDeadline} ago`
      : `in ${relativeDeadline}`,
    isPastDeadline,
  };
}

/** Map a WorkplaceType value to the badge `type` prop expected by `<JobBadge>`. */
function resolveWorkplaceBadgeType(
  workplaceType: WorkplaceType
): 'not specified' | 'onsite' | 'remote' | 'hybrid' | 'default' {
  if (workplaceType === 'Not specified') {
    return 'not specified';
  }
  if (workplaceType === 'On-site') {
    return 'onsite';
  }
  return workplaceType.toLowerCase() as 'remote' | 'hybrid' | 'default';
}

/** Map a visa-sponsorship string to the badge `type` prop. */
function resolveVisaBadgeType(
  visa: string
): 'visa-yes' | 'visa-no' | 'visa-not-specified' {
  if (visa === 'Yes') {
    return 'visa-yes';
  }
  if (visa === 'No') {
    return 'visa-no';
  }
  return 'visa-not-specified';
}

/** Render the job-location row content based on workplace type. */
function renderLocationContent(
  workplaceType: WorkplaceType,
  remoteRegion: RemoteRegion,
  location: string
): React.ReactNode {
  if (workplaceType === 'Remote') {
    return (
      <span className="ml-6 text-gray-600 text-sm">
        Remote ({remoteRegion || 'Worldwide'})
      </span>
    );
  }
  if (workplaceType === 'Hybrid') {
    return (
      <span className="ml-6 text-gray-600 text-sm">
        {[location, `Hybrid (${remoteRegion})`].filter(Boolean).join(', ')}
      </span>
    );
  }
  return (
    <p className="ml-6 text-gray-600 text-sm">{location || 'Not specified'}</p>
  );
}

export function JobDetailsSidebar({
  title,
  jobUrl,
  fullDate,
  relativeTime,
  workplace_type,
  remote_region,
  timezone_requirements,
  workplace_city,
  workplace_country,
  salary,
  career_level,
  apply_url,
  visa_sponsorship,
  languages,
  benefits,
  valid_through,
  job_identifier,
  job_source_name,
}: JobDetailsSidebarProps) {
  const showSalary = salary && (salary.min !== null || salary.max !== null);
  const usdApprox = showSalary ? formatUSDApproximation(salary) : null;
  const careerLevels = Array.from(
    new Set(Array.isArray(career_level) ? career_level : [career_level])
  );

  const location = [workplace_city, workplace_country]
    .filter(Boolean)
    .join(', ');
  const deadline = resolveDeadline(valid_through);

  return (
    <div className="space-y-4 rounded-lg border bg-gray-50 p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-md">Job Details</h2>
        {config.jobReport.enabled && config.jobReport.showInSidebar && (
          <a
            className="flex items-center gap-1 font-medium text-red-700 text-xs hover:text-red-800"
            href={`mailto:${
              config.jobReport.email
            }?subject=${encodeURIComponent(
              config.jobReport.emailSubject.replace('[Job Title]', title)
            )}&body=${encodeURIComponent(
              config.jobReport.emailMessage
                .replace('[Job Title]', title)
                .replace('[Job URL]', jobUrl)
            )}`}
          >
            <Flag className="h-3 w-3" />
            {config.jobReport.buttonText}
          </a>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-gray-500" />
          <h3 className="font-medium text-sm">Date Posted</h3>
        </div>
        <p className="ml-6 text-gray-600 text-sm">
          {fullDate} ({relativeTime})
        </p>
      </div>

      {/* Application Deadline */}
      {deadline && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-gray-500" />
            <h3 className="font-medium text-sm">Application Deadline</h3>
          </div>
          <div className="ml-6">
            <p className="text-gray-600 text-sm">
              {deadline.fullDate} ({deadline.relativeTime})
            </p>
            {deadline.isPastDeadline && (
              <p className="mt-1 text-amber-600 text-xs">
                This deadline has passed, but the job may still be accepting
                applications.
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-gray-500" />
          <h3 className="font-medium text-sm">Job Location</h3>
        </div>
        {renderLocationContent(workplace_type, remote_region, location)}
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <Laptop className="h-4 w-4 shrink-0 text-gray-500" />
          <h3 className="font-medium text-sm">Workplace Type</h3>
        </div>
        <div className="ml-6">
          <JobBadge type={resolveWorkplaceBadgeType(workplace_type)}>
            {workplace_type}
          </JobBadge>
        </div>
      </div>

      {showSalary && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Wallet className="h-4 w-4 shrink-0 text-gray-500" />
            <h3 className="font-medium text-sm">Salary</h3>
          </div>
          <div className="ml-6">
            <p className="text-gray-600 text-sm">
              {formatSalary(salary, true)}
            </p>
            {usdApprox && (
              <p className="mt-0.5 text-gray-500 text-xs">{usdApprox}</p>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center gap-2">
          <Briefcase className="h-4 w-4 shrink-0 text-gray-500" />
          <h3 className="font-medium text-sm">Career Level</h3>
        </div>
        <div className="ml-6 flex flex-wrap gap-1.5">
          {careerLevels.map((level) => (
            <JobBadge
              href={
                level !== 'NotSpecified'
                  ? `/jobs/level/${level.toLowerCase()}`
                  : undefined
              }
              key={level}
              type="career-level"
            >
              {formatCareerLevel(level)}
            </JobBadge>
          ))}
        </div>
      </div>

      {job_source_name && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link className="h-4 w-4 shrink-0 text-gray-500" />
            <h3 className="font-medium text-sm">Job Source</h3>
          </div>
          <a
            className="ml-6 text-sm text-zinc-900 underline underline-offset-4 transition-colors hover:text-zinc-800"
            href={apply_url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {job_source_name}
          </a>
        </div>
      )}

      {/* Job Identifier */}
      {job_identifier && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Hash className="h-4 w-4 shrink-0 text-gray-500" />
            <h3 className="font-medium text-sm">Job ID</h3>
          </div>
          <p className="ml-6 text-gray-600 text-sm">{job_identifier}</p>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center gap-2">
          <Globe className="h-4 w-4 shrink-0 text-gray-500" />
          <h3 className="font-medium text-sm">Visa Sponsorship</h3>
        </div>
        <div className="ml-6">
          <JobBadge type={resolveVisaBadgeType(visa_sponsorship)}>
            {visa_sponsorship}
          </JobBadge>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-gray-500" />
          <h3 className="font-medium text-sm">Job Timezones</h3>
        </div>
        <p className="ml-6 text-gray-600 text-sm">
          {timezone_requirements || 'Not specified'}
        </p>
      </div>

      {/* Languages */}
      {languages.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Languages className="h-4 w-4 shrink-0 text-gray-500" />
            <h3 className="font-medium text-sm">Languages</h3>
          </div>
          <div className="ml-6 flex flex-wrap gap-1.5">
            {languages.map((langCode) => (
              <JobBadge
                href={`/jobs/language/${langCode}`}
                key={langCode}
                type="language"
              >
                {getDisplayNameFromCode(langCode)}
              </JobBadge>
            ))}
          </div>
        </div>
      )}

      {/* Benefits */}
      {benefits && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Gift className="h-4 w-4 shrink-0 text-gray-500" />
            <h3 className="font-medium text-sm">Benefits & Perks</h3>
          </div>
          <div className="ml-6">
            <CollapsibleText maxLength={150} text={benefits} />
          </div>
        </div>
      )}
    </div>
  );
}
