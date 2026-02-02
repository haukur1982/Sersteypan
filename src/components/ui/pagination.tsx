'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl: string
  searchParams?: Record<string, string>
  className?: string
}

/**
 * Generates page numbers to display with ellipsis for large page counts.
 * Shows: first page, last page, current page, and 1 page on each side of current.
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = []

  // Always show first page
  pages.push(1)

  // Calculate range around current page
  const rangeStart = Math.max(2, currentPage - 1)
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1)

  // Add ellipsis if there's a gap after first page
  if (rangeStart > 2) {
    pages.push('ellipsis')
  }

  // Add pages in range
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i)
  }

  // Add ellipsis if there's a gap before last page
  if (rangeEnd < totalPages - 1) {
    pages.push('ellipsis')
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
}

/**
 * Build URL with page parameter
 */
function buildPageUrl(baseUrl: string, page: number, searchParams?: Record<string, string>): string {
  const params = new URLSearchParams(searchParams || {})
  params.set('page', String(page))
  return `${baseUrl}?${params.toString()}`
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  searchParams,
  className,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      {/* Previous Button */}
      <PaginationLink
        href={buildPageUrl(baseUrl, currentPage - 1, searchParams)}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only sm:ml-1">Fyrri</span>
      </PaginationLink>

      {/* Page Numbers */}
      <div className="hidden sm:flex items-center gap-1">
        {pages.map((page, index) =>
          page === 'ellipsis' ? (
            <PaginationEllipsis key={`ellipsis-${index}`} />
          ) : (
            <PaginationLink
              key={page}
              href={buildPageUrl(baseUrl, page, searchParams)}
              isActive={page === currentPage}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </PaginationLink>
          )
        )}
      </div>

      {/* Mobile: Show current/total */}
      <span className="sm:hidden text-sm text-muted-foreground px-2">
        {currentPage} / {totalPages}
      </span>

      {/* Next Button */}
      <PaginationLink
        href={buildPageUrl(baseUrl, currentPage + 1, searchParams)}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
      >
        <span className="sr-only sm:not-sr-only sm:mr-1">Næsta</span>
        <ChevronRight className="h-4 w-4" />
      </PaginationLink>
    </nav>
  )
}

interface PaginationLinkProps {
  href: string
  disabled?: boolean
  isActive?: boolean
  children: React.ReactNode
  'aria-label'?: string
  'aria-current'?: 'page' | undefined
}

function PaginationLink({
  href,
  disabled,
  isActive,
  children,
  ...props
}: PaginationLinkProps) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled className="min-w-9" {...props}>
        {children}
      </Button>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({
          variant: isActive ? 'default' : 'outline',
          size: 'sm',
        }),
        'min-w-9'
      )}
      {...props}
    >
      {children}
    </Link>
  )
}

function PaginationEllipsis() {
  return (
    <span className="flex h-9 w-9 items-center justify-center" aria-hidden>
      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
    </span>
  )
}

/**
 * Hook to parse pagination params from URL search params
 */
export function usePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

  return { page, limit }
}

/**
 * Type for paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}
