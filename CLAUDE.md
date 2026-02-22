# Sersteypan - Icelandic Precast Concrete Factory Management System

## Quick Context

Sersteypan manages the complete lifecycle of precast concrete elements: **Planning → Rebar → Casting → Curing → Ready → Loaded → Delivered → Verified**. Built with Next.js 16 + Supabase for an Icelandic concrete factory.

**Four portals**: Admin (owner), Factory (floor manager), Buyer (construction company), Driver (truck driver)

**Stack**: Next.js 16.1.6, React 19, TypeScript (strict), Supabase (PostgreSQL + Auth + RLS + Storage + Realtime), Tailwind CSS 4, Radix UI

## Critical Auth Rules

These rules were learned through painful debugging. Violating any of them breaks login:

1. **Next.js 16 uses `src/proxy.ts`** (exported function `proxy`), NOT `middleware.ts`. They cannot coexist.
2. **Use `getServerUser()` from `src/lib/auth/getServerUser.ts`** in Server Components. NEVER use `getUser()` from `actions.ts` — that's a server action for mutations only.
3. **Never `redirect('/login')` when `getServerUser()` returns null** in layouts or pages. The proxy already handles unauthenticated redirects. Null means transient cookie timing, not missing session.
4. **Server actions with `useActionState` MUST have signature `(prevState, formData)`**. Wrapping a server action in a client async function swallows the `redirect()` throw and the form gets stuck on "loading."
5. **Never use `<a href>` or `<Link>` for signout**. Next.js prefetches links, which triggers GET-based signout and destroys the session on every page load. Always use `<form action={logout}>` with the server action.
6. **The proxy should be lightweight**: only `supabase.auth.getUser()` for session refresh + redirect unauthenticated. Don't add DB queries for role checks — that belongs in layouts/pages.

## Auth Flow

```
Request → Proxy (src/proxy.ts)
       → Middleware (src/lib/supabase/middleware.ts) — refreshes session, redirects unauthed to /login
       → Layout (getServerUser() for display, role guard)
       → Page (getServerUser() for data, createClient() for queries)
```

**Login**: Server action `login()` in `src/lib/auth/actions.ts` → `signInWithPassword` → profile fetch → role-based `redirect()`

**Logout**: Server action `logout()` in `src/lib/auth/actions.ts` → `signOut` → `redirect('/login')`

## Database Schema (26 Tables)

### Core
- `profiles` — users (id FK to auth.users, role: admin/factory_manager/buyer/driver, company_id, is_active)
- `companies` — buyer companies (name, kennitala, contact info)
- `projects` — construction projects (company_id, status, lat/lng)
- `buildings` — buildings within projects (floors)

### Elements
- `elements` — precast concrete items (project_id, element_type, status, dimensions, weight, QR code)
- `element_types` — configurable catalog (key, label_is, label_en)
- `element_events` — audit trail for every status change (who, when, notes)
- `element_photos` — photos at each production stage
- `element_positions` — x/y placement on floor plans

### Deliveries
- `deliveries` — truck deliveries (project_id, driver_id, status, truck info, timestamps)
- `delivery_items` — elements loaded onto each delivery
- `visual_verifications` — driver visual QC (verified/rejected)

### Factory
- `fix_in_factory` — defect tracking (element_id, priority, status)
- `todo_items` — factory worker task list
- `diary_entries` — daily production log

### Stock
- `stock_items` — inventory (name, SKU, category, quantity, reorder_level, location)
- `stock_transactions` — in/out movements with audit
- `project_allocations` — stock reserved for projects
- `suppliers` — vendor directory
- `supplier_items` — supplier product catalog

### Communication
- `project_messages` — cross-portal messaging (element_id optional FK to tag specific elements)
- `project_documents` — file uploads with category (drawing/rebar/concrete_spec/other)

### Other
- `floor_plans` — uploaded blueprint images with anchor points
- `priority_requests` — buyer priority escalation (pending/approved/denied)
- `notification_reads` — per-user notification tracking
- `audit_log` — system-wide audit trail
- `legacy_id_mapping` — data migration helper

### Storage Buckets (8)
element-photos, delivery-photos, signatures, project-documents, qr-codes, reports, floor-plans, documents

## RLS Strategy

Row Level Security enforced at database level:
- **Admin**: full access to all tables
- **Factory manager**: full access to production data (not tenant-isolated)
- **Buyer**: only their company's data (`get_user_company()` helper)
- **Driver**: only their assigned deliveries (`is_delivery_for_driver()` helper)

Helper functions use `SECURITY DEFINER` to prevent infinite recursion. All helpers check `is_active = true`.

## Key Patterns

### Server Actions
```typescript
// CORRECT: (prevState, formData) signature for useActionState
export async function myAction(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  // validate, mutate, revalidatePath, redirect
}

// CORRECT: pass directly to useActionState
const [state, formAction, isPending] = useActionState(myAction, { error: '' })
```

### Data Fetching in Server Components
```typescript
import { getServerUser } from '@/lib/auth/getServerUser'
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const user = await getServerUser()
  // Never redirect to /login if user is null
  if (user && user.role !== 'expected_role') {
    redirect(dashboardPathForRole(user.role))
  }
  const supabase = await createClient()
  const { data } = await supabase.from('table').select('*')
  // RLS automatically filters by role
}
```

### Offline Queue (Driver Portal)
```typescript
import { queueAction } from '@/lib/offline/queue'
// Queue when offline, auto-syncs when connection returns
await queueAction('add_element_to_delivery', { deliveryId, elementId })
```

## File Structure

