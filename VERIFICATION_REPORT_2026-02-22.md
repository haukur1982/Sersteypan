# Verification Report — 2026-02-22 (v2)
## For Codex Review

This document summarizes all work done today on the Sersteypan system. Please verify each item against the live codebase and deployed Supabase instance.

**v2 changes:** Fixed 5 findings from Codex's first review (see "Codex v1 Findings Resolved" section at bottom).

---

## DEPLOYMENT BLOCKERS

**Migration 017 is NOT applied to remote DB.** All code that selects `latitude`/`longitude` from `projects` has been removed or guarded with TODO comments. The maps integration components exist but produce no output until migration 017 is applied and `GOOGLE_MAPS_API_KEY` is set on Vercel. No production pages will break.

**Verified safe:** `src/app/(portals)/driver/deliver/[id]/page.tsx` query does NOT select latitude/longitude. `projectCoordinates` is hardcoded to `null`. `src/lib/buyer/queries.ts` does NOT select latitude/longitude.

---

## Session Overview

Two separate development efforts were merged and deployed today:

1. **Gemini's work** (commits `ab5c0db`, `f88abc7`) — Addressed 13 owner feedback items from annotated PDFs
2. **Claude's work** (this session) — Reviewed Gemini's work, identified gaps, created proper migration, deployed fixes, fixed production break risk

---

## What Was Deployed to Production Today

### A. SQL Migration (run via Supabase SQL Editor)

**Source file:** `supabase/migrations/044_owner_feedback_fixes.sql`

**F3 — Photo Upload RLS Fix:**
- Added RLS policies to `element_photos` table
- `SELECT`: any authenticated user (USING clause)
- `INSERT`: admin and factory_manager only (WITH CHECK clause: `get_user_role() IN ('admin', 'factory_manager')`)
- `UPDATE/DELETE`: admin and factory_manager only (USING clause: `get_user_role() IN ('admin', 'factory_manager')`)
- **Why:** Factory managers were blocked from uploading per-element photos because the table had no INSERT policy

**F6 — Updated Production Checklist:**
- Changed default checklist on `production_batches.checklist` column to 7 items (was 5):
  1. Mál staðfest
  2. Mót olíuborið (NEW)
  3. Járnabinding staðfest
  4. Raflagnir/pípulagnir staðsettar
  5. Myndir hlaðnar upp
  6. Steypuhula yfir stáli — DYNAMIC per element type (NEW)
  7. Steypubíll C35 / ½ flot 70-75 á mæli (NEW)
- Replaced `create_batch_with_elements()` RPC function to:
  - Build checklist dynamically based on element types in batch
  - Show correct concrete cover: filigran 25mm, svalir 40mm, stigar 35mm
  - If batch contains multiple types, ALL are listed (e.g., "filigran 25mm, svalir 40mm")
  - Preserved existing security: `FOR UPDATE` row locking, `status IN ('planned', 'rebar')` validation

### B. Edge Function Deployment

**Function:** `generate-qr-codes`
**Deployed via:** `npx supabase functions deploy generate-qr-codes`
**Change:** Rewrote from PNG buffer output (crashed in Deno) to native SVG output
**Key file:** `supabase/functions/generate-qr-codes/index.ts`
**Verification:** Check Supabase Dashboard → Edge Functions → `generate-qr-codes` → should show 2026-02-22

### C. Hotfix: Remove latitude/longitude from driver query

**File:** `src/app/(portals)/driver/deliver/[id]/page.tsx`
**What:** Gemini's commit `ab5c0db` re-added `latitude, longitude` to the Supabase select query on `projects`. Since migration 017 is NOT applied to remote, this would cause every driver delivery page to return a PostgREST error and 404.
**Fix:** Removed latitude/longitude from query, set `projectCoordinates = null`, added TODO comment.
**Risk if not deployed:** Driver portal delivery confirmation pages would all fail.

---

## What Gemini Implemented (commits ab5c0db, f88abc7)

These were already in the codebase when this session started. Verified in code but NOT deployed by this session (they deploy via Vercel on git push to main):

