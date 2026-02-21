-- Migration 038: Framvinda V2 Enhancements
--
-- 1. Per-period grunnvisitala (requirements #4, #5)
-- 2. Change default VAT from 11% to 24% (requirement #2)
-- 3. Period description text for reports (requirement #7)

-- =====================================================
-- A. Per-period grunnvisitala
-- =====================================================
-- On longer projects, the base price index (grunnvísitala) changes.
-- Each period needs its own grunnvísitala for accurate calculations.

ALTER TABLE framvinda_periods
    ADD COLUMN IF NOT EXISTS grunnvisitala numeric(10,2);

-- Backfill existing periods from their contract's grunnvisitala
UPDATE framvinda_periods p
    SET grunnvisitala = c.grunnvisitala
    FROM framvinda_contracts c
    WHERE p.contract_id = c.id
      AND p.grunnvisitala IS NULL;

-- Make NOT NULL after backfill (safe since we just filled all existing rows)
ALTER TABLE framvinda_periods
    ALTER COLUMN grunnvisitala SET NOT NULL;

-- =====================================================
-- B. Change default VAT rate from 11% to 24%
-- =====================================================
-- Icelandic standard VAT for construction services is 24%.
-- The 11% rate was incorrect — that's the reduced rate for residential heating.

ALTER TABLE framvinda_contracts
    ALTER COLUMN vat_rate SET DEFAULT 24.0;

-- =====================================================
-- C. Period description text
-- =====================================================
-- Formal description shown on the PDF report.
-- Separate from internal `notes` (which is for admin-only notes).

ALTER TABLE framvinda_periods
    ADD COLUMN IF NOT EXISTS description text;
