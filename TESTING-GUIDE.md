# Sérsteypan - End-to-End Testing Guide

**Version:** 1.0
**Last Updated:** 2026-01-30
**Status:** Pre-Production Testing

---

## Overview

This guide provides comprehensive testing instructions for all four portals of the Sérsteypan production management system. Follow these tests before any demo or production deployment.

---

## Test Credentials

> **⚠️ IMPORTANT:** Get actual test credentials from Supabase Dashboard:
> Dashboard → Authentication → Users

### Required Test Users

| Role | Email | Purpose |
|------|-------|---------|
| **Admin** | `admin@sersteypan.is` | Full system access |
| **Factory Manager** | `factory@sersteypan.is` | Production management |
| **Buyer** | `buyer@sersteypan.is` | Customer view (Company A) |
| **Buyer 2** | `buyer2@sersteypan.is` | Security testing (Company B) |
| **Driver** | `driver@sersteypan.is` | Delivery management |

### Test Data Setup

Before testing, ensure the database has:
- ✅ At least 2 companies
- ✅ At least 2 projects (different companies)
- ✅ At least 20 elements across different statuses
- ✅ At least 1 active delivery
- ✅ Test photos uploaded to storage buckets

---

## Admin Portal Tests

**URL:** `/admin`
**Login as:** `admin@sersteypan.is`

### 1. Authentication & Authorization

- [ ] **Login with valid credentials** → Dashboard appears
- [ ] **Login with invalid credentials** → Error message shown
- [ ] **Access admin route without login** → Redirected to `/login`
- [ ] **Session persists after page refresh** → Still logged in
- [ ] **Logout** → Redirected to login, session cleared

### 2. Dashboard

- [ ] **View dashboard stats** → Shows total projects, elements, active deliveries
- [ ] **Stats are accurate** → Manually verify counts match database
- [ ] **Recent activity feed** → Shows latest 10 events
- [ ] **Quick action buttons** → Navigate to correct pages

### 3. Company Management

**Navigate to:** `/admin/companies`

- [ ] **View companies list** → All companies displayed
- [ ] **Create new company**
  - Fill: Name, Kennitala, Contact info
  - Submit → Company appears in list
  - Verify: Company ID is UUID, created_at timestamp set
- [ ] **Edit company**
  - Change name, address, contact
  - Save → Changes reflected immediately
- [ ] **Search companies** → Filter by name works
- [ ] **Sort companies** → By name, created date

**Edge Cases:**
- [ ] Create company with missing required fields → Validation error
- [ ] Create company with duplicate kennitala → Error (if enforced)
- [ ] Create company with Icelandic characters (Þ, Ð, Æ) → Works correctly

### 4. Project Management

**Navigate to:** `/admin/projects`

- [ ] **View projects list** → All projects shown
- [ ] **Create new project**
  - Select company from dropdown
  - Fill: Name, address, dates
  - Submit → Project created
  - Verify: Project linked to correct company
- [ ] **View project detail page** → `/admin/projects/[id]`
  - Shows project info, company, element count
  - Shows elements list
- [ ] **Edit project** → Name, status, dates update
- [ ] **Project status workflow**
  - Change: planning → active → completed
  - Verify: Status badge updates in all views

**Edge Cases:**
- [ ] Create project with future start date → Accepted
- [ ] Create project with past end date → Warning shown
- [ ] Project with no elements → Empty state shown

### 5. Element Management

**Navigate to:** Project detail page → Elements tab

- [ ] **Create element**
  - Fill: Name (e.g., "F-13"), Type, Floor, Dimensions
  - Submit → Element created with status 'planned'
  - Verify: Element appears in list
- [ ] **Bulk create elements** (if implemented)
  - Upload CSV with 10 elements
  - Verify: All 10 created correctly
- [ ] **Generate QR codes**
  - Select elements
  - Click "Generate QR Codes"
  - Verify: QR codes generated, downloadable
  - Verify: QR contains element UUID (not name)
