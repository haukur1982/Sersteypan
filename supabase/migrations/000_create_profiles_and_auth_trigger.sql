-- =============================================
-- PROFILES TABLE + AUTH TRIGGER (FOUNDATION)
-- =============================================
-- Purpose:
-- 1) Ensure public.profiles exists for all environments
-- 2) Auto-create profiles when auth.users is inserted
-- 3) Backfill any missing profile rows
-- =============================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'buyer' check (role in ('admin', 'factory_manager', 'buyer', 'driver')),
  company_id uuid,
  phone text,
  avatar_url text,
  preferences jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- Add FK if companies table exists (keeps migration order flexible)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'companies'
  ) then
    if not exists (
      select 1 from pg_constraint where conname = 'profiles_company_id_fkey'
    ) then
      alter table public.profiles
        add constraint profiles_company_id_fkey
        foreign key (company_id) references public.companies(id) on delete set null;
    end if;
  end if;
end $$;

-- Auto-create profiles for new auth users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_email text;
  v_full_name text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', new.raw_app_meta_data->>'role', 'buyer');
  if v_role not in ('admin', 'factory_manager', 'buyer', 'driver') then
    v_role := 'buyer';
  end if;

  v_email := coalesce(new.email, new.phone, 'unknown');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', v_email);

  insert into public.profiles (id, email, full_name, role, company_id, is_active, created_at, updated_at)
  values (new.id, v_email, v_full_name, v_role, null, true, now(), now())
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any missing profiles
insert into public.profiles (id, email, full_name, role, company_id, is_active, created_at, updated_at)
select
  u.id,
  coalesce(u.email, u.phone, 'unknown') as email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email, u.phone, 'Unknown') as full_name,
  case
    when (u.raw_user_meta_data->>'role') in ('admin', 'factory_manager', 'buyer', 'driver') then u.raw_user_meta_data->>'role'
    when (u.raw_app_meta_data->>'role') in ('admin', 'factory_manager', 'buyer', 'driver') then u.raw_app_meta_data->>'role'
    else 'buyer'
  end as role,
  null as company_id,
  true as is_active,
  coalesce(u.created_at, now()) as created_at,
  now() as updated_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
