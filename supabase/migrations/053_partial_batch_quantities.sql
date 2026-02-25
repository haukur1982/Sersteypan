-- Migration 053: Partial batch quantities
-- Allows elements with piece_count > 1 to be partially batched.
-- E.g., batch 2 of 3 pieces, then batch the remaining 1 later.

-- New columns: how many pieces of this element are in the current batch
ALTER TABLE elements ADD COLUMN IF NOT EXISTS rebar_batch_quantity integer;
ALTER TABLE elements ADD COLUMN IF NOT EXISTS batch_quantity integer;

-- =============================================================================
-- Update create_rebar_batch_with_elements to accept per-element quantities
-- =============================================================================
CREATE OR REPLACE FUNCTION create_rebar_batch_with_elements(
  p_project_id uuid,
  p_element_ids uuid[],
  p_created_by uuid,
  p_notes text DEFAULT NULL,
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

  -- Step 1: Lock matching rows
  PERFORM id
  FROM elements
  WHERE id = ANY(p_element_ids)
    AND project_id = p_project_id
    AND rebar_batch_id IS NULL
    AND status = 'planned'
  FOR UPDATE;

  -- Step 2: Count locked rows
  SELECT COUNT(*) INTO v_valid_count
  FROM elements
  WHERE id = ANY(p_element_ids)
    AND project_id = p_project_id
    AND rebar_batch_id IS NULL
    AND status = 'planned';

  IF v_valid_count != v_requested_count THEN
    RETURN jsonb_build_object('error',
      'Sumar einingar eru ekki tiltækar (rangt verkefni, þegar í járnalotu, eða ekki í stöðunni "Skipulagt"). Tiltækar: '
      || v_valid_count || ' af ' || v_requested_count);
  END IF;

  -- Validate per-element quantities if provided
  IF p_element_quantities IS NOT NULL THEN
    FOR v_i IN 1..v_requested_count LOOP
      v_qty := p_element_quantities[v_i];
      SELECT piece_count, rebar_done_count INTO v_el
      FROM elements WHERE id = p_element_ids[v_i];

      IF v_qty IS NOT NULL AND (v_qty < 1 OR v_qty > (COALESCE(v_el.piece_count, 1) - COALESCE(v_el.rebar_done_count, 0))) THEN
        RETURN jsonb_build_object('error',
          'Ógilt magn fyrir einingu. Hámark: ' || (COALESCE(v_el.piece_count, 1) - COALESCE(v_el.rebar_done_count, 0)));
      END IF;
    END LOOP;
  END IF;

  v_batch_number := generate_rebar_batch_number();

  v_default_checklist := '[
    {"key": "dimensions",    "label": "Mál staðfest (lengd, breidd, hæð)",     "checked": false, "checked_by": null, "checked_at": null},
    {"key": "bar_sizes",     "label": "Réttar stangaþykktir (K-mál)",          "checked": false, "checked_by": null, "checked_at": null},
    {"key": "spacing",       "label": "Bil milli stanga (c/c) rétt",           "checked": false, "checked_by": null, "checked_at": null},
    {"key": "cover_spacers", "label": "Þekjuklemmur settar",                   "checked": false, "checked_by": null, "checked_at": null},
    {"key": "ties_welds",    "label": "Bindisvírar / suður athugað",           "checked": false, "checked_by": null, "checked_at": null},
    {"key": "clean",         "label": "Hreint — engin ryð eða óhreinindi",     "checked": false, "checked_by": null, "checked_at": null},
    {"key": "photos",        "label": "Ljósmyndir teknar",                     "checked": false, "checked_by": null, "checked_at": null}
  ]'::jsonb;

  INSERT INTO rebar_batches
    (project_id, batch_number, created_by, notes, checklist)
  VALUES
    (p_project_id, v_batch_number, p_created_by, p_notes, v_default_checklist)
  RETURNING id INTO v_batch_id;

  -- Link elements to rebar batch with per-element quantities
  FOR v_i IN 1..v_requested_count LOOP
    UPDATE elements
    SET rebar_batch_id = v_batch_id,
        rebar_batch_number = v_batch_number,
        rebar_batch_quantity = CASE
          WHEN p_element_quantities IS NOT NULL THEN p_element_quantities[v_i]
          ELSE COALESCE(piece_count, 1) - COALESCE(rebar_done_count, 0)
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

-- =============================================================================
-- Update create_batch_with_elements to accept per-element quantities
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

    -- Validate: all elements belong to the project, are unbatched, and in allowed status
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

-- =============================================================================
-- Update approve_rebar_batch to handle piece_count
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
  v_all_checked boolean;
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

  SELECT bool_and((item->>'checked')::boolean)
  INTO v_all_checked
  FROM jsonb_array_elements(v_batch.checklist) AS item;

  IF NOT COALESCE(v_all_checked, false) THEN
    RETURN jsonb_build_object('error', 'Öll atriði í gátlista verða að vera hakuð áður en lota er samþykkt');
  END IF;

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

-- =============================================================================
-- Update complete_batch to increment by batch_quantity instead of 1
-- =============================================================================
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

    SELECT bool_and((item->>'checked')::boolean)
    INTO v_all_checked
    FROM jsonb_array_elements(v_batch.checklist) AS item;

    IF NOT COALESCE(v_all_checked, false) THEN
        RETURN jsonb_build_object('error', 'Öll atriði í gátlista verða að vera hakuð áður en lotu er lokið');
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