- [ ] **Update element status** (Admin can update any status)
  - Change: planned → rebar → cast → curing → ready
  - Verify: Timestamps update (rebar_completed_at, etc.)
  - Verify: Status badge color changes
- [ ] **Element detail view** → Shows full history, photos
- [ ] **Search elements** → By name, batch number, drawing reference

**Edge Cases:**
- [ ] Create element with name "F-13" in two different projects → Both allowed (UUID prevents collision)
- [ ] Update element to invalid status (e.g., ready → planned) → Only admin/factory can rollback
- [ ] Element with negative dimensions → Validation error
- [ ] Element with Icelandic name (e.g., "Stigi-Þ") → Works correctly

### 6. User Management

**Navigate to:** `/admin/users`

- [ ] **View all users** → Shows all roles
- [ ] **Create factory manager**
  - Fill: Name, Email, Phone
  - Role: factory_manager
  - Submit → User created, invite email sent (if configured)
- [ ] **Create buyer**
  - Fill: Name, Email, Phone
  - Role: buyer
  - **CRITICAL:** Assign company → Buyer can only see that company's projects
  - Submit → User created
- [ ] **Create driver**
  - Fill: Name, Email, Phone
  - Role: driver
  - Submit → User created
- [ ] **Deactivate user** → is_active = false, cannot log in
- [ ] **Reactivate user** → is_active = true, can log in again

**Security Tests:**
- [ ] User cannot change their own role (RLS policy enforced)
- [ ] User cannot change their own company_id

### 7. Document Upload

**Navigate to:** Project detail page → Documents tab

- [ ] **Upload PDF drawing** → File appears in list
- [ ] **Upload image (JPG, PNG)** → File accepted
- [ ] **Upload invalid file (EXE)** → Rejected with error
- [ ] **Upload oversized file (>50MB)** → Rejected with error
- [ ] **Download document** → File opens correctly
- [ ] **Delete document** → Removed from list and storage

### 8. Search & Reports

- [ ] **Global search** → Search for element by name across all projects
- [ ] **Search with Icelandic characters** → "Járnabundið" finds correctly
- [ ] **Generate project report** (if implemented)
  - Select project
  - Click "Generate Report"
  - PDF downloads with all elements, photos, timeline

---

## Factory Manager Portal Tests

**URL:** `/factory`
**Login as:** `factory@sersteypan.is`

### 1. Dashboard

- [ ] **View today's production queue** → Elements to process today
- [ ] **Stats cards** → In progress, completed today, pending
- [ ] **Cannot see admin functions** → No user management, company management

### 2. Production Queue

**Navigate to:** `/factory/production`

- [ ] **View production queue** → Elements sorted by priority, created date
- [ ] **Filter by status** → Show only 'planned', 'rebar', etc.
- [ ] **Filter by project** → Show only selected project's elements

### 3. Update Element Status

**Critical Workflow Test:**

- [ ] **Select element in 'planned' status**
  - Click "Mark as Rebar Complete"
  - Upload photo of rebar cage (required)
  - Add notes (optional)
  - Submit → Status changes to 'rebar'
  - Verify: rebar_completed_at timestamp set
  - Verify: Photo appears in element history
  - Verify: element_events log created

- [ ] **Continue workflow: rebar → cast**
  - Upload photo of casting process
  - Submit → Status = 'cast', cast_at timestamp set

- [ ] **Continue: cast → curing**
  - No photo required
  - Submit → Status = 'curing'

- [ ] **Continue: curing → ready**
  - Upload photo of finished element
  - Submit → Status = 'ready', ready_at timestamp set
  - Verify: Element now appears in driver's available list

**Edge Cases:**
- [ ] Try to skip status (planned → cast directly) → Blocked by database trigger
- [ ] Try to upload photo > 10MB → Rejected
- [ ] Try to mark element 'ready' without photo → Validation error (if required)

### 4. Bulk Status Update

