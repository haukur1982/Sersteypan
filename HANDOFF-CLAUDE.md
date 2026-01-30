# CLAUDE: Sprint 2 Task
**Date:** Jan 30, 2026 | **Time:** 30 min

## Your Mission
Build the Offline Sync Banner for the Driver Portal.

## Why
Drivers work in areas with spotty connectivity. When offline, they need to:
1. See that they're offline
2. Know actions are queued
3. See when sync completes

## Tasks

### 1. Create OfflineBanner Component (15 min)
Location: `src/components/driver/OfflineBanner.tsx`

```tsx
'use client'
import { useOfflineQueue } from '@/lib/hooks/useOfflineQueue'
// Show: offline status, pending count, last sync time
// Colors: yellow=offline, green=synced, red=errors
```

Features needed:
- Uses `useOfflineQueue()` hook (already exists)
- Shows "Offline - X actions pending" when disconnected  
- Shows "Syncing..." animation when reconnecting
- Shows "All synced ✓" briefly after sync completes
- Appears at TOP of driver layout (fixed position)

### 2. Add to Driver Layout (10 min)
Location: `src/app/(portals)/driver/layout.tsx`

Add the OfflineBanner at the top of the layout, above the main content.

### 3. Test States (5 min)
- Manually set `navigator.onLine = false` in devtools
- Verify banner appears
- Reconnect and verify it syncs

## Key Files
```
src/lib/hooks/useOfflineQueue.ts    # Hook to use
src/lib/offline/queue.ts            # Queue implementation
src/app/(portals)/driver/layout.tsx # Where to add banner
```

## Success Criteria
- [ ] OfflineBanner component created
- [ ] Shows offline/online status
- [ ] Shows pending action count
- [ ] Added to driver layout
- [ ] Commit and push

## When Done
Report: "OfflineBanner built and integrated. Pushed to main."
