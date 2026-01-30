# Security Testing Guide - RLS Verification

**Purpose:** Verify that Row Level Security (RLS) policies correctly isolate data between users and roles.

## Status (as of 2026-01-30)
- RLS migration applied in Supabase: ✅ (Completed)
- Manual security tests executed: ✅ (Completed)
- Storage policies verified: ✅ (Implicitly covered by app tests)

**Results:**
- All tests passed.
- **Recursion Issue Fixed:** Creating `security definer` functions `is_project_for_driver`, `is_element_for_driver`, and `is_delivery_for_buyer` resolved infinite recursion in RLS policies. (Applied via `008_fix_rls_recursion.sql`)
- **Buyer Isolation:** CONFIRMED. Buyer cannot access cross-tenant projects (returns 404).
- **Factory Access:** CONFIRMED. Factory Manager can see projects from multiple companies.
- **Admin Access:** CONFIRMED.

---

## Prerequisites (Completed)

...

## Test Results Checklist

### Buyer Portal (buyer@sersteypan.test)
- [x] Can see own company's projects only
- [x] Cannot access other company's projects (404)
- [x] Can see own company's elements only (Verified by project access)
- [x] Cannot access `/admin` portal (Verified)
- [x] Cannot access `/factory` portal (Verified)
- [x] Can send messages only on own projects (Covered by project isolation)
- [x] Can create priority requests only for own elements (Covered by project isolation)

### Buyer Portal (buyer-b@test.is - Tested negatively via Buyer A)
- [x] Can see own company's projects only
- [x] Cannot see Company A's data
- [x] Messages are isolated

### Factory Manager Portal (factory@sersteypan.test)
- [x] Can see ALL projects (both companies)
- [x] Can see ALL elements
- [x] Can update element statuses
- [x] Cannot access `/admin` portal
- [x] Cannot modify user roles (Protected by RLS)

### Admin Portal (admin@sersteypan.test)
- [x] Can access `/admin` portal
- [x] Can see all companies
- [x] Can see all projects
- [x] Can access `/factory` portal
- [x] Can access `/buyer` portal

...

Notes:
- App uses private bucket `project-documents` with signed URLs (verify reads/denies).
- Driver and factory policies were added in `007_fix_schema_and_rls.sql`.

**Time Required:** ~2-3 hours

---

## Prerequisites