- [ ] **Select 10 elements in 'curing' status**
- [ ] **Bulk update to 'ready'**
- [ ] **Verify:** All 10 updated
- [ ] **Verify:** Real-time update sends single refresh message (not 10 individual)

### 5. Diary Entries

**Navigate to:** `/factory/diary`

- [ ] **Create diary entry**
  - Select date (today)
  - Add title: "Daily Production Notes"
  - Add content: "Completed 15 elements, 2 with minor cracks"
  - Link to project (optional)
  - Submit → Entry saved
- [ ] **View diary entries** → Sorted by date (newest first)
- [ ] **Edit diary entry** → Update content
- [ ] **Search diary** → Find by keyword

### 6. Stock Management

**Navigate to:** `/factory/stock`

- [ ] **View stock items** → All materials listed
- [ ] **Update quantity** → Increase/decrease stock count
- [ ] **Low stock alert** → Items below min_quantity highlighted
- [ ] **Add new stock item** → Name, quantity, unit, supplier

### 7. Security Tests

- [ ] **Try to access admin routes** → Redirected or 403 error
- [ ] **Try to create users** → No access
- [ ] **Try to delete projects** → No access
- [ ] **Can update elements** → Allowed (factory manager role)

---

## Buyer Portal Tests

**URL:** `/buyer`
**Login as:** `buyer@sersteypan.is`

### 1. Dashboard

- [ ] **View own projects only** → Only projects for buyer's company shown
- [ ] **View project summary** → Element count, delivery status
- [ ] **Cannot see other company's projects** → Security critical

### 2. Project View

**Navigate to:** `/buyer/projects/[id]`

- [ ] **View project detail** → All elements listed
- [ ] **View element status** → Color-coded badges
- [ ] **View element history timeline**
  - Shows: planned → rebar (timestamp) → cast → ready
  - Shows: Photos at each stage
  - Shows: Who updated status

### 3. Element Search

- [ ] **Search for "F-13"** → Finds element
- [ ] **Click element** → Opens detail modal/page
- [ ] **View full history** → All status changes with timestamps
- [ ] **View photos** → Rebar photo, casting photo, ready photo, delivery photo

**User Story Verification:**
> "If customer can't find F-13, search shows: here it was rebar-bound, here it was cast, here it went on truck, here it was delivered - all in text and photos"

- [ ] Search results show full lifecycle ✓
- [ ] Photos visible at each stage ✓
- [ ] Delivery info included ✓

### 4. Delivery Tracking

**Navigate to:** `/buyer/deliveries`

- [ ] **View all deliveries for own projects** → List shown
- [ ] **View delivery detail** → `/buyer/deliveries/[id]`
  - Shows: Truck info, driver name
  - Shows: Elements on delivery
  - Shows: Departure time, arrival time
  - Shows: Delivery photo, signature
  - Shows: Receiver name

### 5. Priority Requests

**Navigate to:** Element detail page

- [ ] **Request priority change**
  - Click "Request Priority"
  - Set new priority: 10 (high)
  - Add reason: "Needed for crane access"
  - Submit → Request sent to factory manager
- [ ] **View pending requests** → Status: pending
- [ ] **Receive notification when approved** → Priority updated

### 6. Messages

**Navigate to:** `/buyer/messages`

- [ ] **View messages** → Threaded by project
- [ ] **Send message to admin**
  - Select project
  - Type message: "When will F-13 be ready?"
  - Submit → Message sent
- [ ] **Receive reply** → Admin's response appears
- [ ] **Unread indicator** → New messages highlighted

### 7. Security Tests (CRITICAL)

**Login as:** `buyer2@sersteypan.is` (Company B)

- [ ] **Try to access Company A's projects**
  - Navigate to `/buyer/projects/[company-a-project-id]`
  - Expected: 403 Forbidden or redirect
  - Verify: RLS policy blocks access
