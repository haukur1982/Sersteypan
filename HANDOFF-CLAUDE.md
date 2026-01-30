# CLAUDE: 90-Minute Sprint Task
**Date:** Jan 30, 2026 | **Time:** 90 minutes

## Your Mission
Test and fix the Driver Portal delivery workflow end-to-end.

## Context
- Driver Portal UI was built last night but never tested
- Pages exist: `/driver/scan`, `/driver/load`, `/driver/deliveries`, `/driver/deliver/[id]`
- Backend actions exist in `src/lib/driver/qr-actions.ts` and `delivery-actions.ts`

## Tasks (in order)

### 1. Test QR Scanner (15 min)
```
Location: src/app/(portals)/driver/scan/
```
- Open `/driver/scan` as a driver user
- Check if camera permission request works
- Test fallback to manual UUID entry
- Fix any console errors

### 2. Test Load Checklist (20 min)
```
Location: src/app/(portals)/driver/load/
```
- Navigate to `/driver/load`
- Try adding elements (you'll need test element UUIDs from database)
- Test truck registration input
- Test "Hefja afhendingu" (Create delivery) button
- Fix any errors in delivery creation

### 3. Test Delivery Confirmation (20 min)
```
Location: src/app/(portals)/driver/deliver/[id]/
```
- Navigate to a delivery detail page
- Test signature canvas (drawing)
- Test photo capture/upload
- Test "Staðfesta afhendingu" button
- Fix any upload or confirmation errors

### 4. Fix Any Bugs Found (25 min)
Document and fix issues. Common problems to look for:
- Missing RLS permissions for driver role
- Null/undefined handling in TypeScript
- Missing database columns referenced in code

## Key Files
```
src/lib/driver/qr-actions.ts      # QR scanning + element lookup
src/lib/driver/delivery-actions.ts # Delivery lifecycle
src/components/driver/QRScanner.tsx # Camera component
```

## Test User
Login as driver role user (check Supabase auth.users for credentials)

## Success Criteria
- [ ] Can scan/enter element UUID
- [ ] Can add elements to load checklist
- [ ] Can create delivery from load page
- [ ] Can capture signature
- [ ] Can upload photo
- [ ] Can complete delivery

## When Done
- Commit and push all fixes
- Report back: "X issues found, Y fixed, Z remaining"