| ID | Description | Key Files (full paths) | Status |
|----|-------------|------------------------|--------|
| **A1** | Bulk element type change — multi-select + dropdown | `src/components/admin/ProjectElementsTableClient.tsx`, `src/lib/elements/actions.ts` | Verified in code |
| **A2** | Drawing deactivation (soft delete with reason) | `supabase/migrations/043_project_documents_deactivation.sql`, `src/lib/documents/actions.ts`, `src/components/documents/DocumentListWithFilter.tsx` | Verified in code |
| **A3** | Hard delete for wrong uploads | `src/lib/documents/actions.ts`, `src/components/documents/DocumentListWithFilter.tsx` | Verified in code |
| **A4** | QR/Barcode — SVG rewrite | `supabase/functions/generate-qr-codes/index.ts` | **Deployed today** |
| **A5/A6** | Framvinda date range explanation | `src/app/(portals)/admin/framvinda/[projectId]/[periodId]/FramvindaEditorClient.tsx` | Verified in code |
| **A7** | rebar_batch_id column | `supabase/migrations/041_rebar_batches.sql` | Applied previously |
| **F1** | Rebar-before-casting enforcement | `src/lib/factory/batch-actions.ts` (`.eq('status', 'rebar')` on line 529) | Verified in code |
| **F2** | Natural alphanumeric sort | `src/components/factory/BatchCreateDialog.tsx` (`localeCompare` with `{ numeric: true }` on line 89) | Verified in code |
| **F3** | Photo upload RLS | `supabase/migrations/044_owner_feedback_fixes.sql` | **Applied today via SQL Editor** |
| **F4** | Post-completion report uploads | `src/app/(portals)/factory/batches/[batchId]/page.tsx` (line 254, `disabled={isCancelled}`) | Verified in code |
| **F5** | Default concrete type | `src/components/factory/BatchCreateDialog.tsx` (`useState('C35 ½ flot 70-75 á mæli')` on line 74) | Verified in code |
| **F6** | Updated checklist with dynamic cover | `supabase/migrations/044_owner_feedback_fixes.sql` | **Applied today via SQL Editor** |
| **AI** | Drawing prompt improvements (Veggur, Sula, tables, spatial) | `src/lib/ai/drawing-prompt.ts` | Verified in code |

---

## What Claude Did in This Session

### Maps Integration (committed, NOT active until migration 017 applied):
- `src/lib/maps/geocoding.ts` — Google Maps geocoding server action
- `src/lib/maps/types.ts` — Coordinates types and map URL helpers
- `src/components/shared/OpenInMapsButton.tsx` — Reusable navigation button
- `src/components/projects/ProjectForm.tsx` — Added geocoding UI ("Finna á korti" button)
- `src/app/(portals)/driver/deliver/[id]/DeliverPageClient.tsx` — Map navigation button (receives null coordinates until migration applied)
- `src/app/(portals)/buyer/deliveries/[id]/page.tsx` — Conditional map link (hidden until coordinates exist)
- `supabase/migrations/017_add_project_coordinates.sql` — Adds latitude/longitude columns to projects

### Documentation:
- `Framvinda/Handbok-Framvinda.md` — Comprehensive Icelandic owner's manual for progressive billing
- `REBAR_RESEARCH_EXTRACT.md` — Extracted rebar/AI research from Feb 16-18 session transcript

### Review & Fixes:
- Reviewed Gemini's walkthrough v1 (incomplete: 6/13 items) and v2 (complete: 13/13 items)
- Identified and fixed 3 issues in Gemini's `database_fixes.sql`:
  1. F6 checklist IF/ELSIF only picks one element type → fixed with array-based approach
  2. F3 RLS `WITH CHECK (true)` too permissive → fixed to admin+factory_manager
  3. Removed status validation in `create_batch_with_elements` → restored `status IN ('planned', 'rebar')`
- Created proper migration `supabase/migrations/044_owner_feedback_fixes.sql`
- Fixed production break: removed latitude/longitude from driver delivery query (Gemini re-added after Claude removed)
- Guided user through Supabase SQL Editor deployment and edge function deployment

---

## Verification Checklist for Codex

### Database (check via Supabase SQL Editor)