- [ ] **Try to view Company A's deliveries** → Blocked
- [ ] **Try to search elements from Company A** → Not in results
- [ ] **Try direct API call to Supabase**
  - Open DevTools → Network
  - Copy a request to `/rest/v1/projects?id=eq.[company-a-id]`
  - Replay request → RLS blocks, no data returned

**If any security test fails → STOP and fix immediately**

---

## Driver Portal Tests

**URL:** `/driver`
**Login as:** `driver@sersteypan.is`

### 1. Dashboard

- [ ] **View active deliveries** → Today's deliveries shown
- [ ] **Stats:** Today, In Transit, Completed
- [ ] **Quick actions:** Create Delivery, Scan QR

### 2. Create Delivery

**Navigate to:** `/driver/deliveries/new`

- [ ] **Select project** → Dropdown shows all projects
- [ ] **Enter truck registration** → "ABC123"
- [ ] **Enter truck description** → "Blue Mercedes Sprinter"
- [ ] **Select planned date** → Today
- [ ] **Submit** → Delivery created with status='planned'

### 3. Scan QR Code

**Navigate to:** `/driver/scan`

- [ ] **Camera permission requested** → Allow camera
- [ ] **Scan QR code** (use test QR or mock)
  - QR contains: `https://app.sersteypan.is/element/{uuid}` or plain UUID
  - Element info displayed: Name, Project, Status
  - **CRITICAL:** Only 'ready' elements can be loaded
- [ ] **Scan element in 'cast' status** → Error: "Element not ready for loading"
- [ ] **Scan element already on another delivery** → Error: "Already on delivery X"

**Manual Search Fallback:**
- [ ] **Click "Manual Search"**
- [ ] **Enter element name: "F-13"**
- [ ] **Select project first** → Dropdown forces project selection
- [ ] **Search** → Element found (within that project only)

### 4. Load Checklist

**Navigate to:** `/driver/load`

**Workflow Test:**

- [ ] **Scan first element (ready status)**
  - Element appears in load list
  - Shows: Name, project, weight
- [ ] **Scan second element (same project)**
  - Added to list
  - Total weight updates
- [ ] **Try to scan element from different project** → Error: "Cross-project loading not allowed"
- [ ] **Remove element from list**
  - Click remove button
  - Element removed
  - Delivery status still 'planned' (can modify before departure)
- [ ] **Enter truck registration: "XYZ789"**
- [ ] **Click "Start Delivery"**
  - Server action: createDelivery() called
  - For each element: addElementToDelivery() called
  - Verify: Delivery status changes to 'loading'
  - Verify: Element statuses change from 'ready' → 'loaded'
  - Verify: loaded_at timestamps set
  - Verify: loaded_by = driver's user ID
- [ ] **Navigate to delivery detail** → Shows all loaded elements

### 5. Start Delivery (Depart Factory)

**Navigate to:** `/driver/deliveries/[id]`

- [ ] **Delivery status = 'loading'** → Can mark as departed
- [ ] **Click "Mark as Departed"**
  - Server action: startDelivery() called
  - Verify: Status changes to 'in_transit'
  - Verify: departed_at timestamp set
  - Verify: Cannot add/remove elements after departure

**Edge Case:**
- [ ] **Try to depart with 0 elements** → Error: "Cannot depart with empty delivery"

### 6. Arrive at Site

**Navigate to:** `/driver/deliveries/[id]` (in transit)

- [ ] **Click "Mark as Arrived"**
  - Server action: arriveAtSite() called
  - Verify: Status changes to 'arrived'
  - Verify: arrived_at timestamp set

### 7. Delivery Confirmation

**Navigate to:** `/driver/deliver/[id]`

**Full Confirmation Workflow:**

- [ ] **View elements on delivery** → All items listed
- [ ] **For each element:**
  - [ ] Confirm delivered (if per-element confirmation implemented)
  - [ ] Upload photo of placed element (optional)
  - [ ] Add notes (optional)
- [ ] **Capture signature**
  - Click signature pad
  - Draw signature with mouse/touch
  - Verify: Canvas works on touch devices
  - Clear and redraw → Works
