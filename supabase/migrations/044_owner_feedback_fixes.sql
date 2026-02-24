-- ============================================================
-- Migration 044: Owner Feedback Fixes (F3, F6)
-- ============================================================
-- F3: Fix element_photos RLS so factory workers can upload photos
-- F6: Update production batch checklist with owner's exact items
--     and add dynamic concrete cover text based on element type
-- ============================================================


-- ============================================================
-- 1. FIX F3: element_photos RLS — Allow factory uploads
-- ============================================================
-- The photo upload infrastructure exists but factory managers
-- were blocked by missing INSERT RLS policy on element_photos table.

ALTER TABLE element_photos ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view photos
DROP POLICY IF EXISTS "Anyone can view element photos" ON element_photos;
CREATE POLICY "Anyone can view element photos"
  ON element_photos FOR SELECT
  TO authenticated
  USING (true);

-- Admin + factory managers can insert photos
DROP POLICY IF EXISTS "Factory managers and Admins can insert photos" ON element_photos;
DROP POLICY IF EXISTS "Authenticated users can insert photos" ON element_photos;
DROP POLICY IF EXISTS "Admin and factory can insert photos" ON element_photos;
CREATE POLICY "Admin and factory can insert photos"
  ON element_photos FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'factory_manager'));

-- Admin + factory managers can update photos
DROP POLICY IF EXISTS "Factory managers and Admins can update their photos" ON element_photos;
DROP POLICY IF EXISTS "Admin and factory can update photos" ON element_photos;
CREATE POLICY "Admin and factory can update photos"
  ON element_photos FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));

-- Admin + factory managers can delete photos
DROP POLICY IF EXISTS "Factory managers and Admins can delete their photos" ON element_photos;
DROP POLICY IF EXISTS "Admin and factory can delete photos" ON element_photos;
CREATE POLICY "Admin and factory can delete photos"
  ON element_photos FOR DELETE
  TO authenticated
  USING (get_user_role() IN ('admin', 'factory_manager'));


-- ============================================================
-- 2. FIX F6: Update production batch checklist
-- ============================================================
-- Owner's requested checklist items (exact order):
--   1. Mál staðfest
--   2. Mót olíuborið (NEW)
--   3. Járnabinding staðfest
--   4. Raflagnir/pípulagnir staðsettar
--   5. Myndir hlaðnar upp
--   6. Steypuhula yfir stáli — dynamic per element type (NEW)
--   7. Steypubíll C35 ½ flot 70-75 á mæli (NEW)

-- Update the column default for any manual inserts
ALTER TABLE production_batches
  ALTER COLUMN checklist SET DEFAULT '[
    {"key": "dimensions", "label": "Mál staðfest", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "mold_oiled", "label": "Mót olíuborið", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "rebar", "label": "Járnabinding staðfest", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "plumbing", "label": "Raflagnir/pípulagnir staðsettar", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "photos", "label": "Myndir hlaðnar upp", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "concrete_cover", "label": "Steypuhula yfir stáli", "checked": false, "checked_by": null, "checked_at": null},
    {"key": "concrete_truck", "label": "Steypubíll C35 / ½ flot 70-75 á mæli", "checked": false, "checked_by": null, "checked_at": null}
  ]'::jsonb;

-- Replace the create_batch_with_elements RPC with dynamic checklist
-- Preserves: FOR UPDATE locking, status check, air_temperature_c
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
  v_default_checklist jsonb;
  v_valid_count integer;
  v_requested_count integer;
  v_element_types text[];
  v_cover_parts text[];
  v_cover_text text;
BEGIN
  v_requested_count := array_length(p_element_ids, 1);

  IF v_requested_count IS NULL OR v_requested_count = 0 THEN
    RETURN jsonb_build_object('error', 'Engar einingar valdar');
  END IF;

  -- Step 1: Lock matching rows with FOR UPDATE
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

  -- Get all distinct element types in the batch for dynamic checklist
  SELECT array_agg(DISTINCT element_type) INTO v_element_types
  FROM elements
  WHERE id = ANY(p_element_ids);

  -- Build dynamic concrete cover text listing ALL types in batch
  v_cover_parts := ARRAY[]::text[];
  IF 'filigran' = ANY(v_element_types) THEN
    v_cover_parts := array_append(v_cover_parts, 'filigran 25mm');
  END IF;
  IF 'svalir' = ANY(v_element_types) THEN
    v_cover_parts := array_append(v_cover_parts, 'svalir 40mm');
  END IF;
  IF 'stigi' = ANY(v_element_types) THEN
    v_cover_parts := array_append(v_cover_parts, 'stigar 35mm');
  END IF;

  IF array_length(v_cover_parts, 1) > 0 THEN
    v_cover_text := 'Steypuhula yfir stáli (' || array_to_string(v_cover_parts, ', ') || ')';
  ELSE
    v_cover_text := 'Steypuhula yfir stáli';
  END IF;

  -- Build checklist with owner's exact items (F6)
  v_default_checklist := jsonb_build_array(
    jsonb_build_object('key', 'dimensions', 'label', 'Mál staðfest', 'checked', false, 'checked_by', null, 'checked_at', null),
    jsonb_build_object('key', 'mold_oiled', 'label', 'Mót olíuborið', 'checked', false, 'checked_by', null, 'checked_at', null),
    jsonb_build_object('key', 'rebar', 'label', 'Járnabinding staðfest', 'checked', false, 'checked_by', null, 'checked_at', null),
    jsonb_build_object('key', 'plumbing', 'label', 'Raflagnir/pípulagnir staðsettar', 'checked', false, 'checked_by', null, 'checked_at', null),
    jsonb_build_object('key', 'photos', 'label', 'Myndir hlaðnar upp', 'checked', false, 'checked_by', null, 'checked_at', null),
    jsonb_build_object('key', 'concrete_cover', 'label', v_cover_text, 'checked', false, 'checked_by', null, 'checked_at', null),
    jsonb_build_object('key', 'concrete_truck', 'label', 'Steypubíll C35 / ½ flot 70-75 á mæli', 'checked', false, 'checked_by', null, 'checked_at', null)
  );

  -- Insert batch with dynamic checklist
  INSERT INTO production_batches (
    project_id, batch_number, created_by,
    concrete_supplier, concrete_grade, notes,
    checklist, air_temperature_c
  )
  VALUES (
    p_project_id, v_batch_number, p_created_by,
    p_concrete_supplier, p_concrete_grade, p_notes,
    v_default_checklist, p_air_temperature_c
  )
  RETURNING id INTO v_batch_id;

  -- Link elements to batch
  UPDATE elements
  SET batch_id = v_batch_id,
      batch_number = v_batch_number
  WHERE id = ANY(p_element_ids);

  RETURN jsonb_build_object(
    'success', true,
    'batchId', v_batch_id,
    'batchNumber', v_batch_number
  );
END;
$$;