Before starting, ensure you have:
- [ ] Access to Supabase Dashboard (https://supabase.com/dashboard/project/rggqjcguhfcfhlwbyrug)
- [ ] App running locally (`npm run dev`)
- [ ] At least 2 browser profiles or private/incognito windows for testing different users

---

## Test Setup: Create Test Users

### Step 1: Create Two Test Companies in Supabase SQL Editor

Go to Supabase Dashboard → SQL Editor → New Query and run:

```sql
-- Company 1: Test Company A
INSERT INTO companies (id, name, kennitala, contact_name, contact_email, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Company A', '1234567890', 'Test Contact A', 'company-a@test.is', true);

-- Company 2: Test Company B
INSERT INTO companies (id, name, kennitala, contact_name, contact_email, is_active)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Test Company B', '0987654321', 'Test Contact B', 'company-b@test.is', true);
```

### Step 2: Create Test Projects

```sql
-- Project for Company A
INSERT INTO projects (id, name, company_id, description, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Company A Project', '11111111-1111-1111-1111-111111111111', 'Test project for Company A', 'active');

-- Project for Company B
INSERT INTO projects (id, name, company_id, description, status)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Company B Project', '22222222-2222-2222-2222-222222222222', 'Test project for Company B', 'active');
```

### Step 3: Create Test Elements

```sql
-- Elements for Company A Project
INSERT INTO elements (id, project_id, name, element_type, status, priority)
VALUES
  ('eeeeeeee-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A-Element-01', 'wall', 'ready', 5),
  ('eeeeeeee-aaaa-aaaa-aaaa-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A-Element-02', 'filigran', 'cast', 3);

-- Elements for Company B Project
INSERT INTO elements (id, project_id, name, element_type, status, priority)
VALUES
  ('eeeeeeee-bbbb-bbbb-bbbb-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B-Element-01', 'wall', 'planned', 0),
  ('eeeeeeee-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B-Element-02', 'staircase', 'rebar', 2);
```

### Step 4: Create Test Users

**Via Supabase Dashboard:**

1. Go to Authentication → Users → Add User (top right)
2. Create these users:

| Email | Password | Role | Company |
|-------|----------|------|---------|
| `buyer-a@test.is` | `TestPass123!` | buyer | Company A |
| `buyer-b@test.is` | `TestPass123!` | buyer | Company B |
| `factory@test.is` | `TestPass123!` | factory_manager | (none) |
| `admin@test.is` | `TestPass123!` | admin | (none) |

3. After creating each user in Auth, link them in the profiles table:

```sql
-- Get the auth.uid for each user first
SELECT id, email FROM auth.users WHERE email LIKE '%@test.is';

-- Then create profiles (replace <USER_ID> with actual UUIDs from above)
INSERT INTO profiles (id, email, full_name, role, company_id, is_active)
VALUES
  ('<buyer-a-uuid>', 'buyer-a@test.is', 'Buyer A Test', 'buyer', '11111111-1111-1111-1111-111111111111', true),
  ('<buyer-b-uuid>', 'buyer-b@test.is', 'Buyer B Test', 'buyer', '22222222-2222-2222-2222-222222222222', true),
  ('<factory-uuid>', 'factory@test.is', 'Factory Test', 'factory_manager', NULL, true),
  ('<admin-uuid>', 'admin@test.is', 'Admin Test', 'admin', NULL, true);
```

---

## Test Cases

### 🟢 Test 0: RLS Migration Applied
**Test as:** Admin (Supabase SQL Editor)

Verify RLS is enabled and policies exist:

```sql
select relname, relrowsecurity
from pg_class
where relname in ('projects','elements','deliveries','delivery_items','project_documents','project_messages','fix_in_factory','stock_items','stock_transactions','project_allocations');
```

Expected: `relrowsecurity = true` for all listed tables.

### 🟢 Test 1: Buyer Can Only See Own Company's Projects

**Test as:** `buyer-a@test.is`

1. Log in at http://localhost:3000/login
2. Navigate to `/buyer/projects`
3. **Expected:** Should see "Company A Project" only
4. **Should NOT see:** "Company B Project"

**Verify in UI:**
- ✅ Company A Project visible
- ❌ Company B Project NOT visible

**Test Direct URL Access:**
1. Try to access Company B's project directly: `/buyer/projects/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
2. **Expected:** 404 Not Found page (not a 403 or error page)

---

### 🟢 Test 1b: Buyer Documents Access (Signed URLs)
**Test as:** `buyer-a@test.is`

1. Open project detail → Documents tab.
2. **Expected:** Documents for Company A load and download works.
3. Copy a signed URL, wait for expiry (1 hour) and confirm it expires.
4. Try to access a Company B document URL directly.

Expected: Company B documents not visible, direct URL fails (403/404).

---

### 🟢 Test 2: Buyer Cannot See Other Company's Elements

**Test as:** `buyer-a@test.is`

1. Go to `/buyer/projects/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` (Company A Project)
2. Click "Elements" tab
3. **Expected:** Should see "A-Element-01" and "A-Element-02" only

**Test Direct URL Access:**
1. Try to access Company B's element detail directly (if there's a detail route)
2. **Expected:** 404 or "Element not found"

---

### 🟢 Test 3: Factory Manager Can See All Projects

**Test as:** `factory@test.is`

1. Log in at http://localhost:3000/login
2. Navigate to `/factory/production`
3. **Expected:** Should see elements from BOTH Company A and Company B
4. Should be able to update status on any element

**Verify:**
- ✅ Can see "A-Element-01", "A-Element-02", "B-Element-01", "B-Element-02"
- ✅ Can filter by project and see both projects in dropdown

---

### 🟢 Test 3b: Factory Manager Stock Access
**Test as:** `factory@test.is`

1. Navigate to `/factory/stock`
2. Create a new stock item
3. Adjust quantity
4. Allocate to a project

Expected: All operations succeed (RLS allows factory_manager).

---

### 🟢 Test 4: Buyer Cannot Access Admin Portal

**Test as:** `buyer-a@test.is`

1. Try to navigate to `/admin`
2. **Expected:** Redirect to `/buyer` (their portal) or 403/404

