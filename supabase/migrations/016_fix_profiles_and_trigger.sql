-- =============================================
-- FIX: REPAIR PROFILES, TRIGGER AND RLS
-- =============================================

-- 1. Ensure the trigger is absolutely correct and active
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_email text;
  v_full_name text;
BEGIN
  -- Extract role with fallback - DEFAULT TO ADMIN as per request for immediate access
  -- v_role := COALESCE(new.raw_user_meta_data->>'role', new.raw_app_meta_data->>'role', 'buyer');
  -- Temporarily force admin for resilience
  v_role := 'admin';

  IF v_role NOT IN ('admin', 'factory_manager', 'buyer', 'driver') THEN
    v_role := 'buyer';
  END IF;

  -- Extract email/name with fallbacks
  v_email := COALESCE(new.email, new.phone, 'unknown');
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', v_email);

  -- Insert profile, ignoring conflicts if already exists
  INSERT INTO public.profiles (id, email, full_name, role, company_id, is_active, created_at, updated_at)
  VALUES (new.id, v_email, v_full_name, v_role, null, true, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = now(); -- Keep existing role/name if already there

  RETURN new;
END;
$$;

-- Re-create the trigger to be sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. SAFETY NET: Allow users to create their own profile if the trigger fails
-- This prevents the "silent failure" where the app tries to self-heal but gets blocked by RLS.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. IMMEDIATE BACKFILL: Fix any currently broken users (like the one reporting the issue)
-- This runs immediately when the migration is applied.
INSERT INTO public.profiles (id, email, full_name, role, company_id, is_active, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.email, u.phone, 'unknown') as email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email, 'Unknown') as full_name,
  'admin' as role, -- FORCED ADMIN for all backfilled users
  null as company_id,
  true as is_active,
  now() as created_at,
  now() as updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4. BONUS: UPGRADE EXISTING USERS to Admin (requested: "make admin profiles for all of them")
-- This ensures that even if they had a 'buyer' profile, they now get access.
UPDATE public.profiles
SET role = 'admin'
WHERE role != 'admin';
