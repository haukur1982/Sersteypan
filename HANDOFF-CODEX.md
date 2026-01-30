# CODEX: 90-Minute Sprint Task
**Date:** Jan 30, 2026 | **Time:** 90 minutes

## Your Mission
Deploy Edge Functions and create storage infrastructure.

## Tasks (in order)

### 1. Create Storage Buckets Migration (20 min)
Create `supabase/migrations/009_storage_buckets.sql`:

```sql
-- Create storage buckets for QR codes and reports
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('qr-codes', 'qr-codes', true),
  ('reports', 'reports', false),
  ('signatures', 'signatures', false),
  ('delivery-photos', 'delivery-photos', false)
ON CONFLICT (id) DO NOTHING;

-- QR codes bucket policy (public read for printing)
CREATE POLICY "QR codes are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'qr-codes');

CREATE POLICY "Admins can manage QR codes"
ON storage.objects FOR ALL
USING (bucket_id = 'qr-codes' AND auth.jwt() ->> 'role' = 'admin');

-- Reports bucket policy (authenticated users)
CREATE POLICY "Authenticated users can read reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'reports' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can manage reports"
ON storage.objects FOR ALL
USING (bucket_id = 'reports' AND auth.jwt() ->> 'role' = 'admin');

-- Signatures bucket policy (drivers can upload)
CREATE POLICY "Drivers can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signatures' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures' AND auth.role() = 'authenticated');

-- Delivery photos policy
CREATE POLICY "Drivers can upload delivery photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'delivery-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view delivery photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-photos' AND auth.role() = 'authenticated');
```

### 2. Apply Migration to Supabase (10 min)
```bash
# Option A: Supabase CLI
supabase db push

# Option B: Manual via Supabase Dashboard SQL Editor
# Copy the SQL above and run it
```

### 3. Test Edge Functions Locally (20 min)
```bash
cd supabase/functions

# Test QR generation
supabase functions serve generate-qr-codes --env-file .env.local

# In another terminal, test with curl:
curl -X POST http://localhost:54321/functions/v1/generate-qr-codes \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"elementIds": ["element-uuid-here"]}'
```

### 4. Deploy Edge Functions to Production (20 min)
```bash
# Deploy QR generator
supabase functions deploy generate-qr-codes

# Deploy PDF report generator
supabase functions deploy generate-report

# Set secrets if needed
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
```

### 5. Create Admin UI Button for QR Generation (20 min)
Add a "Generate QR Codes" button to the elements page.

Location: `src/app/(portals)/admin/elements/page.tsx` or create component

```tsx
async function generateQRCodes(elementIds: string[]) {
  const response = await fetch('/api/generate-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elementIds })
  })
  // Handle response
}
```

## Key Files
```
supabase/functions/generate-qr-codes/index.ts
supabase/functions/generate-report/index.ts
supabase/functions/_shared/supabaseClient.ts
```

## Environment Variables Needed
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_QR_BUCKET=qr-codes
SUPABASE_REPORTS_BUCKET=reports
```

## Success Criteria
- [ ] Storage buckets created (qr-codes, reports, signatures, delivery-photos)
- [ ] Edge Functions deployed and responding
- [ ] Can generate QR code for an element
- [ ] QR code URL saved to element record

## When Done
- Commit and push migration file
- Report back: "Buckets created, functions deployed, QR test result: X"
