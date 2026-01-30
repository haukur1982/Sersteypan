-- Floor Plans Feature Migration
-- Allows uploading floor plan images and placing elements
-- Created: 2026-01-30

-- Floor Plans Table
create table if not exists floor_plans (
    id uuid primary key default extensions.uuid_generate_v4(),
    project_id uuid not null references projects(id) on delete cascade,
    name text not null,
    description text,
    floor_number integer default 1,
    image_url text not null,
    width_px integer,
    height_px integer,
    scale_meters_per_px numeric(10, 6),
    is_active boolean default true,
    created_by uuid references profiles(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Element Positions on Floor Plans
create table if not exists element_positions (
    id uuid primary key default extensions.uuid_generate_v4(),
    floor_plan_id uuid not null references floor_plans(id) on delete cascade,
    element_id uuid not null references elements(id) on delete cascade,
    x_position integer not null,
    y_position integer not null,
    rotation_degrees integer default 0,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(floor_plan_id, element_id)
);

-- Indexes
create index if not exists idx_floor_plans_project on floor_plans(project_id);
create index if not exists idx_element_positions_floor_plan on element_positions(floor_plan_id);
create index if not exists idx_element_positions_element on element_positions(element_id);

-- RLS Policies
alter table floor_plans enable row level security;
alter table element_positions enable row level security;

-- Floor plans: same access as projects
drop policy if exists "Users can view floor plans for their projects" on floor_plans;
create policy "Users can view floor plans for their projects"
on floor_plans for select
using (
    project_id in (
        select id from projects where company_id = get_user_company()
    )
    or get_user_role() in ('admin', 'factory_manager')
);

drop policy if exists "Admins can manage floor plans" on floor_plans;
create policy "Admins can manage floor plans"
on floor_plans for all
using (get_user_role() = 'admin')
with check (get_user_role() = 'admin');

-- Element positions: same access
drop policy if exists "Users can view element positions" on element_positions;
create policy "Users can view element positions"
on element_positions for select
using (
    floor_plan_id in (
        select fp.id from floor_plans fp
        join projects p on fp.project_id = p.id
        where p.company_id = get_user_company()
    )
    or get_user_role() in ('admin', 'factory_manager')
);

drop policy if exists "Admins can manage element positions" on element_positions;
create policy "Admins can manage element positions"
on element_positions for all
using (get_user_role() = 'admin')
with check (get_user_role() = 'admin');
