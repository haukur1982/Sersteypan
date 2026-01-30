# CLAUDE: Sprint 4 Task  
**Date:** Jan 30, 2026 | **Time:** 30 min

## Your Mission
Add Factory Dashboard stats enhancement (similar to Admin dashboard).

## Why
Factory managers need at-a-glance stats for their daily operations:
- Elements in each production stage
- Today's production goals
- Stock alerts

## Tasks

### 1. Enhance Factory Dashboard (30 min)
Location: `src/app/(portals)/factory/page.tsx`

Add:
```tsx
// Stats Cards at top:
// - Elements in Production (rebar + cast + curing)
// - Ready to Ship (ready status)
// - Shipped Today (delivered today)
// - Stock Alerts (low stock items from stock table)

// Production Queue with progress bars showing:
// - Planned -> Rebar -> Cast -> Curing -> Ready

// Today's Diary Entries preview (last 3)
```

Use same card styling as admin dashboard for consistency.

## Key Files
```
src/app/(portals)/admin/page.tsx    # Reference for stats pattern
src/app/(portals)/factory/page.tsx  # Where to add
src/lib/factory/queries.ts          # May need to add queries
```

## Success Criteria
- [ ] Factory dashboard has stats cards
- [ ] Shows production pipeline counts
- [ ] Stock alerts if low inventory
- [ ] Commit and push

## When Done
Report: "Factory dashboard enhanced with stats cards and production overview. Pushed to main."
