-- 064: Building Floor Geometry
-- Stores AI-extracted building geometry (wall segments + floor zones) for
-- composite floor plan visualization with panelization overlays.

-- ============================================================================
-- 1. New table: building_floor_geometries
-- ============================================================================

CREATE TABLE IF NOT EXISTS building_floor_geometries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,
    floor integer NOT NULL,

    -- Source tracking
    drawing_analysis_id uuid REFERENCES drawing_analyses(id) ON DELETE SET NULL,
    source_document_name text,

    -- Building bounding box (mm), origin at bottom-left
    bounding_width_mm integer NOT NULL CHECK (bounding_width_mm > 0),
    bounding_height_mm integer NOT NULL CHECK (bounding_height_mm > 0),

    -- Wall segments as JSONB array
    -- Each: { id, x1_mm, y1_mm, x2_mm, y2_mm, thickness_mm, wall_type }
    wall_segments jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- Floor zones as JSONB array of polygons
    -- Each: { id, name, points: [{x_mm, y_mm}], zone_type, linked_layout_id }
    floor_zones jsonb NOT NULL DEFAULT '[]'::jsonb,

    scale text,
    general_notes text,

    created_by uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bfg_project ON building_floor_geometries(project_id);
CREATE INDEX IF NOT EXISTS idx_bfg_building_floor ON building_floor_geometries(building_id, floor);

-- Updated_at trigger
CREATE OR REPLACE TRIGGER set_bfg_updated_at
    BEFORE UPDATE ON building_floor_geometries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. RLS policies (admin full access)
-- ============================================================================

ALTER TABLE building_floor_geometries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to building_floor_geometries"
    ON building_floor_geometries
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.is_active = true
        )
    );

-- ============================================================================
-- 3. Add geometry_zone_id to panelization_layouts
-- ============================================================================

ALTER TABLE panelization_layouts
    ADD COLUMN IF NOT EXISTS geometry_zone_id text;

-- ============================================================================
-- 4. Update analysis_mode constraint to allow 'geometry'
-- ============================================================================

ALTER TABLE drawing_analyses DROP CONSTRAINT IF EXISTS drawing_analyses_analysis_mode_check;
ALTER TABLE drawing_analyses ADD CONSTRAINT drawing_analyses_analysis_mode_check
    CHECK (analysis_mode IN ('elements', 'surfaces', 'geometry'));
