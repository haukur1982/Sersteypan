-- =============================================
-- STORAGE BUCKETS & RLS POLICIES
-- =============================================

-- Enable storage if not already enabled
-- (Supabase projects have this enabled by default)

-- =============================================
-- BUCKET 1: Element Photos
-- =============================================

-- Create element-photos bucket (public read, authenticated write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'element-photos',
  'element-photos',
  true,  -- Public read access
  10485760,  -- 10MB max file size
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- RLS Policies for element-photos bucket

-- Allow authenticated users to upload photos
create policy "Authenticated users can upload element photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'element-photos' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own uploads
create policy "Users can update own element photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'element-photos' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own uploads
create policy "Users can delete own element photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'element-photos' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access (since bucket is public)
create policy "Public can view element photos"
on storage.objects for select
to public
using (bucket_id = 'element-photos');

-- =============================================
-- BUCKET 2: Delivery Photos
-- =============================================

-- Create delivery-photos bucket (public read, authenticated write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-photos',
  'delivery-photos',
  true,  -- Public read access
  10485760,  -- 10MB max file size
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- RLS Policies for delivery-photos bucket

-- Allow authenticated users to upload delivery photos
create policy "Authenticated users can upload delivery photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'delivery-photos' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own uploads
create policy "Users can update own delivery photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'delivery-photos' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own uploads
create policy "Users can delete own delivery photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'delivery-photos' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
create policy "Public can view delivery photos"
on storage.objects for select
to public
using (bucket_id = 'delivery-photos');

-- =============================================
-- BUCKET 3: Signatures
-- =============================================

-- Create signatures bucket (private, authenticated access only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signatures',
  'signatures',
  false,  -- Private bucket (not public)
  2097152,  -- 2MB max file size
  array['image/png', 'image/svg+xml']  -- Signatures are typically PNG or SVG
)
on conflict (id) do nothing;

-- RLS Policies for signatures bucket

-- Allow authenticated users to upload signatures
create policy "Authenticated users can upload signatures"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'signatures' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to view signatures
-- (for deliveries they're involved with)
create policy "Users can view signatures"
on storage.objects for select
to authenticated
using (bucket_id = 'signatures');

-- Prevent updates to signatures (immutable for audit purposes)
-- Prevent deletes to signatures (immutable for audit purposes)

-- =============================================
-- BUCKET 4: Project Documents
-- =============================================

-- Create project-documents bucket (private, authenticated access only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,  -- Private bucket
  52428800,  -- 50MB max file size
  array[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  -- .docx
    'application/msword',  -- .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  -- .xlsx
    'application/vnd.ms-excel',  -- .xls
    'application/dwg',  -- AutoCAD
    'image/vnd.dwg'  -- AutoCAD
  ]
)
on conflict (id) do nothing;

-- RLS Policies for project-documents bucket

-- Allow authenticated users to upload documents
create policy "Authenticated users can upload project documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-documents' and
  auth.role() = 'authenticated'
);

-- Allow users to view documents for projects they have access to
create policy "Users can view accessible project documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-documents' and
  (
    -- Admins can see all
    get_user_role() = 'admin' or
    -- Factory managers can see all
    get_user_role() = 'factory_manager' or
    -- Buyers can see their company's project documents
    (
      get_user_role() = 'buyer' and
      exists (
        select 1 from project_documents pd
        join projects p on pd.project_id = p.id
        where pd.file_url like '%' || (storage.foldername(name))[2] || '%'
        and p.company_id = get_user_company()
      )
    ) or
    -- Drivers can see all (they deliver to all projects)
    get_user_role() = 'driver'
  )
);

-- Allow admins to delete documents
create policy "Admins can delete project documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-documents' and
  get_user_role() = 'admin'
);

-- =============================================
-- HELPER FUNCTION: Get public URL for element photo
-- =============================================

-- Function to get the public URL for an element photo
-- This is useful for consistent URL generation across the app
create or replace function get_element_photo_url(bucket_name text, file_path text)
returns text as $$
declare
  base_url text;
begin
  -- Get the Supabase project URL from settings
  select decrypted_secret into base_url
  from vault.decrypted_secrets
  where name = 'SUPABASE_URL'
  limit 1;

  -- If we can't get it from vault, construct from current host
  if base_url is null then
    base_url := current_setting('request.headers')::json->>'host';
  end if;

  -- Return the full public URL
  return base_url || '/storage/v1/object/public/' || bucket_name || '/' || file_path;
end;
$$ language plpgsql security definer stable;

-- =============================================
-- UPDATE element_photos table to use storage
-- =============================================

-- Add comment to clarify photo_url format
comment on column element_photos.photo_url is
  'Storage path in format: element-photos/[user_id]/[filename]. Use get_element_photo_url() to get full URL.';

-- =============================================
-- NOTES FOR DEVELOPERS
-- =============================================

-- Storage file path conventions:
-- element-photos: element-photos/[user_id]/[element_id]/[timestamp]_[stage].jpg
-- delivery-photos: delivery-photos/[user_id]/[delivery_id]/[timestamp].jpg
-- signatures: signatures/[user_id]/[delivery_id]_signature.png
-- project-documents: project-documents/[project_id]/[filename]

-- Example upload path for element photo:
-- element-photos/auth.uid()/550e8400-e29b-41d4-a716-446655440000/1706184000_rebar.jpg

-- To upload from client:
-- const { data, error } = await supabase.storage
--   .from('element-photos')
--   .upload(`${userId}/${elementId}/${Date.now()}_${stage}.jpg`, file)

-- To get public URL:
-- const { data } = supabase.storage
--   .from('element-photos')
--   .getPublicUrl(filePath)
