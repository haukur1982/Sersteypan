-- Create storage buckets for Sérsteypan
-- Run this in the Supabase Dashboard SQL Editor or apply via CLI

-- 1. QR Codes Bucket (public, for QR code images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('qr-codes', 'qr-codes', true, 1048576, ARRAY['image/png', 'image/jpeg', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- 2. Reports Bucket (private, for PDF reports)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reports', 'reports', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 3. Delivery Photos Bucket (private, for driver delivery photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('delivery-photos', 'delivery-photos', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 4. Documents Bucket (private, for project documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for qr-codes (public read, admin write)
CREATE POLICY IF NOT EXISTS "QR codes are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'qr-codes');

CREATE POLICY IF NOT EXISTS "Admins can upload QR codes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'qr-codes' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Storage Policies for reports (authenticated read, service role write)
CREATE POLICY IF NOT EXISTS "Users can read their project reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reports' AND
  auth.role() = 'authenticated'
);

-- Storage Policies for delivery-photos (drivers can upload, authenticated read)
CREATE POLICY IF NOT EXISTS "Authenticated users can view delivery photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'delivery-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY IF NOT EXISTS "Drivers can upload delivery photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'delivery-photos' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'driver')
);

-- Storage Policies for documents (project-based access)
CREATE POLICY IF NOT EXISTS "Authenticated users can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY IF NOT EXISTS "Admins can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
