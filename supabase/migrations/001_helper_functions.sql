-- Helper functions for RLS policies
-- These must exist before any RLS policies that use them

-- Drop existing functions if they have wrong signatures
drop function if exists get_user_role();
drop function if exists get_user_company();

-- Create functions with correct signatures
create or replace function get_user_role()
returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer;

create or replace function get_user_company()
returns uuid as $$
  select company_id from profiles where id = auth.uid()
$$ language sql security definer;
