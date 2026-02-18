-- Migration 029: Batch Atomicity, Sequence-Based Numbering, and Atomic RPCs
--
-- Fixes from code review:
-- 1. Replace MAX()+1 batch numbering with PostgreSQL sequence (race condition fix)
-- 2. Atomic create_batch_with_elements() RPC (prevents orphan batches)
-- 3. Atomic complete_batch() RPC (prevents batch marked done with un-advanced elements)

-- =====================================================
-- A. SEQUENCE-BASED BATCH NUMBERING (replaces MAX()+1)
-- =====================================================
-- The original generate_batch_number() used SELECT MAX + 1 which has
-- no locking and can produce duplicate numbers under concurrent inserts.
-- A PostgreSQL sequence guarantees uniqueness via atomic nextval().

DO $$
DECLARE
    max_seq integer;
BEGIN
    -- Find the highest existing batch number for the current year
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(batch_number, '-', 3) AS integer)
    ), 0)
    INTO max_seq
    FROM production_batches
    WHERE batch_number LIKE 'LOTA-' || to_char(NOW(), 'YYYY') || '-%';

    -- Create sequence starting after the highest existing number
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS batch_number_seq START WITH %s', max_seq + 1);
END $$;

-- Replace the function to use the sequence
CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS text AS $$
DECLARE
    current_year text;
    next_seq integer;
BEGIN
    current_year := to_char(NOW(), 'YYYY');
    next_seq := nextval('batch_number_seq');
    RETURN 'LOTA-' || current_year || '-' || LPAD(next_seq::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- B. ATOMIC BATCH CREATION RPC
-- =====================================================
-- Wraps batch insert + element linking in a single transaction.
-- Validates: elements exist, belong to project, are unbatched, in allowed status.
-- If any validation fails or any operation fails, the entire transaction rolls back.

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

    -- Validate: all elements belong to the project, are unbatched, and in allowed status
    -- Lock the rows with FOR UPDATE to prevent concurrent batch assignment
    SELECT COUNT(*) INTO v_valid_count
    FROM elements
    WHERE id = ANY(p_element_ids)
      AND project_id = p_project_id
      AND batch_id IS NULL
      AND status IN ('planned', 'rebar')
    FOR UPDATE;

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

-- =====================================================
-- C. ATOMIC BATCH COMPLETION RPC
-- =====================================================
-- Wraps batch completion + element status advancement in a single transaction.
-- Uses FOR UPDATE to lock the batch row, preventing concurrent completion.
-- If element advancement fails, the entire transaction rolls back.

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

    -- Advance elements from planned/rebar to cast (same transaction — atomic)
    UPDATE elements
    SET status = 'cast',
        cast_at = v_now
    WHERE batch_id = p_batch_id
      AND status IN ('planned', 'rebar');

    RETURN jsonb_build_object('success', true);
END;
$$;
