/**
 * Sentry client-side configuration
 * This file configures the Sentry SDK for browser-side error tracking
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set sample rate for error events (1.0 = 100%)
  sampleRate: 1.0,

  // Performance monitoring - start with 10% sampling
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for debugging (optional, 10% of sessions)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Ignore common non-errors
  ignoreErrors: [
    // Browser extensions
    /ResizeObserver loop/,
    /Loading chunk \d+ failed/,
    // Network errors
    /Network request failed/,
    /Failed to fetch/,
    // User cancelled actions
    /AbortError/,
  ],

  // Integrations
  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // Before sending, add additional context
  beforeSend(event) {
    // Don't send events in development unless specifically enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null
    }
    return event
  },
})
