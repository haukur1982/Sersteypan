# Claude Handoff Brief
**Date:** 2026-01-30 | **From:** Gemini | **Priority:** High

---

## Context
We completed security testing. Now building Phase 6 (Driver Portal). Gemini is doing UI. Your job: integration logic.

## Your Tasks

### 1. QR Scanning Logic
**File:** `src/lib/driver/qr-actions.ts`

```typescript
'use server'

// Scan QR → lookup element → return element data
export async function lookupElementByQR(qrContent: string): Promise<{
  element: Element | null
  error?: string
}>

// Add element to delivery (during loading)
export async function addElementToDelivery(
  deliveryId: string, 
  elementId: string
): Promise<{ success: boolean, error?: string }>

// Confirm element delivered
export async function confirmElementDelivered(
  deliveryId: string,
  elementId: string,
  photoUrl?: string
): Promise<{ success: boolean, error?: string }>
```

**Key Rules (from CLAUDE.md):**
- QR contains UUID, not human-readable name
- Validate element status before loading (must be `ready`)
- Update element status to `loaded` when added to delivery
- Update to `delivered` when confirmed

### 2. Offline Queue System
**File:** `src/lib/offline/queue.ts`

```typescript
interface OfflineAction {
  id: string
  type: 'update_element_status' | 'confirm_delivery' | 'upload_photo'
  payload: Record<string, any>
  createdAt: Date
  retryCount: number
}

// Queue actions when offline
export function queueAction(action: OfflineAction): void

// Sync when back online
export async function syncPendingActions(): Promise<SyncResult>

// Get pending count (for UI warning)
export function getPendingCount(): number
```

**iOS Safari Warning (CLAUDE.md lines 1851-1921):**
- IndexedDB can be purged on iOS
- Mirror critical items to localStorage as backup
- Show BIG RED BANNER when items pending sync

### 3. Delivery Workflow Validation
**File:** `src/lib/driver/delivery-actions.ts`

```typescript
// Create new delivery (driver initiates)
export async function createDelivery(formData: FormData): Promise<{
  deliveryId: string | null
  error?: string
}>

// Complete delivery with signature + photo
export async function completeDelivery(
  deliveryId: string,
  receivedByName: string,
  signatureUrl?: string,
  photoUrl?: string
): Promise<{ success: boolean, error?: string }>
```

---

## Key Files to Reference
- `CLAUDE.md` lines 1743-1773 (QR Code Requirements)
- `CLAUDE.md` lines 1847-1928 (Offline Strategy)
- `src/lib/buyer/actions.ts` (example Server Actions pattern)
- `src/types/database.ts`

## Coordination
- Gemini: Building Driver Portal UI (pages, components)
- Codex: Edge Functions (QR generation, PDF reports)
- You: Server Actions, offline queue, workflow validation

## Testing Notes
- Use mock element UUIDs from test data
- Test offline by enabling airplane mode in browser DevTools
- Verify status transitions enforce the workflow
