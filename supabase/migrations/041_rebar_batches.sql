-- ============================================================
-- Migration 041: Rebar Preparation Batches (Járnalotur)
-- ============================================================
-- Adds a dedicated rebar prep workflow. Rebar is fabricated ahead
-- of time in bulk, stored in a stockpile, then consumed by casting
-- batches when concrete arrives. This mirrors the production_batches
-- system but with rebar-specific QC checklist and status lifecycle.
-- ============================================================

-- =====================================================
-- A. REBAR BATCHES TABLE
-- =====================================================

CREATE TABLE rebar_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  batch_number text NOT NULL UNIQUE,
  batch_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing', 'qc_ready', 'approved', 'cancelled')),
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- =====================================================
-- B. REBAR BATCH LINK ON ELEMENTS
-- =====================================================
-- Parallel to batch_id (casting). An element can have both:
-- rebar_batch_id from prep phase + batch_id from casting phase.

ALTER TABLE elements
  ADD COLUMN IF NOT EXISTS rebar_batch_id uuid REFERENCES rebar_batches(id),
  ADD COLUMN IF NOT EXISTS rebar_batch_number text;

-- =====================================================
-- C. SEQUENCE-BASED BATCH NUMBERING
-- =====================================================
-- JARN-YYYY-NNN format (parallel to LOTA-YYYY-NNN for casting)

CREATE SEQUENCE IF NOT EXISTS rebar_batch_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_rebar_batch_number()
RETURNS text AS $$
DECLARE
  current_year text;
  next_seq integer;
BEGIN
  current_year := to_char(NOW(), 'YYYY');
  next_seq := nextval('rebar_batch_number_seq');
  RETURN 'JARN-' || current_year || '-' || LPAD(next_seq::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- D. ATOMIC RPC: CREATE REBAR BATCH
-- =====================================================
-- Validates elements, generates batch number, inserts batch,
-- links elements — all in one transaction.

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

  -- Validate: elements belong to project, have no rebar batch, and are in 'planned' status
  -- Lock with FOR UPDATE to prevent concurrent batch assignment
  SELECT COUNT(*) INTO v_valid_count
  FROM elements
  WHERE id = ANY(p_element_ids)
    AND project_id = p_project_id
    AND rebar_batch_id IS NULL
    AND status = 'planned'
  FOR UPDATE;

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

-- =====================================================
-- E. ATOMIC RPC: APPROVE REBAR BATCH
-- =====================================================
-- Validates checklist complete, advances batch to 'approved',
-- and moves elements from 'planned' to 'rebar' status.

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
  -- Fetch and lock batch row
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

  -- Verify all checklist items are checked
  SELECT bool_and((item->>'checked')::boolean)
  INTO v_all_checked
  FROM jsonb_array_elements(v_batch.checklist) AS item;

  IF NOT COALESCE(v_all_checked, false) THEN
    RETURN jsonb_build_object('error', 'Öll atriði í gátlista verða að vera hakuð áður en lota er samþykkt');
  END IF;

  -- Update batch status to approved
  UPDATE rebar_batches
  SET status = 'approved',
      approved_by = p_approved_by,
      approved_at = NOW()
  WHERE id = p_batch_id;

  -- Advance elements from 'planned' to 'rebar'
  -- (handle_element_status_change trigger sets rebar_completed_at)
  UPDATE elements
  SET status = 'rebar'
  WHERE rebar_batch_id = p_batch_id
    AND status = 'planned';

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- F. RLS POLICIES
-- =====================================================

ALTER TABLE rebar_batches ENABLE ROW LEVEL SECURITY;

-- Admin + factory manager: full access
CREATE POLICY "Admin and factory full access to rebar batches"
  ON rebar_batches
  FOR ALL
  USING (get_user_role() IN ('admin', 'factory_manager'));

-- Buyer: read-only for their company's projects
CREATE POLICY "Buyers can view rebar batches for their projects"
  ON rebar_batches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = rebar_batches.project_id
        AND p.company_id = get_user_company()
    )
  );

-- =====================================================
-- G. INDEXES
-- =====================================================

CREATE INDEX idx_rebar_batches_project ON rebar_batches(project_id);
CREATE INDEX idx_rebar_batches_status ON rebar_batches(status);
CREATE INDEX idx_rebar_batches_created_at ON rebar_batches(created_at);
CREATE INDEX idx_elements_rebar_batch ON elements(rebar_batch_id);

-- =====================================================
-- H. UPDATED_AT TRIGGER
-- =====================================================
-- Reuses the existing update_updated_at_column() function

CREATE TRIGGER set_rebar_batches_updated_at
  BEFORE UPDATE ON rebar_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
