-- Migration 030: Fix element_type check constraint + batch RPC aggregate bug
--
-- Two issues found during E2E workflow testing:
--
-- 1. elements_element_type_check constraint doesn't include 'svalagangur' (corridor)
--    despite element_types table having it since migration 027.
--    Fix: Drop and recreate constraint with all current types.
--
-- 2. create_batch_with_elements() uses FOR UPDATE with COUNT(*) aggregate,
--    which PostgreSQL disallows ("FOR UPDATE is not allowed with aggregate functions").
--    Fix: Separate the locking SELECT from the counting.

-- =====================================================
-- A. FIX ELEMENT TYPE CHECK CONSTRAINT
-- =====================================================
-- The original constraint was created directly on the remote DB and only
-- included: wall, filigran, staircase, balcony, ceiling, column, beam, other.
-- We need to add 'svalagangur' (balcony corridor) which was added to
-- element_types in migration 027 but never added to this check constraint.

-- Drop the old constraint
ALTER TABLE elements DROP CONSTRAINT IF EXISTS elements_element_type_check;

-- Recreate with all valid types (matching element_types table)
ALTER TABLE elements ADD CONSTRAINT elements_element_type_check
  CHECK (element_type IN (
    'wall',
    'filigran',
    'staircase',
    'balcony',
    'svalagangur',
    'ceiling',
    'column',
    'beam',
    'other'
  ));

-- =====================================================
-- B. FIX create_batch_with_elements() — FOR UPDATE + aggregate
-- =====================================================
-- PostgreSQL does not allow FOR UPDATE with aggregate functions (COUNT).
-- Fix: First lock the rows with FOR UPDATE (without aggregate), then count.
-- This preserves the concurrency safety while avoiding the SQL error.

CREATE OR REPLACE FUNCTION create_batch_with_elements(
    p_project_id uuid,
    p_element_ids uuid[],
    p_created_by uuid,
    p_concrete_supplier text DEFAULT NULL,
    p_concrete_grade text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_number text;
    v_batch_id uuid;
    v_valid_count integer;
    v_requested_count integer;
BEGIN
    v_requested_count := array_length(p_element_ids, 1);

    -- Validate: at least one element
    IF v_requested_count IS NULL OR v_requested_count = 0 THEN
        RETURN jsonb_build_object('error', 'Engar einingar valdar');
    END IF;

    -- Step 1: Lock matching rows with FOR UPDATE (no aggregate)
    -- This prevents concurrent batch assignment to the same elements.
    PERFORM id
    FROM elements
    WHERE id = ANY(p_element_ids)
      AND project_id = p_project_id
      AND batch_id IS NULL
      AND status IN ('planned', 'rebar')
    FOR UPDATE;

    -- Step 2: Count the locked rows (separate query, no FOR UPDATE needed)
    SELECT COUNT(*) INTO v_valid_count
    FROM elements
    WHERE id = ANY(p_element_ids)
      AND project_id = p_project_id
      AND batch_id IS NULL
      AND status IN ('planned', 'rebar');

    IF v_valid_count != v_requested_count THEN
        RETURN jsonb_build_object('error',
            'Sumar einingar eru ekki tiltækar fyrir lotu (rangt verkefni, þegar í lotu, eða ekki í leyfilegri stöðu). Tiltækar: '
            || v_valid_count || ' af ' || v_requested_count);
    END IF;

    -- Generate batch number (uses sequence, concurrency-safe)
    v_batch_number := generate_batch_number();

    -- Insert batch record
    INSERT INTO production_batches (
        project_id, batch_number, created_by,
        concrete_supplier, concrete_grade, notes
    ) VALUES (
        p_project_id, v_batch_number, p_created_by,
        p_concrete_supplier, p_concrete_grade, p_notes
    )
    RETURNING id INTO v_batch_id;

    -- Link elements to batch (same transaction — atomic)
    UPDATE elements
    SET batch_id = v_batch_id, batch_number = v_batch_number
    WHERE id = ANY(p_element_ids);

    RETURN jsonb_build_object(
        'success', true,
        'batchId', v_batch_id,
        'batchNumber', v_batch_number
    );
END;
$$;
