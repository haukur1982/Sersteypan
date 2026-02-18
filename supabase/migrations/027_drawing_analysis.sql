-- Migration 027: AI Drawing Analysis Pipeline
-- Adds the infrastructure for AI-powered drawing analysis and bulk element creation.
-- The drawing_analyses table serves as a staging area between AI extraction and
-- human-reviewed element creation — nothing touches the elements table without explicit
-- admin approval.

-- 1. Add 'svalagangur' (Balcony corridor) element type
-- These are distinct structural walkway elements, different from regular balconies (svalir).
INSERT INTO element_types (key, label_is, label_en, sort_order, is_active)
VALUES ('svalagangur', 'Svalagangur', 'Balcony Corridor', 5, true)
ON CONFLICT (key) DO NOTHING;

-- 2. Add rebar_spec column to elements table
-- Rebar specifications (e.g., "K10 c/c 200 K10 c/c 250") are prominently featured
-- in all structural engineering drawings and critical for production.
ALTER TABLE elements ADD COLUMN IF NOT EXISTS rebar_spec text;

-- 3. Create drawing_analyses table
CREATE TABLE IF NOT EXISTS drawing_analyses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id uuid REFERENCES project_documents(id) ON DELETE SET NULL,

    -- Analysis lifecycle status
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reviewed', 'committed')),

    -- Source document info
    document_name text NOT NULL,
    page_count integer,
    pages_analyzed integer DEFAULT 0,

    -- AI extraction results (JSONB array of extracted elements)
    -- Each element: { name, element_type, length_mm, width_mm, height_mm, weight_kg,
    --                  quantity, rebar_spec, floor, building, production_notes,
    --                  confidence: { name, dimensions, weight } }
    extracted_elements jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- AI metadata
    ai_summary text,
    ai_model text,
    ai_confidence_notes text,

    -- Human review tracking
    reviewed_by uuid REFERENCES profiles(id),
    reviewed_at timestamptz,
    review_notes text,

    -- Commit tracking
    elements_created integer DEFAULT 0,

    -- Error tracking
    error_message text,

    -- Audit
    created_by uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drawing_analyses_project ON drawing_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_analyses_status ON drawing_analyses(status);
CREATE INDEX IF NOT EXISTS idx_drawing_analyses_created_at ON drawing_analyses(created_at DESC);

-- 4. RLS Policies — Admin only
ALTER TABLE drawing_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view drawing analyses"
    ON drawing_analyses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can insert drawing analyses"
    ON drawing_analyses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can update drawing analyses"
    ON drawing_analyses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can delete drawing analyses"
    ON drawing_analyses FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

-- 5. Updated_at trigger (reuse pattern from other tables)
CREATE OR REPLACE FUNCTION update_drawing_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_drawing_analyses_updated_at
    BEFORE UPDATE ON drawing_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_drawing_analyses_updated_at();
