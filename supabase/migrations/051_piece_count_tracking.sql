-- Migration 051: Piece Count Tracking
--
-- Problem: Elements with piece_count > 1 (e.g., SG-1 ×3) disappear entirely
-- when processed. The owner expects: process 1 piece, leave 2 remaining.
--
-- Solution: Add per-stage counters so each "completion" action only advances
-- one piece. Status only changes when all pieces are processed.

-- =====================================================
-- A. ADD TRACKING COLUMNS
-- =====================================================

ALTER TABLE elements ADD COLUMN IF NOT EXISTS rebar_done_count integer NOT NULL DEFAULT 0;
ALTER TABLE elements ADD COLUMN IF NOT EXISTS cast_done_count integer NOT NULL DEFAULT 0;

-- =====================================================
-- B. UPDATE complete_batch() TO HANDLE piece_count
-- =====================================================
-- Previously: all batch elements advanced from 'planned'/'rebar' to 'cast'
-- Now: increment cast_done_count, only advance status when all pieces are done

CREATE OR REPLACE FUNCTION complete_batch(
    p_batch_id uuid,
    p_completed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch record;
    v_all_checked boolean;
    v_now timestamptz := NOW();
BEGIN
    -- Fetch and lock batch row
    SELECT status, checklist INTO v_batch
    FROM production_batches
    WHERE id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Lota finnst ekki');
    END IF;

    IF v_batch.status = 'completed' THEN
        RETURN jsonb_build_object('error', 'Lota er nú þegar lokið');
    END IF;

    IF v_batch.status = 'cancelled' THEN
        RETURN jsonb_build_object('error', 'Lota hefur verið afturkölluð');
    END IF;

    -- Verify all checklist items are checked
    SELECT bool_and((item->>'checked')::boolean)
    INTO v_all_checked
    FROM jsonb_array_elements(v_batch.checklist) AS item;

    IF NOT COALESCE(v_all_checked, false) THEN
        RETURN jsonb_build_object('error', 'Öll atriði í gátlista verða að vera hakuð áður en lotu er lokið');
    END IF;

    -- Update batch status to completed
    UPDATE production_batches
    SET status = 'completed',
        completed_by = p_completed_by,
        completed_at = v_now
    WHERE id = p_batch_id;

    -- Step 1: Increment cast_done_count for all batch elements
    UPDATE elements
    SET cast_done_count = COALESCE(cast_done_count, 0) + 1,
        updated_at = v_now
    WHERE batch_id = p_batch_id
      AND status IN ('planned', 'rebar');

    -- Step 2: Advance fully-processed elements to 'cast'
    UPDATE elements
    SET status = 'cast',
        cast_at = v_now
    WHERE batch_id = p_batch_id
      AND status IN ('planned', 'rebar')
      AND COALESCE(cast_done_count, 0) >= COALESCE(piece_count, 1);

    -- Step 3: Release partially-processed elements (can be re-batched)
    UPDATE elements
    SET batch_id = NULL,
        batch_number = NULL
    WHERE batch_id = p_batch_id
      AND status IN ('planned', 'rebar')
      AND COALESCE(cast_done_count, 0) < COALESCE(piece_count, 1);

    RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- C. FIX handle_element_status_change TRIGGER
-- =====================================================
-- The trigger was incorrectly setting rebar_completed_at when status changes TO 'rebar'.
-- That column should only be set by markRebarComplete() when the rebar worker finishes.
-- The 'rebar' status entry is tracked by updated_at instead.

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
      -- Full revert: clear all timestamps
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
