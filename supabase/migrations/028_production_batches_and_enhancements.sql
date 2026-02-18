-- Migration 028: Production Batches, Enhanced Defects, and Document Organization
--
-- Supports the factory owner's core workflow:
-- 1. Batch system: Group elements into concrete pours with traceability
-- 2. Production checklist: Verify items before concrete goes into mold
-- 3. Enhanced defect tracking: Root cause, corrective action, lessons learned
-- 4. Document organization: Categorize by building and floor

-- =====================================================
-- A. PRODUCTION BATCHES TABLE
-- =====================================================
-- The factory pours ~10 filigran + 2 balcony + 1 stair elements at once
-- from the same concrete truck. A batch groups these elements for
-- traceability — if a defect is found in one element, you can look up
-- every element from the same batch.

CREATE TABLE IF NOT EXISTS production_batches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Auto-generated batch number: "LOTA-2026-001"
    batch_number text NOT NULL UNIQUE,
    batch_date date NOT NULL DEFAULT CURRENT_DATE,

    -- Status lifecycle: preparing → checklist → completed | cancelled
    status text NOT NULL DEFAULT 'preparing'
        CHECK (status IN ('preparing', 'checklist', 'completed', 'cancelled')),

    -- Concrete slip document (uploaded to project-documents bucket)
    concrete_slip_url text,
    concrete_slip_name text,

    -- Concrete specification
    concrete_supplier text,
    concrete_grade text,          -- e.g., "C30/37"

    -- Production checklist (JSONB array)
    -- Each item: { key: string, label: string, checked: boolean,
    --              checked_by: uuid|null, checked_at: timestamptz|null }
    checklist jsonb NOT NULL DEFAULT '[
        {"key": "rebar_verified", "label": "Járnabinding staðfest", "checked": false, "checked_by": null, "checked_at": null},
        {"key": "electrical_placed", "label": "Raflagnir/pípulagnir staðsettar", "checked": false, "checked_by": null, "checked_at": null},
        {"key": "formwork_verified", "label": "Mót staðfest", "checked": false, "checked_by": null, "checked_at": null},
        {"key": "dimensions_verified", "label": "Mál staðfest", "checked": false, "checked_by": null, "checked_at": null},
        {"key": "photos_uploaded", "label": "Myndir hlaðnar upp", "checked": false, "checked_by": null, "checked_at": null}
    ]'::jsonb,

    notes text,

    -- Audit
    created_by uuid NOT NULL REFERENCES profiles(id),
    completed_by uuid REFERENCES profiles(id),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_batches_project ON production_batches(project_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON production_batches(status);
CREATE INDEX IF NOT EXISTS idx_production_batches_batch_number ON production_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_production_batches_batch_date ON production_batches(batch_date DESC);

-- Auto-generate batch_number: "LOTA-2026-001", "LOTA-2026-002", etc.
CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS text AS $$
DECLARE
    current_year text;
    next_seq integer;
BEGIN
    current_year := to_char(NOW(), 'YYYY');
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(batch_number, '-', 3) AS integer)
    ), 0) + 1
    INTO next_seq
    FROM production_batches
    WHERE batch_number LIKE 'LOTA-' || current_year || '-%';

    RETURN 'LOTA-' || current_year || '-' || LPAD(next_seq::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_production_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_production_batches_updated_at
    BEFORE UPDATE ON production_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_production_batches_updated_at();

-- =====================================================
-- B. ADD batch_id FK ON ELEMENTS
-- =====================================================
-- Links each element to the batch it was poured in.
-- The existing batch_number text field is kept for display/legacy,
-- but batch_id is the canonical foreign key.

ALTER TABLE elements ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES production_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_elements_batch_id ON elements(batch_id);

-- =====================================================
-- C. ENHANCED DEFECT TRACKING
-- =====================================================
-- The owner wants: what happened, what was done to fix it,
-- what can be done better next time so it doesn't repeat.

ALTER TABLE fix_in_factory ADD COLUMN IF NOT EXISTS corrective_action text;
ALTER TABLE fix_in_factory ADD COLUMN IF NOT EXISTS lessons_learned text;
ALTER TABLE fix_in_factory ADD COLUMN IF NOT EXISTS root_cause text;
ALTER TABLE fix_in_factory ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- =====================================================
-- D. DOCUMENT ORGANIZATION BY BUILDING/FLOOR
-- =====================================================
-- The owner wants documents organized by building (A, B, C)
-- and by floor, not just by category.

ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES buildings(id) ON DELETE SET NULL;
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS floor integer;
CREATE INDEX IF NOT EXISTS idx_project_documents_building ON project_documents(building_id);

-- =====================================================
-- E. RLS POLICIES FOR production_batches
-- =====================================================

ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin full access to batches"
    ON production_batches FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

-- Factory manager: full access
CREATE POLICY "Factory manager full access to batches"
    ON production_batches FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'factory_manager'
              AND profiles.is_active = true
        )
    );

-- Buyer: read-only access to their company's project batches
CREATE POLICY "Buyer can view own project batches"
    ON production_batches FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            JOIN profiles ON profiles.company_id = projects.company_id
            WHERE projects.id = production_batches.project_id
              AND profiles.id = auth.uid()
              AND profiles.role = 'buyer'
              AND profiles.is_active = true
        )
    );
