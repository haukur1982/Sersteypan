# Codex Handoff Brief
**Date:** 2026-01-30 | **From:** Gemini | **Priority:** High

---

## Context
We completed security testing. Now building Phase 6 (Driver Portal). Gemini is doing UI. Your job: backend/Edge Functions.

## Your Tasks

### 1. Edge Function: `generate-qr-codes` 
**Location:** `supabase/functions/generate-qr-codes/index.ts`

```typescript
// Input
{ element_ids: string[] }

// Output
{ qr_codes: Array<{ element_id: string, qr_url: string }> }
```

**Requirements:**
- Use `qrcode` npm package (already in CLAUDE.md spec)
- QR content = element UUID (NOT human-readable name)
- Store generated QR URL in `elements.qr_code_url`
- Return signed URLs

### 2. Edge Function: `generate-report`
**Location:** `supabase/functions/generate-report/index.ts`

```typescript
// Input
{ 
  type: 'project_status' | 'delivery_manifest',
  project_id?: string,
  delivery_id?: string 
}

// Output
{ pdf_url: string }
```

**Requirements:**
- Use `@react-pdf/renderer` or similar
- Project status: elements list with status, photos, timeline
- Delivery manifest: elements on truck, weights, delivery address

### 3. Optional: `start-delivery` and `complete-delivery`
Currently using Server Actions. If time permits, convert to Edge Functions for better bulk ops.

---

## Key Files to Reference
- `CLAUDE.md` lines 1321-1359 (Edge Function specs)
- `src/types/database.ts` (TypeScript types)
- `supabase/migrations/` (schema reference)

## How to Test
```bash
supabase functions serve generate-qr-codes --env-file .env.local
curl -X POST http://localhost:54321/functions/v1/generate-qr-codes \
  -H "Authorization: Bearer <anon_key>" \
  -d '{"element_ids": ["<uuid>"]}'
```

## Coordination
- Gemini: Building Driver Portal UI
- Claude: QR scanning logic, offline queue
- You: Edge Functions, PDF generation
