-- =============================================================================
-- Fix: "FOR UPDATE is not allowed with aggregate functions"
--
-- Migration 053 regressed create_batch_with_elements by combining COUNT(*)
-- with FOR UPDATE in one query. PostgreSQL doesn't allow this.
--
-- Fix: Split into two queries (same pattern used in migrations 030, 045):
--   1. PERFORM ... FOR UPDATE  (lock rows)
--   2. SELECT COUNT(*)         (count locked rows)
-- =============================================================================

CREATE OR REPLACE FUNCTION create_batch_with_elements(
    p_project_id uuid,
    p_element_ids uuid[],
    p_created_by uuid,
    p_concrete_supplier text DEFAULT NULL,
    p_concrete_grade text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_air_temperature_c numeric DEFAULT NULL,
    p_element_quantities integer[] DEFAULT NULL
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
    v_default_checklist jsonb;
    v_i integer;
    v_qty integer;
    v_el record;
BEGIN
    v_requested_count := array_length(p_element_ids, 1);

    IF v_requested_count IS NULL OR v_requested_count = 0 THEN
        RETURN jsonb_build_object('error', 'Engar einingar valdar');
    END IF;

    -- Validate quantities array length if provided
    IF p_element_quantities IS NOT NULL
       AND array_length(p_element_quantities, 1) != v_requested_count THEN
      RETURN jsonb_build_object('error', 'Fjöldi magns stemmir ekki við fjölda eininga');
    END IF;

    -- Step 1: Lock matching rows (no aggregate — FOR UPDATE is allowed here)
    PERFORM id
    FROM elements
    WHERE id = ANY(p_element_ids)
      AND project_id = p_project_id
      AND batch_id IS NULL
      AND status IN ('planned', 'rebar')
    FOR UPDATE;

    -- Step 2: Count the locked rows (separate query, no FOR UPDATE)
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

    -- Validate per-element quantities if provided
    IF p_element_quantities IS NOT NULL THEN
      FOR v_i IN 1..v_requested_count LOOP
        v_qty := p_element_quantities[v_i];
        SELECT piece_count, cast_done_count INTO v_el
        FROM elements WHERE id = p_element_ids[v_i];

        IF v_qty IS NOT NULL AND (v_qty < 1 OR v_qty > (COALESCE(v_el.piece_count, 1) - COALESCE(v_el.cast_done_count, 0))) THEN
          RETURN jsonb_build_object('error',
            'Ógilt magn fyrir einingu. Hámark: ' || (COALESCE(v_el.piece_count, 1) - COALESCE(v_el.cast_done_count, 0)));
        END IF;
      END LOOP;
    END IF;

    v_batch_number := generate_batch_number();

    v_default_checklist := '[
      {"key": "mold_oiled",     "label": "Mót olíuborið",                       "checked": false, "checked_by": null, "checked_at": null},
      {"key": "rebar_verified", "label": "Járnabinding staðfest",               "checked": false, "checked_by": null, "checked_at": null},
      {"key": "dimensions_ok",  "label": "Mál staðfest",                        "checked": false, "checked_by": null, "checked_at": null},
      {"key": "mep_placed",     "label": "Raflagnir/pípulagnir staðsettar",     "checked": false, "checked_by": null, "checked_at": null},
      {"key": "photos_taken",   "label": "Myndir hlaðnar upp",                  "checked": false, "checked_by": null, "checked_at": null},
      {"key": "concrete_ready", "label": "Steypuhræra tilbúin",                 "checked": false, "checked_by": null, "checked_at": null},
      {"key": "final_check",    "label": "Lokayfirferð",                        "checked": false, "checked_by": null, "checked_at": null}
    ]'::jsonb;

    INSERT INTO production_batches (
        project_id, batch_number, created_by,
        concrete_supplier, concrete_grade, notes, air_temperature_c,
        checklist
    ) VALUES (
        p_project_id, v_batch_number, p_created_by,
        p_concrete_supplier, p_concrete_grade, p_notes, p_air_temperature_c,
        v_default_checklist
    )
    RETURNING id INTO v_batch_id;

    -- Link elements to batch with per-element quantities
    FOR v_i IN 1..v_requested_count LOOP
      UPDATE elements
      SET batch_id = v_batch_id,
          batch_number = v_batch_number,
          batch_quantity = CASE
            WHEN p_element_quantities IS NOT NULL THEN p_element_quantities[v_i]
            ELSE COALESCE(piece_count, 1) - COALESCE(cast_done_count, 0)
          END
      WHERE id = p_element_ids[v_i];
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'batchId', v_batch_id,
        'batchNumber', v_batch_number
    );
END;
$$;
