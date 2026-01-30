-- =============================================
-- FIX SCHEMA + RLS ALIGNMENT
-- =============================================
-- Created: 2026-01-29
-- Purpose:
-- 1) Add missing fix_in_factory table
-- 2) Align stock_items schema to app usage
-- 3) Expand RLS policies for non-buyer roles
-- 4) Tighten storage policies and align project-documents access
-- =============================================

-- =============================================
-- 1) FIX-IN-FACTORY TABLE
-- =============================================

create table if not exists public.fix_in_factory (
  id uuid primary key default extensions.uuid_generate_v4(),
  element_id uuid references public.elements(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  issue_description text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  resolution_notes text,
  reported_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_fix_in_factory_status on public.fix_in_factory(status);
create index if not exists idx_fix_in_factory_priority on public.fix_in_factory(priority);
create index if not exists idx_fix_in_factory_project on public.fix_in_factory(project_id);
create index if not exists idx_fix_in_factory_element on public.fix_in_factory(element_id);

alter table public.fix_in_factory enable row level security;

drop policy if exists "Admin/Factory manage fix requests" on public.fix_in_factory;
create policy "Admin/Factory manage fix requests"
  on public.fix_in_factory for all
  using (get_user_role() in ('admin', 'factory_manager'))
  with check (get_user_role() in ('admin', 'factory_manager'));

-- =============================================
-- 2) STOCK ITEMS SCHEMA ALIGNMENT
-- =============================================

alter table public.stock_items
  add column if not exists location text;

alter table public.stock_items
  add column if not exists supplier_item_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stock_items_supplier_item_id_fkey'
  ) then
    alter table public.stock_items
      add constraint stock_items_supplier_item_id_fkey
      foreign key (supplier_item_id) references public.supplier_items(id) on delete set null;
  end if;
end $$;

create index if not exists idx_stock_items_supplier_item_id on public.stock_items(supplier_item_id);

-- Fix stock RLS role name mismatch (factory -> factory_manager)
drop policy if exists "Factory and Admin can manage stock items" on public.stock_items;
drop policy if exists "Factory and Admin can view/create transactions" on public.stock_transactions;
drop policy if exists "Factory/Admin manage allocations" on public.project_allocations;

create policy "Factory and Admin can manage stock items"
  on public.stock_items for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'factory_manager')
    )
  );

create policy "Factory and Admin can view/create transactions"
  on public.stock_transactions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'factory_manager')
    )
  );

create policy "Factory/Admin manage allocations"
  on public.project_allocations for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'factory_manager')
    )
  );

-- =============================================
-- 3) CORE RLS EXPANSION (ADMIN/FACTORY/DRIVER)
-- =============================================

-- Projects
drop policy if exists "Admin manage projects" on public.projects;
drop policy if exists "Factory view projects" on public.projects;
drop policy if exists "Drivers view assigned projects" on public.projects;

create policy "Admin manage projects"
  on public.projects for all
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

create policy "Factory view projects"
  on public.projects for select
  using (get_user_role() = 'factory_manager');

create policy "Drivers view assigned projects"
  on public.projects for select
  using (
    get_user_role() = 'driver' and
    exists (
      select 1 from public.deliveries d
      where d.project_id = projects.id and d.driver_id = auth.uid()
    )
  );

-- Elements
drop policy if exists "Admin/Factory manage elements" on public.elements;
drop policy if exists "Drivers view elements in assigned deliveries" on public.elements;

create policy "Admin/Factory manage elements"
  on public.elements for all
  using (get_user_role() in ('admin', 'factory_manager'))
  with check (get_user_role() in ('admin', 'factory_manager'));

create policy "Drivers view elements in assigned deliveries"
  on public.elements for select
  using (
    get_user_role() = 'driver' and
    exists (
      select 1
      from public.delivery_items di
      join public.deliveries d on d.id = di.delivery_id
      where di.element_id = elements.id and d.driver_id = auth.uid()
    )
  );

-- Deliveries
drop policy if exists "Admin/Factory manage deliveries" on public.deliveries;
drop policy if exists "Drivers view assigned deliveries" on public.deliveries;
drop policy if exists "Drivers update assigned deliveries" on public.deliveries;