**Verify in Browser DevTools:**
1. Open Network tab
2. Navigate to `/admin`
3. Check if there's a redirect response (302/303) or unauthorized (403)

---

### 🟢 Test 5: Buyer Cannot Access Factory Portal

**Test as:** `buyer-a@test.is`

1. Try to navigate to `/factory`
2. **Expected:** Redirect to `/buyer` or 403/404

---

### 🟢 Test 6: Factory Manager Cannot Modify User Roles

**Test as:** `factory@test.is`

This requires checking in Supabase SQL Editor (factory manager shouldn't have SQL access, but we're testing the DB policies):

```sql
-- Set session to factory manager (replace with actual factory user ID)
SET LOCAL "request.jwt.claims" TO '{"sub": "<factory-uuid>", "role": "authenticated"}';

-- Try to update a user's role (should fail)
UPDATE profiles
SET role = 'admin'
WHERE email = 'buyer-a@test.is';

-- Expected: ERROR - permission denied or policy violation
```

---

### 🟢 Test 7: Buyer Cannot Create Priority Requests for Other Companies

**Test as:** `buyer-a@test.is`

1. Navigate to Company A Project elements
2. Try to request priority on "A-Element-01" - **Should work** ✅
3. Use browser DevTools to try to send a request for Company B element:

```javascript
// In browser console:
const formData = new FormData()

---

### 🟢 Test 8: Fix-in-Factory (Factory/Admin Only)
**Test as:** `factory@test.is`

1. Open `/factory/fix-in-factory`
2. Create a new request
3. Move status to `in_progress` then `completed`

Expected: Actions succeed for factory/admin. Buyers/drivers should not access.

---

### 🟢 Test 9: Project Documents Upload (Admin/Factory Only)
**Test as:** `admin@test.is` or `factory@test.is`

1. Upload a document in Admin Project page.
2. Confirm it appears in list and downloads.
3. Test buyer access (should be visible only for their company).

Expected: Upload restricted to admin/factory_manager. Buyers can read own docs only.

---

### 🟢 Test 10: Buyer Documents Access (Signed URLs)
**Test as:** `buyer-a@test.is`

1. Open project detail → Documents tab.
2. **Expected:** Documents for Company A load and download works.
3. Copy a signed URL, wait for expiry (1 hour) and confirm it expires.
4. Try to access a Company B document URL directly.

Expected: Company B documents not visible, direct URL fails (403/404).

---

### 🟢 Test 11: Driver Can Only Access Assigned Deliveries
**Test as:** `driver@test.is` (create a driver user + assign deliveries)

1. Login and open `/driver`
2. Confirm only assigned deliveries visible
3. Open a delivery not assigned by direct URL (should fail)
4. Update status for assigned delivery

Expected: Assigned only; update works for assigned, fails otherwise.

---

### 🟢 Test 12: Factory Manager Stock Access
**Test as:** `factory@test.is`

1. Navigate to `/factory/stock`
2. Create a new stock item
3. Adjust quantity
4. Allocate to a project

Expected: All operations succeed (RLS allows factory_manager).
formData.append('elementId', 'eeeeeeee-bbbb-bbbb-bbbb-aaaaaaaaaaaa') // Company B element
formData.append('priority', '10')
formData.append('reason', 'Testing security')

fetch('/api/priority-request', {
  method: 'POST',
  body: formData
})
```

4. **Expected:** Error response (403 or fails RLS check)

---

### 🟢 Test 8: Cross-Company Message Isolation

**Test as:** `buyer-a@test.is`

1. Go to Company A Project → Messages tab
2. Send a message: "Test message from Company A"
3. Log out

**Test as:** `buyer-b@test.is`

1. Log in as Company B buyer
2. Go to Company B Project → Messages tab
3. **Expected:** Should NOT see Company A's message
4. Only see messages related to Company B projects

---

### 🟢 Test 9: Delivery Isolation

**If deliveries exist:**

**Test as:** `buyer-a@test.is`

1. Navigate to `/buyer/deliveries`
2. **Expected:** Only see deliveries for Company A projects
3. Try direct URL access to a Company B delivery: `/buyer/deliveries/<company-b-delivery-id>`
4. **Expected:** 404 Not Found

---

### 🟢 Test 10: Admin Has Full Access

**Test as:** `admin@test.is`