```sql
-- 1. Verify element_photos RLS policies (including WITH CHECK for INSERT safety)
SELECT policyname, cmd, qual, with_check_qual
FROM pg_policies WHERE tablename = 'element_photos';
-- Expected: 4 policies:
--   SELECT: qual allows authenticated
--   INSERT: with_check_qual contains 'admin', 'factory_manager'
--   UPDATE: qual contains 'admin', 'factory_manager'
--   DELETE: qual contains 'admin', 'factory_manager'

-- 2. Verify production_batches checklist default has 7 items
SELECT column_default FROM information_schema.columns
WHERE table_name = 'production_batches' AND column_name = 'checklist';
-- Expected: 7-item JSON array including 'mold_oiled', 'concrete_cover', 'concrete_truck'

-- 3. Verify create_batch_with_elements has dynamic cover logic
SELECT prosrc FROM pg_proc WHERE proname = 'create_batch_with_elements';
-- Expected: Contains 'v_cover_parts', 'array_append', 'filigran 25mm', 'svalir 40mm', 'stigar 35mm'
-- Expected: Contains "status IN ('planned', 'rebar')" (status validation preserved)

-- 4. Verify rebar_batches table exists (migration 041)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'rebar_batches';
-- Expected: 1

-- 5. Verify elements has rebar_batch_id column (migration 041)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'elements' AND column_name = 'rebar_batch_id';
-- Expected: 1 row

-- 6. Verify project_documents has deactivation columns (migration 043)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'project_documents'
  AND column_name IN ('is_active', 'deactivated_at', 'deactivation_reason');
-- Expected: 3 rows

-- 7. Verify projects does NOT have latitude/longitude (migration 017 not applied)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'latitude';
-- Expected: 0 rows (confirms migration 017 is not applied)
```

### Edge Function (check via Supabase Dashboard → Edge Functions)

- `generate-qr-codes` should show deployment date 2026-02-22
- Code should use `QRCode.toString(elementId, { type: 'svg' })` not `QRCode.toBuffer()`

### Frontend (check via Vercel deployment after push)

- [ ] Admin: Bulk element type change works (select multiple → dropdown → save)
- [ ] Admin: Document deactivation (archive icon) with reason input
- [ ] Admin: Document hard delete (trash icon) for wrong uploads
- [ ] Admin: QR code generation produces SVG files in `qr-codes` storage bucket
- [ ] Admin: Framvinda shows date range text under "Stinga upp" button
- [ ] Factory: Only rebar-status elements appear in batch creation dialog
- [ ] Factory: Elements sorted naturally (F(A)-1-1, F(A)-1-2, ..., F(A)-1-10)
- [ ] Factory: Photo upload works for factory managers on individual elements
- [ ] Factory: Concrete report upload works on completed (not just active) batches
- [ ] Factory: Default concrete type pre-filled as "C35 ½ flot 70-75 á mæli"
- [ ] Factory: New batch checklist has 7 items including "Mót olíuborið" and dynamic "Steypuhula yfir stáli"
- [ ] Factory: Concrete cover label shows correct value per element type in batch
- [ ] Driver: Delivery confirmation page loads without errors (no latitude/longitude query)

### Maps Integration (NOT active — requires manual steps)

To activate maps:
1. Apply migration: run `017_add_project_coordinates.sql` in Supabase SQL Editor
2. Set `GOOGLE_MAPS_API_KEY` env var on Vercel
3. Uncomment latitude/longitude in driver query (`src/app/(portals)/driver/deliver/[id]/page.tsx`, see TODO)
4. Add latitude/longitude to buyer delivery query (`src/lib/buyer/queries.ts`, `getDeliveryDetail()`)
5. Verify: Admin project form shows "Finna á korti" button, driver delivery shows "Opna í Google Maps"

---

## Codex v1 Findings — Resolved

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 1 | Driver page selects latitude/longitude but migration 017 not applied | High | **Fixed:** Removed from query, set `projectCoordinates = null`, added TODO. Build verified. |
| 2 | RLS verification query doesn't check `with_check_qual` | Medium | **Fixed:** SQL check #1 now selects `with_check_qual` column |
| 3 | Maps integration not in verification checklist | Medium | **Fixed:** Added dedicated "Maps Integration" checklist section |
| 4 | buyer/queries.ts entry misleading (says "reverted" but file was also changed by linter) | Low | **Fixed:** Removed from file change table; clarified that no latitude/longitude code persists in buyer queries |
| 5 | Ambiguous file references without full paths | Low | **Fixed:** All file references now use full paths from `src/` root |

---

*Generated by Claude Code — 2026-02-22 (v2, post-Codex review)*
