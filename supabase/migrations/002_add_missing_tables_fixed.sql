-- Fixed version with type casting for get_user_company() which returns text

create table priority_requests (
  id uuid primary key default uuid_generate_v4(),
  element_id uuid not null references elements(id) on delete cascade,
  requested_by uuid not null references profiles(id),
  requested_priority int not null,
  reason text,
  status text default 'pending' check (status in ('pending', 'approved', 'denied', 'modified')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  final_priority int,
  review_notes text,
  created_at timestamptz default now()
);

create index idx_priority_requests_element on priority_requests(element_id);
create index idx_priority_requests_status on priority_requests(status);

alter table priority_requests enable row level security;

create policy "Buyers can create requests for own projects" on priority_requests
  for insert with check (
    get_user_role() = 'buyer' and
    exists (
      select 1 from elements e
      join projects p on e.project_id = p.id
      where e.id = element_id and p.company_id::text = get_user_company()
    )
  );

create policy "Factory managers can review requests" on priority_requests
  for update using (get_user_role() in ('admin', 'factory_manager'));

create policy "Users can view relevant requests" on priority_requests
  for select using (
    get_user_role() in ('admin', 'factory_manager') or
    (get_user_role() = 'buyer' and requested_by = auth.uid())
  );

create table legacy_id_mapping (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  legacy_id text not null,
  new_id uuid not null,
  migrated_at timestamptz default now()
);

create index idx_legacy_mapping on legacy_id_mapping(table_name, legacy_id);