```
src/
  proxy.ts                          # Next.js 16 proxy (replaces middleware.ts)
  app/
    (auth)/login/                   # Login page + LoginClient
    (portals)/admin/                # Admin portal (13 pages)
    (portals)/factory/              # Factory portal (14 pages, incl. projects + floor plans)
    (portals)/buyer/                # Buyer portal (8 pages)
    (portals)/driver/               # Driver portal (8 pages)
    api/                            # API routes (element-types, notifications)
  components/
    ui/                             # Radix UI primitives (shadcn/ui)
    layout/                         # Sidebar, DashboardLayout, RoleBasedNav
    shared/                         # Cross-portal (messages, photos, signature)
    admin/, factory/, buyer/, driver/  # Portal-specific components
  lib/
    auth/actions.ts                 # login(), logout() server actions
    auth/getServerUser.ts           # Server Component user fetch
    auth/rolePaths.ts               # dashboardPathForRole() helper
    supabase/middleware.ts          # Session refresh + auth redirects
    supabase/server.ts              # createClient() for server-side
    supabase/client.ts              # createBrowserClient() for client-side
    offline/queue.ts                # IndexedDB offline queue (491 lines)
    schemas/common.ts               # Zod validation (UUID, kennitala, phone, etc.)
    utils/rateLimit.ts              # Hybrid rate limiter (in-memory + Upstash-ready)
    utils/sanitize.ts               # DOMPurify + text/URL/filename sanitizers
    utils/audit.ts                  # Audit logging helper
    {domain}/actions.ts             # Server actions per domain
    {domain}/queries.ts             # Data fetching per domain
    hooks/useRealtimeElements.ts    # Supabase realtime subscriptions
    hooks/useOfflineActions.ts      # Offline-aware driver actions
    providers/AuthProvider.tsx       # Client-side auth context
  types/database.ts                 # Generated Supabase types
supabase/
  migrations/                       # 21 SQL migration files
```

## Security

- **CSP headers** in `next.config.ts` (script-src, style-src, img-src, connect-src, frame-ancestors)
- **Rate limiting** in `src/lib/utils/rateLimit.ts` (auth: 5/min, API: 30/min, expensive: 5/5min)
- **Zod validation** in `src/lib/schemas/` (UUID, kennitala with checksum, Icelandic phone, dimensions)
- **DOMPurify** in `src/lib/utils/sanitize.ts` (HTML/text/URL/filename sanitization)
- **Sentry** monitoring with session replay (`instrumentation.ts`, `instrumentation-client.ts`)
- **Error boundaries** at global and portal level

## Adding a New Feature

1. Create page: `src/app/(portals)/{portal}/new-feature/page.tsx`
2. Add queries: `src/lib/{domain}/queries.ts`
3. Add server actions: `src/lib/{domain}/actions.ts` (with `(prevState, formData)` signature)
4. Add to navigation: `src/components/layout/RoleBasedNav.tsx`
5. If new table needed: create migration in `supabase/migrations/`, add RLS policies, push with `supabase db push --include-all`
6. Validate inputs with Zod schemas from `src/lib/schemas/common.ts`

## Adding a Database Migration

1. Create file: `supabase/migrations/NNN_description.sql`
2. Write SQL (tables, RLS policies, indexes, functions)
3. Push: `supabase db push --include-all`
4. Manually add new columns to `src/types/database.ts` (Row, Insert, Update). Note: `supabase gen types` from remote may omit columns like `preferences` — prefer manual edits to the existing file.

## Testing

- **Unit tests**: `npm run test` (Vitest, 5 test files in `src/__tests__/`)
- **E2E tests**: `npm run test:e2e` (Playwright, 7 specs in `e2e/`)
- **Build check**: `npm run build`
- **Type check**: `npx tsc --noEmit`
- **Lint**: `npm run lint`

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `owner.admin@sersteypan.test` | `OwnerAccess!2026` |
| Factory | `owner.factory@sersteypan.test` | `OwnerAccess!2026` |
| Buyer | `owner.buyer@sersteypan.test` | `OwnerAccess!2026` |
| Driver | `owner.driver@sersteypan.test` | `OwnerAccess!2026` |

## Factory Intelligence (Migration 020)

### Element Status Summaries
Factory projects list (`/factory/projects`) shows per-project element status breakdown (e.g., "3 Skipul. · 2 Steypt · 1 Tilb."). Uses `getElementCountsByProject()` in `src/lib/factory/queries.ts`.

### Document Categories
Documents have a `category` field: `drawing` (Teikning), `rebar` (Armering), `concrete_spec` (Steypuskýrsla), `other` (Annað). Upload form has a category selector. `DocumentListWithFilter` component provides filterable document list with category badges.

### Priority View (Forgangur)
Factory dashboard shows priority elements (where `priority > 0` and not delivered/loaded). Uses `getPriorityElements()`. Displayed in a dedicated "Forgangur" card section.

### Element-Tagged Messages
Messages can optionally reference a specific element via `element_id`. Element tags appear as clickable badges on messages. Reply forms include an element picker when elements are available.

## Known Limitations

1. No email notifications for status changes
2. No reporting dashboard or charts
3. No production scheduling calendar
4. No bulk status updates
5. Read-only buyer profile
6. 3D Lab is experimental (not connected to production data)
7. Stock management lacks purchase orders
8. Hardcoded Icelandic strings (no i18n framework)

## Deployment

- **Hosting**: Vercel (auto-deploy from `main` branch)
- **Database**: Supabase (project ref: `rggqjcguhfcfhlwbyrug`, EU West 1)
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`)
- **Monitoring**: Sentry (conditional, requires `NEXT_PUBLIC_SENTRY_DSN`)
