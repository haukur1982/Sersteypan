-- Migration 036: Framvinda (Progress Billing)
--
-- Enables the owner to generate monthly progress billing reports for projects.
-- Tracks: contract pricing, billing periods, per-line quantities, and vísitala adjustments.
--
-- Structure:
-- 1. framvinda_contracts — one per project (billing agreement)
-- 2. framvinda_contract_lines — billable line items (categories, prices, quantities)
-- 3. framvinda_periods — billing periods (monthly reports)
-- 4. framvinda_period_lines — per-line amounts for each period

-- =====================================================
-- A. FRAMVINDA CONTRACTS
-- =====================================================

CREATE TABLE IF NOT EXISTS framvinda_contracts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Base price index at contract signing (e.g. 117.6)
    grunnvisitala numeric(10,2) NOT NULL,

    -- VAT rate (default 11% for Icelandic construction)
    vat_rate numeric(5,2) NOT NULL DEFAULT 11.0,

    notes text,

    created_by uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),

    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_framvinda_contracts_project ON framvinda_contracts(project_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_framvinda_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_framvinda_contracts_updated_at
    BEFORE UPDATE ON framvinda_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_framvinda_contracts_updated_at();

-- =====================================================
-- B. FRAMVINDA CONTRACT LINES
-- =====================================================

CREATE TABLE IF NOT EXISTS framvinda_contract_lines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id uuid NOT NULL REFERENCES framvinda_contracts(id) ON DELETE CASCADE,

    -- Category grouping (sections in the report)
    category text NOT NULL CHECK (category IN (
        'filigran', 'svalir', 'stigar', 'svalagangar', 'flutningur', 'annad'
    )),

    -- Display order within category
    sort_order integer NOT NULL DEFAULT 0,

    -- Line label (e.g. "Hús A 1 hæð", "SV1", "SG-4", "Flutningur á byggingarstað")
    label text NOT NULL,

    -- Whether this is an "Auka" (extra/surcharge) line
    is_extra boolean NOT NULL DEFAULT false,
    extra_description text,  -- e.g. "Stækkun svala úr 20 í 25cm"

    -- Pricing unit: 'm2' for area-based, 'stk' for unit-based, 'ferdir' for trips
    pricing_unit text NOT NULL CHECK (pricing_unit IN ('m2', 'stk', 'ferdir')),

    -- Contract quantities
    contract_count integer,            -- Stk: number of units (e.g. 21 balconies, 3 SG-1 pieces)
    unit_area_m2 numeric(12,6),        -- m2 per unit (e.g. 8.6245 for SV1)
    total_quantity numeric(14,6) NOT NULL,  -- MAGN: total m2, count, or trips
    unit_price numeric(12,2) NOT NULL, -- VERÐ: price per m2/unit/trip
    total_price numeric(16,2) NOT NULL, -- SAMTALS: total_quantity * unit_price

    -- Optional linking to building+floor (for filigran grouping)
    building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,
    floor integer,

    -- Optional linking to element type (for auto-suggest)
    element_type_key text,

    -- Optional pattern to match elements by drawing_reference (for auto-suggest)
    drawing_reference_pattern text,

    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_framvinda_contract_lines_contract ON framvinda_contract_lines(contract_id);
CREATE INDEX IF NOT EXISTS idx_framvinda_contract_lines_category ON framvinda_contract_lines(contract_id, category, sort_order);

CREATE OR REPLACE FUNCTION update_framvinda_contract_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_framvinda_contract_lines_updated_at
    BEFORE UPDATE ON framvinda_contract_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_framvinda_contract_lines_updated_at();

-- =====================================================
-- C. FRAMVINDA PERIODS (Billing periods / monthly reports)
-- =====================================================

CREATE TABLE IF NOT EXISTS framvinda_periods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id uuid NOT NULL REFERENCES framvinda_contracts(id) ON DELETE CASCADE,

    -- Period info
    period_number integer NOT NULL,  -- Sequential: 1, 2, 3... (Framvinda 1, 2, 3...)
    period_start date NOT NULL,
    period_end date NOT NULL,

    -- Current price index for this period
    visitala numeric(10,2) NOT NULL,

    -- Status
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),

    notes text,

    -- Cached totals (recalculated on save)
    subtotal numeric(16,2),           -- Sum of all line amounts this period
    visitala_amount numeric(16,2),    -- Price index adjustment amount
    total_with_visitala numeric(16,2),

    created_by uuid NOT NULL REFERENCES profiles(id),
    finalized_at timestamptz,
    finalized_by uuid REFERENCES profiles(id),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),

    UNIQUE(contract_id, period_number)
);

