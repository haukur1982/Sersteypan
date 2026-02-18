-- Migration 031: Fix element status trigger for service role operations
--
-- Problem: The handle_element_status_change() trigger blocks status updates
-- when auth.uid() IS NULL (service role / system operations).
-- This prevents the complete_batch() SECURITY DEFINER RPC from working,
-- and blocks E2E scripts using the service role key.
--
-- The trigger was modified on the remote DB to include authorization logic
-- that raises 'Unauthorized status change' when the user isn't recognized.
--
-- Fix: Re-deploy the trigger function with a bypass for service role operations.
-- When auth.uid() IS NULL, the operation is from a trusted system context
-- (service role key or SECURITY DEFINER function) and should be allowed.

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

    -- Only admin and factory_manager can change element status
    IF _user_role IS NULL OR _user_role NOT IN ('admin', 'factory_manager') THEN
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

  -- 3. Handle backward transitions: null timestamps for stages after new status
  --    Status order: planned(0) < rebar(1) < cast(2) < curing(3) < ready(4) < loaded(5) < delivered(6)
  IF NEW.status = 'ready' THEN
    NEW.loaded_at := NULL;
    NEW.delivered_at := NULL;
  ELSIF NEW.status = 'curing' THEN
    NEW.ready_at := NULL;
    NEW.loaded_at := NULL;
    NEW.delivered_at := NULL;
  ELSIF NEW.status = 'cast' THEN
    NEW.curing_completed_at := NULL;
    NEW.ready_at := NULL;
    NEW.loaded_at := NULL;
    NEW.delivered_at := NULL;
  ELSIF NEW.status = 'rebar' THEN
    NEW.cast_at := NULL;
    NEW.curing_completed_at := NULL;
    NEW.ready_at := NULL;
    NEW.loaded_at := NULL;
    NEW.delivered_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;
