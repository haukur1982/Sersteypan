-- =============================================================================
-- Migration 062: Panelization Tool (Plötusnið)
-- =============================================================================
-- Adds the infrastructure for precast element panelization — dividing building
-- walls and floor slabs into manufacturable, transportable precast panels.
--
-- Three tables:
--   panelization_layouts  — root table, one per surface being divided
--   panelization_panels   — calculated panels within each layout
--   panelization_openings — windows/doors on wall layouts
--
-- Pattern follows drawing_analyses (migration 027): a staging area where the
-- admin designs layouts, then commits them as real elements.
-- =============================================================================

-- 1. Panelization Layouts
CREATE TABLE IF NOT EXISTS panelization_layouts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,

    -- Mode: 'wall' or 'filigran'
    mode text NOT NULL CHECK (mode IN ('wall', 'filigran')),

    -- Human label for this surface
    name text NOT NULL,  -- e.g. "Norðurveggur 1H", "Plata hæð 3"

    -- Floor reference
    floor integer,

    -- Surface dimensions (mm)
    surface_length_mm integer NOT NULL CHECK (surface_length_mm > 0 AND surface_length_mm <= 50000),
    surface_height_mm integer NOT NULL CHECK (surface_height_mm > 0 AND surface_height_mm <= 50000),
    thickness_mm integer NOT NULL CHECK (thickness_mm > 0 AND thickness_mm <= 500),

    -- Naming pattern for generated panels
    name_prefix text NOT NULL DEFAULT 'V',  -- V=Veggur, F=Filigran

    -- Panel constraints (stored per-layout so they can be tuned)
    max_panel_width_mm integer NOT NULL DEFAULT 3000,
    preferred_panel_width_mm integer NOT NULL DEFAULT 2500,
    min_panel_width_mm integer NOT NULL DEFAULT 600,
    max_panel_weight_kg numeric(10,2) NOT NULL DEFAULT 10000,
    joint_width_mm integer NOT NULL DEFAULT 20,
    concrete_density_kg_m3 integer NOT NULL DEFAULT 2400,

    -- Filigran-specific: strip direction
    strip_direction text CHECK (strip_direction IN ('length', 'width')),

    -- Factory/transport constraints
    max_transport_width_mm integer NOT NULL DEFAULT 3000,
    max_transport_height_mm integer NOT NULL DEFAULT 4000,
    max_table_length_mm integer NOT NULL DEFAULT 12000,
    max_table_width_mm integer NOT NULL DEFAULT 4000,

    -- Lifecycle
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'committed')),
    elements_created integer DEFAULT 0,

    -- Audit
    created_by uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- 2. Panelization Panels
CREATE TABLE IF NOT EXISTS panelization_panels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    layout_id uuid NOT NULL REFERENCES panelization_layouts(id) ON DELETE CASCADE,

    -- Sequential index within the layout (left to right, or strip order)
    panel_index integer NOT NULL,

    -- Generated panel name (e.g. "V-101", "F-301")
    name text NOT NULL,

    -- Position on the surface (offset from left/bottom edge in mm)
    offset_x_mm integer NOT NULL DEFAULT 0,
    offset_y_mm integer NOT NULL DEFAULT 0,

    -- Panel dimensions (mm)
    width_mm integer NOT NULL CHECK (width_mm > 0),
    height_mm integer NOT NULL CHECK (height_mm > 0),
    thickness_mm integer NOT NULL CHECK (thickness_mm > 0),

    -- Calculated fields
    weight_kg numeric(10,2) NOT NULL,
    area_m2 numeric(10,4) NOT NULL,
    volume_m3 numeric(10,6) NOT NULL,

    -- Link to generated element (null until committed)
    element_id uuid REFERENCES elements(id) ON DELETE SET NULL,

    -- Constraint violation flags
    exceeds_weight boolean NOT NULL DEFAULT false,
    exceeds_transport boolean NOT NULL DEFAULT false,
    exceeds_table boolean NOT NULL DEFAULT false,

    -- Manual adjustment tracking
    is_manually_adjusted boolean NOT NULL DEFAULT false,

    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- 3. Panelization Openings (wall mode)
CREATE TABLE IF NOT EXISTS panelization_openings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    layout_id uuid NOT NULL REFERENCES panelization_layouts(id) ON DELETE CASCADE,

    -- Opening type
    opening_type text NOT NULL CHECK (opening_type IN ('window', 'door', 'other')),

    -- Position relative to the surface (mm from left edge, mm from bottom)
    offset_x_mm integer NOT NULL CHECK (offset_x_mm >= 0),
    offset_y_mm integer NOT NULL CHECK (offset_y_mm >= 0),

    -- Size (mm)
    width_mm integer NOT NULL CHECK (width_mm > 0),
    height_mm integer NOT NULL CHECK (height_mm > 0),

    -- Label (optional, e.g. "Gluggi 1", "Hurð A")
    label text,

    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_panelization_layouts_project ON panelization_layouts(project_id);
CREATE INDEX IF NOT EXISTS idx_panelization_layouts_building ON panelization_layouts(building_id);
CREATE INDEX IF NOT EXISTS idx_panelization_layouts_status ON panelization_layouts(status);
CREATE INDEX IF NOT EXISTS idx_panelization_panels_layout ON panelization_panels(layout_id);
CREATE INDEX IF NOT EXISTS idx_panelization_panels_element ON panelization_panels(element_id);
CREATE INDEX IF NOT EXISTS idx_panelization_openings_layout ON panelization_openings(layout_id);

-- 5. RLS Policies — Admin only (same pattern as drawing_analyses)
ALTER TABLE panelization_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE panelization_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panelization_openings ENABLE ROW LEVEL SECURITY;

-- Layouts
CREATE POLICY "Admin can view panelization layouts"
    ON panelization_layouts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can insert panelization layouts"
    ON panelization_layouts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can update panelization layouts"
    ON panelization_layouts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can delete panelization layouts"
    ON panelization_layouts FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

-- Panels
CREATE POLICY "Admin can view panelization panels"
    ON panelization_panels FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can insert panelization panels"
    ON panelization_panels FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can update panelization panels"
    ON panelization_panels FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can delete panelization panels"
    ON panelization_panels FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

-- Openings
CREATE POLICY "Admin can view panelization openings"
    ON panelization_openings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can insert panelization openings"
    ON panelization_openings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can update panelization openings"
    ON panelization_openings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Admin can delete panelization openings"
    ON panelization_openings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

-- 6. Updated_at trigger for layouts
CREATE OR REPLACE FUNCTION update_panelization_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_panelization_layouts_updated_at
    BEFORE UPDATE ON panelization_layouts
    FOR EACH ROW EXECUTE FUNCTION update_panelization_layouts_updated_at();
