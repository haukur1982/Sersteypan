# Code Hardening & Quality Audit Report
**Date:** Jan 30, 2026
**Scope:** Full codebase review with focus on type safety, server actions, data access, and UX edge cases.

## Summary
- **TypeScript strict check:** PASS (`npx tsc --noEmit`)
- **Lint:** PASS (`npm run lint`)
- **Build:** FAILED in this environment due to a Turbopack internal error (see "Build & Tooling" below)

## Checks Run
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (failed in sandbox; see details)
- Searched for `any`/`@ts-ignore` (none remaining)

## Fixes Applied
### Type safety / `any` removal
- Replaced `any` with typed models in:
  - Driver deliveries (detail + list)
  - Buyer deliveries list
  - Factory production detail (photo list)
  - Driver QR lookup & actions
  - Notifications query mapping
  - Offline queue error handling and conflict types
  - Driver delivery update payloads

### Lint & React Hooks issues
- Restructured message sending to avoid impure render calls and removed `Date.now()` use in render scope.
- Replaced `hasMarkedAsRead` state with a ref to avoid `setState` in effect body.
- Adjusted `OfflineBanner` effect logic to avoid `setState` directly in effect body.
- Fixed missing hook dependencies and unused variables.

### UI / Data correctness
- Added safe handling for nullable dates (driver list).
- Mapped element status to valid photo upload stages to avoid invalid stage values.
- Removed unused props from floor plan components and updated call sites.

### Tooling hygiene
- Added ESLint ignore entries for:
  - `scripts/**` (Node CJS scripts)
  - `supabase/functions/generate-report/**` (JSX-in-TS Deno edge file)

## Build & Tooling Notes
- `npm run build` failed in this sandbox with a Turbopack internal error:
  - **Error:** “creating new process / binding to a port — Operation not permitted”
  - **Context:** `src/app/globals.css` (PostCSS eval step)
  - **Action:** Re-run build in a non-sandboxed environment or confirm local permissions.
- Warning during build:
  - **"middleware" file convention deprecated** → consider updating to `proxy` per Next.js guidance.

## Remaining Risks / Recommendations
1. **Edge function report generation**
   - The Deno edge function uses JSX (`@react-pdf/renderer`), which is why it’s ignored by ESLint.
   - Recommendation: remove or rewrite the edge function, or keep only the Next.js API route version.
2. **RLS & DB integrity checks**
   - Execute policy and integrity SQL checks from `CODE-HARDENING-PLAN.md` in Supabase.
3. **Environment validation**
   - Add a small env validation utility (`src/lib/env.ts`) and import in critical server entrypoints.
4. **Performance / N+1**
   - No obvious N+1 patterns found in audited files, but re-check if new list views are added.

## Files Touched (Audit Fixes)
- `eslint.config.mjs`
- `src/app/(portals)/admin/page.tsx`
- `src/app/(portals)/admin/projects/[projectId]/floor-plans/FloorPlanViewer.tsx`
- `src/app/(portals)/admin/projects/[projectId]/floor-plans/page.tsx`
- `src/app/(portals)/admin/projects/[projectId]/floor-plans/new/FloorPlanUploadForm.tsx`
- `src/app/(portals)/admin/projects/[projectId]/floor-plans/new/page.tsx`
- `src/app/(portals)/driver/page.tsx`
- `src/app/(portals)/driver/load/LoadPageClient.tsx`
- `src/app/(portals)/driver/deliver/[id]/DeliverPageClient.tsx`
- `src/app/(portals)/factory/page.tsx`
- `src/app/(portals)/factory/production/[elementId]/page.tsx`
- `src/components/buyer/project/DeliveriesTab.tsx`
- `src/components/driver/DriverDeliveryDetail.tsx`
- `src/components/driver/DriverDeliveryList.tsx`
- `src/components/driver/OfflineBanner.tsx`
- `src/components/driver/QRScanner.tsx`
- `src/components/factory/ElementStatusUpdateForm.tsx`
- `src/components/factory/FixInFactoryList.tsx`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/shared/MessagesList.tsx`
- `src/components/shared/PhotoUploadForm.tsx`
- `src/lib/driver/actions.ts`
- `src/lib/driver/delivery-actions.ts`
- `src/lib/driver/qr-actions.ts`
- `src/lib/driver/queries.ts`
- `src/lib/hooks/useUnreadMessages.ts`
- `src/lib/notifications/queries.ts`
- `src/lib/offline/queue.ts`
- `src/lib/stock/queries.ts`

## Status
- **Audit complete.**
- **Codebase passes TypeScript and ESLint checks.**
- **Build should be re-run outside sandbox to confirm.**
