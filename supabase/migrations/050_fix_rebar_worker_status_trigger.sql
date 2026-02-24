-- ============================================================
-- Migration 050: Allow rebar_worker (and driver) through
-- handle_element_status_change() trigger
--
-- Bug: The trigger at line 40 only allowed admin + factory_manager,
-- blocking rebar workers from changing planned → rebar despite
-- enforce_element_status_transition() allowing it.
--
-- The proper role-specific transition checks are in
-- enforce_element_status_transition() (migration 047).
-- This function should allow any recognized active role through,
-- since the other trigger handles the specific transition rules.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_element_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _user_role text;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get the current user (may be null for system/service role operations)
  _user_id := auth.uid();

  -- Authorization check: if there IS a user context, verify they have permission
  -- If auth.uid() IS NULL, this is a system operation (service role, SECURITY DEFINER RPC)
  -- and should be allowed through.
  IF _user_id IS NOT NULL THEN
    SELECT role INTO _user_role FROM profiles WHERE id = _user_id AND is_active = true;

    -- Allow recognized roles that can change element status.
    -- The specific transition rules are enforced by enforce_element_status_transition().
    IF _user_role IS NULL OR _user_role NOT IN ('admin', 'factory_manager', 'rebar_worker', 'driver') THEN
      RAISE EXCEPTION 'Unauthorized status change';
    END IF;
  END IF;

  -- 1. Insert audit event into element_events
  INSERT INTO element_events (
    element_id,
    previous_status,
    status,
    notes,
    created_by,
    created_at
  ) VALUES (
    NEW.id,
    OLD.status,
    NEW.status,
    CASE
      WHEN NEW.production_notes IS DISTINCT FROM OLD.production_notes
      THEN NEW.production_notes
      ELSE NULL
    END,
    _user_id,
    NOW()
  );

  -- 2. Set the correct timestamp column based on new status
  CASE NEW.status
    WHEN 'rebar' THEN
      NEW.rebar_completed_at := NOW();
    WHEN 'cast' THEN
      NEW.cast_at := NOW();
    WHEN 'curing' THEN
      NEW.curing_completed_at := NOW();
    WHEN 'ready' THEN
      NEW.ready_at := NOW();
    WHEN 'loaded' THEN
      NEW.loaded_at := NOW();
    WHEN 'delivered' THEN
      NEW.delivered_at := NOW();
    WHEN 'planned' THEN
      -- Full revert: clear all timestamps
      NEW.rebar_completed_at := NULL;
      NEW.cast_at := NULL;
      NEW.curing_completed_at := NULL;
      NEW.ready_at := NULL;
      NEW.loaded_at := NULL;
      NEW.delivered_at := NULL;
    ELSE
      -- Unknown status, don't modify timestamps
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;
