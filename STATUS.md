# Sérsteypan - Project Status Report
**Last Updated:** June 10, 2026
**Current Phase:** Pre-launch hardening — factory opens fall 2026

---

## Quick Summary

All four portals (Admin, Factory, Buyer, Driver) are functionally complete and in use.
The system has grown far past the January status: AI drawing analysis, automatic filigran
panelization, DWG support via ConvertAPI, building visualization with auto-positioned
elements, rebar batches, shifts, framvinda contracts. 185+ commits, ~439 TS files, 60+ migrations.

**This file was 5 months stale (last update Jan 29).** Rewritten June 10 after a full
codebase review (architecture + security + AI subsystem) done with Claude.

---

## June 10, 2026 — Full System Review Findings

Three parallel review passes: architecture/code quality, security/RLS, and the AI
drawing-analysis subsystem. Full conversation in Claude Code session history.

### Security — MUST FIX BEFORE FALL LAUNCH

1. **Public storage buckets**: `element-photos` (005), `qr-codes` (009) are `public: true`.
   `delivery-photos` was created public in 005; migration 009 tried to set it private but
   `on conflict do nothing` means the public setting won. Anyone with a URL can read
   photos/QR codes. Fix: new migration setting `public = false` (UPDATE, not INSERT) +
   serve via signed URLs.
2. **`legacy_id_mapping` has no RLS** (002) — any authenticated user can enumerate all IDs.
3. **`profiles` readable by all authenticated users** (015) — buyers can see every user's
   name/email/phone across companies. Scope by role/company.
4. **`notification_reads` has RLS enabled but no policies** (019) — verify intended behavior.
5. **Rate limiting is in-memory** — multi-instance Vercel deploys don't share state.
   Set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in production.
6. NOT an issue: `.env.local` is properly gitignored, never committed. Keys are safe
   (a review agent flagged this wrongly; verified with git ls-files / git log).

### Code quality — known debt (not launch blockers, but real)

- **Error handling split-brain**: some actions throw (`stock/actions.ts`), some return
  `{ error }` (`elements/actions.ts`). Standardize on returned error objects.
- **Offline queue conflict detection is a stub**: `detectConflict()` in
  `src/lib/offline/queue.ts:316` always returns no-conflict. Driver actions queued
  offline can silently "succeed" against stale server state.
- **God files**: `elements/actions.ts` (1,124 lines), factory production page (702),
  rebar batch dialog (631), shift calendar (618).
- **Test coverage ~5%**: 5 unit files + 7 e2e specs. Zero tests on the panelization
  algorithm and AI response parsing — the highest-risk code.
- **`updateElement()` skips Zod validation** (manual FormData checks) while sibling
  actions use schemas.

### AI subsystem (drawing analysis → panelization → building view) — ~70% production-ready

Strong: human review gate before commit, salvage parsing of partial AI output,
per-field confidence levels, commit-time sanity bounds, building-name mapping,
DWG conversion with good error codes, realtime progress.

Missing before heavy production use:
- No AI/ConvertAPI cost tracking at all (no tokens/spend logging)
- Wall panelization ignores openings (all panels full-height — MVP comment in
  `src/lib/panelization/algorithm.ts:244`)
- No geometry validation (overlapping elements, out-of-bounds positions)
- Skipped elements during commit not surfaced in UI
- Zero tests on algorithm + parsers

---

## Security Sprint — DONE June 10/11 (commit 9b31e03)

Shipped and verified in production:
- **Signed-URL code live** on Vercel (probe: /qr page serves inline SVG). All readers
  resolve via `src/lib/storage/resolveUrl.ts`; all writers store storage paths.
  Historical full-URL rows resolve through the same helper — no backfill.
- **All 8 storage buckets flipped private** via Storage Admin API. Verified live:
  old public URL → 400, signed URL → 200 (tested on a real element photo).
- **Migration 067 written** (`supabase/migrations/20260610000000_067_security_hardening.sql`).
  Bucket UPDATE portion is already live (idempotent re-run is fine).
- Public /qr/[elementId] page now renders QR inline (no bucket dependency).
- Build ✓, tsc ✓, 117/117 unit tests ✓, ESLint (pre-commit) ✓.

**COMPLETED June 11 (continued session):**
- Migrations 067 + 068 applied to production. 068 dropped ROGUE DASHBOARD POLICIES that
  existed in no migration file (`"Users can view all profiles"` to public using(true) on
  profiles — it nullified all scoped policies — plus 3 public storage-read policies).
  Lesson: the live DB had drifted from the migration files; policies had been created
  manually in the dashboard.
- Verified per-role via REST: admin/factory see all 11 profiles; buyer sees 8 (staff +
  own company only — cross-company leak CLOSED); driver sees 6; anon sees 0. All roles
  can still sign storage URLs; anon cannot (400).
- e2e: 33/33 passed (auth.spec.ts + rbac.spec.ts) against production DB.

**COMPLETED June 11 (late session):**
- **Upstash Redis live**: Marketplace resource `upstash-kv-aureolin-island` provisioned
  and connected to the project (all environments). Rate limiter patched to also accept
  the marketplace var names (`KV_REST_API_URL`/`KV_REST_API_TOKEN`). Pipeline verified
  against the live instance. Distributed rate limiting active after next deploy.
- **NEXT_PUBLIC_APP_URL set** in production env (`https://sersteypan.vercel.app`).
  NOTE: re-point it (and REGENERATE printed QR codes) if a real domain like
  app.sersteypan.is is stood up before launch.
- Vercel CLI now linked: repo → sersteypan/sersteypan (the project lives in the
  "sersteypan" team — same login, use `--scope sersteypan`).

**STILL PENDING (needs Hawk):**
1. **Rotate the Supabase DB password** (was shared in chat June 11) — Supabase
   dashboard → Project Settings → Database. Nothing else uses it.
2. `NEXT_PUBLIC_SENTRY_DSN` was dropped from `.env.local` by the Vercel env pull —
   re-add locally if local Sentry is wanted (production unaffected; it's set in Vercel).

**Security fast-follows found during the sweep (authenticated-only, mild):**
- `element_photos` "Anyone can view element photos" — any authenticated user reads all
  photo rows cross-company. Scope like profiles were.
- `project_documents` "Authenticated users can view project documents" — same pattern
  for document metadata.
- `element_task_workers` / `element_tasks` — open to all authenticated users.
- Consider a periodic drift check: compare live pg_policies against migration files
  (this is how the rogue policies were found).

## What Should Happen Next (priority order)

1. Finish the 4 pending items above.
2. **Tests for panelization algorithm + AI parsers** — pure functions, easy wins. (~1 day)
3. **AI cost logging table** — provider, model, tokens, estimated cost per analysis. (~half day)
4. **Standardize server action error handling** to returned `{ error }` objects.
5. Then: future-plans roadmap (Building Twin → framvinda link → production scheduling →
   quoting from drawings; Lyklapétur stays separate, snapshot-export integration post-launch —
   discussed with Claude June 10, see memory).

---

## Test Accounts

See CLAUDE.md "Test Accounts" section (owner.*@sersteypan.test).

## Commands

```bash
npm run dev          # port 3000
npm run build
npm run test         # vitest
npm run test:e2e     # playwright
npx tsc --noEmit
supabase db push --include-all
```
