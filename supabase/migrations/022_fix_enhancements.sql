-- Enhance fix_in_factory with defect categories, delivery impact, and resolution tracking

-- Defect category for classification
alter table public.fix_in_factory
  add column if not exists category text default 'other';

-- Does this defect block a customer delivery?
alter table public.fix_in_factory
  add column if not exists delivery_impact boolean default false;

-- Who resolved the issue (may differ from assigned_to)
alter table public.fix_in_factory
  add column if not exists resolved_by uuid references auth.users(id);

-- Index for open requests with delivery impact (urgent queue)
create index if not exists idx_fix_delivery_impact
  on public.fix_in_factory (delivery_impact, status)
  where delivery_impact = true and status != 'completed' and status != 'cancelled';
