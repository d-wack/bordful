'use client';

import { useState } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  LOADING_STATE_DELAY,
  PAGINATION_DELTA,
} from '@/lib/constants/defaults';
import { usePagination } from '@/lib/hooks/usePagination';

type PaginationControlProps = {
  totalItems: number;
  itemsPerPage: number;
  className?: string;
};

type PageOrEllipsis = number | string;

/**
 * Build a compact pagination range with ellipsis markers.
 * Returns page numbers interspersed with '...' strings where gaps exist.
 */
function getPaginationRange(current: number, total: number): PageOrEllipsis[] {
  const delta = PAGINATION_DELTA;
  const range: number[] = [];

  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      range.push(i);
    }
  }

  const rangeWithDots: PageOrEllipsis[] = [];
  let prev: number | undefined;

  for (const i of range) {
    if (prev !== undefined) {
      if (i - prev === PAGINATION_DELTA + 1) {
        rangeWithDots.push(prev + 1);
      } else if (i - prev !== 1) {
        rangeWithDots.push(`ellipsis-after-${prev}`);
      }
    }
    rangeWithDots.push(i);
    prev = i;
  }

  return rangeWithDots;
}

export function PaginationControl({
  totalItems,
  itemsPerPage,
  className,
}: PaginationControlProps) {
  const { page, setPage } = usePagination();
  const [isUpdating, setIsUpdating] = useState(false);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) {
      return;
    }

    setIsUpdating(true);
    setPage(newPage);

    setTimeout(() => setIsUpdating(false), LOADING_STATE_DELAY);
  };

  if (page < 1 || (totalPages > 0 && page > totalPages)) {
    setPage(Math.max(1, Math.min(page, totalPages)));
    return null;
  }

  return (
    <div
      className={`mt-8 flex justify-center sm:justify-start ${className || ''}`}
    >
      {isUpdating ? (
        <div className="py-2 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-r-transparent" />
        </div>
      ) : (
        <Pagination>
          <PaginationContent className="flex gap-2">
            <PaginationItem>
              <PaginationPrevious
                className={`transition-colors hover:bg-gray-100 ${
                  page === 1 ? 'pointer-events-none opacity-50' : ''
                }`}
                href={`?page=${page - 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(page - 1);
                }}
              />
            </PaginationItem>

            {getPaginationRange(page, totalPages).map((pageNum) =>
              typeof pageNum === 'string' ? (
                <PaginationItem key={pageNum}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    className="transition-colors hover:bg-gray-100"
                    href={`?page=${pageNum}`}
                    isActive={page === pageNum}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(pageNum as number);
                    }}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                className={`transition-colors hover:bg-gray-100 ${
                  page === totalPages ? 'pointer-events-none opacity-50' : ''
                }`}
                href={`?page=${page + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
