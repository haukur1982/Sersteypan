-- ============================================================
-- Migration 024: Element Status Trigger + Quality Gate
-- ============================================================
-- Fixes the broken audit trail. The code has always said
-- "trigger will handle status timestamp updates and event logging"
-- but the trigger never existed. This creates it.
-- ============================================================

-- 1. Trigger function: auto-logs events + sets timestamps on status change
CREATE OR REPLACE FUNCTION handle_element_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get the current user (may be null for system operations)
  _user_id := auth.uid();

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

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trg_element_status_change ON elements;
CREATE TRIGGER trg_element_status_change
  BEFORE UPDATE ON elements
  FOR EACH ROW
  EXECUTE FUNCTION handle_element_status_change();

-- 3. Add index on element_events for common queries
CREATE INDEX IF NOT EXISTS idx_element_events_element_id ON element_events(element_id);
CREATE INDEX IF NOT EXISTS idx_element_events_created_at ON element_events(created_at);
CREATE INDEX IF NOT EXISTS idx_element_events_status ON element_events(status);

-- 4. Enable RLS on element_events (if not already enabled)
ALTER TABLE element_events ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for element_events

-- Admin + factory manager: full read access
CREATE POLICY "Admin and factory can view all element events"
  ON element_events
  FOR SELECT
  USING (get_user_role() IN ('admin', 'factory_manager'));

-- Buyer: can view events for elements in their company's projects
CREATE POLICY "Buyers can view events for their company elements"
  ON element_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM elements e
      JOIN projects p ON e.project_id = p.id
      WHERE e.id = element_events.element_id
        AND p.company_id = get_user_company()
    )
  );

-- Driver: can view events for elements they've delivered
CREATE POLICY "Drivers can view events for their delivery elements"
  ON element_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM delivery_items di
      JOIN deliveries d ON di.delivery_id = d.id
      WHERE di.element_id = element_events.element_id
        AND d.driver_id = auth.uid()
    )
  );

-- No direct INSERT/UPDATE/DELETE for users — only via trigger
-- The trigger function runs as SECURITY DEFINER, bypassing RLS
