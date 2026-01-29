# Storage Bucket Setup

## Manual Setup in Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/rggqjcguhfcfhlwbyrug/storage/buckets
2. Click "New bucket"
3. Create bucket with name: `documents`
4. Set as **Public bucket** (so documents can be downloaded via public URLs)
5. Save

## Storage Policies

Run these SQL commands in the Supabase SQL Editor:

```sql
-- Allow authenticated users to upload documents
create policy "Authenticated users can upload documents"
on storage.objects for insert
with check (
  bucket_id = 'documents' and
  auth.role() = 'authenticated'
);

-- Allow everyone to download documents (public bucket)
create policy "Public read access to documents"
on storage.objects for select
using (bucket_id = 'documents');

-- Allow admins to delete documents
create policy "Admins can delete documents"
on storage.objects for delete
using (
  bucket_id = 'documents' and
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
);
```

## Testing

After setup, test by:
1. Go to a project detail page
2. Upload a PDF or image file
3. Verify it appears in the documents list
4. Click download button to verify public access works