create policy "Admin/Factory manage deliveries"
  on public.deliveries for all
  using (get_user_role() in ('admin', 'factory_manager'))
  with check (get_user_role() in ('admin', 'factory_manager'));

create policy "Drivers view assigned deliveries"
  on public.deliveries for select
  using (get_user_role() = 'driver' and driver_id = auth.uid());

create policy "Drivers update assigned deliveries"
  on public.deliveries for update
  using (get_user_role() = 'driver' and driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- Delivery Items
drop policy if exists "Admin/Factory manage delivery items" on public.delivery_items;
drop policy if exists "Drivers view assigned delivery items" on public.delivery_items;

create policy "Admin/Factory manage delivery items"
  on public.delivery_items for all
  using (get_user_role() in ('admin', 'factory_manager'))
  with check (get_user_role() in ('admin', 'factory_manager'));

create policy "Drivers view assigned delivery items"
  on public.delivery_items for select
  using (
    get_user_role() = 'driver' and
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_items.delivery_id and d.driver_id = auth.uid()
    )
  );

-- Project Documents
drop policy if exists "Admin/Factory manage project documents" on public.project_documents;

create policy "Admin/Factory manage project documents"
  on public.project_documents for all
  using (get_user_role() in ('admin', 'factory_manager'))
  with check (get_user_role() in ('admin', 'factory_manager'));

-- Project Messages
drop policy if exists "Admin/Factory view project messages" on public.project_messages;
drop policy if exists "Admin/Factory send messages" on public.project_messages;
drop policy if exists "Users can update project messages" on public.project_messages;

create policy "Admin/Factory view project messages"
  on public.project_messages for select
  using (get_user_role() in ('admin', 'factory_manager'));

create policy "Admin/Factory send messages"
  on public.project_messages for insert
  with check (get_user_role() in ('admin', 'factory_manager'));

create policy "Users can update project messages"
  on public.project_messages for update
  using (
    get_user_role() in ('admin', 'factory_manager') or
    (
      get_user_role() = 'buyer' and
      project_id in (select id from public.projects where company_id = get_user_company())
    )
  )
  with check (
    get_user_role() in ('admin', 'factory_manager') or
    (
      get_user_role() = 'buyer' and
      project_id in (select id from public.projects where company_id = get_user_company())
    )
  );

-- =============================================
-- 4) STORAGE POLICY HARDENING
-- =============================================

-- Element photos: enforce path ownership on insert
drop policy if exists "Authenticated users can upload element photos" on storage.objects;
create policy "Authenticated users can upload element photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'element-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delivery photos: enforce path ownership on insert
drop policy if exists "Authenticated users can upload delivery photos" on storage.objects;
create policy "Authenticated users can upload delivery photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'delivery-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Signatures: enforce path ownership on insert
drop policy if exists "Authenticated users can upload signatures" on storage.objects;
create policy "Authenticated users can upload signatures"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'signatures' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Project documents: tighten to admin/factory upload and project-based read
drop policy if exists "Authenticated users can upload project documents" on storage.objects;
drop policy if exists "Users can view accessible project documents" on storage.objects;
drop policy if exists "Admins can delete project documents" on storage.objects;

create policy "Admin/Factory can upload project documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-documents' and
    get_user_role() in ('admin', 'factory_manager')
  );

create policy "Users can view accessible project documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-documents' and
    (
      get_user_role() in ('admin', 'factory_manager') or
      (
        get_user_role() = 'buyer' and
        exists (
          select 1 from public.projects p
          where p.id::text = (storage.foldername(name))[1]
            and p.company_id = get_user_company()
        )
      ) or
      (
        get_user_role() = 'driver' and
        exists (
          select 1 from public.deliveries d
          join public.projects p on d.project_id = p.id
          where p.id::text = (storage.foldername(name))[1]
            and d.driver_id = auth.uid()
        )
      )
    )
  );

create policy "Admins can delete project documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-documents' and
    get_user_role() = 'admin'
  );
