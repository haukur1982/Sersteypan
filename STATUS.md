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

**STILL PENDING (needs Hawk):**
1. **Apply SQL portion of migration 067** (storage policy swap to authenticated,
   `legacy_id_mapping` RLS, role-scoped `profiles` SELECT). Needs the Supabase DB
   password: `SUPABASE_DB_PASSWORD=... supabase db push --include-all` — or paste the
   migration into the dashboard SQL editor. Until then: anon-key holders can still read
   storage objects via the API (the lazy/public-URL hole is closed), and profiles PII
   is still readable cross-company.
2. **Upstash Redis for rate limiting**: Vercel project lives in the "sersteypan" team;
   this Mac's CLI is logged into the personal account. Install the Upstash Marketplace
   integration from the dashboard (or `vercel login` with the team account), then the
   limiter picks up `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` automatically.
3. **NEXT_PUBLIC_APP_URL is unset** — QR codes encode the fallback
   `https://app.sersteypan.is`, which does not resolve. Set the env var in Vercel
   (or stand up the domain) before printing real labels.
4. After the SQL lands: run e2e `auth.spec.ts` + `rbac.spec.ts` and click through all
   four portals (photos, QR labels, floor plans, delivery signatures).

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
