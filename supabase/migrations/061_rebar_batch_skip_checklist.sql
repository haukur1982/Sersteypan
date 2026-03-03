-- =============================================================================
-- Migration 061: Remove checklist enforcement from approve_rebar_batch
-- =============================================================================
-- The factory owner requested that rebar batches (Járnalotur) should NOT
-- require a QC checklist before approval. The "Samþykkja lotu" button
-- should work directly without the checklist gate.
--
-- This migration updates the approve_rebar_batch function to skip the
-- checklist validation that was added in migration 053.
-- =============================================================================

CREATE OR REPLACE FUNCTION approve_rebar_batch(
  p_batch_id uuid,
  p_approved_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch record;
BEGIN
  SELECT status, checklist INTO v_batch
  FROM rebar_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Járnalota finnst ekki');
  END IF;

  IF v_batch.status = 'approved' THEN
    RETURN jsonb_build_object('error', 'Lota er þegar samþykkt');
  END IF;

  IF v_batch.status = 'cancelled' THEN
    RETURN jsonb_build_object('error', 'Lota hefur verið afturkölluð');
  END IF;

  -- NOTE: Checklist validation removed per owner request (migration 061).
  -- Rebar batches no longer require checklist items to be checked.

  UPDATE rebar_batches
  SET status = 'approved',
      approved_by = p_approved_by,
      approved_at = NOW()
  WHERE id = p_batch_id;

  -- Step 1: Increment rebar_done_count by batch quantity
  UPDATE elements
  SET rebar_done_count = COALESCE(rebar_done_count, 0)
      + COALESCE(rebar_batch_quantity, COALESCE(piece_count, 1) - COALESCE(rebar_done_count, 0))
  WHERE rebar_batch_id = p_batch_id
    AND status = 'planned';

  -- Step 2: Advance fully-processed elements to 'rebar'
  UPDATE elements
  SET status = 'rebar'
  WHERE rebar_batch_id = p_batch_id
    AND status = 'planned'
    AND COALESCE(rebar_done_count, 0) >= COALESCE(piece_count, 1);

  -- Step 3: Release partially-processed elements (stay 'planned', clear batch link)
  UPDATE elements
  SET rebar_batch_id = NULL,
      rebar_batch_number = NULL,
      rebar_batch_quantity = NULL
  WHERE rebar_batch_id = p_batch_id
    AND status = 'planned'
    AND COALESCE(rebar_done_count, 0) < COALESCE(piece_count, 1);

  RETURN jsonb_build_object('success', true);
END;
$$;