- [ ] **Upload delivery photo** (overall site photo)
  - Select image from device
  - Verify: Preview shown
  - Verify: File size check (max 10MB)
- [ ] **Enter receiver name** → "Jón Þórsson, Site Foreman"
- [ ] **Click "Complete Delivery"**
  - Server action: quickCompleteDelivery() called
  - Verify: Signature uploaded to 'signatures' bucket
  - Verify: Photo uploaded to 'delivery-photos' bucket (if exists)
  - Verify: Delivery status → 'completed'
  - Verify: completed_at timestamp set
  - Verify: All element statuses → 'delivered'
  - Verify: delivered_at timestamps set

**Edge Cases:**
- [ ] Submit without signature → Validation error
- [ ] Submit without receiver name → Validation error
- [ ] Upload photo > 10MB → Rejected
- [ ] Upload invalid file type → Rejected

### 8. Offline Scenarios (CRITICAL FOR MOBILE)

**Setup:**
- Use Chrome DevTools Device Mode (iPhone)
- Or test on real iOS device

**Test 1: Go Offline Before Departure**
- [ ] Load delivery page
- [ ] Open DevTools → Network tab
- [ ] Select "Offline" from throttling dropdown
- [ ] **Verify: Offline banner appears (yellow)**
  - Text: "Ónettengdur - Aðgerðir í biðröð"
  - Shows pending count
- [ ] Try to start delivery
- [ ] **Verify: Action queued in IndexedDB**
  - Open DevTools → Application → IndexedDB → sersteypan-offline
  - See queued action
- [ ] Go back online
- [ ] **Verify: Offline banner changes to "Syncing..." (blue)**
- [ ] **Verify: Action syncs automatically**
- [ ] **Verify: Banner shows "Allt samstillt! ✓" (green) briefly**
- [ ] **Verify: Delivery status updated to 'in_transit'**

**Test 2: Go Offline During Delivery**
- [ ] Mark delivery as arrived (while online)
- [ ] Go offline
- [ ] Complete delivery (signature + photo + submit)
- [ ] **Verify: Actions queued**
- [ ] **Verify: Big red warning banner**
  - Text: "⚠️ X ITEMS NOT SYNCED - DO NOT CLOSE APP"
  - "SYNC NOW" button visible
- [ ] Close tab → Reopen app
- [ ] **Verify: Queued actions still in IndexedDB (not lost)**
- [ ] Go online
- [ ] **Verify: Auto-sync triggers**
- [ ] **Verify: Delivery completes successfully**

**Test 3: Conflict Detection**
- [ ] Driver A: Load element F-13 (offline)
- [ ] Driver B: Load same element F-13 (online) → Succeeds
- [ ] Driver A: Go online
- [ ] **Verify: Sync detects conflict**
- [ ] **Verify: Red error banner**
  - "Árekstrar: 1 aðgerð"
  - Shows element already on another delivery
- [ ] **Verify: Action NOT applied (prevent duplicate loading)**

**iOS Safari Specific (Test on real iPhone):**
- [ ] Queue actions
- [ ] Background app for 1 minute
- [ ] Reopen app
- [ ] **Verify: IndexedDB data still present** (not purged)
- [ ] **Verify: localStorage backup exists** (fallback)

### 9. Mobile Responsiveness

**Test on real mobile device (or DevTools iPhone 12 Pro):**

- [ ] **Scan QR page:** Camera works, UI fits screen
- [ ] **Load checklist:** Touch targets > 44x44 pixels
- [ ] **Signature canvas:** Finger drawing works smoothly
- [ ] **Photo upload:** Camera API works (not just file picker)
- [ ] **All buttons accessible:** No horizontal scrolling
- [ ] **Text readable:** Minimum 16px font size
- [ ] **Navigation works:** Burger menu if responsive design

---

## Cross-Portal Integration Tests

These tests verify that data flows correctly between portals.

### Test 1: Element Status Propagation

