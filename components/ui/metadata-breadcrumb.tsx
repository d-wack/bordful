import type { Metadata } from 'next';
import { ServerBreadcrumb } from '@/components/ui/breadcrumb';

type MetadataBreadcrumbProps = {
  /**
   * The page metadata to extract breadcrumb information from
   */
  metadata: Metadata;

  /**
   * Current pathname to determine the active breadcrumb
   */
  pathname: string;

  /**
   * Optional className to apply to the breadcrumb container
   */
  className?: string;

  /**
   * Optional explicit breadcrumb items to use instead of generating from metadata
   */
  items?: { name: string; url: string }[];
};

/** Extract the raw title string from Next.js Metadata. */
function extractRawTitle(metadata: Metadata): string {
  if (typeof metadata.title === 'string') {
    return metadata.title;
  }
  if (metadata.title && 'default' in metadata.title) {
    return metadata.title.default as string;
  }
  return '';
}

/**
 * Extracts breadcrumb items from page metadata
 */
function extractBreadcrumbsFromMetadata(
  metadata: Metadata,
  pathname: string
): { name: string; url: string }[] {
  const breadcrumbs: { name: string; url: string }[] = [
    { name: 'Home', url: '/' },
  ];

  // Remove any site suffix (e.g., " | My Site") from the raw title
  const cleanedTitle = extractRawTitle(metadata).split('|')[0].trim();

  if (cleanedTitle.length > 0) {
    breadcrumbs.push({ name: cleanedTitle, url: pathname });
  }

  return breadcrumbs;
}

/**
 * Server component that generates breadcrumbs from page metadata
 */
export function MetadataBreadcrumb({
  metadata,
  pathname,
  className,
  items: explicitItems,
}: MetadataBreadcrumbProps) {
  // Use provided items or extract from metadata
  const breadcrumbItems =
    explicitItems || extractBreadcrumbsFromMetadata(metadata, pathname);

  return <ServerBreadcrumb className={className} items={breadcrumbItems} />;
}
