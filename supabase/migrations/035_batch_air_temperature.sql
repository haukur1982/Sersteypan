-- Migration 035: Add air temperature to production batches
--
-- The factory owner wants to record the ambient air temperature
-- during each concrete pour. This is important for curing quality —
-- if concrete is poured below 5°C or above 30°C, curing behavior changes.

ALTER TABLE production_batches
    ADD COLUMN IF NOT EXISTS air_temperature_c numeric(4,1);

-- Update the create_batch_with_elements RPC to accept air_temperature_c
CREATE OR REPLACE FUNCTION create_batch_with_elements(
    p_project_id uuid,
    p_element_ids uuid[],
    p_created_by uuid,
    p_concrete_supplier text DEFAULT NULL,
    p_concrete_grade text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_air_temperature_c numeric DEFAULT NULL
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
    PERFORM id
    FROM elements
    WHERE id = ANY(p_element_ids)
      AND project_id = p_project_id
      AND batch_id IS NULL
      AND status IN ('planned', 'rebar')
    FOR UPDATE;

    -- Step 2: Count the locked rows
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

    -- Generate batch number
    v_batch_number := generate_batch_number();

    -- Insert batch record (now includes air_temperature_c)
    INSERT INTO production_batches (
        project_id, batch_number, created_by,
        concrete_supplier, concrete_grade, notes, air_temperature_c
    ) VALUES (
        p_project_id, v_batch_number, p_created_by,
        p_concrete_supplier, p_concrete_grade, p_notes, p_air_temperature_c
    )
    RETURNING id INTO v_batch_id;

    -- Link elements to batch
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
