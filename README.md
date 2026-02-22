# Sersteypan

Sersteypan is a multi-portal production system for precast concrete workflows built with Next.js and Supabase.

## Portals

- `Admin` (`/admin`) manages projects, users, companies, reports, and settings.
- `Factory` (`/factory`) handles production, batches, rebar, stock, diary, and defects.
- `Buyer` (`/buyer`) tracks project progress, deliveries, messages, and finalized framvinda periods.
- `Driver` (`/driver`) handles loading, scanning, delivery execution, and visual verification.

## Tech Stack

- Next.js App Router (`next@16`)
- React (`react@19`)
- Supabase (Auth, Postgres, Storage, Realtime)
- TypeScript, ESLint, Vitest, Playwright

## Local Setup

1. Install dependencies:
```bash
npm ci
```
2. Create local env file:
```bash
cp .env.example .env.local
```
3. Run the app:
```bash
npm run dev
```

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Some routes/features also require:

- `SUPABASE_SERVICE_ROLE_KEY` (server-only API/report/storage tasks)
- `SUPABASE_REPORTS_BUCKET` (optional, defaults to `reports`)
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (optional distributed rate limiting)
- `ANTHROPIC_API_KEY` and/or `GOOGLE_AI_API_KEY` (AI features)
- `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` for source maps)

## Scripts

- `npm run dev` start development server
- `npm run build` production build
- `npm run start` run production server
- `npm run lint` run ESLint
- `npm run test:run` run unit tests once
- `npm run test:e2e` run Playwright E2E tests
- `npm run test:coverage` run unit coverage (requires coverage provider package)

## Quality Gates

Before merge/deploy:

1. `npm run lint`
2. `npm run test:run`
3. `npm run build`

## Security Notes

- Auth/session protection is enforced by `src/proxy.ts` and server-side role checks.
- CSP is configured in `next.config.ts`.
- For stricter CSP script handling, set:
  - `CSP_ALLOW_UNSAFE_INLINE_SCRIPTS=false`
  - enable only after validating nonce/hash compatibility in your deployment.

## Repo Notes

- Main app code lives in `src/`.
- Database migrations live in `supabase/migrations/`.
- E2E tests live in `e2e/`.
