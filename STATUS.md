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

## What Should Happen Next (priority order)

1. **Security migration**: private buckets + signed URLs, RLS on `legacy_id_mapping`,
   scope `profiles` reads, policies for `notification_reads`. (~half day)
2. **Upstash Redis env vars in Vercel** for real rate limiting. (15 min)
3. **Tests for panelization algorithm + AI parsers** — pure functions, easy wins. (~1 day)
4. **AI cost logging table** — provider, model, tokens, estimated cost per analysis. (~half day)
5. **Standardize server action error handling** to returned `{ error }` objects.
6. Then: future-plans roadmap (production scheduling, quoting from drawings —
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
