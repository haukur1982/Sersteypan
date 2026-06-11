-- =============================================================
-- 068: Drop rogue policies created via dashboard (schema drift)
--
-- These policies exist on the live DB but in NO migration file —
-- they were created manually in the Supabase dashboard at some
-- point and silently OR-ed past the scoped policies migration 067
-- introduced. RLS policies are permissive-OR: one `using (true)`
-- policy defeats every careful one beside it.
-- =============================================================

-- profiles: open to EVERYONE including anon (`to public using (true)`).
-- This single policy nullified all of 067's role-scoped SELECT policies.
drop policy if exists "Users can view all profiles" on profiles;

-- storage.objects: rogue public-read policies on now-private buckets.
-- Buckets being private blocks the /object/public endpoint, but these
-- policies still allowed anon-key API reads. 067's authenticated
-- SELECT policies are the intended replacements.
drop policy if exists "Public read access to element photos" on storage.objects;
drop policy if exists "QR codes are publicly accessible" on storage.objects;
-- Named "Authenticated..." but actually granted `to public`:
drop policy if exists "Authenticated users can view delivery photos" on storage.objects;