CREATE INDEX IF NOT EXISTS idx_framvinda_periods_contract ON framvinda_periods(contract_id);
CREATE INDEX IF NOT EXISTS idx_framvinda_periods_status ON framvinda_periods(status);

CREATE OR REPLACE FUNCTION update_framvinda_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_framvinda_periods_updated_at
    BEFORE UPDATE ON framvinda_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_framvinda_periods_updated_at();

-- =====================================================
-- D. FRAMVINDA PERIOD LINES (per-line billing for each period)
-- =====================================================

CREATE TABLE IF NOT EXISTS framvinda_period_lines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    period_id uuid NOT NULL REFERENCES framvinda_periods(id) ON DELETE CASCADE,
    contract_line_id uuid NOT NULL REFERENCES framvinda_contract_lines(id) ON DELETE CASCADE,

    -- This period's billing
    quantity_this_period numeric(14,6) NOT NULL DEFAULT 0,
    amount_this_period numeric(16,2) NOT NULL DEFAULT 0,

    -- Whether owner manually adjusted (vs auto-suggested)
    is_manually_adjusted boolean NOT NULL DEFAULT false,

    -- Notes for this line this period (Athugasemd column)
    notes text,

    -- Optional date-specific detail
    -- Format: [{ "date": "2024-06-01", "quantity": 2.0 }, ...]
    date_details jsonb DEFAULT '[]'::jsonb,

    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),

    UNIQUE(period_id, contract_line_id)
);

CREATE INDEX IF NOT EXISTS idx_framvinda_period_lines_period ON framvinda_period_lines(period_id);
CREATE INDEX IF NOT EXISTS idx_framvinda_period_lines_contract_line ON framvinda_period_lines(contract_line_id);

CREATE OR REPLACE FUNCTION update_framvinda_period_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_framvinda_period_lines_updated_at
    BEFORE UPDATE ON framvinda_period_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_framvinda_period_lines_updated_at();

-- =====================================================
-- E. RLS POLICIES
-- =====================================================

-- Admin full access on all four tables
ALTER TABLE framvinda_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE framvinda_contract_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE framvinda_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE framvinda_period_lines ENABLE ROW LEVEL SECURITY;

-- framvinda_contracts
CREATE POLICY "Admin full access to framvinda_contracts"
    ON framvinda_contracts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

-- Buyer read-only (for future use)
CREATE POLICY "Buyer can view own project framvinda_contracts"
    ON framvinda_contracts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            JOIN profiles ON profiles.company_id = projects.company_id
            WHERE projects.id = framvinda_contracts.project_id
              AND profiles.id = auth.uid()
              AND profiles.role = 'buyer'
              AND profiles.is_active = true
        )
    );

-- framvinda_contract_lines
CREATE POLICY "Admin full access to framvinda_contract_lines"
    ON framvinda_contract_lines FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Buyer can view own project framvinda_contract_lines"
    ON framvinda_contract_lines FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM framvinda_contracts
            JOIN projects ON projects.id = framvinda_contracts.project_id
            JOIN profiles ON profiles.company_id = projects.company_id
            WHERE framvinda_contracts.id = framvinda_contract_lines.contract_id
              AND profiles.id = auth.uid()
              AND profiles.role = 'buyer'
              AND profiles.is_active = true
        )
    );

-- framvinda_periods
CREATE POLICY "Admin full access to framvinda_periods"
    ON framvinda_periods FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Buyer can view finalized framvinda_periods"
    ON framvinda_periods FOR SELECT
    USING (
        status = 'finalized'
        AND EXISTS (
            SELECT 1 FROM framvinda_contracts
            JOIN projects ON projects.id = framvinda_contracts.project_id
            JOIN profiles ON profiles.company_id = projects.company_id
            WHERE framvinda_contracts.id = framvinda_periods.contract_id
              AND profiles.id = auth.uid()
              AND profiles.role = 'buyer'
              AND profiles.is_active = true
        )
    );

-- framvinda_period_lines
CREATE POLICY "Admin full access to framvinda_period_lines"
    ON framvinda_period_lines FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Buyer can view finalized framvinda_period_lines"
    ON framvinda_period_lines FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM framvinda_periods
            JOIN framvinda_contracts ON framvinda_contracts.id = framvinda_periods.contract_id
            JOIN projects ON projects.id = framvinda_contracts.project_id
            JOIN profiles ON profiles.company_id = projects.company_id
            WHERE framvinda_periods.id = framvinda_period_lines.period_id
              AND framvinda_periods.status = 'finalized'
              AND profiles.id = auth.uid()
              AND profiles.role = 'buyer'
              AND profiles.is_active = true
        )
    );
