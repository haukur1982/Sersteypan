-- =============================================
-- RLS POLICIES FOR BUYER PORTAL
-- =============================================
-- This migration adds Row Level Security policies to ensure buyers
-- can only access data for their own company's projects.
--
-- Security Model:
-- - Buyers see only projects where project.company_id = buyer's company_id
-- - Buyers see only elements/deliveries/documents/messages for their projects
-- - Buyers can insert priority_requests and messages for their projects
--
-- Created: 2026-01-28
-- Part of: Phase 5.7 - Buyer Portal Security Hardening
-- =============================================

-- Enable RLS on all buyer-accessible tables
alter table projects enable row level security;
alter table elements enable row level security;
alter table deliveries enable row level security;
alter table delivery_items enable row level security;
alter table project_documents enable row level security;
alter table project_messages enable row level security;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get current user's role
create or replace function get_user_role()
returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Get current user's company ID (for buyers)
create or replace function get_user_company()
returns uuid as $$
  select company_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- =============================================
-- PROJECTS POLICIES
-- =============================================

-- Buyers can view only their company's projects
create policy "Buyers view own company projects" on projects
  for select using (
    get_user_role() = 'buyer' and company_id = get_user_company()
  );

-- =============================================
-- ELEMENTS POLICIES
-- =============================================

-- Buyers can view elements for their company's projects
create policy "Buyers view own project elements" on elements
  for select using (
    get_user_role() = 'buyer' and
    project_id in (select id from projects where company_id = get_user_company())
  );

-- =============================================
-- DELIVERIES POLICIES
-- =============================================

-- Buyers can view deliveries for their company's projects
create policy "Buyers view own project deliveries" on deliveries
  for select using (
    get_user_role() = 'buyer' and
    project_id in (select id from projects where company_id = get_user_company())
  );

-- =============================================
-- DELIVERY ITEMS POLICIES
-- =============================================

-- Buyers can view delivery items for their company's deliveries
create policy "Buyers view own delivery items" on delivery_items
  for select using (
    get_user_role() = 'buyer' and
    delivery_id in (
      select d.id from deliveries d
      join projects p on d.project_id = p.id
      where p.company_id = get_user_company()
    )
  );

-- =============================================
-- PROJECT DOCUMENTS POLICIES
-- =============================================

-- Buyers can view documents for their company's projects
create policy "Buyers view own project documents" on project_documents
  for select using (
    get_user_role() = 'buyer' and
    project_id in (select id from projects where company_id = get_user_company())
  );

-- =============================================
-- PROJECT MESSAGES POLICIES
-- =============================================

-- Buyers can view messages for their company's projects
create policy "Buyers view own project messages" on project_messages
  for select using (
    get_user_role() = 'buyer' and
    project_id in (select id from projects where company_id = get_user_company())
  );

-- Buyers can send messages for their company's projects
create policy "Buyers can send messages" on project_messages
  for insert with check (
    get_user_role() = 'buyer' and
    project_id in (select id from projects where company_id = get_user_company())
  );

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- To verify RLS is working, run these queries as a buyer:
--
-- 1. Count visible projects (should only be your company's):
--    SELECT COUNT(*) FROM projects;
--
-- 2. Try to access another company's project (should return 0 rows):
--    SELECT * FROM projects WHERE company_id = '<other-company-id>';
--
-- 3. Verify elements are filtered:
--    SELECT COUNT(*) FROM elements;
--
-- 4. Verify deliveries are filtered:
--    SELECT COUNT(*) FROM deliveries;
--
-- =============================================
