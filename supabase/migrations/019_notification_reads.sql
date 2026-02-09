-- Persist notification read state per user.
-- Notifications themselves are currently derived from other tables (events/deliveries),
-- so we store only the "read" marker here.

create table if not exists public.notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.notification_reads enable row level security;

-- Users can only see/modify their own reads. Inactive users have no role (see 018),
-- so we block access when get_user_role() is null.
drop policy if exists "notification_reads_select_own" on public.notification_reads;
create policy "notification_reads_select_own"
  on public.notification_reads
  for select
  to authenticated
  using (auth.uid() = user_id and get_user_role() is not null);

drop policy if exists "notification_reads_insert_own" on public.notification_reads;
create policy "notification_reads_insert_own"
  on public.notification_reads
  for insert
  to authenticated
  with check (auth.uid() = user_id and get_user_role() is not null);

drop policy if exists "notification_reads_update_own" on public.notification_reads;
create policy "notification_reads_update_own"
  on public.notification_reads
  for update
  to authenticated
  using (auth.uid() = user_id and get_user_role() is not null)
  with check (auth.uid() = user_id and get_user_role() is not null);

drop policy if exists "notification_reads_delete_own" on public.notification_reads;
create policy "notification_reads_delete_own"
  on public.notification_reads
  for delete
  to authenticated
  using (auth.uid() = user_id and get_user_role() is not null);

