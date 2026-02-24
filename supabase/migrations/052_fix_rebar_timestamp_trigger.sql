-- Migration 052: Fix handle_element_status_change trigger
--
-- The trigger was incorrectly setting rebar_completed_at when status changes TO 'rebar'.
-- That column should only be set by markRebarComplete() when the rebar worker finishes.
-- Also resets rebar_done_count and cast_done_count when reverting to 'planned'.

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
  -- Only proceed if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Auth check (skip for service role / internal calls)
  _user_id := auth.uid();
  IF _user_id IS NOT NULL THEN
    SELECT role INTO _user_role
    FROM profiles
    WHERE id = _user_id AND is_active = true;

    IF _user_role IS NULL OR _user_role NOT IN ('admin', 'factory_manager', 'rebar_worker', 'driver') THEN
      RAISE EXCEPTION 'Unauthorized status change';
    END IF;
  END IF;

  -- Set the correct timestamp column based on new status
  -- NOTE: 'rebar' does NOT set rebar_completed_at — that's set by markRebarComplete()
  CASE NEW.status
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
      -- Full revert: clear all timestamps and counters
      NEW.rebar_completed_at := NULL;
      NEW.rebar_done_count := 0;
      NEW.cast_done_count := 0;
      NEW.cast_at := NULL;
      NEW.curing_completed_at := NULL;
      NEW.ready_at := NULL;
      NEW.loaded_at := NULL;
      NEW.delivered_at := NULL;
    ELSE
      -- No timestamp to set for 'rebar', 'verified', etc.
      NULL;
  END CASE;

  -- Always update updated_at
  NEW.updated_at := NOW();

  -- Log to element_events (audit trail)
  INSERT INTO element_events (
    element_id, previous_status, status, created_by, notes
  ) VALUES (
    NEW.id, OLD.status, NEW.status, _user_id,
    'Stöðubreyting: ' || COALESCE(OLD.status, 'null') || ' → ' || NEW.status
  );

  RETURN NEW;
END;
$$;

-- Fix existing elements that had rebar_completed_at set by the trigger
-- when they entered 'rebar' status but haven't actually been completed
UPDATE elements
SET rebar_completed_at = NULL
WHERE status = 'rebar'
  AND rebar_done_count = 0;
