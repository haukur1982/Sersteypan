# CLAUDE: Sprint 3 Task
**Date:** Jan 30, 2026 | **Time:** 30 min

## Your Mission
Create comprehensive End-to-End Testing Documentation for the application.

## Why
Before demo/production, we need a testing guide that documents:
- All user flows per portal
- How to verify each feature works
- Known edge cases

## Tasks

### 1. Create TESTING-GUIDE.md (30 min)
Location: Project root

Include:

```markdown
# Sérsteypan - Testing Guide

## Test Credentials
(Get from Supabase Dashboard > Authentication > Users)

## Admin Portal Tests
1. [ ] Login as admin
2. [ ] Create company
3. [ ] Create project
4. [ ] Create elements
5. [ ] Generate QR codes
6. [ ] Search functionality

## Factory Portal Tests
1. [ ] Login as factory_manager
2. [ ] View production queue
3. [ ] Update element status (planned → rebar → cast → curing → ready)
4. [ ] Add diary entry
5. [ ] Manage stock

## Buyer Portal Tests
1. [ ] Login as buyer
2. [ ] View projects (only own company)
3. [ ] View deliveries
4. [ ] Send/receive messages
5. [ ] Security: Cannot access other company's projects

## Driver Portal Tests
1. [ ] Login as driver
2. [ ] Create new delivery
3. [ ] Scan QR code (or manual entry)
4. [ ] Add elements to load
5. [ ] Start delivery (change to in_transit)
6. [ ] Complete delivery with signature

## Cross-Portal Tests
1. [ ] Element status changes reflect in all portals
2. [ ] Real-time updates work
3. [ ] Messages work between buyer and admin

## Mobile Responsiveness
- [ ] Driver portal works on mobile
- [ ] Signature canvas works on touch

## Offline Scenarios
- [ ] Offline banner appears when disconnected
- [ ] Actions queue when offline
- [ ] Sync when reconnected
```

## Success Criteria
- [ ] TESTING-GUIDE.md created with all test cases
- [ ] Includes test credentials section
- [ ] Covers all 4 portals
- [ ] Commit and push

## When Done
Report: "TESTING-GUIDE.md created with X test cases. Pushed to main."
