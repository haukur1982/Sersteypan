# CODEX: Code Hardening & Quality Audit
**Priority:** HIGH | **Scope:** Full Codebase Review

## Mission
Audit the entire codebase for robustness. Ensure every function, database query, and API call is rock solid before we build more features.

---

## 1. TypeScript Strict Mode Compliance

### Tasks
```bash
# Run strict type check
npx tsc --noEmit --strict 2>&1 | head -100
```

- [ ] Fix all `any` types - replace with proper types
- [ ] Fix all `@ts-ignore` comments - resolve underlying issues
- [ ] Ensure all function parameters are typed
- [ ] Ensure all return types are explicit
- [ ] Check for null/undefined handling

### Key Files to Review
```
src/lib/**/*.ts          # All server actions and queries
src/app/api/**/*.ts      # API routes
src/components/**/*.tsx  # Client components with data handling
```

---

## 2. Database Query Validation

### Tasks
- [ ] Verify all Supabase queries have proper error handling
- [ ] Check RLS policies cover all tables
- [ ] Verify foreign key constraints are correct
- [ ] Check for N+1 query issues (multiple queries in loops)
- [ ] Verify indexes exist for frequently queried columns

### Pattern to Enforce
```typescript
// GOOD - Always handle errors
const { data, error } = await supabase.from('table').select('*')
if (error) {
  console.error('Query failed:', error)
  throw new Error('Failed to fetch data')
}

// BAD - Ignoring errors
const { data } = await supabase.from('table').select('*')
return data // Could be null!
```

### RLS Policy Audit
```sql
-- Run in Supabase SQL Editor
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

Check each table has:
- [ ] SELECT policy for appropriate roles
- [ ] INSERT/UPDATE/DELETE policies for appropriate roles
- [ ] No public access to sensitive data

---

## 3. Server Actions Security

### Files to Audit
```
src/lib/auth/actions.ts
src/lib/elements/actions.ts
src/lib/projects/actions.ts
src/lib/driver/delivery-actions.ts
src/lib/driver/complete-delivery-action.ts
src/lib/floor-plans/actions.ts (if exists)
```

### Checklist for Each Action
- [ ] Validates user is authenticated
- [ ] Validates user has correct role
- [ ] Validates input parameters (not just types, but business logic)
- [ ] Handles errors gracefully
- [ ] Returns meaningful error messages
- [ ] Doesn't expose sensitive data in errors

### Example Pattern
```typescript
'use server'
export async function secureAction(input: SomeInput) {
  // 1. Auth check
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  
  // 2. Role check
  if (user.role !== 'admin') throw new Error('Forbidden')
  
  // 3. Input validation
  if (!input.id || typeof input.id !== 'string') {
    throw new Error('Invalid input')
  }
  
  // 4. Database operation with error handling
  const { data, error } = await supabase...
  if (error) {
    console.error('DB error:', error)
    throw new Error('Operation failed')
  }
  
  return data
}
```

---

## 4. Error Handling & Edge Cases

### Global Patterns to Check
- [ ] All try/catch blocks log errors before re-throwing
- [ ] Client components show user-friendly error messages
- [ ] Loading states are shown during async operations
- [ ] Empty states are handled (no data scenarios)
- [ ] Network failures are handled gracefully

### Files with Critical Error Handling
```
src/app/(portals)/driver/deliver/[id]/DeliverPageClient.tsx
src/app/(portals)/driver/scan/ScanPageClient.tsx
src/app/(portals)/driver/load/LoadPageClient.tsx
src/app/api/generate-report/route.tsx
```

---

## 5. Environment Variables Validation

### Check all required env vars exist
```typescript
// Create: src/lib/env.ts
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required env var: ${envVar}`)
  }
}
```

---

## 6. Database Schema Integrity

### Run Schema Validation
```sql
-- Check for orphaned records
SELECT 'elements without project' as issue, count(*) 
FROM elements e 
LEFT JOIN projects p ON e.project_id = p.id 
WHERE p.id IS NULL;

SELECT 'deliveries without project' as issue, count(*) 
FROM deliveries d 
LEFT JOIN projects p ON d.project_id = p.id 
WHERE p.id IS NULL;

SELECT 'profiles without auth user' as issue, count(*) 
FROM profiles p 
LEFT JOIN auth.users u ON p.id = u.id 
WHERE u.id IS NULL;
```

### Verify Constraints
- [ ] All foreign keys have ON DELETE behavior defined
- [ ] All required fields are NOT NULL
- [ ] All UUIDs use proper generation

---

## 7. Code Duplication & Refactoring

### Look for Duplicated Logic
- [ ] Status color/label mappings (should be in one place)
- [ ] Date formatting functions
- [ ] Supabase client creation
- [ ] Auth checks in server components

### Suggested Refactors
```
src/lib/constants/statuses.ts  # All status colors/labels
src/lib/utils/date.ts          # Date formatting
src/lib/utils/auth.ts          # Auth helper functions
```

---

## 8. Build & Lint Verification

### Commands to Run
```bash
# Full build check
npm run build

# TypeScript strict check
npx tsc --noEmit

# If ESLint configured
npm run lint

# Check for unused exports
npx ts-prune
```

---

## Deliverables

After completing this audit, create:

1. **AUDIT-REPORT.md** in project root listing:
   - Issues found
   - Fixes applied
   - Remaining technical debt

2. **Commit all fixes** in logical chunks:
   - "Fix: TypeScript strict mode errors"
   - "Fix: Add missing error handling in server actions"
   - "Refactor: Centralize status constants"
   - "Fix: Add missing RLS policies"

---

## When Done
Report: "Code audit complete. Fixed X issues, created AUDIT-REPORT.md. Codebase is hardened and ready for continued development."
