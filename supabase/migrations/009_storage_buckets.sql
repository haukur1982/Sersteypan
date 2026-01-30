-- Storage buckets for QR codes and reports
-- Created: 2026-01-30
-- Note: signatures and delivery-photos buckets are created in 005_setup_storage_buckets.sql

-- Create buckets if missing
insert into storage.buckets (id, name, public)
values
  ('qr-codes', 'qr-codes', true),
  ('reports', 'reports', false),
  ('signatures', 'signatures', false),
  ('delivery-photos', 'delivery-photos', false)
on conflict (id) do nothing;

-- QR codes: public read for printing, admin manage
drop policy if exists "QR codes are publicly readable" on storage.objects;
create policy "QR codes are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'qr-codes');

drop policy if exists "Admins can manage QR codes" on storage.objects;
create policy "Admins can manage QR codes"
on storage.objects for all
to authenticated
using (bucket_id = 'qr-codes' and get_user_role() = 'admin')
with check (bucket_id = 'qr-codes' and get_user_role() = 'admin');

-- Reports: authenticated read, admin manage
drop policy if exists "Authenticated users can read reports" on storage.objects;
create policy "Authenticated users can read reports"
on storage.objects for select
to authenticated
using (bucket_id = 'reports' and auth.role() = 'authenticated');

drop policy if exists "Admins can manage reports" on storage.objects;
create policy "Admins can manage reports"
on storage.objects for all
to authenticated
using (bucket_id = 'reports' and get_user_role() = 'admin')
with check (bucket_id = 'reports' and get_user_role() = 'admin');

-- Signatures / delivery-photos policies are defined in 005_setup_storage_buckets.sql.
