# CLAUDE: Sprint 5 Task
**Date:** Jan 30, 2026 | **Time:** 30 min

## Your Mission
Create an In-App Notification Center for real-time status alerts.

## Why
Users need to know when:
- Elements change status (great for buyers tracking their projects)
- Deliveries are scheduled/completed
- Messages are received

## Tasks

### 1. Create Notifications Bell Component (20 min)
Location: `src/components/notifications/NotificationBell.tsx`

Features:
- Bell icon in header (lucide-react `Bell`)
- Red badge with unread count
- Dropdown showing recent notifications
- Click to mark as read
- "Mark all as read" button

### 2. Create Notifications Database Query (10 min)
Location: `src/lib/notifications/queries.ts`

```typescript
// Notifications are stored in a table we'll create
// For now, generate from element_events and messages

export async function getUnreadNotifications(userId: string) {
  // Query element_events + messages for this user's company
  // Return as notification objects
}
```

### 3. Add to Dashboard Layouts
Add NotificationBell to the DashboardLayout header, next to logout.

## Key Files
```
src/components/layout/DashboardLayout.tsx  # Add bell here
src/components/notifications/NotificationBell.tsx  # New
src/lib/notifications/queries.ts  # New
```

## Success Criteria
- [ ] Bell icon visible in header
- [ ] Shows unread count badge
- [ ] Dropdown lists recent element status changes
- [ ] Commit and push

## When Done
Report: "Notification bell added to header with status change alerts. Pushed to main."
