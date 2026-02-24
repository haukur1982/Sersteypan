-- ============================================================
-- Migration 045: Fix create_rebar_batch_with_elements RPC
-- ============================================================
-- Bug: PostgreSQL does not allow FOR UPDATE with aggregate
-- functions (COUNT). This crashed every rebar batch creation.
--
-- Fix: Split into two steps — first PERFORM ... FOR UPDATE
-- to lock rows, then SELECT COUNT(*) without FOR UPDATE.
-- Same pattern applied in migration 030 for create_batch_with_elements.
-- ============================================================

CREATE OR REPLACE FUNCTION create_rebar_batch_with_elements(
  p_project_id uuid,
  p_element_ids uuid[],
  p_created_by uuid,
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
  v_default_checklist jsonb;
BEGIN
  v_requested_count := array_length(p_element_ids, 1);

  IF v_requested_count IS NULL OR v_requested_count = 0 THEN
    RETURN jsonb_build_object('error', 'Engar einingar valdar');
  END IF;

  -- Step 1: Lock matching rows with FOR UPDATE (no aggregate)
  PERFORM id
  FROM elements
  WHERE id = ANY(p_element_ids)
    AND project_id = p_project_id
    AND rebar_batch_id IS NULL
    AND status = 'planned'
  FOR UPDATE;

  -- Step 2: Count the locked rows (separate query, no FOR UPDATE)
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

  v_batch_number := generate_rebar_batch_number();

  -- Default QC checklist for rebar prep
  v_default_checklist := '[
    {"key": "dimensions",    "label": "Mál staðfest (lengd, breidd, hæð)",     "checked": false, "checked_by": null, "checked_at": null},
    {"key": "bar_sizes",     "label": "Réttar stangaþykktir (K-mál)",          "checked": false, "checked_by": null, "checked_at": null},
    {"key": "spacing",       "label": "Bil milli stanga (c/c) rétt",           "checked": false, "checked_by": null, "checked_at": null},
    {"key": "cover_spacers", "label": "Þekjuklemmur settar",                   "checked": false, "checked_by": null, "checked_at": null},
    {"key": "ties_welds",    "label": "Bindisvírar / suður athugað",           "checked": false, "checked_by": null, "checked_at": null},
    {"key": "clean",         "label": "Hreint — engin ryð eða óhreinindi",     "checked": false, "checked_by": null, "checked_at": null},
    {"key": "photos",        "label": "Ljósmyndir teknar",                     "checked": false, "checked_by": null, "checked_at": null}
  ]'::jsonb;

  INSERT INTO rebar_batches (project_id, batch_number, created_by, notes, checklist)
  VALUES (p_project_id, v_batch_number, p_created_by, p_notes, v_default_checklist)
  RETURNING id INTO v_batch_id;

  -- Link elements to rebar batch
  UPDATE elements
  SET rebar_batch_id = v_batch_id, rebar_batch_number = v_batch_number
  WHERE id = ANY(p_element_ids);

  RETURN jsonb_build_object(
    'success', true,
    'batchId', v_batch_id,
    'batchNumber', v_batch_number
  );
END;
$$;
