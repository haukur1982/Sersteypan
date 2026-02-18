-- Migration 033: Fix enforce_element_status_transition for service role + clean up duplicate triggers
--
-- Found via diagnostic inspection (migration 032):
--   4 BEFORE UPDATE triggers on elements table:
--     1. element_status_change      → log_element_status_change()         [OLD — duplicate]
--     2. enforce_status_transition   → enforce_element_status_transition() [blocks service role]
--     3. trg_element_status_change   → handle_element_status_change()     [migration 024 — canonical]
--     4. update_elements_updated_at  → update_updated_at()                [keep]
--
-- Issues:
--   A. enforce_element_status_transition() raises 'Unauthorized status change' when
--      auth.uid() IS NULL (service role / SECURITY DEFINER RPCs like complete_batch).
--   B. log_element_status_change() duplicates handle_element_status_change() — both
--      insert into element_events and set timestamps, causing double event logging.
--
-- Fixes:
--   A. Update enforce_element_status_transition() to allow service role through.
--   B. Drop the old log_element_status_change trigger (keep the canonical one from migration 024).

-- =====================================================
-- A. FIX enforce_element_status_transition() for service role
-- =====================================================
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

  RAISE EXCEPTION 'Unauthorized status change';
END;
$$;

-- =====================================================
-- B. DROP duplicate log_element_status_change trigger
-- =====================================================
-- The canonical trigger is trg_element_status_change (migration 024)
-- which has more complete logic (backward transitions, all timestamps).
-- The older element_status_change trigger duplicates event logging and timestamps.

DROP TRIGGER IF EXISTS element_status_change ON elements;

-- Keep the function around (no harm) but mark it as deprecated in a comment.
-- We don't drop the function in case something else references it.

-- =====================================================
-- C. DROP temporary diagnostic functions (migration 032)
-- =====================================================
DROP FUNCTION IF EXISTS _temp_inspect_element_triggers();
DROP FUNCTION IF EXISTS _temp_get_function_source(text);
