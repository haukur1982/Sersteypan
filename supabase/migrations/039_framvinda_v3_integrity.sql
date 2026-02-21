-- Migration 039: Framvinda V3 — Data Integrity & Immutability
--
-- Fixes critical issues identified by senior developer review:
-- 1. FK CASCADE → RESTRICT to prevent silent data destruction
-- 2. Snapshot columns for historical immutability
-- 3. Contract freeze after first billing
-- 4. Over-billing awareness
--
-- Context: saveContractLines() did DELETE ALL + INSERT ALL. The FK
-- framvinda_period_lines.contract_line_id had ON DELETE CASCADE,
-- so editing contract setup after billing silently destroyed all
-- period line data. Migration 037's finalized-period triggers do
-- NOT fire on cascade deletes from parent table.

-- =====================================================
-- A. FK FIX — CASCADE to RESTRICT
-- =====================================================
-- If you try to delete a contract line that has period lines
-- referencing it, PostgreSQL will REJECT the delete with an error.

ALTER TABLE framvinda_period_lines
  DROP CONSTRAINT framvinda_period_lines_contract_line_id_fkey;

ALTER TABLE framvinda_period_lines
  ADD CONSTRAINT framvinda_period_lines_contract_line_id_fkey
  FOREIGN KEY (contract_line_id)
  REFERENCES framvinda_contract_lines(id)
  ON DELETE RESTRICT;

-- =====================================================
-- B. SNAPSHOT COLUMNS ON PERIOD LINES
-- =====================================================
-- Frozen at finalization time. NULL for drafts (use live contract data).
-- Populated automatically by the snapshot trigger when period is finalized.

ALTER TABLE framvinda_period_lines
  ADD COLUMN IF NOT EXISTS snapshot_unit_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS snapshot_label text,
  ADD COLUMN IF NOT EXISTS snapshot_pricing_unit text,
  ADD COLUMN IF NOT EXISTS snapshot_total_quantity numeric(14,6);

-- =====================================================
-- C. SNAPSHOT VAT RATE ON PERIODS
-- =====================================================

ALTER TABLE framvinda_periods
  ADD COLUMN IF NOT EXISTS snapshot_vat_rate numeric(5,2);

-- =====================================================
-- D. CONTRACT FREEZE COLUMNS
-- =====================================================

ALTER TABLE framvinda_contracts
  ADD COLUMN IF NOT EXISTS is_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS frozen_by uuid REFERENCES profiles(id);

-- =====================================================
-- E. SNAPSHOT-ON-FINALIZATION TRIGGER
-- =====================================================
-- When a period transitions from draft → finalized, copy current
-- contract line data into snapshot columns on the period lines.
-- Also snapshot the VAT rate onto the period itself.

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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_snapshot_on_finalize
  BEFORE UPDATE ON framvinda_periods
  FOR EACH ROW
  EXECUTE FUNCTION snapshot_period_lines_on_finalize();

-- =====================================================
-- F. AUTO-FREEZE CONTRACT ON FIRST FINALIZATION
-- =====================================================
-- When the first period is finalized for a contract, automatically
-- freeze the contract to prevent further modifications to contract lines.

CREATE OR REPLACE FUNCTION auto_freeze_contract_on_finalize()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finalized' AND OLD.status = 'draft' THEN
    UPDATE framvinda_contracts
    SET is_frozen = true,
        frozen_at = COALESCE(frozen_at, NOW()),
        frozen_by = COALESCE(frozen_by, NEW.finalized_by)
    WHERE id = NEW.contract_id
      AND is_frozen = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_freeze_contract
  AFTER UPDATE ON framvinda_periods
  FOR EACH ROW
  EXECUTE FUNCTION auto_freeze_contract_on_finalize();

-- =====================================================
-- G. GUARD FROZEN CONTRACT LINES
-- =====================================================
-- Prevent insert/update/delete on contract lines when contract is frozen.

CREATE OR REPLACE FUNCTION guard_frozen_contract_lines()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  -- For DELETE, use OLD; for INSERT/UPDATE, use NEW
  IF TG_OP = 'DELETE' THEN
    v_contract_id := OLD.contract_id;
  ELSE
    v_contract_id := NEW.contract_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM framvinda_contracts
    WHERE id = v_contract_id
      AND is_frozen = true
  ) THEN
    RAISE EXCEPTION 'Cannot modify contract lines after billing has started (contract is frozen)';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guard_frozen_lines_update
  BEFORE UPDATE ON framvinda_contract_lines
  FOR EACH ROW EXECUTE FUNCTION guard_frozen_contract_lines();

CREATE TRIGGER guard_frozen_lines_insert
  BEFORE INSERT ON framvinda_contract_lines
  FOR EACH ROW EXECUTE FUNCTION guard_frozen_contract_lines();

CREATE TRIGGER guard_frozen_lines_delete
  BEFORE DELETE ON framvinda_contract_lines
  FOR EACH ROW EXECUTE FUNCTION guard_frozen_contract_lines();

-- =====================================================
-- H. BACKFILL EXISTING DATA
-- =====================================================
-- Populate snapshots for already-finalized periods and freeze
-- contracts that already have finalized periods.

-- Backfill period line snapshots
UPDATE framvinda_period_lines pl
SET snapshot_unit_price = cl.unit_price,
    snapshot_label = cl.label,
    snapshot_pricing_unit = cl.pricing_unit,
    snapshot_total_quantity = cl.total_quantity
FROM framvinda_contract_lines cl, framvinda_periods p
WHERE pl.contract_line_id = cl.id
  AND p.id = pl.period_id
  AND p.status = 'finalized'
  AND pl.snapshot_unit_price IS NULL;

-- Backfill period VAT snapshots
UPDATE framvinda_periods p
SET snapshot_vat_rate = c.vat_rate
FROM framvinda_contracts c
WHERE p.contract_id = c.id
  AND p.status = 'finalized'
  AND p.snapshot_vat_rate IS NULL;

-- Freeze contracts with existing finalized periods
UPDATE framvinda_contracts c
SET is_frozen = true,
    frozen_at = (
      SELECT MIN(finalized_at) FROM framvinda_periods
      WHERE contract_id = c.id AND status = 'finalized'
    )
WHERE EXISTS (
  SELECT 1 FROM framvinda_periods
  WHERE contract_id = c.id AND status = 'finalized'
)
AND is_frozen = false;
