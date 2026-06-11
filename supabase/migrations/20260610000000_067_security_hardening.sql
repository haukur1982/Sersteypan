-- =============================================================
-- 067: Security hardening (pre-launch)
--
-- 1. Make photo/QR/floor-plan buckets private (app now serves
--    signed URLs; stored refs may be bare paths or legacy URLs)
-- 2. Replace public storage SELECT policies with authenticated
-- 3. Enable RLS on legacy_id_mapping (deny all; service role only)
-- 4. Tighten profiles SELECT: stop leaking all users' PII to
--    every authenticated user across companies
-- =============================================================

-- -------------------------------------------------------------
-- 1. Buckets → private
-- NOTE: UPDATE, not INSERT ... on conflict do nothing — migration
-- 009 tried the insert form and silently lost to migration 005.
-- -------------------------------------------------------------
update storage.buckets
set public = false
where id in ('element-photos', 'delivery-photos', 'qr-codes', 'floor-plans');

-- -------------------------------------------------------------
-- 2. Storage object policies: public → authenticated reads
-- (floor-plans already has "Authenticated can read floor plans";
-- only its bucket flag was public)
-- -------------------------------------------------------------
drop policy if exists "Public can view element photos" on storage.objects;
create policy "Authenticated can view element photos"
on storage.objects for select
to authenticated
using (bucket_id = 'element-photos' and get_user_role() is not null);

drop policy if exists "Public can view delivery photos" on storage.objects;
create policy "Authenticated can view delivery photos"
on storage.objects for select
to authenticated
using (bucket_id = 'delivery-photos' and get_user_role() is not null);

drop policy if exists "QR codes are publicly readable" on storage.objects;
create policy "Authenticated can view QR codes"
on storage.objects for select
to authenticated
using (bucket_id = 'qr-codes' and get_user_role() is not null);

-- -------------------------------------------------------------
-- 3. legacy_id_mapping: RLS on, no policies
-- Zero app-code references; only the service role (which bypasses
-- RLS) should ever touch it.
-- -------------------------------------------------------------
alter table legacy_id_mapping enable row level security;

-- -------------------------------------------------------------
-- 4. profiles: role-scoped SELECT
--
-- Previous policy let ANY authenticated user read ALL profiles
-- (names, emails, phones across companies). The app actually needs:
--   - everyone: own row (auth/role checks on every server action)
--   - admin/factory_manager: all profiles (user mgmt, worker
--     dropdowns, batch reviewers, message sender names)
--   - buyer: staff names (message senders, delivery drivers) +
--     own-company colleagues — NOT other companies' buyers
--   - driver/rebar_worker: staff names + own row
-- get_user_role()/get_user_company() are SECURITY DEFINER and
-- return null for inactive users, so these don't recurse and
-- inactive users only ever see their own row.
-- -------------------------------------------------------------
drop policy if exists "Profiles are viewable by authenticated users" on profiles;

create policy "Users view own profile"
on profiles for select
to authenticated
using (id = auth.uid());

create policy "Staff view all profiles"
on profiles for select
to authenticated
using (get_user_role() in ('admin', 'factory_manager'));

create policy "Buyers view staff and company colleagues"
on profiles for select
to authenticated
using (
  get_user_role() = 'buyer'
  and (
    role in ('admin', 'factory_manager', 'driver')
    or company_id = get_user_company()
  )
);

create policy "Drivers and rebar workers view staff"
on profiles for select
to authenticated
using (
  get_user_role() in ('driver', 'rebar_worker')
  and role in ('admin', 'factory_manager')
);