**Scenario:** Factory manager updates element → Buyer sees change

1. **Factory Manager Portal:**
   - [ ] Update element "F-13" from 'cast' to 'curing'
2. **Buyer Portal (open in another browser/tab):**
   - [ ] **Verify: Element status updates in real-time** (or after refresh)
   - [ ] **Verify: Timeline shows new status with timestamp**
3. **Admin Portal:**
   - [ ] **Verify: Element status updated**
   - [ ] **Verify: element_events log has new entry**

### Test 2: Delivery Lifecycle (Multi-Portal View)

**Scenario:** Track delivery from creation to completion across all portals

1. **Driver Portal:**
   - [ ] Create delivery
   - [ ] Load 5 elements
   - [ ] Start delivery (depart)
2. **Buyer Portal (same project):**
   - [ ] **Verify: Delivery appears in "In Transit"**
   - [ ] **Verify: 5 elements show status 'loaded'**
   - [ ] Open delivery detail
   - [ ] **Verify: Shows departure time, truck info**
3. **Driver Portal:**
   - [ ] Mark as arrived
   - [ ] Complete delivery
4. **Buyer Portal:**
   - [ ] **Verify: Delivery status updates to 'completed'**
   - [ ] **Verify: Elements show status 'delivered'**
   - [ ] **Verify: Signature image appears**
   - [ ] **Verify: Delivery photo appears**
5. **Admin Portal:**
   - [ ] **Verify: Delivery in completed list**
   - [ ] **Verify: Audit log shows all status changes**

### Test 3: Priority Request Workflow

1. **Buyer Portal:**
   - [ ] Request priority change for element "V-22"
   - [ ] Priority: 10, Reason: "Critical path"
2. **Factory Manager Portal:**
   - [ ] **Verify: Notification of priority request**
   - [ ] Review request
   - [ ] Approve request
3. **Buyer Portal:**
   - [ ] **Verify: Notification of approval**
   - [ ] **Verify: Element priority updated**
4. **Factory Manager Portal:**
   - [ ] **Verify: Production queue re-sorted by priority**

### Test 4: Messages Between Portals

1. **Buyer Portal:**
   - [ ] Send message to admin: "Need status update on Project X"
2. **Admin Portal:**
   - [ ] **Verify: Unread message indicator**
   - [ ] Open message thread
   - [ ] Reply: "All elements on schedule"
3. **Buyer Portal:**
   - [ ] **Verify: Reply appears in thread**
   - [ ] **Verify: Unread indicator**

---

## Security & RLS Policy Tests

**These tests verify Row Level Security policies are working.**

### Test 1: Buyer Cannot Access Other Company's Data

1. **Login as:** `buyer@sersteypan.is` (Company A)
2. **Get Project ID from Company B** (via admin portal or database)
3. **Try to access:** `/buyer/projects/[company-b-project-id]`
   - [ ] **Expected:** 403 Forbidden or empty data
4. **Open DevTools → Console**
5. **Execute:**
   ```javascript
   const { data, error } = await supabase
     .from('projects')
     .select('*')
     .eq('id', '[company-b-project-id]')
   ```
   - [ ] **Expected:** `data = []` (RLS blocks)

### Test 2: Driver Cannot Modify User Roles

1. **Login as:** `driver@sersteypan.is`
2. **Open DevTools → Console**
3. **Try to change own role:**
   ```javascript
   const { data, error } = await supabase
     .from('profiles')
     .update({ role: 'admin' })
     .eq('id', '[driver-user-id]')
   ```
   - [ ] **Expected:** Error (RLS policy blocks role change)
4. **Verify in database:** Role still = 'driver'

### Test 3: Factory Manager Cannot Delete Projects

1. **Login as:** `factory@sersteypan.is`
2. **Try to delete project:**
   ```javascript
   const { data, error } = await supabase
     .from('projects')
     .delete()
     .eq('id', '[project-id]')
   ```
   - [ ] **Expected:** Error (RLS policy blocks delete)

