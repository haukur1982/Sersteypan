/**
 * Pagination utilities for Supabase queries
 */

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
  error?: string
}

/**
 * Parse pagination parameters from URL search params with validation.
 * Enforces reasonable limits to prevent abuse.
 */
export function parsePaginationParams(
  searchParams: { get: (key: string) => string | null },
  defaults: { page?: number; limit?: number } = {}
): PaginationParams {
  const { page: defaultPage = 1, limit: defaultLimit = 20 } = defaults

  let page = parseInt(searchParams.get('page') || String(defaultPage), 10)
  let limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10)

  // Validate and clamp values
  page = Math.max(1, isNaN(page) ? defaultPage : page)
  limit = Math.min(100, Math.max(1, isNaN(limit) ? defaultLimit : limit))

  return { page, limit }
}

/**
 * Calculate offset for Supabase range queries
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit
}

/**
 * Calculate pagination metadata from total count
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

/**
 * Build a Supabase count query options object
 */
export function countQueryOptions() {
  return { count: 'exact', head: true } as const
}

/**
 * Calculate range for Supabase .range() method
 * Returns [from, to] inclusive range
 */
export function calculateRange(page: number, limit: number): [number, number] {
  const from = (page - 1) * limit
  const to = from + limit - 1
  return [from, to]
}
