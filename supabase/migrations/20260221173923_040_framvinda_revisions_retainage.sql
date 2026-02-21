-- Migration 040: Framvinda Revisions (Change Orders) & Retainage
-- 
-- 1. Adds retainage support (Tryggingarfé) to contracts and periods.
-- 2. Adds contract revisions for Viðbótarverk (Change Orders).
-- 3. Updates the contract freeze guard to allow appending revision lines to frozen contracts.

-- =====================================================
-- 1. RETAINAGE (TRYGGINGARFÉ) COLUMNS
-- =====================================================
ALTER TABLE framvinda_contracts
  ADD COLUMN IF NOT EXISTS retainage_percentage numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE framvinda_periods
  ADD COLUMN IF NOT EXISTS snapshot_retainage_percentage numeric(5,2);

-- Update the snapshot trigger to also freeze retainage
CREATE OR REPLACE FUNCTION snapshot_period_lines_on_finalize()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finalized' AND OLD.status = 'draft' THEN
    -- Snapshot line data from contract lines
    UPDATE framvinda_period_lines pl
    SET snapshot_unit_price = cl.unit_price,
        snapshot_label = cl.label,
        snapshot_pricing_unit = cl.pricing_unit,
        snapshot_total_quantity = cl.total_quantity
    FROM framvinda_contract_lines cl
    WHERE pl.period_id = NEW.id
      AND pl.contract_line_id = cl.id;

    -- Snapshot VAT rate from contract
    NEW.snapshot_vat_rate := (
      SELECT vat_rate FROM framvinda_contracts
      WHERE id = NEW.contract_id
    );
    
    -- Snapshot Retainage percentage from contract
    NEW.snapshot_retainage_percentage := (
      SELECT retainage_percentage FROM framvinda_contracts
      WHERE id = NEW.contract_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing finalized periods with retainage = 0
UPDATE framvinda_periods
SET snapshot_retainage_percentage = 0
WHERE status = 'finalized' AND snapshot_retainage_percentage IS NULL;

-- =====================================================
-- 2. CONTRACT REVISIONS (VIÐBÆTUR)
-- =====================================================
CREATE TABLE framvinda_contract_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL REFERENCES framvinda_contracts(id) ON DELETE CASCADE,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
    created_at timestamptz NOT NULL DEFAULT now(),
    approved_at timestamptz,
    approved_by uuid REFERENCES profiles(id)
);

ALTER TABLE framvinda_contract_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to framvinda_contract_revisions"
    ON framvinda_contract_revisions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = true
        )
    );

CREATE POLICY "Buyer can view own project framvinda_contract_revisions"
    ON framvinda_contract_revisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM framvinda_contracts
            JOIN projects ON projects.id = framvinda_contracts.project_id
            JOIN profiles ON profiles.company_id = projects.company_id
            WHERE framvinda_contracts.id = framvinda_contract_revisions.contract_id
              AND profiles.id = auth.uid()
              AND profiles.role = 'buyer'
              AND profiles.is_active = true
        )
    );

-- Add revision_id to contract lines
ALTER TABLE framvinda_contract_lines
  ADD COLUMN IF NOT EXISTS revision_id uuid REFERENCES framvinda_contract_revisions(id) ON DELETE CASCADE;

-- Default base lines have revision_id = NULL

-- =====================================================
-- 3. UPDATE CONTRACT FREEZE GUARD
-- =====================================================
-- Base lines (revision_id IS NULL) are bound to framvinda_contracts.is_frozen.
-- Revision lines are bound to framvinda_contract_revisions.status == 'approved'.

CREATE OR REPLACE FUNCTION guard_frozen_contract_lines()
RETURNS TRIGGER AS $$
DECLARE
  v_is_frozen boolean;
  v_rev_status text;
BEGIN
  -- For OLD records (DELETE or UPDATE)
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.revision_id IS NULL THEN
      SELECT is_frozen INTO v_is_frozen FROM framvinda_contracts WHERE id = OLD.contract_id;
      IF v_is_frozen THEN
        RAISE EXCEPTION 'Cannot modify base contract lines after billing has started. Create a Change Order (Viðbót) instead.';
      END IF;
    ELSE
      SELECT status INTO v_rev_status FROM framvinda_contract_revisions WHERE id = OLD.revision_id;
      IF v_rev_status = 'approved' THEN
        RAISE EXCEPTION 'Cannot modify lines attached to an approved Change Order (Viðbót).';
      END IF;
    END IF;
  END IF;

  -- For NEW records (INSERT or UPDATE)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.revision_id IS NULL THEN
      SELECT is_frozen INTO v_is_frozen FROM framvinda_contracts WHERE id = NEW.contract_id;
      IF v_is_frozen THEN
        RAISE EXCEPTION 'Cannot insert/update base contract lines after billing has started. Create a Change Order (Viðbót) instead.';
      END IF;
    ELSE
      SELECT status INTO v_rev_status FROM framvinda_contract_revisions WHERE id = NEW.revision_id;
      IF v_rev_status = 'approved' THEN
        RAISE EXCEPTION 'Cannot add or move lines to an approved Change Order (Viðbót).';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
