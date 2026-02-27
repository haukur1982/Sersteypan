-- =============================================================================
-- Feature: Allow skipping the production checklist when completing a batch.
--
-- Adds optional `p_skip_checklist boolean` parameter to `complete_batch`.
-- When true, the checklist validation is bypassed and a note is appended
-- to the batch `notes` for audit trail.
--
-- Only admins should use this — role enforcement is in the server action.
-- =============================================================================

CREATE OR REPLACE FUNCTION complete_batch(
    p_batch_id uuid,
    p_completed_by uuid,
    p_skip_checklist boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch record;
    v_all_checked boolean;
    v_now timestamptz := NOW();
    v_skip_note text;
BEGIN
    SELECT status, checklist, notes INTO v_batch
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

    -- Validate checklist unless explicitly skipped
    IF NOT p_skip_checklist THEN
        SELECT bool_and((item->>'checked')::boolean)
        INTO v_all_checked
        FROM jsonb_array_elements(v_batch.checklist) AS item;

        IF NOT COALESCE(v_all_checked, false) THEN
            RETURN jsonb_build_object('error', 'Öll atriði í gátlista verða að vera hakuð áður en lotu er lokið');
        END IF;
    ELSE
        -- Record that checklist was skipped for audit trail
        v_skip_note := '⚠ Gátlista var sleppt ' || to_char(v_now, 'DD.MM.YYYY HH24:MI');
        UPDATE production_batches
        SET notes = CASE
            WHEN v_batch.notes IS NOT NULL AND v_batch.notes != ''
                THEN v_batch.notes || E'\n' || v_skip_note
            ELSE v_skip_note
        END
        WHERE id = p_batch_id;
    END IF;

    UPDATE production_batches
    SET status = 'completed',
        completed_by = p_completed_by,
        completed_at = v_now
    WHERE id = p_batch_id;

    -- Step 1: Increment cast_done_count by batch_quantity (default: all remaining)
    UPDATE elements
    SET cast_done_count = COALESCE(cast_done_count, 0)
        + COALESCE(batch_quantity, COALESCE(piece_count, 1) - COALESCE(cast_done_count, 0)),
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
        batch_number = NULL,
        batch_quantity = NULL
    WHERE batch_id = p_batch_id
      AND status IN ('planned', 'rebar')
      AND COALESCE(cast_done_count, 0) < COALESCE(piece_count, 1);

    RETURN jsonb_build_object('success', true);
END;
$$;
