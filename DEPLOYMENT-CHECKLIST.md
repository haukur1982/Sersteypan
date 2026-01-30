# 🚀 Production Deployment Checklist

**Target:** Vercel + Supabase Production
**Date:** Jan 30, 2026

## 1. Database Synchronization (Supabase)

### Migration Status
- [ ] verify all local migrations are applied to production
- [ ] Run `supabase migration list` to confirm sync

### Storage Buckets (Verification)
Ensure the following buckets exist and have "Public" access if required:
- `floor-plans` (Authenticated Read)
- `delivery-photos` (Authenticated Read)
- `signatures` (Authenticated Read)
- `qr-codes` (Public Read)

**Command to verify:**
```sql
select id, name, public from storage.buckets;
```

## 2. Environment Variables (Vercel)

Ensure these are set in Vercel Project Settings:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API Key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** Service Role Key (for Admin actions) |
| `SUPABASE_REPORTS_BUCKET` | `reports` (Default) |

## 3. Build Verification

- [x] `npm run build` passes locally
- [x] TypeScript strict mode check passed
- [x] Linting passed

## 4. Post-Deployment Verification

### Smoke Test Plan
1.  **Login:** Log in as Admin.
2.  **Factory Dashboard:** Check stock levels load.
3.  **Floor Plans:** Upload a floor plan image and verify it appears.
4.  **Driver App:** Simulate a "Scan" flow (navigating to `/driver/load`).
5.  **Notifications:** Check the notification bell.

---

## 🛑 Critical Actions Before Go-Live

1.  **Push Migrations:**
    If migrations are missing, run:
    ```bash
    supabase db push
    ```

2.  **Deploy Edge Functions (if changed):**
    ```bash
    supabase functions deploy generate-report --no-verify-jwt
    ```
