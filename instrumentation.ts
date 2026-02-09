import * as Sentry from '@sentry/nextjs'

const serverSampleRate = process.env.NODE_ENV === 'production' ? 1.0 : 0
const tracesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0

export const onRequestError = Sentry.captureRequestError

export async function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    sampleRate: serverSampleRate,
    tracesSampleRate,
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.NODE_ENV === 'development',
    beforeSend(event) {
      if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
        return null
      }
      return event
    },
  })
}
