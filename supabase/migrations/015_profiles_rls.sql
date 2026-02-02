-- =============================================
-- PROFILES RLS POLICIES (STABLE DEFAULTS)
-- =============================================
-- Goals:
-- 1) Ensure profiles are always readable for app joins
-- 2) Allow users to update only their own profile
-- 3) Allow admins to manage all profiles
-- =============================================

alter table public.profiles enable row level security;

-- Clean up any prior policies to avoid duplicates
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Profiles update own" on public.profiles;
drop policy if exists "Admins manage profiles" on public.profiles;

-- Any authenticated user can read profiles (needed for joins across the app)
create policy "Profiles are viewable by authenticated users"
  on public.profiles
  for select
  using (auth.role() = 'authenticated');

-- Users can only update their own profile
create policy "Profiles update own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can manage all profiles
create policy "Admins manage profiles"
  on public.profiles
  for all
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');
