-- =============================================
-- STOCK MANAGEMENT SCHEMA
-- =============================================

-- Drop existing tables if they exist (cleanup legacy/conflicting schemas)
drop table if exists public.project_allocations cascade;
drop table if exists public.stock_transactions cascade;
drop table if exists public.stock_items cascade;

-- 1. Stock Items
create table public.stock_items (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text not null,
  sku text unique not null,
  category text, -- e.g., 'barriers', 'marketing_blocks', 'raw_materials'
  quantity_on_hand integer not null default 0,
  reorder_level integer default 10,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Stock Transactions
-- Logs every change to inventory (audit trail)
create table public.stock_transactions (
  id uuid primary key default extensions.uuid_generate_v4(),
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  quantity_change integer not null, -- can be negative
  transaction_type text not null check (transaction_type in ('adjustment', 'production', 'allocation', 'return')),
  reference_id text, -- e.g., project_id or NULL
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

-- 3. Project Allocations
-- Tracks which project has reserved/taken stock
create table public.project_allocations (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  quantity integer not null default 0,
  status text not null default 'reserved' check (status in ('reserved', 'delivered')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS POLICIES
alter table public.stock_items enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.project_allocations enable row level security;

-- Stock Items: Factory/Admin can read/write. Others read-only (if needed).
create policy "Factory and Admin can manage stock items"
  on public.stock_items for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'factory')
    )
  );

-- Transactions: Factory/Admin can view/create.
create policy "Factory and Admin can view/create transactions"
  on public.stock_transactions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'factory')
    )
  );

-- Allocations: Factory/Admin manage. Buyers read their own project's allocations.
create policy "Factory/Admin manage allocations"
  on public.project_allocations for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'factory')
    )
  );

create policy "Buyers view allocations for their projects"
  on public.project_allocations for select
  using (
    exists (
      select 1 from public.projects
      where id = public.project_allocations.project_id
      and company_id in (
        select company_id from public.profiles where id = auth.uid()
      )
    )
  );
