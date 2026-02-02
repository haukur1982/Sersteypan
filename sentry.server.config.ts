/**
 * Sentry server-side configuration
 * This file configures the Sentry SDK for server-side error tracking
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set sample rate for error events (1.0 = 100%)
  sampleRate: 1.0,

  // Performance monitoring - start with 10% sampling
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Before sending, add additional context
  beforeSend(event) {
    // Don't send events in development unless specifically enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null
    }
    return event
  },
})