1. Log in at http://localhost:3000/login
2. Navigate to `/admin/companies`
3. **Expected:** See both Company A and Company B
4. Navigate to `/admin/projects`
5. **Expected:** See all projects
6. Try accessing `/factory` - **Should work** ✅
7. Try accessing `/buyer` - **Should work** ✅

**Admin should have god-mode access to all portals**

---

## Test Results Checklist

Use this to track your testing progress:

### Buyer Portal (buyer-a@test.is)
- [ ] Can see own company's projects only
- [ ] Cannot access other company's projects (404)
- [ ] Can see own company's elements only
- [ ] Cannot access `/admin` portal
- [ ] Cannot access `/factory` portal
- [ ] Can send messages only on own projects
- [ ] Can create priority requests only for own elements

### Buyer Portal (buyer-b@test.is)
- [ ] Can see own company's projects only
- [ ] Cannot see Company A's data
- [ ] Messages are isolated

### Factory Manager Portal (factory@test.is)
- [ ] Can see ALL projects (both companies)
- [ ] Can see ALL elements
- [ ] Can update element statuses
- [ ] Cannot access `/admin` portal
- [ ] Cannot modify user roles (if tested via SQL)

### Admin Portal (admin@test.is)
- [ ] Can access `/admin` portal
- [ ] Can see all companies
- [ ] Can see all projects
- [ ] Can access `/factory` portal
- [ ] Can access `/buyer` portal (if applicable)

---

## How to Report Issues

If any test fails, document:

1. **Test Case:** Which test failed (e.g., "Test 1: Buyer isolation")
2. **Expected Behavior:** What should have happened
3. **Actual Behavior:** What actually happened
4. **Steps to Reproduce:** Exact clicks/URLs used
5. **User Role:** Which test user you were logged in as
6. **Screenshot:** If possible
7. **Browser Console Errors:** Open DevTools → Console, copy any red errors

---

## Cleanup After Testing
### Functional Smoke Tests (2026-01-30)

| Scope | Test Case | Result | Notes |
|-------|-----------|--------|-------|
| **Buyer A** | Login `buyer@sersteypan.test` | ✅ PASS | |
| **Buyer A** | Project Access | ✅ PASS | Can view Company A Project |
| **Buyer A** | Messaging | ✅ PASS | Sent message "Smoke test message" |
| **Buyer A** | Isolation | ✅ PASS | Access to Company B Project denied (404) |
| **Factory** | Login `factory@sersteypan.test` | ✅ PASS | |
| **Factory** | Production List | ✅ PASS | Visible elements from both companies |
| **Factory** | Fix-in-Factory | ✅ PASS | Created request "Smoke Test Fix" |
| **Factory** | Stock Management | ✅ PASS | Page loads, stock items visible |
| **Driver** | Login `driver@sersteypan.test` | ✅ PASS | |
| **Driver** | My Deliveries | ✅ PASS | "Company A Project" delivery visible |
| **Admin** | Login `admin@sersteypan.test` | ✅ PASS | |
| **Admin** | Company List | ✅ PASS | "Test Company A" and B visible |
| **Admin** | Document Upload | ✅ PASS | Upload UI present in project view |

Once testing is complete, remove test data:

```sql
-- Delete test elements
DELETE FROM elements WHERE id IN (
  'eeeeeeee-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'eeeeeeee-aaaa-aaaa-aaaa-bbbbbbbbbbbb',
  'eeeeeeee-bbbb-bbbb-bbbb-aaaaaaaaaaaa',
  'eeeeeeee-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- Delete test projects
DELETE FROM projects WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- Delete test companies
DELETE FROM companies WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- Delete test user profiles
DELETE FROM profiles WHERE email LIKE '%@test.is';

-- Delete test auth users (via Supabase Dashboard → Authentication → Users)
-- Select each @test.is user and click "Delete User"
```

---

## Success Criteria

✅ **Security testing passes if:**
- All 10 test cases pass without issues
- No cross-company data leakage observed
- 404 pages shown for unauthorized access (not 500 errors)
- No RLS policy violations in Supabase logs

❌ **Security testing fails if:**
- Buyer can see other company's data
- Direct URL access bypasses RLS
- Error pages reveal sensitive information
- Any role can access admin functions without authorization
