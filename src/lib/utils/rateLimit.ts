/**
 * Simple in-memory rate limiter for server actions.
 *
 * Note: This is per-instance. For multi-instance deployments (like Vercel),
 * consider using @upstash/ratelimit with Redis for distributed rate limiting.
 *
 * @example
 * // In a server action
 * const rateLimiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 })
 *
 * export async function sensitiveAction() {
 *   const ip = headers().get('x-forwarded-for') || 'unknown'
 *   const { success, remaining } = rateLimiter.check(ip)
 *
 *   if (!success) {
 *     return { error: 'Too many requests. Please try again later.' }
 *   }
 *
 *   // ... rest of action
 * }
 */

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Number of requests remaining in the current window */
  remaining: number
  /** Timestamp when the rate limit resets */
  resetAt: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

/**
 * Create a rate limiter instance.
 * Each instance maintains its own request counts.
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config
  const requests = new Map<string, RateLimitEntry>()

  // Cleanup old entries periodically (every minute)
  const cleanup = () => {
    const now = Date.now()
    for (const [key, entry] of requests.entries()) {
      if (entry.resetAt < now) {
        requests.delete(key)
      }
    }
  }

  // Run cleanup every minute
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 60000)
  }

  return {
    /**
     * Check if a request is allowed for the given identifier.
     * @param identifier - Unique identifier (e.g., IP address, user ID)
     */
    check(identifier: string): RateLimitResult {
      const now = Date.now()
      const entry = requests.get(identifier)

      // If no entry or window expired, create new entry
      if (!entry || entry.resetAt < now) {
        requests.set(identifier, {
          count: 1,
          resetAt: now + windowMs,
        })
        return {
          success: true,
          remaining: maxRequests - 1,
          resetAt: now + windowMs,
        }
      }

      // Increment count
      entry.count++

      // Check if over limit
      if (entry.count > maxRequests) {
        return {
          success: false,
          remaining: 0,
          resetAt: entry.resetAt,
        }
      }

      return {
        success: true,
        remaining: maxRequests - entry.count,
        resetAt: entry.resetAt,
      }
    },

    /**
     * Reset the rate limit for an identifier.
     * Useful for testing or manual resets.
     */
    reset(identifier: string): void {
      requests.delete(identifier)
    },

    /**
     * Clear all rate limit entries.
     */
    clear(): void {
      requests.clear()
    },
  }
}

// Pre-configured rate limiters for common use cases

/**
 * Check if we're in a test environment where rate limiting should be relaxed
 */
const isTestEnvironment = process.env.CI === 'true' || process.env.E2E_TEST === 'true'

/**
 * Rate limiter for authentication actions (login, password reset).
 * 5 attempts per minute per IP in production, 1000 in test environments.
 */
export const authRateLimiter = createRateLimiter({
  maxRequests: isTestEnvironment ? 1000 : 5,
  windowMs: 60 * 1000, // 1 minute
})

/**
 * Rate limiter for general API actions.
 * 30 requests per minute per IP.
 */
export const apiRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
})

/**
 * Rate limiter for expensive operations (reports, exports).
 * 5 requests per 5 minutes per IP.
 */
export const expensiveRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 5 * 60 * 1000, // 5 minutes
})

/**
 * Helper to get client IP from headers in a server action.
 * Returns 'unknown' if IP cannot be determined.
 */
export function getClientIP(headersList: Headers): string {
  const cfConnectingIp = headersList.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  const vercelForwardedFor = headersList.get('x-vercel-forwarded-for')
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim()
  }

  // Try various headers that might contain the client IP
  const forwarded = headersList.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim()
  }

  const realIp = headersList.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  const clientIp = headersList.get('x-client-ip')
  if (clientIp) {
    return clientIp
  }

  return 'unknown'
}
