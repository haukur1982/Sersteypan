-- Floor plans storage bucket
insert into storage.buckets (id, name, public)
values ('floor-plans', 'floor-plans', true)
on conflict (id) do nothing;

-- Anyone authenticated can read floor plans
create policy "Authenticated can read floor plans"
on storage.objects for select
to authenticated
using (bucket_id = 'floor-plans');

-- Admins can manage floor plans
create policy "Admins can manage floor plans"
on storage.objects for all
to authenticated
using (bucket_id = 'floor-plans' and get_user_role() = 'admin')
with check (bucket_id = 'floor-plans' and get_user_role() = 'admin');
