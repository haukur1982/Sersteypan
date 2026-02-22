-- ============================================================
-- Migration 042: Cancel Rebar Batch RPC
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_rebar_batch(
  p_batch_id uuid,
  p_cancelled_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch record;
BEGIN
  -- Fetch and lock batch row
  SELECT status INTO v_batch
  FROM rebar_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Járnalota finnst ekki');
  END IF;

  IF v_batch.status = 'approved' THEN
    RETURN jsonb_build_object('error', 'Ekki er hægt að afturkalla samþykkta lotu');
  END IF;

  IF v_batch.status = 'cancelled' THEN
    RETURN jsonb_build_object('error', 'Lota hefur þegar verið afturkölluð');
  END IF;

  -- Update batch status to cancelled
  UPDATE rebar_batches
  SET status = 'cancelled',
      notes = COALESCE(notes, '') || CHR(10) || 'Afturkallað af notanda ' || p_cancelled_by
  WHERE id = p_batch_id;

  -- Detach elements so they can be re-planned
  UPDATE elements
  SET rebar_batch_id = NULL,
      rebar_batch_number = NULL
  WHERE rebar_batch_id = p_batch_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
