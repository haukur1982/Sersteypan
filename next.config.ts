import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Security headers to protect against common web vulnerabilities
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === 'production' ? [] : ["'unsafe-eval'"]),
].join(' ')

const securityHeaders = [
  {
    // Prevent clickjacking attacks
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Prevent MIME type sniffing
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Control referrer information
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Enable XSS protection in older browsers
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    // Control browser features
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    // Strict Transport Security (HTTPS only)
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    // Content Security Policy
    // Note: 'unsafe-inline' is needed for Next.js styles, 'unsafe-eval' for development
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://rggqjcguhfcfhlwbyrug.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://rggqjcguhfcfhlwbyrug.supabase.co wss://rggqjcguhfcfhlwbyrug.supabase.co https://*.sentry.io https://*.ingest.sentry.io",
      "frame-src 'self' https://rggqjcguhfcfhlwbyrug.supabase.co",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '60mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rggqjcguhfcfhlwbyrug.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppress source map upload logs in CI
  silent: true,

  // Organization and project from environment
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps only in production
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',

  // Hide source maps from browser
  hideSourceMaps: true,
};

// Export with Sentry wrapper (gracefully handles missing DSN)
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