### Test 4: User Cannot Change Own Company

1. **Login as:** `buyer@sersteypan.is`
2. **Try to change company_id:**
   ```javascript
   const { data, error } = await supabase
     .from('profiles')
     .update({ company_id: '[different-company-id]' })
     .eq('id', '[own-user-id]')
   ```
   - [ ] **Expected:** Error (RLS policy blocks company change)

---

## Performance Tests

### Test 1: Large Dataset Handling

**Setup:**
- Create project with 500 elements
- Set various statuses across elements

**Tests:**
- [ ] **Admin project page loads** → < 3 seconds
- [ ] **Factory production queue loads** → < 3 seconds
- [ ] **Buyer project view loads** → < 3 seconds
- [ ] **Search works with 500 elements** → Results within 1 second
- [ ] **Bulk update 50 elements** → Completes within 5 seconds

### Test 2: Concurrent Users

**Setup:**
- 5 browser tabs (3 factory managers, 2 drivers)

**Tests:**
- [ ] **All update different elements simultaneously** → No conflicts
- [ ] **Real-time updates work for all users** → Status changes visible
- [ ] **Database handles concurrent writes** → No deadlocks

### Test 3: File Upload Performance

- [ ] **Upload 10MB photo** → Completes within 10 seconds
- [ ] **Upload PDF (25MB)** → Completes within 15 seconds
- [ ] **Generate QR codes for 100 elements** → Completes within 30 seconds

---

## Accessibility Tests

### Keyboard Navigation

- [ ] **Tab through all forms** → Focus indicators visible
- [ ] **Submit form with Enter** → Works
- [ ] **Close modal with Escape** → Works
- [ ] **Navigate lists with arrow keys** → Works

### Screen Reader Tests (NVDA/JAWS/VoiceOver)

- [ ] **Element status badges** → Aria-label announces status
- [ ] **Form labels** → All inputs have associated labels
- [ ] **Error messages** → Announced via aria-live
- [ ] **Status changes** → Announced to screen reader

### Color Contrast

- [ ] **Text on backgrounds** → Minimum 4.5:1 contrast ratio
- [ ] **Status badges** → Color + icon + text (not color alone)
- [ ] **Floor plan markers** → Pattern overlays for colorblind users

### Mobile Accessibility

- [ ] **Touch targets** → Minimum 44x44 pixels
- [ ] **Text resizable to 200%** → Layout doesn't break
- [ ] **No horizontal scrolling** → At 320px viewport

---

## Edge Cases & Error Handling

### Database Errors

- [ ] **Network interruption during form submit**
  - Simulate: DevTools → Network → Offline during submit
  - Expected: Error message shown, data not lost (stored locally if offline)
- [ ] **Duplicate key constraint** (e.g., two elements with same UUID)
  - Expected: Database error caught, user-friendly message shown

### Validation Errors

- [ ] **Submit form with missing required fields** → Inline errors shown
- [ ] **Enter invalid email format** → Validation error
- [ ] **Enter negative number for weight** → Validation error
- [ ] **Upload file that's too large** → Size error before upload starts

### Workflow Violations

- [ ] **Try to load element with status 'cast'** → Error: "Element not ready"
- [ ] **Try to complete delivery without signature** → Validation error
- [ ] **Try to delete element that's on a delivery** → Foreign key error (handled gracefully)

### Real-Time Edge Cases

- [ ] **Two users update same element simultaneously**
  - Expected: Last write wins, but both see final state
  - Verify: audit_log shows both changes
- [ ] **User loses connection mid-update**
  - Expected: Request queued, syncs when reconnected

---

## Browser Compatibility

Test on:

- [ ] **Chrome** (Desktop & Android)
- [ ] **Safari** (Desktop & iOS) ← **CRITICAL for driver portal**
- [ ] **Firefox** (Desktop)
- [ ] **Edge** (Desktop)

**Minimum versions:** Last 2 major versions

