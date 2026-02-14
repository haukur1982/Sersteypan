-- Notifications table for in-app notification bell
-- Stores actual notification records instead of deriving them from other tables

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- 'element_status', 'new_message', 'delivery_status', 'priority_request', 'fix_in_factory'
  title text not null,
  body text,
  link text, -- relative URL to navigate to on click
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index for fast unread count + recent notifications per user
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc);

-- Index for cleanup of old notifications
create index if not exists idx_notifications_created_at
  on public.notifications (created_at);

-- RLS
alter table public.notifications enable row level security;

-- Users can only see their own notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id and get_user_role() is not null);

-- System inserts notifications (via server actions), users don't insert directly
-- But we need insert for server actions running as the user
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert"
  on public.notifications
  for insert
  to authenticated
  with check (get_user_role() is not null);

-- Users can mark their own notifications as read
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id and get_user_role() is not null)
  with check (auth.uid() = user_id);

-- Users can delete their own notifications
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (auth.uid() = user_id and get_user_role() is not null);
