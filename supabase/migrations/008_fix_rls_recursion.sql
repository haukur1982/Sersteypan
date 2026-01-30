-- Fix Infinite Recursion in RLS Policies
-- Introduced: 2026-01-29
-- Description: Creates SECURITY DEFINER functions to break cyclic dependencies in RLS policies for drivers and buyers.

-- 1. Helper to check if a project contains a delivery assigned to the driver
create or replace function public.is_project_for_driver(project_id uuid, driver_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 
    from public.deliveries d
    where d.project_id = is_project_for_driver.project_id 
    and d.driver_id = is_project_for_driver.driver_id
  );
$$;

-- 2. Helper to check if an element belongs to a delivery assigned to the driver
create or replace function public.is_element_for_driver(element_id uuid, driver_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 
    from public.deliveries d
    join public.delivery_items di on di.delivery_id = d.id
    where di.element_id = is_element_for_driver.element_id 
    and d.driver_id = is_element_for_driver.driver_id
  );
$$;

-- 3. Helper to check if a delivery belongs to a project of the user's company (for Buyers)
create or replace function public.is_delivery_for_buyer(project_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 
    from public.projects p
    where p.id = is_delivery_for_buyer.project_id
    and p.company_id = (select company_id from public.profiles where id = auth.uid())
  );
$$;

-- Update RLS Policies to use these functions

-- PROJECTS: Driver Policy
drop policy if exists "Drivers view assigned projects" on public.projects;
create policy "Drivers view assigned projects"
  on public.projects for select
  using (
    get_user_role() = 'driver' and
    public.is_project_for_driver(id, auth.uid())
  );

-- ELEMENTS: Driver Policy
drop policy if exists "Drivers view elements in assigned deliveries" on public.elements;
create policy "Drivers view elements in assigned deliveries"
  on public.elements for select
  using (
    get_user_role() = 'driver' and
    public.is_element_for_driver(id, auth.uid())
  );

-- DELIVERIES: Buyer Policy (Source of recursion?)
drop policy if exists "Buyers view own project deliveries" on public.deliveries;
create policy "Buyers view own project deliveries"
  on public.deliveries for select
  using (
    get_user_role() = 'buyer' and
    public.is_delivery_for_buyer(project_id)
  );