**Critical features to verify on iOS Safari:**
- [ ] Camera API for QR scanning
- [ ] Canvas signature capture (touch events)
- [ ] IndexedDB persistence (does NOT purge aggressively)
- [ ] Offline queue survives app backgrounding

---

## Pre-Demo Checklist

Before showing the system to stakeholders:

- [ ] All critical tests above pass
- [ ] No console errors in browser DevTools
- [ ] All images load correctly (check storage bucket permissions)
- [ ] Test credentials work (reset passwords if needed)
- [ ] Sample data is realistic (Icelandic names, actual projects)
- [ ] No "lorem ipsum" or placeholder text visible
- [ ] Mobile view tested on real device (not just emulator)
- [ ] Offline scenario demonstrated successfully

---

## Pre-Production Checklist

Before deploying to production:

- [ ] All tests in this guide pass (100%)
- [ ] Security tests pass (RLS policies enforced)
- [ ] Performance tests pass (page loads < 3s)
- [ ] Mobile tests pass on iOS Safari (critical)
- [ ] Offline queue tested and verified working
- [ ] Error monitoring configured (Sentry or similar)
- [ ] Backup strategy confirmed with Supabase
- [ ] GDPR compliance verified (data retention, user rights)
- [ ] User training completed for all roles
- [ ] Old PHP system kept accessible (read-only fallback)

---

## Known Issues & Limitations

**Document known issues here as testing progresses:**

1. **Storage Bucket Missing** (as of 2026-01-30)
   - Issue: `delivery-photos` bucket doesn't exist
   - Workaround: Create manually in Supabase Dashboard
   - Status: Documented in SPRINT-REPORT.md

2. **Real-Time Updates May Delay**
   - Issue: Supabase real-time can have 1-2 second lag
   - Workaround: Manual refresh if needed
   - Status: Acceptable for MVP

3. **iOS Safari IndexedDB Purging**
   - Issue: iOS can purge IndexedDB after 7 days of inactivity
   - Mitigation: localStorage backup implemented
   - Status: Needs real-world testing

---

## Test Results Log

| Date | Tester | Portal | Tests Run | Pass | Fail | Notes |
|------|--------|--------|-----------|------|------|-------|
| 2026-01-30 | - | - | - | - | - | Template created |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |

---

## Reporting Issues

When a test fails:

1. **Severity:**
   - 🔴 **Critical:** Blocks core workflow (login fails, cannot create delivery)
   - 🟡 **Medium:** Feature broken but workaround exists
   - 🟢 **Low:** UI glitch, minor inconsistency

2. **Report Format:**
   ```
   **Test:** [Name of test that failed]
   **Severity:** Critical / Medium / Low
   **Steps to Reproduce:**
   1. Login as driver
   2. Navigate to /driver/scan
   3. Click "Scan QR Code"
   **Expected:** Camera opens
   **Actual:** Permission denied error
   **Browser:** iOS Safari 16.2
   **Screenshots:** [Attach if applicable]
   ```

3. **Where to Report:**
   - Create GitHub Issue (if repository has issues enabled)
   - Or document in TESTING-ISSUES.md
   - Tag with priority label

---

## Conclusion

This testing guide covers:
- ✅ **4 portal workflows** (Admin, Factory, Buyer, Driver)
- ✅ **Security & RLS policies** (critical for multi-tenancy)
- ✅ **Cross-portal integration** (real-time updates)
- ✅ **Mobile & offline scenarios** (driver portal critical features)
- ✅ **Edge cases & error handling**
- ✅ **Accessibility compliance**
- ✅ **Performance benchmarks**

**Total Test Cases:** 200+

**Estimated Testing Time:**
- First full run: 6-8 hours
- Subsequent runs: 3-4 hours (using checklist)

**Testing Cadence:**
- After any major feature change
- Before every demo
- Before production deployment

---

**Document Version:** 1.0
**Created By:** Claude (Sprint 3)
**Last Updated:** 2026-01-30
**Next Review:** Before production deployment
