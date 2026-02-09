-- Enforce active-account checks in RLS helper functions.
-- This ensures deactivated users lose policy access immediately.

create or replace function get_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and coalesce(is_active, true) = true
$$;

create or replace function get_user_company()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id
  from public.profiles
  where id = auth.uid()
    and coalesce(is_active, true) = true
$$;
