-- ============================================================
-- Migration 047: Rebar Worker Role
-- ============================================================
-- Adds `rebar_worker` as a new user role for rebar construction
-- workers who use a simplified tablet-friendly portal.
--
-- Rebar workers can:
--   - View projects and their elements
--   - View element details (rebar spec, drawings, checklist)
--   - Change element status: planned → rebar (start rebar work)
--   - Update element checklist (rebar-related items)
--   - Set rebar_completed_at timestamp
--   - Log element events (audit trail)
--   - View project documents (rebar drawings)
-- ============================================================

-- =====================================================
-- 1. UPDATE ROLE CONSTRAINT ON PROFILES
-- =====================================================
-- Drop existing check constraint and re-create with new role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'factory_manager', 'buyer', 'driver', 'rebar_worker'));

-- =====================================================
-- 2. UPDATE handle_new_user() TRIGGER FUNCTION
-- =====================================================
-- Accept rebar_worker as a valid role during user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_email text;
  v_full_name text;
BEGIN
  v_role := coalesce(new.raw_user_meta_data->>'role', new.raw_app_meta_data->>'role', 'buyer');
  IF v_role NOT IN ('admin', 'factory_manager', 'buyer', 'driver', 'rebar_worker') THEN
    v_role := 'buyer';
  END IF;

  v_email := coalesce(new.email, new.phone, 'unknown');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', v_email);

  INSERT INTO public.profiles (id, email, full_name, role, company_id, is_active, created_at, updated_at)
  VALUES (new.id, v_email, v_full_name, v_role, null, true, now(), now())
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- =====================================================
-- 3. RLS POLICIES FOR REBAR WORKER
-- =====================================================

-- Projects: rebar workers can view all projects (read-only)
DROP POLICY IF EXISTS "Rebar workers view projects" ON public.projects;
CREATE POLICY "Rebar workers view projects"
  ON public.projects FOR SELECT
  USING (get_user_role() = 'rebar_worker');

-- Elements: rebar workers can view and update elements
-- (update limited to status, checklist, rebar_completed_at via app logic)
DROP POLICY IF EXISTS "Rebar workers view elements" ON public.elements;
CREATE POLICY "Rebar workers view elements"
  ON public.elements FOR SELECT
  USING (get_user_role() = 'rebar_worker');

DROP POLICY IF EXISTS "Rebar workers update elements" ON public.elements;
CREATE POLICY "Rebar workers update elements"
  ON public.elements FOR UPDATE
  USING (get_user_role() = 'rebar_worker')
  WITH CHECK (get_user_role() = 'rebar_worker');

-- Element events: rebar workers can view history and log their work
DROP POLICY IF EXISTS "Rebar workers view element events" ON public.element_events;
CREATE POLICY "Rebar workers view element events"
  ON public.element_events FOR SELECT
  USING (get_user_role() = 'rebar_worker');

DROP POLICY IF EXISTS "Rebar workers insert element events" ON public.element_events;
CREATE POLICY "Rebar workers insert element events"
  ON public.element_events FOR INSERT
  WITH CHECK (get_user_role() = 'rebar_worker');

-- Project documents: rebar workers can view (read drawings, rebar specs)
DROP POLICY IF EXISTS "Rebar workers view project documents" ON public.project_documents;
CREATE POLICY "Rebar workers view project documents"
  ON public.project_documents FOR SELECT
  USING (get_user_role() = 'rebar_worker');

-- Element photos: rebar workers can view
DROP POLICY IF EXISTS "Rebar workers view element photos" ON public.element_photos;
CREATE POLICY "Rebar workers view element photos"
  ON public.element_photos FOR SELECT
  USING (get_user_role() = 'rebar_worker');

-- Element photos: rebar workers can upload (document their rebar work)
DROP POLICY IF EXISTS "Rebar workers insert element photos" ON public.element_photos;
CREATE POLICY "Rebar workers insert element photos"
  ON public.element_photos FOR INSERT
  WITH CHECK (get_user_role() = 'rebar_worker');

-- =====================================================
-- 4. UPDATE STATUS TRANSITION TRIGGER
-- =====================================================
-- Allow rebar_worker to change status: planned → rebar
CREATE OR REPLACE FUNCTION enforce_element_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  -- Only check when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- If auth.uid() IS NULL, this is a system operation (service role key,
  -- SECURITY DEFINER RPC like complete_batch, or migration scripts).
  -- Allow through without role check.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO user_role FROM profiles WHERE id = auth.uid() AND is_active = true;

  -- Allow admin/factory_manager to make any status change
  IF user_role IN ('admin', 'factory_manager') THEN
    RETURN NEW;
  END IF;

  -- Driver logic: ready <-> loaded -> delivered
  IF user_role = 'driver' THEN
    IF OLD.status = 'ready' AND NEW.status = 'loaded' THEN RETURN NEW; END IF;
    IF OLD.status = 'loaded' AND NEW.status = 'delivered' THEN RETURN NEW; END IF;
    IF OLD.status = 'loaded' AND NEW.status = 'ready' THEN RETURN NEW; END IF; -- Unload
    RAISE EXCEPTION 'Driver cannot perform this status change';
  END IF;

  -- Rebar worker logic: planned → rebar (start rebar work)
  IF user_role = 'rebar_worker' THEN
    IF OLD.status = 'planned' AND NEW.status = 'rebar' THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Rebar worker cannot perform this status change';
  END IF;

  RAISE EXCEPTION 'Unauthorized status change';
END;
$$;

-- =====================================================
-- 5. STORAGE POLICIES FOR REBAR WORKER
-- =====================================================

-- Element photos storage: rebar workers can upload
DROP POLICY IF EXISTS "Rebar workers can upload element photos" ON storage.objects;
CREATE POLICY "Rebar workers can upload element photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'element-photos' AND
    get_user_role() = 'rebar_worker' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Project documents storage: rebar workers can view
DROP POLICY IF EXISTS "Rebar workers can view project documents" ON storage.objects;
CREATE POLICY "Rebar workers can view project documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-documents' AND
    get_user_role() = 'rebar_worker'
  );

-- QR codes storage: rebar workers can view (for QR scanning)
DROP POLICY IF EXISTS "Rebar workers can view QR codes" ON storage.objects;
CREATE POLICY "Rebar workers can view QR codes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'qr-codes' AND
    get_user_role() = 'rebar_worker'
  );
